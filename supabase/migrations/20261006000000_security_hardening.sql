-- BALE — Security hardening (2026-10-06)
--
-- Two confirmed findings, both reachable in production until this migration:
--
--   1. The `receipts` Storage bucket was created with `public = true`. Storage
--      policies restricted UPLOAD and LIST to Founders, but a public bucket
--      bypasses auth on READ — anyone holding the URL could fetch a receipt
--      photo. Receipts routinely show supplier names, amounts, TINs, and
--      sometimes signatures or card fragments.
--      Fix: private bucket + short-lived signed URLs. expenses.receipt_url now
--      stores the STORAGE PATH, not a URL (see lib/supabase/receipts.ts).
--
--   2. Financial mutations left no trail. There is now an append-only
--      `audit_log` with Founder-only read access and NO update/delete policy,
--      so a row cannot be edited or erased through any RLS-respecting client.
--
-- Applying this migration is idempotent and safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Receipts bucket: public → private
-- ---------------------------------------------------------------------------

update storage.buckets
set public = false
where id = 'receipts' and public is distinct from false;

-- Policies are unchanged: Founders already hold select/insert/update/delete on
-- this bucket via public.is_founder(). `createSignedUrl()` requires the SELECT
-- policy, which is why signed URLs keep working after the bucket is private.

-- ---------------------------------------------------------------------------
-- 2. Backfill: public/signed receipt URLs → storage paths
--
-- Rows written before this migration hold one of:
--   https://<ref>.supabase.co/storage/v1/object/public/receipts/<path>
--   https://<ref>.supabase.co/storage/v1/object/sign/receipts/<path>?token=…
-- The app now resolves a signed URL from the path at render time, so any
-- absolute URL left in place would be both broken and permanently public.
--
-- Note: the query string is stripped BEFORE the prefix, because a signed URL's
-- token would otherwise travel with the path.
-- ---------------------------------------------------------------------------

update public.expenses
set receipt_url = split_part(receipt_url, '?', 1)
where receipt_url ~ '^https?://' and receipt_url like '%?%';

update public.expenses
set receipt_url = regexp_replace(
      receipt_url,
      '^.*/storage/v1/object/(public|sign|authenticated)/receipts/',
      ''
    )
where receipt_url ~ '/storage/v1/object/(public|sign|authenticated)/receipts/';

-- Anything that is still an absolute URL is not a storage path and cannot be
-- signed. Leaving it would make the UI claim a receipt is available when it is
-- not, so it is cleared and the Founder re-attaches the photo.
update public.expenses
set receipt_url = null
where receipt_url ~ '^https?://';

-- ---------------------------------------------------------------------------
-- 3. audit_log — append-only trail for financial mutations
-- ---------------------------------------------------------------------------

create table if not exists public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Nullable: a system/migration action has no human actor.
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    actor_email TEXT,
    -- insert | update | delete
    action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
    table_name TEXT NOT NULL,
    record_id UUID,
    -- Full row snapshots. BEFORE is null on insert, AFTER is null on delete.
    before_row JSONB,
    after_row JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

create index if not exists idx_audit_log_record
  on public.audit_log (table_name, record_id, created_at DESC);
create index if not exists idx_audit_log_created_at
  on public.audit_log (created_at DESC);
create index if not exists idx_audit_log_actor
  on public.audit_log (actor_id, created_at DESC);

alter table public.audit_log enable row level security;

-- Founders read the trail…
drop policy if exists "Founders can read the audit log" on public.audit_log;
create policy "Founders can read the audit log"
  on public.audit_log for select
  to authenticated
  using (public.is_founder());

-- …and record their own actions. `actor_id = auth.uid()` prevents a Founder
-- from writing an entry that blames someone else.
drop policy if exists "Founders can append to the audit log" on public.audit_log;
create policy "Founders can append to the audit log"
  on public.audit_log for insert
  to authenticated
  with check (public.is_founder() and actor_id = auth.uid());

-- Deliberately NO update and NO delete policy: with RLS enabled, any
-- UPDATE/DELETE matching zero policies is denied. The trail cannot be rewritten
-- by whoever happens to hold a Founder session.

-- ---------------------------------------------------------------------------
-- 3. Scope every existing policy to `authenticated`
--
-- The original policies omitted the TO clause, which defaults the policy to
-- PUBLIC — the anon role included. Their USING expressions already require a
-- real user (`public.is_founder()` / `auth.uid()`), so anon could not pass
-- them; this change removes the possibility that a future policy is written in
-- the same shape with a condition anon CAN satisfy. Semantics for signed-in
-- users are unchanged, which is why this is a mechanical drop-and-recreate.
-- ---------------------------------------------------------------------------

drop policy if exists "Founders have full access to users" on public.users;
create policy "Founders have full access to users"
  on public.users FOR ALL to authenticated
  using (public.is_founder());

drop policy if exists "Supervisors can read their own profile" on public.users;
create policy "Supervisors can read their own profile"
  on public.users FOR SELECT to authenticated
  using (auth.uid() = id);

