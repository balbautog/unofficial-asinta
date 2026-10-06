-- BALE (Billing & Advance Ledger Engine)
-- Communications feature set: email templates, email logs, reminder
-- dispatches, invoice-level reminder settings, and honest SMS log fields.
--
-- This migration is ADDITIVE ONLY. It never modifies or weakens the policies
-- created by earlier migrations.

-- ---------------------------------------------------------------------------
-- 1. EMAIL TEMPLATES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_type TEXT UNIQUE NOT NULL CHECK (template_type IN (
      'initial_request',
      'upcoming_reminder',
      'due_today',
      'overdue',
      'payment_acknowledgment',
      'final_demand'
    )),
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_type ON public.email_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON public.email_templates(active);

-- ---------------------------------------------------------------------------
-- 2. EMAIL LOGS — immutable snapshots of every send attempt
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_text TEXT NOT NULL,
    body_html TEXT NOT NULL,
    template_type TEXT NOT NULL CHECK (template_type IN (
      'initial_request',
      'upcoming_reminder',
      'due_today',
      'overdue',
      'payment_acknowledgment',
      'final_demand'
    )),
    template_version INTEGER NOT NULL DEFAULT 1,
    -- 'accepted' means the SMTP server accepted the message. 'delivered' is
    -- reserved for explicit provider delivery confirmations only.
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'failed', 'delivered', 'bounced')),
    provider_message_id TEXT,
    error_message TEXT,
    sent_by UUID REFERENCES public.users(id),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    idempotency_key TEXT UNIQUE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_logs_invoice_id ON public.email_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_template_type ON public.email_logs(template_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_logs_idempotency_key ON public.email_logs(idempotency_key);

-- ---------------------------------------------------------------------------
-- 3. REMINDER DISPATCHES — idempotency ledger for scheduled reminders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reminder_dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    channel TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('upcoming', 'due_today', 'overdue', 'follow_up')),
    scheduled_date DATE NOT NULL,
    idempotency_key TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
    provider_message_id TEXT,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminder_dispatches_invoice_id ON public.reminder_dispatches(invoice_id);
CREATE INDEX IF NOT EXISTS idx_reminder_dispatches_status ON public.reminder_dispatches(status);
CREATE INDEX IF NOT EXISTS idx_reminder_dispatches_scheduled ON public.reminder_dispatches(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_reminder_dispatches_created ON public.reminder_dispatches(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reminder_dispatches_idem ON public.reminder_dispatches(idempotency_key);

-- ---------------------------------------------------------------------------
-- 4. INVOICE-LEVEL REMINDER SETTINGS (defaults are OFF)
-- ---------------------------------------------------------------------------
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS automatic_reminders_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminders_paused_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_invoices_auto_reminders ON public.invoices(automatic_reminders_enabled);

-- ---------------------------------------------------------------------------
-- 5. HONEST SMS LOG FIELDS (additive — historical rows keep working)
-- ---------------------------------------------------------------------------
ALTER TABLE public.sms_logs
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS simulated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS provider_status TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sms_logs_invoice_id ON public.sms_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON public.sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_at ON public.sms_logs(sent_at);

-- ---------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY — Founder-only billing communications.
--    Supervisors have NO access. The service-role key (used only by the
--    server-side cron route) bypasses RLS by design and never reaches the
--    browser.
-- ---------------------------------------------------------------------------
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_dispatches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders full access to email_templates" ON public.email_templates;
CREATE POLICY "Founders full access to email_templates" ON public.email_templates
  FOR ALL TO authenticated USING (public.is_founder());

DROP POLICY IF EXISTS "Founders full access to email_logs" ON public.email_logs;
CREATE POLICY "Founders full access to email_logs" ON public.email_logs
  FOR ALL TO authenticated USING (public.is_founder());

DROP POLICY IF EXISTS "Founders full access to reminder_dispatches" ON public.reminder_dispatches;
CREATE POLICY "Founders full access to reminder_dispatches" ON public.reminder_dispatches
  FOR ALL TO authenticated USING (public.is_founder());

-- ---------------------------------------------------------------------------
-- 7. SEED THE DEFAULT "INITIAL REQUEST FOR PAYMENT" TEMPLATE (idempotent)
-- ---------------------------------------------------------------------------
INSERT INTO public.email_templates (template_type, subject_template, body_template, version, active)
VALUES (
  'initial_request',
  'Request for Payment – {{project_name}} – {{invoice_number}}',
  E'Dear {{client_contact_name}},\n\nGood day.\n\nPlease find below the Request for Payment from Asinta Architects for the project {{project_name}}.\n\nInvoice Number: {{invoice_number}}\nInvoice Date: {{issue_date}}\nTotal Invoice Amount: {{invoice_amount}}\nPayments Received: {{amount_paid}}\nOutstanding Balance: {{outstanding_balance}}\nPayment Due Date: {{due_date}}\n\n{{invoice_notes}}\n\nWe kindly request that payment be settled on or before the stated due date. If payment has already been made, please disregard this request and send us the payment confirmation for proper recording.\n\nFor questions or clarifications regarding this billing, you may reply to this email or contact Asinta Architects directly.\n\nThank you for your continued trust and support.\n\nGod bless.\n\nSincerely,\n\nAsinta Architects\n{{firm_email}}\n{{firm_contact_number}}\n\nThis email was generated through the BALE management system.',
  1,
  TRUE
)
ON CONFLICT (template_type) DO NOTHING;
