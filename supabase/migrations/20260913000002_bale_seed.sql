-- =============================================================
-- BALE (Billing & Advance Ledger Engine) — demo/seed data
--
-- Generated from the retired local mock dataset. Every record now lives
-- in live Supabase PostgreSQL; the app has NO client-side mock fallback.
--
-- Demo auth password for every seeded account: asinta2026
-- (change these immediately for any real deployment).
--
-- The script is idempotent — re-running it never duplicates rows.
-- =============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------
-- 1. Authentication accounts (auth.users + auth.identities)
--    NOTE: for production, provision users through the Supabase Auth
--    dashboard / Admin API instead of direct inserts.
-- ------------------------------------------------------------------

-- Ar. Junel Buyagon (founder) — legacy id: usr-founder-1
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values (
  '02f773a0-abec-4916-9858-e9e547782bc3',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'junel@asinta.ph',
  crypt('asinta2026', gen_salt('bf')),
  '2026-01-10T08:00:00Z',
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Ar. Junel Buyagon"}'::jsonb,
  '2026-01-10T08:00:00Z', '2026-01-10T08:00:00Z'
) on conflict do nothing;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
values (
  '02f773a0-abec-4916-9858-e9e547782bc3', '02f773a0-abec-4916-9858-e9e547782bc3', '02f773a0-abec-4916-9858-e9e547782bc3', 'email',
  jsonb_build_object('sub', '02f773a0-abec-4916-9858-e9e547782bc3', 'email', 'junel@asinta.ph', 'email_verified', true),
  '2026-01-10T08:00:00Z', '2026-01-10T08:00:00Z', '2026-01-10T08:00:00Z'
) on conflict do nothing;

-- Ar. Rei Viviene Buyagon (founder) — legacy id: usr-founder-2
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values (
  'b5117c39-e80b-cded-2c90-510de7ce7512',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'rei@asinta.ph',
  crypt('asinta2026', gen_salt('bf')),
  '2026-01-10T08:00:00Z',
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Ar. Rei Viviene Buyagon"}'::jsonb,
  '2026-01-10T08:00:00Z', '2026-01-10T08:00:00Z'
) on conflict do nothing;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
values (
  'b5117c39-e80b-cded-2c90-510de7ce7512', 'b5117c39-e80b-cded-2c90-510de7ce7512', 'b5117c39-e80b-cded-2c90-510de7ce7512', 'email',
  jsonb_build_object('sub', 'b5117c39-e80b-cded-2c90-510de7ce7512', 'email', 'rei@asinta.ph', 'email_verified', true),
  '2026-01-10T08:00:00Z', '2026-01-10T08:00:00Z', '2026-01-10T08:00:00Z'
) on conflict do nothing;

-- Engr. Marco Santos (supervisor) — legacy id: usr-supervisor-1
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values (
  'a564529f-1d75-aeec-1b99-a2391b321b90',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'marco.santos@asinta.ph',
  crypt('asinta2026', gen_salt('bf')),
  '2026-02-01T08:00:00Z',
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Engr. Marco Santos"}'::jsonb,
  '2026-02-01T08:00:00Z', '2026-02-01T08:00:00Z'
) on conflict do nothing;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
values (
  'a564529f-1d75-aeec-1b99-a2391b321b90', 'a564529f-1d75-aeec-1b99-a2391b321b90', 'a564529f-1d75-aeec-1b99-a2391b321b90', 'email',
  jsonb_build_object('sub', 'a564529f-1d75-aeec-1b99-a2391b321b90', 'email', 'marco.santos@asinta.ph', 'email_verified', true),
  '2026-02-01T08:00:00Z', '2026-02-01T08:00:00Z', '2026-02-01T08:00:00Z'
) on conflict do nothing;

-- Carlos Reyes (supervisor) — legacy id: usr-supervisor-2
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values (
  '494fdb42-abc2-1f62-2745-0f60da3bc00e',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'carlos.reyes@asinta.ph',
  crypt('asinta2026', gen_salt('bf')),
  '2026-02-15T08:00:00Z',
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Carlos Reyes"}'::jsonb,
  '2026-02-15T08:00:00Z', '2026-02-15T08:00:00Z'
) on conflict do nothing;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
values (
  '494fdb42-abc2-1f62-2745-0f60da3bc00e', '494fdb42-abc2-1f62-2745-0f60da3bc00e', '494fdb42-abc2-1f62-2745-0f60da3bc00e', 'email',
  jsonb_build_object('sub', '494fdb42-abc2-1f62-2745-0f60da3bc00e', 'email', 'carlos.reyes@asinta.ph', 'email_verified', true),
  '2026-02-15T08:00:00Z', '2026-02-15T08:00:00Z', '2026-02-15T08:00:00Z'
) on conflict do nothing;

