-- BALE (Billing & Advance Ledger Engine)
-- Asinta Architects - Database Schema & Security Policies (Supabase PostgreSQL)

-- Enable UUID extension
-- UUID primary keys use gen_random_uuid(), built into PostgreSQL 13+
-- (and always available on Supabase) — no extension required.

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('founder', 'supervisor')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. WORKERS TABLE
CREATE TABLE IF NOT EXISTS public.workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    position TEXT NOT NULL,
    pay_rate NUMERIC(10, 2) NOT NULL CHECK (pay_rate >= 0),
    pay_rate_type TEXT NOT NULL CHECK (pay_rate_type IN ('daily', 'hourly')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    location TEXT NOT NULL,
    budget_estimate NUMERIC(14, 2) NOT NULL CHECK (budget_estimate >= 0),
    status TEXT NOT NULL CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
    start_date DATE NOT NULL,
    target_completion_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PROJECT_SUPERVISORS RELATIONSHIP TABLE
CREATE TABLE IF NOT EXISTS public.project_supervisors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    supervisor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, supervisor_id)
);

-- 6. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    invoice_number TEXT UNIQUE NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    amount_paid NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'pending', 'partially_paid', 'paid', 'overdue', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('materials', 'labor', 'equipment', 'permits', 'transportation', 'other')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL,
    receipt_url TEXT,
    notes TEXT,
    ai_category_suggestion TEXT,
    ai_bale_detection BOOLEAN DEFAULT FALSE,
    ai_approval_suggestion TEXT,
    ai_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. ADVANCES (BALE) TABLE
CREATE TABLE IF NOT EXISTS public.advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    amount_deducted NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (amount_deducted >= 0),
    reason TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'partially_deducted', 'fully_deducted', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'half_day', 'leave')),
    hours_worked NUMERIC(4, 2) NOT NULL DEFAULT 8.0 CHECK (hours_worked >= 0 AND hours_worked <= 24),
    notes TEXT,
    recorded_by UUID REFERENCES public.users(id),
    is_founder_override BOOLEAN NOT NULL DEFAULT FALSE,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(worker_id, project_id, date)
);

-- 10. PAYROLL TABLE
CREATE TABLE IF NOT EXISTS public.payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE RESTRICT,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    gross_pay NUMERIC(10, 2) NOT NULL CHECK (gross_pay >= 0),
    bale_deduction NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (bale_deduction >= 0),
    other_deductions NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (other_deductions >= 0),
    net_pay NUMERIC(10, 2) NOT NULL CHECK (net_pay >= 0),
    status TEXT NOT NULL CHECK (status IN ('draft', 'reviewed', 'approved', 'paid')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. TOOLS TABLE
CREATE TABLE IF NOT EXISTS public.tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    condition TEXT NOT NULL CHECK (condition IN ('excellent', 'good', 'fair', 'needs_repair', 'damaged')),
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. SMS LOGS TABLE
CREATE TABLE IF NOT EXISTS public.sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    recipient TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('delivered', 'sent', 'pending', 'failed')),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON public.expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_advances_worker_id ON public.advances(worker_id);
CREATE INDEX IF NOT EXISTS idx_attendance_project_date ON public.attendance(project_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_worker_date ON public.attendance(worker_id, date);
CREATE INDEX IF NOT EXISTS idx_project_supervisors_sup ON public.project_supervisors(supervisor_id);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- HELPER FUNCTIONS FOR RLS
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_founder()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'founder'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_supervisor_assigned(proj_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_supervisors
    WHERE supervisor_id = auth.uid() AND project_id = proj_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS POLICIES

-- 1. Users policies
CREATE POLICY "Founders have full access to users" ON public.users
  FOR ALL USING (public.is_founder());
CREATE POLICY "Supervisors can read their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- 2. Projects policies
CREATE POLICY "Founders have full access to projects" ON public.projects
  FOR ALL USING (public.is_founder());
CREATE POLICY "Supervisors can view assigned projects only" ON public.projects
  FOR SELECT USING (public.is_supervisor_assigned(id));

-- 3. Project Supervisors policies
CREATE POLICY "Founders manage project supervisor assignments" ON public.project_supervisors
  FOR ALL USING (public.is_founder());
CREATE POLICY "Supervisors can view their own project assignments" ON public.project_supervisors
  FOR SELECT USING (supervisor_id = auth.uid());

-- 4. Invoices policies (Founder ONLY)
CREATE POLICY "Founders full access to invoices" ON public.invoices
  FOR ALL USING (public.is_founder());

-- 5. Clients policies (Founder ONLY)
CREATE POLICY "Founders full access to clients" ON public.clients
  FOR ALL USING (public.is_founder());

-- 6. Expenses policies (Founder ONLY)
CREATE POLICY "Founders full access to expenses" ON public.expenses
  FOR ALL USING (public.is_founder());

-- 7. Advances (Bale) policies (Founder ONLY)
CREATE POLICY "Founders full access to advances" ON public.advances
  FOR ALL USING (public.is_founder());

-- 8. Workers policies
CREATE POLICY "Founders full access to workers" ON public.workers
  FOR ALL USING (public.is_founder());
CREATE POLICY "Supervisors can view active workers" ON public.workers
  FOR SELECT USING (auth.uid() IS NOT NULL AND active = TRUE);

-- 9. Attendance policies
CREATE POLICY "Founders full access to attendance" ON public.attendance
  FOR ALL USING (public.is_founder());
CREATE POLICY "Supervisors can read attendance for assigned projects" ON public.attendance
  FOR SELECT USING (public.is_supervisor_assigned(project_id));
CREATE POLICY "Supervisors can insert attendance for assigned projects" ON public.attendance
  FOR INSERT WITH CHECK (public.is_supervisor_assigned(project_id));
CREATE POLICY "Supervisors can update attendance for assigned projects" ON public.attendance
  FOR UPDATE USING (public.is_supervisor_assigned(project_id));

-- 10. Payroll policies (Founder ONLY)
CREATE POLICY "Founders full access to payroll" ON public.payroll
  FOR ALL USING (public.is_founder());

-- 11. Tools policies
CREATE POLICY "Founders full access to tools" ON public.tools
  FOR ALL USING (public.is_founder());
CREATE POLICY "Supervisors can view tools on assigned projects" ON public.tools
  FOR SELECT USING (project_id IS NOT NULL AND public.is_supervisor_assigned(project_id));

-- 12. SMS logs policies (Founder ONLY)
CREATE POLICY "Founders full access to sms_logs" ON public.sms_logs
  FOR ALL USING (public.is_founder());
