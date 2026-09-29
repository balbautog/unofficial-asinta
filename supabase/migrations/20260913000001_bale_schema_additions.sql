-- BALE (Billing & Advance Ledger Engine)
-- Schema additions: payroll attendance columns + Supabase Storage bucket for
-- expense receipts.

-- 1. Payroll: persist the attendance summary each run is computed from so
--    payslips can display days / hours worked.
alter table public.payroll
  add column if not exists days_worked NUMERIC(5, 2),
  add column if not exists hours_worked NUMERIC(6, 2);

-- 2. Receipts storage bucket -------------------------------------------------
-- Expense receipt photos are uploaded directly from the client to this
-- bucket; the resulting public URL is stored on expenses.receipt_url.
-- Uploads are restricted to authenticated Founders by the storage policies
-- below (leveraging the same public.is_founder() helper used for table RLS).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Founders may upload receipt photos.
drop policy if exists "Founders can upload expense receipts" on storage.objects;
create policy "Founders can upload expense receipts"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and public.is_founder()
  );

-- Founders may read receipt objects through the storage API.
drop policy if exists "Founders can read expense receipts" on storage.objects;
create policy "Founders can read expense receipts"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_founder()
  );

-- Founders may replace or remove receipt photos.
drop policy if exists "Founders can update expense receipts" on storage.objects;
create policy "Founders can update expense receipts"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_founder()
  );

drop policy if exists "Founders can delete expense receipts" on storage.objects;
create policy "Founders can delete expense receipts"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_founder()
  );
