# BALE — Billing & Advance Ledger Engine (Asinta Architects)

Lightweight AI-integrated service and ledger management platform for Asinta
Architects (Batangas, Philippines). Built for project billing, expenses,
attendance, and worker advances ("bale").

**All data is live.** BALE fetches and mutates every record directly through
Supabase PostgreSQL and Supabase Auth — there are no local mock or
localStorage fallbacks.

## Architecture

| Concern | Implementation |
| --- | --- |
| Database | Supabase PostgreSQL (`projects`, `invoices`, `expenses`, `attendance`, `advances`, `payroll`, `tools`, `clients`, `workers`, `users`, `sms_logs`, `project_supervisors`) |
| Auth | `supabase.auth.signInWithPassword()` / `signOut()`, session cookies synced via `@supabase/ssr` |
| Roles | `public.users.role` (`founder` \| `supervisor`), enforced by middleware **and** PostgreSQL RLS |
| Receipts | Supabase Storage bucket `receipts`; public URL saved to `expenses.receipt_url` |
| Security | Every query carries the signed-in user's JWT so Row Level Security is enforced end-to-end |

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (or run
   the local stack with `supabase start` — the default URL
   `http://localhost:54321` is used when env vars are absent).

2. **Apply the migrations** (SQL Editor → paste each file, or
   `supabase db push`):
   - `supabase/migrations/20260913000000_bale_schema.sql` — tables, RLS policies
   - `supabase/migrations/20260913000001_bale_schema_additions.sql` — payroll summary columns + `receipts` storage bucket & policies
   - `supabase/migrations/20260913000002_bale_seed.sql` — demo seed data (idempotent)

3. **Configure the environment**:
   ```bash
   cp .env.example .env.local
   # fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

4. **Run**:
   ```bash
   npm install
   npm run dev     # http://localhost:3000
   npm run build   # production build
   ```

## Seeded demo accounts

The seed migration provisions matching `auth.users` and `public.users` rows.
Password for all demo accounts: **`asinta2026`**

| Account | Email | Role |
| --- | --- | --- |
| Ar. Junel Buyagon | `junel@asinta.ph` | founder |
| Ar. Rei Viviene Buyagon | `rei@asinta.ph` | founder |
| Engr. Marco Santos | `marco.santos@asinta.ph` | supervisor |
| Carlos Reyes | `carlos.reyes@asinta.ph` | supervisor |

> For production, provision users through the Supabase Auth dashboard / Admin
> API instead of the seed script, and rotate the demo passwords.

## Role-based access

- **Founders** — full access to projects, invoices, expenses, payroll,
  advances, clients, tools, users, SMS, and settings.
- **Supervisors** — attendance terminal only, restricted to project sites
  assigned in `project_supervisors`; enforced by RLS policies such as
  `is_supervisor_assigned(project_id)`.

`middleware.ts` validates the session server-side (`supabase.auth.getUser()`)
and loads `public.users.role` to guard Founder-only routes. The database RLS
policies remain the last line of defense for every query.

## Error handling

- Mutations surface Supabase failures as error toasts (`components/ui/Toast.tsx`).
- The app shell shows synchronizing states while the ledger loads and a retry
  panel when Supabase is unreachable.