drop policy if exists "Founders have full access to projects" on public.projects;
create policy "Founders have full access to projects"
  on public.projects FOR ALL to authenticated
  using (public.is_founder());

drop policy if exists "Supervisors can view assigned projects only" on public.projects;
create policy "Supervisors can view assigned projects only"
  on public.projects FOR SELECT to authenticated
  using (public.is_supervisor_assigned(id));

drop policy if exists "Founders manage project supervisor assignments" on public.project_supervisors;
create policy "Founders manage project supervisor assignments"
  on public.project_supervisors FOR ALL to authenticated
  using (public.is_founder());

drop policy if exists "Supervisors can view their own project assignments" on public.project_supervisors;
create policy "Supervisors can view their own project assignments"
  on public.project_supervisors FOR SELECT to authenticated
  using (supervisor_id = auth.uid());

drop policy if exists "Founders full access to invoices" on public.invoices;
create policy "Founders full access to invoices"
  on public.invoices FOR ALL to authenticated
  using (public.is_founder());

drop policy if exists "Founders full access to clients" on public.clients;
create policy "Founders full access to clients"
  on public.clients FOR ALL to authenticated
  using (public.is_founder());

drop policy if exists "Founders full access to expenses" on public.expenses;
create policy "Founders full access to expenses"
  on public.expenses FOR ALL to authenticated
  using (public.is_founder());

drop policy if exists "Founders full access to advances" on public.advances;
create policy "Founders full access to advances"
  on public.advances FOR ALL to authenticated
  using (public.is_founder());

drop policy if exists "Founders full access to workers" on public.workers;
create policy "Founders full access to workers"
  on public.workers FOR ALL to authenticated
  using (public.is_founder());

drop policy if exists "Supervisors can view active workers" on public.workers;
create policy "Supervisors can view active workers"
  on public.workers FOR SELECT to authenticated
  using (auth.uid() IS NOT NULL AND active = TRUE);

drop policy if exists "Founders full access to attendance" on public.attendance;
create policy "Founders full access to attendance"
  on public.attendance FOR ALL to authenticated
  using (public.is_founder());

drop policy if exists "Supervisors can read attendance for assigned projects" on public.attendance;
create policy "Supervisors can read attendance for assigned projects"
  on public.attendance FOR SELECT to authenticated
  using (public.is_supervisor_assigned(project_id));

drop policy if exists "Supervisors can insert attendance for assigned projects" on public.attendance;
create policy "Supervisors can insert attendance for assigned projects"
  on public.attendance FOR INSERT to authenticated
  with check (public.is_supervisor_assigned(project_id));

drop policy if exists "Supervisors can update attendance for assigned projects" on public.attendance;
create policy "Supervisors can update attendance for assigned projects"
  on public.attendance FOR UPDATE to authenticated
  using (public.is_supervisor_assigned(project_id));

drop policy if exists "Founders full access to payroll" on public.payroll;
create policy "Founders full access to payroll"
  on public.payroll FOR ALL to authenticated
  using (public.is_founder());

drop policy if exists "Founders full access to tools" on public.tools;
create policy "Founders full access to tools"
  on public.tools FOR ALL to authenticated
  using (public.is_founder());

drop policy if exists "Supervisors can view tools on assigned projects" on public.tools;
create policy "Supervisors can view tools on assigned projects"
  on public.tools FOR SELECT to authenticated
  using (project_id IS NOT NULL AND public.is_supervisor_assigned(project_id));

drop policy if exists "Founders full access to sms_logs" on public.sms_logs;
create policy "Founders full access to sms_logs"
  on public.sms_logs FOR ALL to authenticated
  using (public.is_founder());

drop policy if exists "Founders full access to email_templates" on public.email_templates;
create policy "Founders full access to email_templates"
  on public.email_templates FOR ALL to authenticated
  using (public.is_founder());

drop policy if exists "Founders full access to email_logs" on public.email_logs;
create policy "Founders full access to email_logs"
  on public.email_logs FOR ALL to authenticated
  using (public.is_founder());

drop policy if exists "Founders full access to reminder_dispatches" on public.reminder_dispatches;
create policy "Founders full access to reminder_dispatches"
  on public.reminder_dispatches FOR ALL to authenticated
  using (public.is_founder());

-- Storage policies already specify `to authenticated`; nothing to change there.

-- ---------------------------------------------------------------------------
-- 4. Function hardening
--
-- The RLS helpers are SECURITY DEFINER (they must be, to read public.users
-- inside a policy). Pinning search_path stops a caller from shadowing an
-- unqualified name with an object in a schema they control.
-- ---------------------------------------------------------------------------

create or replace function public.current_user_role()
returns text as $$
  select role from public.users where id = auth.uid();
$$ language sql stable security definer set search_path = public, pg_temp;

create or replace function public.is_founder()
returns boolean as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'founder'
  );
$$ language sql stable security definer set search_path = public, pg_temp;

create or replace function public.is_supervisor_assigned(proj_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.project_supervisors
    where supervisor_id = auth.uid() and project_id = proj_id
  );
$$ language sql stable security definer set search_path = public, pg_temp;