-- ------------------------------------------------------------------
-- 2. BALE profiles (public.users) — role drives all RLS policies
-- ------------------------------------------------------------------

insert into public.users (id, name, email, role, created_at) values ('02f773a0-abec-4916-9858-e9e547782bc3', 'Ar. Junel Buyagon', 'junel@asinta.ph', 'founder', '2026-01-10T08:00:00Z') on conflict (id) do nothing; -- usr-founder-1
insert into public.users (id, name, email, role, created_at) values ('b5117c39-e80b-cded-2c90-510de7ce7512', 'Ar. Rei Viviene Buyagon', 'rei@asinta.ph', 'founder', '2026-01-10T08:00:00Z') on conflict (id) do nothing; -- usr-founder-2
insert into public.users (id, name, email, role, created_at) values ('a564529f-1d75-aeec-1b99-a2391b321b90', 'Engr. Marco Santos', 'marco.santos@asinta.ph', 'supervisor', '2026-02-01T08:00:00Z') on conflict (id) do nothing; -- usr-supervisor-1
insert into public.users (id, name, email, role, created_at) values ('494fdb42-abc2-1f62-2745-0f60da3bc00e', 'Carlos Reyes', 'carlos.reyes@asinta.ph', 'supervisor', '2026-02-15T08:00:00Z') on conflict (id) do nothing; -- usr-supervisor-2

-- ------------------------------------------------------------------
-- 3. Clients
-- ------------------------------------------------------------------
insert into public.clients (id, name, contact_person, phone, email, address, created_at)
values
  ('4f253f4e-bfab-8f08-4e4d-c7a98995e3d8', 'Dr. Eduardo & Maria Laurel', 'Dr. Eduardo Laurel', '+63 917 842 1190', 'eduardo.laurel@medbatangas.ph', 'Ayala Greenfield Estates, Calamba / Batangas Border', '2026-01-15T09:00:00Z'),
  ('781eaf58-2ac6-d504-bd47-a4b10cab1268', 'Aurelia Lifestyle Resorts Corp', 'Bianca Montelibano (VP Dev)', '+63 918 554 9021', 'bmontelibano@aureliagroup.ph', 'Brgy. Wawa, Nasugbu, Batangas', '2026-02-01T10:30:00Z'),
  ('78faed80-651d-d3bf-bcad-6bdb60527892', 'Mr. Vicente Tan & Family', 'Vicente Tan', '+63 920 913 4482', 'vicente.tan@tanholding.com', 'Summit Point Golf & Residential Estate, Lipa City, Batangas', '2026-02-20T11:00:00Z'),
  ('20b9452b-5231-087b-7bf1-ae41f6c79c24', 'Vanguard Agri-Logistics Hub', 'Engr. Rafael Dimayuga', '+63 917 339 8812', 'rdimayuga@vanguardhub.com', 'STAR Tollway Corridor, Tanauan City, Batangas', '2026-03-01T14:00:00Z')
on conflict do nothing;

-- ------------------------------------------------------------------
-- 4. Projects
-- ------------------------------------------------------------------
insert into public.projects (id, name, client_id, location, budget_estimate, status, start_date, target_completion_date, created_at)
values
  ('f337de46-faf2-4ed7-92f5-559417285970', 'Casa Batangas Modern Pavilion', '4f253f4e-bfab-8f08-4e4d-c7a98995e3d8', 'Ayala Greenfield, Sto. Tomas, Batangas', 8450000, 'active', '2026-02-01', '2026-11-30', '2026-01-20T10:00:00Z'),
  ('c9e48d2c-962b-5088-0119-2177bcbee57b', 'Nasugbu Coastal Cliff Residence', '781eaf58-2ac6-d504-bd47-a4b10cab1268', 'Punta Fuego Road, Nasugbu, Batangas', 14200000, 'active', '2026-03-01', '2027-02-28', '2026-02-10T11:00:00Z'),
  ('09d48e01-1e9f-aa8e-91e9-67ff7708cbf1', 'Lipa Modern Zen Villa & Studio', '78faed80-651d-d3bf-bcad-6bdb60527892', 'Summit Point, Lipa City, Batangas', 6800000, 'active', '2026-04-15', '2026-12-15', '2026-03-05T08:30:00Z'),
  ('86e5045e-864d-62b9-b74b-b50b06d055f4', 'Tanauan Commercial & Showroom', '20b9452b-5231-087b-7bf1-ae41f6c79c24', 'J.P. Laurel Highway, Tanauan City, Batangas', 11500000, 'planning', '2026-10-01', '2027-06-30', '2026-04-01T09:00:00Z')
