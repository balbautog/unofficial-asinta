import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INITIAL_REQUEST_BODY,
  DEFAULT_INITIAL_REQUEST_SUBJECT,
  TemplateRenderError,
  extractPlaceholders,
  renderEmail,
  resolveClientGreetingName,
  validateTemplate,
  type TemplateInvoiceData,
} from '@/lib/email/templates';
import { escapeHtml, formatDatePH, formatPeso, isValidEmail } from '@/lib/email/format';

const DATA: TemplateInvoiceData = {
  clientContactPerson: 'Dr. Eduardo Laurel',
  clientCompanyName: 'Laurel Medical Group',
  projectName: 'Laurel Clinic Extension',
  invoiceNumber: 'ASINTA-2026-014',
  issueDate: '2026-01-05',
  invoiceAmount: 1500000,
  amountPaid: 500000,
  dueDate: '2026-01-20',
  invoiceNotes: '25% Structural Progress Billing',
  firmEmail: 'billing@asinta.ph',
  firmContactNumber: '+63 917 800 2026',
};

describe('placeholder replacement', () => {
  it('replaces every supported placeholder with authoritative values', () => {
    const rendered = renderEmail(DEFAULT_INITIAL_REQUEST_SUBJECT, DEFAULT_INITIAL_REQUEST_BODY, DATA);

    expect(rendered.subject).toBe('Request for Payment – Laurel Clinic Extension – ASINTA-2026-014');
    expect(rendered.bodyText).toContain('Dear Dr. Eduardo Laurel,');
    expect(rendered.bodyText).toContain('Invoice Number: ASINTA-2026-014');
    expect(rendered.bodyText).toContain('Total Invoice Amount: ₱1,500,000.00');
    expect(rendered.bodyText).toContain('Payments Received: ₱500,000.00');
    expect(rendered.bodyText).toContain('Outstanding Balance: ₱1,000,000.00');
    expect(rendered.bodyText).toContain('Payment Due Date: January 20, 2026');
    expect(rendered.bodyText).not.toContain('{{');
    expect(rendered.bodyHtml).not.toContain('{{');
  });

  it('rejects unknown placeholders', () => {
    expect(() =>
      renderEmail('Hello {{evil_placeholder}}', DEFAULT_INITIAL_REQUEST_BODY, DATA)
    ).toThrowError(TemplateRenderError);

    const validation = validateTemplate('Hi {{nope}}', 'Body {{project_name}} {{whatever}}');
    expect(validation.valid).toBe(false);
    expect(validation.unknownPlaceholders.sort()).toEqual(['nope', 'whatever']);
  });

  it('warns when important billing placeholders are removed', () => {
    const validation = validateTemplate('Just a subject', 'Dear {{client_contact_name}}, hello.');
    expect(validation.valid).toBe(true);
    expect(validation.missingImportantPlaceholders).toEqual([
      'project_name',
      'invoice_number',
      'outstanding_balance',
      'due_date',
    ]);
  });

  it('extracts placeholders with whitespace tolerance', () => {
    expect(extractPlaceholders('a {{ project_name }} b {{invoice_number}}')).toEqual([
      'project_name',
      'invoice_number',
    ]);
  });
});

describe('contact-name fallback', () => {
  it('prefers contact person, then company, then Valued Client', () => {
    expect(resolveClientGreetingName('Juan Cruz', 'Acme')).toBe('Juan Cruz');
    expect(resolveClientGreetingName('', 'Acme Corp')).toBe('Acme Corp');
    expect(resolveClientGreetingName(null, '   ')).toBe('Valued Client');
    expect(resolveClientGreetingName(undefined, undefined)).toBe('Valued Client');
  });

  it('renders the fallback greeting in the email', () => {
    const rendered = renderEmail(
      DEFAULT_INITIAL_REQUEST_SUBJECT,
      DEFAULT_INITIAL_REQUEST_BODY,
      { ...DATA, clientContactPerson: null, clientCompanyName: null }
    );
    expect(rendered.bodyText).toContain('Dear Valued Client,');
  });
});

describe('currency and date formatting', () => {
  it('formats Philippine Pesos with two decimals and separators', () => {
    expect(formatPeso(1250500.5)).toBe('₱1,250,500.50');
    expect(formatPeso(0)).toBe('₱0.00');
    expect(formatPeso(NaN)).toBe('₱0.00');
  });

  it('formats dates in a human-readable Philippine format', () => {
    expect(formatDatePH('2026-01-20')).toBe('January 20, 2026');
    expect(formatDatePH('')).toBe('');
    expect(formatDatePH('not-a-date')).toBe('');
  });
});

describe('HTML escaping and safety', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml(`<script>alert("x")</script>&'`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;'
    );
  });

  it('escapes database-derived content inside the generated HTML', () => {
    const rendered = renderEmail(DEFAULT_INITIAL_REQUEST_SUBJECT, DEFAULT_INITIAL_REQUEST_BODY, {
      ...DATA,
      projectName: '<img src=x onerror=alert(1)> Project',
      invoiceNotes: '<script>steal()</script> please pay',
    });
    expect(rendered.bodyHtml).not.toContain('<img src=x');
    expect(rendered.bodyHtml).not.toContain('<script>steal()');
    expect(rendered.bodyHtml).toContain('&lt;script&gt;steal()&lt;/script&gt;');
    // No event-handler attributes inside any real (unescaped) HTML tag.
    expect(rendered.bodyHtml).not.toMatch(/<[^>]*\son\w+=/i);
    expect(rendered.bodyHtml).not.toContain('<iframe');
  });

  it('contains branding, summary table, and emphasized balance/due date', () => {
    const rendered = renderEmail(DEFAULT_INITIAL_REQUEST_SUBJECT, DEFAULT_INITIAL_REQUEST_BODY, DATA);
    expect(rendered.bodyHtml).toContain('ASINTA ARCHITECTS');
    expect(rendered.bodyHtml).toContain('<table');
    expect(rendered.bodyHtml).toContain('Outstanding Balance');
    expect(rendered.bodyHtml).toContain('font-weight:700');
  });
});

describe('plain-text rendering', () => {
  it('never shows null/undefined for empty notes and collapses blank lines', () => {
    const rendered = renderEmail(DEFAULT_INITIAL_REQUEST_SUBJECT, DEFAULT_INITIAL_REQUEST_BODY, {
      ...DATA,
      invoiceNotes: null,
    });
    expect(rendered.bodyText).not.toContain('null');
    expect(rendered.bodyText).not.toContain('undefined');
    expect(rendered.bodyText).not.toMatch(/\n{3,}/);
  });
});

describe('email validation', () => {
  it('accepts valid addresses and rejects injection attempts', () => {
    expect(isValidEmail('client@example.com')).toBe(true);
    expect(isValidEmail('client+tag@sub.example.co')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('evil@example.com\r\nBcc: victim@example.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail(null)).toBe(false);
  });
});
