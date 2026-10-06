# Applying the BALE migrations to a live Supabase project

Written for project `mchkdkjntnbwrgmyobpd`. Everything here is read-only until
step 4, and step 4 is reversible via the transaction the bundle runs inside.

> **Why this document exists.** The normal path (`supabase db push`) needs the
> database password and a machine that can reach `*.supabase.co`. The agent
> sandbox this was prepared in **cannot** reach Supabase (its egress allowlist
> covers only npm and GitHub), so the migration could not be applied from here.
> Path A below needs nothing but dashboard access to your project.

---

## 1. Pre-flight — what has already been applied?

Paste into **Supabase → SQL Editor** and run:

```sql
select
  to_regclass('public.expenses')  is not null as base_schema_applied,
  to_regclass('public.audit_log') is not null as hardening_applied,
  to_regclass('public.vendor_memory') is not null as ai_draft_applied,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'expenses' and column_name = 'vendor'
  ) as expenses_vendor_column,
  (select public from storage.buckets where id = 'receipts') as receipts_bucket_public,
  case
    when to_regclass('public.expenses') is null
      then 'apply supabase/apply/fresh-install.sql'
    when to_regclass('public.audit_log') is null
      or to_regclass('public.vendor_memory') is null
      or not exists (select 1 from information_schema.columns
                     where table_schema='public' and table_name='expenses' and column_name='vendor')
      then 'apply supabase/apply/upgrade-hardening.sql'
    else 'already migrated — just run supabase/apply/verify-live.sql'
  end as next_step;
```

Result interpretation:

- `base_schema_applied = false` → project is empty → **fresh-install.sql**
- base applied, anything else false → **upgrade-hardening.sql**
- everything true → nothing to apply; go to step 5.

⚠️ **`fresh-install.sql` is not idempotent.** The base schema creates policies
with plain `CREATE POLICY`, so a second run fails on `policy already exists`.
If the project is half-migrated, stop and restore a backup rather than forcing
statements through.

---

## 2. Before you run it

- **Take a backup.** Supabase Pro: Database → Backups → confirm PITR is on and
  note the timestamp. Without PITR, `pg_dump` the database first. This is also
  the restore test `docs/SECURITY.md` §10 is still waiting for.
- **Prefer staging.** If you have Supabase branching or a throwaway project,
  run it there first — it is the same SQL and costs nothing.
- **Never apply `20260913000002_bale_seed.sql`.** It is not in either bundle. It
  creates real auth accounts with the published password `asinta2026`. Demo data
  is for `supabase start` on a laptop only.
- Path C (§8) applies the same bundle through GitHub Actions if you would
  rather not paste SQL.
- The bundles are **generated** from `supabase/migrations` and record each
  source file's SHA-256 in their header. Regenerate after any migration change:

```bash
npm run build:apply-sql
```

---

## 3. Path A — SQL editor (no CLI, no password)

1. Open `supabase/apply/fresh-install.sql` or `upgrade-hardening.sql`.
2. Copy the **entire** file.
3. Supabase → **SQL Editor** → New query → paste → **Run**.
4. The bundle is wrapped in `begin; … commit;`. If any statement fails, nothing
   is committed — read the error and stop. (If the editor reports *"there is
   already a transaction in progress"*, that is its own wrapper; the script
   still commits as a whole. Harmless.)
5. Expect `Success. No rows returned` — this is DDL, not a query.

The `upgrade-hardening.sql` bundle does four things:

| Section | Effect |
| --- | --- |
| `20261006000000` §1 | `receipts` bucket `public → false` |
| `20261006000000` §2 | rewrites `expenses.receipt_url`: public/signed URL → storage path; clears URLs it cannot resolve |
| `20261006000000` §3 | creates `audit_log`; **drops and re-creates all 23 existing policies** with `TO authenticated` |
| `20261006000000` §4 | pins `search_path` on `current_user_role`, `is_founder`, `is_supervisor_assigned` |
| `20261006000001` | `expenses.vendor`, two indexes, `vendor_memory`, `record_vendor_outcome()`, drops the dead `ai_approval_suggestion` column |

§3 changes the *grantee* of every existing policy from `PUBLIC` (which includes
`anon`) to `authenticated`. Signed-in behaviour is unchanged — the `USING`
predicates already required a real user — but unauthenticated requests now get
nothing instead of being evaluated against a role predicate that was never
meant to include them.

---

## 4. Path B — Supabase CLI

Needs the database password (Project Settings → Database → Connection string)
and a network that can reach Supabase:

```bash
supabase link --project-ref mchkdkjntnbwrgmyobpd
supabase db push          # applies supabase/migrations/*.sql in filename order
```