on conflict do nothing;

-- ------------------------------------------------------------------
-- 5. Workers
-- ------------------------------------------------------------------
insert into public.workers (id, name, contact_number, position, pay_rate, pay_rate_type, active, created_at)
values
  ('9af0a8d4-e790-3cc9-a1eb-2799cc8ce733', 'Danilo Magpantay', '+63 916 112 4433', 'Lead Master Carpenter', 950, 'daily', true, '2026-01-15T08:00:00Z'),
  ('02be5394-7982-5806-3601-a35947502655', 'Renato Castillo', '+63 927 334 8811', 'Senior Mason & Plasterer', 850, 'daily', true, '2026-01-15T08:00:00Z'),
  ('0ff9addd-72b4-3cdc-6c19-f47fb8611a6c', 'Elmer Macatangay', '+63 945 889 0021', 'Master Electrician (PECE Certified)', 900, 'daily', true, '2026-01-20T08:00:00Z'),
  ('7deb1f59-518d-c0f4-ccaa-5192515d2a36', 'Nestor Dimaculangan', '+63 915 677 3344', 'Structural Steelman / Welder', 800, 'daily', true, '2026-02-01T08:00:00Z'),
  ('b08602d2-0238-7012-f3cf-50a34e362566', 'Rommel Gutierrez', '+63 933 221 7788', 'Architectural Finisher / Painter', 750, 'daily', true, '2026-02-05T08:00:00Z'),
  ('e4c6cc24-c274-0c4f-7dd3-0dcd02ec3d3c', 'Jomar Balbastro', '+63 908 445 6677', 'Skilled Construction Helper', 600, 'daily', true, '2026-02-10T08:00:00Z'),
  ('4832550f-10f6-129d-0e4d-3c32ef76c6b8', 'Arnel De Chavez', '+63 919 778 1122', 'Skilled Construction Helper', 600, 'daily', true, '2026-02-10T08:00:00Z')
on conflict do nothing;

-- ------------------------------------------------------------------
-- 6. Project ↔ Supervisor assignments
-- ------------------------------------------------------------------
insert into public.project_supervisors (id, project_id, supervisor_id, created_at)
values
  ('7496a174-f057-c39a-d28c-311ea4d4be0d', 'f337de46-faf2-4ed7-92f5-559417285970', 'a564529f-1d75-aeec-1b99-a2391b321b90', '2026-02-01T08:00:00Z'),
  ('4e99f6cf-d18d-7dd3-2468-30f4b1972c5c', 'c9e48d2c-962b-5088-0119-2177bcbee57b', 'a564529f-1d75-aeec-1b99-a2391b321b90', '2026-03-01T08:00:00Z'),
  ('58fbf9be-67e5-5bb3-eb47-59860e56bb38', '09d48e01-1e9f-aa8e-91e9-67ff7708cbf1', '494fdb42-abc2-1f62-2745-0f60da3bc00e', '2026-04-15T08:00:00Z')
on conflict do nothing;

