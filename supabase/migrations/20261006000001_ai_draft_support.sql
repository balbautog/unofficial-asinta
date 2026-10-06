-- BALE — AI draft support (2026-10-06)
--
-- Track A (vendor memory) and the schema decision that was left open in
-- ROADMAP.md: the decorative `ai_approval_suggestion` column.
--
-- Vendor memory is deliberately COUNT-BASED and inspectable:
--   * keyed by a normalised vendor token (see lib/ai/vendorMemory.ts)
--   * stores how many times a Founder ACCEPTED the suggested category and how
--     many times they OVERRODE it
--   * the suggestion reads "accepted 14 of 15 times" — a measured rate, not an
--     asserted confidence percentage
-- There are no embeddings and no vector similarity anywhere, by design: the
-- moment it becomes a black box the property the design depends on (a Founder
-- can explain and reverse any suggestion) is lost.

-- ---------------------------------------------------------------------------
-- 1. expenses.vendor
--
-- Vendor memory needs the supplier ON the expense row: without it there is
-- nothing to key "this supplier is always materials" on, and duplicate detection
-- ("same supplier + same amount within N days") has no supplier to compare.
-- The AI draft prefills it; the Founder can edit or clear it, and it is never
-- used as a financial value.
-- ---------------------------------------------------------------------------

alter table public.expenses add column if not exists vendor TEXT;

create index if not exists idx_expenses_vendor
  on public.expenses (lower(vendor));
create index if not exists idx_expenses_amount_date
  on public.expenses (amount, expense_date);

-- ---------------------------------------------------------------------------
-- 2. vendor_memory
-- ---------------------------------------------------------------------------

create table if not exists public.vendor_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Normalised lookup key, e.g. "jmc hardware".
    vendor_token TEXT NOT NULL UNIQUE,
    -- What the Founder actually typed, for display in the UI.
    vendor_label TEXT NOT NULL,
    -- Most recently confirmed category (last write wins — simple and reversible).
    category TEXT NOT NULL CHECK (category IN ('materials', 'labor', 'equipment', 'permits', 'transportation', 'other')),
    -- Times the Founder kept the suggested category…
    accepted_count INTEGER NOT NULL DEFAULT 0 CHECK (accepted_count >= 0),
    -- …and times they changed it. Both counters are shown, so the rate is honest.
    override_count INTEGER NOT NULL DEFAULT 0 CHECK (override_count >= 0),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

create index if not exists idx_vendor_memory_last_seen
  on public.vendor_memory (last_seen_at DESC);

alter table public.vendor_memory enable row level security;

drop policy if exists "Founders full access to vendor_memory" on public.vendor_memory;
create policy "Founders full access to vendor_memory"
  on public.vendor_memory for all
  to authenticated
  using (public.is_founder())
  with check (public.is_founder());

-- ---------------------------------------------------------------------------
-- 3. Atomic outcome recorder
--
-- One round trip, no read-modify-write race between two Founder sessions.
-- The counters are the ONLY thing this function changes, so a bad prediction
-- can be corrected by hand from the Supabase table editor and the memory
-- remains fully reversible.
-- ---------------------------------------------------------------------------

create or replace function public.record_vendor_outcome(
    p_vendor_token TEXT,
    p_vendor_label TEXT,
    p_suggested_category TEXT,
    p_final_category TEXT
) RETURNS public.vendor_memory
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_token TEXT := lower(trim(coalesce(p_vendor_token, '')));
    v_label TEXT := trim(coalesce(p_vendor_label, ''));
    v_accepted INTEGER := 0;
    v_override INTEGER := 0;
    v_row public.vendor_memory;
BEGIN
    -- RLS would already block this, but an explicit check gives a readable
    -- error instead of "new row violates row-level security policy".
    IF NOT public.is_founder() THEN
        RAISE EXCEPTION 'Only Founder accounts may record vendor outcomes';
    END IF;

    IF v_token = '' THEN
        RAISE EXCEPTION 'A normalised vendor token is required';
    END IF;

    IF p_final_category IS NULL OR p_final_category NOT IN
        ('materials', 'labor', 'equipment', 'permits', 'transportation', 'other') THEN
        RAISE EXCEPTION 'Unsupported final category: %', p_final_category;
    END IF;

    -- Accepted = the suggestion (if any) matched what the Founder kept.
    IF p_suggested_category IS NOT NULL AND p_suggested_category = p_final_category THEN
        v_accepted := 1;
    ELSE
        v_override := 1;
    END IF;

    INSERT INTO public.vendor_memory AS vm (
        vendor_token, vendor_label, category, accepted_count, override_count, last_seen_at
    )
    VALUES (
        v_token,
        coalesce(nullif(v_label, ''), v_token),
        p_final_category,
        v_accepted,
        v_override,
        NOW()
    )
    ON CONFLICT (vendor_token) DO UPDATE
    SET
        vendor_label   = coalesce(nullif(excluded.vendor_label, ''), vm.vendor_label),
        category       = excluded.category,
        accepted_count = vm.accepted_count + excluded.accepted_count,
        override_count = vm.override_count + excluded.override_count,
        last_seen_at   = NOW()
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$;

revoke all on function public.record_vendor_outcome(TEXT, TEXT, TEXT, TEXT) from public;
grant execute on function public.record_vendor_outcome(TEXT, TEXT, TEXT, TEXT) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Retire the decorative `expenses.ai_approval_suggestion` column
--
-- The column held a routing string that nothing enforced and nothing read
-- (every writer of an expense is already a Founder, so there was no approver to
-- route to). It is no longer written by the app.
--
-- The historical values are not simply discarded: each non-null value is
-- archived into audit_log first, attributed to a system actor, so the trail
-- records that the column existed and what it contained. Then it is dropped.
-- ---------------------------------------------------------------------------

do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'expenses'
          and column_name = 'ai_approval_suggestion'
    ) then
        insert into public.audit_log (actor_id, actor_email, action, table_name, record_id, before_row, after_row)
        select
            null,
            'migration:20261006000001',
            'update',
            'expenses',
            e.id,
            jsonb_build_object('ai_approval_suggestion', e.ai_approval_suggestion),
            jsonb_build_object('ai_approval_suggestion', null, 'dropped_by', '20261006000001_ai_draft_support.sql')
        from public.expenses e
        where e.ai_approval_suggestion is not null;

        alter table public.expenses drop column ai_approval_suggestion;
    end if;
end $$;

-- `ai_confirmed` is intentionally KEPT. It now means "the Founder applied the
-- suggestion that was on screen", which is real information; it used to be
-- hardcoded true on every row and stored nothing.