Note that `db push` runs **all** migrations, including the seed if it is
unapplied. Delete or rename the seed file before pushing to a production
project, or apply the bundles by hand (Path A).

---

## 5. Verify — do not skip this

Run `supabase/apply/verify-live.sql` in the SQL editor. It is read-only and
returns one row per check; **every row must say PASS**:

| Check | Fails when |
| --- | --- |
| base tables present | a table is missing → wrong bundle |
| RLS enabled on every public table | a table has RLS off |
| no policy reachable by anon | a policy still resolves to anon/PUBLIC |
| no permissive `USING (true)` | a policy admits every row |
| audit_log cannot be rewritten | an UPDATE/DELETE policy exists on `audit_log` |
| RLS helpers pin `search_path` | `security definer` helper is shadowable |
| receipts bucket is private | bucket is still public |
| receipt_url holds storage paths | rows still hold `http(s)://` values |
| at least one Founder profile | nobody can sign in as Founder yet (step 6) |
| no orphaned profiles | a `public.users` row has no matching `auth.users` row |

Then do the human checks that SQL cannot make:

1. **Open a receipt** on the Expenses page. It must render. If it says no stored
   photo, the backfill could not resolve that URL — re-attach the photo. This is
   the expected outcome for the absolute URLs §2 deliberately clears.
2. **Upload a new receipt**, reload, reopen it — validates path storage + signed
   URL minting end to end.
3. **Record an expense**, then in the SQL editor:
   `select * from audit_log order by created_at desc limit 3;` — an `insert`
   row for `expenses` should be there with your user id.

---

## 6. First Founder account (no seed)

1. Supabase → **Authentication → Users → Add user** → email + a strong password
   → *Auto Confirm User*.
2. Copy the new user's UUID.
3. SQL editor — link it to the app's role table:

```sql
insert into public.users (id, name, email, role)
values ('<paste-uuid>', 'Junel', 'junel@asinta.ph', 'founder');
```

Both rows are required: `auth.users` authenticates, `public.users` decides the
role, and `requireFounder()` refuses an account with no matching profile row.

Other staff are added the same way with `role = 'supervisor'`, plus a
`project_supervisors` row per assigned project.

---

## 7. Dashboard settings that live outside the code

These are **not** in the migration bundles and will silently disagree with the
app if skipped:

| Where | Setting | Value | Why |
| --- | --- | --- | --- |
| Authentication → Sessions | Inactivity timeout | `20` minutes | mirrors `supabase/config.toml` |
| Authentication → Sessions | Time-box | `8` hours | absolute cap; the app's warning dialog counts down to these |
| Authentication → Rate Limits | tighten sign-in / token refresh | your call | the app's own limiter never sees login traffic (docs/SECURITY.md §7) |
| Database → Backups | PITR | on | docs/SECURITY.md §10 |

`supabase/config.toml` only configures the local stack; the managed project is
configured in the dashboard. When you change one, change the other.

---

## 8. Path C — GitHub Actions (no local setup)

`.github/workflows/apply-migrations.yml` is already in the repository. It is
**manual only** (`workflow_dispatch`) — nothing migrates a database on a push.

1. Settings → Secrets and variables → Actions → New repository secret:
   `SUPABASE_DB_URL` = the **pooled** connection string from Project Settings →
   Database → Connection string → URI, with the password filled in.
2. Actions → **Apply database migrations** → Run workflow:
   - `bundle`: `upgrade-hardening` (or `fresh-install`)
   - `confirm_project_ref`: type `mchkdkjntnbwrgmyobpd`
   - `dry_run`: leave **checked** the first time
3. Read the pre-flight output, then re-run with `dry_run` unchecked.

It applies `supabase/apply/<bundle>.sql` through `psql` with `ON_ERROR_STOP`,
**not** `supabase db push`. That is deliberate: `db push` would run every file in
`supabase/migrations`, including the seed with its published password. The
workflow also refuses to start if the bundle contains the seed password or if
`SUPABASE_DB_URL` does not mention this project ref.

The secret is a database password — rotate it in the dashboard if it is ever
exposed, and note that GitHub masks it in logs but it is visible to anyone with
repository admin rights.

---

## 9. What is still unverified after this

- The application has never run against this project: the sandbox cannot reach
  `*.supabase.co`. Every claim about runtime behaviour here is from tests and
  the local build, not from a live session.
- MFA enrolment, session expiry and the warning dialog need a real signed-in
  browser session.
- Backups/PITR: fill in the table in `docs/SECURITY.md` §10 after the restore
  test.