-- ------------------------------------------------------------------
-- 7. Invoices
-- ------------------------------------------------------------------
insert into public.invoices (id, project_id, client_id, invoice_number, amount, amount_paid, issue_date, due_date, status, notes, created_at)
values
  ('04a12fe6-4231-77a6-7098-91c046fe8aed', 'f337de46-faf2-4ed7-92f5-559417285970', '4f253f4e-bfab-8f08-4e4d-c7a98995e3d8', 'ASINTA-2026-001', 1690000, 1690000, '2026-02-05', '2026-02-20', 'paid', '20% Mobilization and Structural Foundation Milestone', '2026-02-05T10:00:00Z'),
  ('4c414013-24e5-0db0-997e-0557392f5182', 'f337de46-faf2-4ed7-92f5-559417285970', '4f253f4e-bfab-8f08-4e4d-c7a98995e3d8', 'ASINTA-2026-004', 2112500, 1500000, '2026-08-15', '2026-09-01', 'overdue', '25% 2nd Floor Slab & Structural Framing Progress Billing', '2026-08-15T09:00:00Z'),
  ('9c400d0c-d69c-5eb7-e872-75e3f69566eb', 'c9e48d2c-962b-5088-0119-2177bcbee57b', '781eaf58-2ac6-d504-bd47-a4b10cab1268', 'ASINTA-2026-002', 2840000, 2840000, '2026-03-05', '2026-03-20', 'paid', 'Mobilization & Retaining Wall Engineering Phase 1', '2026-03-05T11:00:00Z'),
  ('4319af1c-5118-6c44-857b-5e6a996b43bf', 'c9e48d2c-962b-5088-0119-2177bcbee57b', '781eaf58-2ac6-d504-bd47-a4b10cab1268', 'ASINTA-2026-005', 3550000, 0, '2026-09-01', '2026-09-15', 'pending', 'Cantilevered Deck & Ground Floor Concrete Shell milestone', '2026-09-01T08:30:00Z'),
  ('b6e738fc-7bea-23d9-21ef-7cb7cc053a1b', '09d48e01-1e9f-aa8e-91e9-67ff7708cbf1', '78faed80-651d-d3bf-bcad-6bdb60527892', 'ASINTA-2026-003', 1360000, 1360000, '2026-04-20', '2026-05-05', 'paid', 'Architectural Working Drawings & Site Earthworks', '2026-04-20T14:00:00Z'),
  ('34a637fd-db0e-fa2f-8de4-bfe8315ce238', '09d48e01-1e9f-aa8e-91e9-67ff7708cbf1', '78faed80-651d-d3bf-bcad-6bdb60527892', 'ASINTA-2026-006', 1700000, 0, '2026-09-10', '2026-09-25', 'pending', 'Superstructure & Roof Truss Installation', '2026-09-10T10:00:00Z')
on conflict do nothing;

-- ------------------------------------------------------------------
-- 8. Expenses
-- ------------------------------------------------------------------
insert into public.expenses (id, project_id, description, category, amount, expense_date, receipt_url, notes, ai_category_suggestion, ai_bale_detection, ai_approval_suggestion, ai_confirmed, created_by, created_at)
values
  ('34a8d937-e2b0-6fc0-a55a-d580a82f8c40', 'f337de46-faf2-4ed7-92f5-559417285970', 'Ready-mix concrete Class A (3000 PSI) 24 cu.m for 2nd slab', 'materials', 144000, '2026-08-28', 'https://images.unsplash.com/photo-1541888946425-d0fbb180c5f5?w=600&auto=format&fit=crop&q=80', 'Delivered by Batangas Concrete Solutions Inc. (OR #98122)', 'materials', false, 'Auto-verified with Supplier PO #049', true, '02f773a0-abec-4916-9858-e9e547782bc3', '2026-08-28T14:20:00Z'),
  ('3d75fe68-55fa-b52d-1b2a-e7c302ce4b9f', 'f337de46-faf2-4ed7-92f5-559417285970', 'Deformed Steel Bars 16mm & 12mm Grade 40 (200 pcs)', 'materials', 88500, '2026-09-02', 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80', 'Purchased from Calamba Steel Supply Hub (Invoice #3341)', 'materials', false, 'Standard construction material receipt', true, '02f773a0-abec-4916-9858-e9e547782bc3', '2026-09-02T11:15:00Z'),
  ('0f6e0f9e-a7b3-dce1-10ec-9f7dc5cc59ae', 'f337de46-faf2-4ed7-92f5-559417285970', 'Weekly Skilled Labor Crew Payroll (Aug 24 - Aug 29)', 'labor', 38200, '2026-08-30', null, 'Paid via cash payroll envelope with signed vouchers', 'labor', false, 'Direct labor disbursement verified', true, 'b5117c39-e80b-cded-2c90-510de7ce7512', '2026-08-30T16:00:00Z'),
  ('bdfb4be8-d16d-9020-2e2e-909a6650348e', 'c9e48d2c-962b-5088-0119-2177bcbee57b', 'Boom Truck Crane rental (3 days) for cliffside steel placement', 'equipment', 45000, '2026-09-05', 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=600&auto=format&fit=crop&q=80', 'Heavy Equipment Rental Services - Batangas Port', 'equipment', false, 'Equipment rental verified against schedule', true, '02f773a0-abec-4916-9858-e9e547782bc3', '2026-09-05T13:45:00Z'),
  ('393c2372-fa05-3247-dda2-204a68bb4ba4', '09d48e01-1e9f-aa8e-91e9-67ff7708cbf1', 'Advance cash for Danilo Magpantay (Emergency family medical)', 'labor', 3000, '2026-09-08', null, 'Handed at site. Deductible ₱1,500 across next 2 weekly payrolls.', 'labor', true, 'Worker Advance (Bale) detected. Flag for Bale Ledger deduction.', true, '02f773a0-abec-4916-9858-e9e547782bc3', '2026-09-08T09:30:00Z'),
  ('fdba091b-c16c-0e42-7ccf-38096e0a48d1', 'c9e48d2c-962b-5088-0119-2177bcbee57b', 'Nasugbu LGU Building Permit Modification & Environmental clearance', 'permits', 18500, '2026-08-18', null, 'Official Receipt from Municipal Treasurer Office', 'permits', false, 'Statutory government fee', true, 'b5117c39-e80b-cded-2c90-510de7ce7512', '2026-08-18T10:00:00Z')
on conflict do nothing;

-- ------------------------------------------------------------------
-- 9. Advances (Bale ledger)
-- ------------------------------------------------------------------
insert into public.advances (id, worker_id, project_id, amount, amount_deducted, reason, date, status, created_at)
values
  ('7afe77fb-256d-7286-d604-5e94fa762739', '9af0a8d4-e790-3cc9-a1eb-2799cc8ce733', 'f337de46-faf2-4ed7-92f5-559417285970', 3000, 1500, 'Family medical expense / school tuition balance', '2026-09-01', 'partially_deducted', '2026-09-01T08:30:00Z'),
  ('e245a752-b9a6-b23b-abe9-4523c67fc30f', '02be5394-7982-5806-3601-a35947502655', 'f337de46-faf2-4ed7-92f5-559417285970', 2000, 0, 'Motorcycle repair for daily job site commute', '2026-09-09', 'active', '2026-09-09T07:45:00Z'),
  ('c70607cd-ade9-3f7d-1d38-88a648b1a63d', '7deb1f59-518d-c0f4-ccaa-5192515d2a36', 'c9e48d2c-962b-5088-0119-2177bcbee57b', 1500, 1500, 'Home roofing materials during storm', '2026-08-15', 'fully_deducted', '2026-08-15T09:00:00Z')
on conflict do nothing;

-- ------------------------------------------------------------------
-- 10. Attendance
-- ------------------------------------------------------------------
insert into public.attendance (id, worker_id, project_id, date, status, hours_worked, notes, recorded_by, is_founder_override, submitted_at, created_at)
values
  ('0c856168-3afb-f375-6506-c6019c145375', '9af0a8d4-e790-3cc9-a1eb-2799cc8ce733', 'f337de46-faf2-4ed7-92f5-559417285970', '2026-09-13', 'present', 8, 'Leading formwork installation on upper balcony', 'a564529f-1d75-aeec-1b99-a2391b321b90', false, '2026-09-13T08:05:00Z', '2026-09-13T08:05:00Z'),
  ('0ca99d27-979b-64fa-aa4f-13478be7a96e', '02be5394-7982-5806-3601-a35947502655', 'f337de46-faf2-4ed7-92f5-559417285970', '2026-09-13', 'present', 8, 'Plastering exterior firewall section C', 'a564529f-1d75-aeec-1b99-a2391b321b90', false, '2026-09-13T08:05:00Z', '2026-09-13T08:05:00Z'),
  ('0388376d-e3bd-ff67-0512-23f82e84e4a2', '0ff9addd-72b4-3cdc-6c19-f47fb8611a6c', 'f337de46-faf2-4ed7-92f5-559417285970', '2026-09-13', 'half_day', 4, 'Conduit roughing; left at noon for permit seminar', 'a564529f-1d75-aeec-1b99-a2391b321b90', false, '2026-09-13T08:05:00Z', '2026-09-13T08:05:00Z'),
  ('405bbb26-195d-cb00-4103-1f0eeea6b27f', 'e4c6cc24-c274-0c4f-7dd3-0dcd02ec3d3c', 'f337de46-faf2-4ed7-92f5-559417285970', '2026-09-13', 'present', 8, 'Site hauling and cement mixing assistance', 'a564529f-1d75-aeec-1b99-a2391b321b90', false, '2026-09-13T08:05:00Z', '2026-09-13T08:05:00Z'),
  ('7e5155fa-ee61-6772-35ee-0fc5ea235c1e', '9af0a8d4-e790-3cc9-a1eb-2799cc8ce733', 'f337de46-faf2-4ed7-92f5-559417285970', '2026-09-12', 'present', 8, null, 'a564529f-1d75-aeec-1b99-a2391b321b90', false, '2026-09-12T17:00:00Z', '2026-09-12T17:00:00Z'),
  ('5bcfdc6a-727d-8364-911b-b066d74ee8b7', '02be5394-7982-5806-3601-a35947502655', 'f337de46-faf2-4ed7-92f5-559417285970', '2026-09-12', 'present', 8, null, 'a564529f-1d75-aeec-1b99-a2391b321b90', false, '2026-09-12T17:00:00Z', '2026-09-12T17:00:00Z'),
  ('bbe67ab4-dc54-5bdb-8e57-5224c5d98707', '0ff9addd-72b4-3cdc-6c19-f47fb8611a6c', 'f337de46-faf2-4ed7-92f5-559417285970', '2026-09-12', 'present', 8, null, 'a564529f-1d75-aeec-1b99-a2391b321b90', false, '2026-09-12T17:00:00Z', '2026-09-12T17:00:00Z'),
  ('06b07ec5-0dbc-4db3-108c-45ab2004c022', '7deb1f59-518d-c0f4-ccaa-5192515d2a36', 'c9e48d2c-962b-5088-0119-2177bcbee57b', '2026-09-13', 'present', 8, 'Welding cantilever deck support brackets', 'a564529f-1d75-aeec-1b99-a2391b321b90', false, '2026-09-13T08:15:00Z', '2026-09-13T08:15:00Z'),
  ('d7e51360-3ee4-a4e9-4a2d-2a21b44ca2d0', 'b08602d2-0238-7012-f3cf-50a34e362566', 'c9e48d2c-962b-5088-0119-2177bcbee57b', '2026-09-13', 'leave', 0, 'Approved sick leave (Barangay health clearance submitted)', 'a564529f-1d75-aeec-1b99-a2391b321b90', true, '2026-09-13T08:15:00Z', '2026-09-13T08:15:00Z'),
  ('d1784947-7535-1b56-1542-9584ea20cfc0', '4832550f-10f6-129d-0e4d-3c32ef76c6b8', 'c9e48d2c-962b-5088-0119-2177bcbee57b', '2026-09-13', 'present', 8, 'Material handling and site cleanup', 'a564529f-1d75-aeec-1b99-a2391b321b90', false, '2026-09-13T08:15:00Z', '2026-09-13T08:15:00Z')
on conflict do nothing;

-- ------------------------------------------------------------------
-- 11. Payroll
-- ------------------------------------------------------------------
insert into public.payroll (id, worker_id, period_start, period_end, gross_pay, bale_deduction, other_deductions, net_pay, status, days_worked, hours_worked, notes, created_at)
values
  ('21791ef4-dd52-b1fa-98f2-a956bcbffe83', '9af0a8d4-e790-3cc9-a1eb-2799cc8ce733', '2026-09-01', '2026-09-07', 5700, 1500, 0, 4200, 'paid', 6, 48, 'Week 36 - Formwork installation milestone', '2026-09-07T18:00:00Z'),
  ('5ce4bbb4-c3bf-3af1-d268-6c6e1792fecd', '02be5394-7982-5806-3601-a35947502655', '2026-09-01', '2026-09-07', 5100, 0, 0, 5100, 'paid', 6, 48, 'Week 36 - Masonry framing', '2026-09-07T18:00:00Z'),
  ('ec48593d-6940-78cb-609b-18169434def3', '0ff9addd-72b4-3cdc-6c19-f47fb8611a6c', '2026-09-01', '2026-09-07', 5400, 0, 0, 5400, 'paid', 6, 48, 'Week 36 - Electrical piping', '2026-09-07T18:00:00Z'),
  ('b373db2c-8200-ff5f-32d7-a59c30d5b49d', '9af0a8d4-e790-3cc9-a1eb-2799cc8ce733', '2026-09-08', '2026-09-14', 5700, 1500, 0, 4200, 'draft', 6, 48, 'Week 37 - Current period pending founder approval', '2026-09-13T09:00:00Z'),
  ('5e1dc025-479f-98df-561d-3e1a84724505', '02be5394-7982-5806-3601-a35947502655', '2026-09-08', '2026-09-14', 5100, 1000, 0, 4100, 'draft', 6, 48, 'Week 37 - Active bale deduction of ₱1,000 applied', '2026-09-13T09:00:00Z')
on conflict do nothing;

-- ------------------------------------------------------------------
-- 12. Tools
-- ------------------------------------------------------------------
insert into public.tools (id, name, quantity, condition, project_id, created_at)
values
  ('5c1ca1d3-839b-01f5-6a33-25d0ca3cfb50', 'Bosch Professional Rotary Hammer Drill SDS-Plus 800W', 2, 'excellent', 'f337de46-faf2-4ed7-92f5-559417285970', '2026-01-20T08:00:00Z'),
  ('00d2fbd6-dd4e-fed7-ada7-931f6b508f7a', 'Makita 18V Cordless Circular Saw & Guide Rail Kit', 3, 'good', 'f337de46-faf2-4ed7-92f5-559417285970', '2026-01-20T08:00:00Z'),
  ('21c0f9fc-84d2-db29-ac36-4dc753629075', 'Heavy Duty 1-Bagger Portable Concrete Mixer 6HP Engine', 1, 'good', 'f337de46-faf2-4ed7-92f5-559417285970', '2026-02-01T08:00:00Z'),
  ('6fd88fab-ed33-eff7-477c-65c7a7c9ebbe', 'Leica Disto D2 Laser Distance Meter & Digital Theodolite', 1, 'excellent', 'c9e48d2c-962b-5088-0119-2177bcbee57b', '2026-02-15T08:00:00Z'),
  ('4bf5b454-ea11-8018-647e-f73ab495c352', 'Yamato Inverter Arc Welder 300A with auto-darkening mask', 2, 'good', 'c9e48d2c-962b-5088-0119-2177bcbee57b', '2026-03-01T08:00:00Z'),
  ('051877fd-1be6-6271-d647-791768b32ab1', 'Total Station Optical Level & Aluminum Tripod', 1, 'fair', '09d48e01-1e9f-aa8e-91e9-67ff7708cbf1', '2026-03-10T08:00:00Z'),
  ('71c65bf8-9f0f-8376-a381-9108ee653836', 'Stihl TS 420 Concrete Cut-off Machine 14-inch', 1, 'needs_repair', null, '2026-03-20T08:00:00Z')
on conflict do nothing;

-- ------------------------------------------------------------------
-- 13. SMS logs
-- ------------------------------------------------------------------
insert into public.sms_logs (id, invoice_id, recipient, phone, message, status, sent_at)
values
  ('4c83ef72-96fc-2b5a-df10-0309159e79c1', '4c414013-24e5-0db0-997e-0557392f5182', 'Dr. Eduardo Laurel', '+63 917 842 1190', 'Good day Dr. Laurel, this is Asinta Architects. A gentle reminder regarding progress invoice ASINTA-2026-004 balance ₱612,500 due on Sep 1, 2026. Thank you for your continued partnership.', 'delivered', '2026-09-03T09:15:00Z'),
  ('47bc38b0-d5e9-581f-f22a-015beb4b66b6', '4319af1c-5118-6c44-857b-5e6a996b43bf', 'Bianca Montelibano (Aurelia)', '+63 918 554 9021', 'Greetings Ms. Bianca! Asinta Architects issued invoice ASINTA-2026-005 for ₱3,550,000 for the Nasugbu Residence Cantilever milestone, due on Sep 15, 2026.', 'delivered', '2026-09-02T10:00:00Z')
on conflict do nothing;
