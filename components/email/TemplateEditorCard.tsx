'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, FileText, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { useDataStore } from '@/lib/data/store';
import { useToast } from '@/components/ui/Toast';

interface TemplateResponse {
  template: {
    template_type: string;
    subject_template: string;
    body_template: string;
    version: number;
  };
  defaults: { subject_template: string; body_template: string };
  supportedPlaceholders: string[];
  importantPlaceholders: string[];
  isSystemDefault: boolean;
}

interface PreviewState {
  subject: string;
  bodyText: string;
  bodyHtml: string;
  warnings: string[];
  sample: boolean;
}

/**
 * Founder-only editor for the Initial Request for Payment email template.
 * Templates are safe text with {{placeholders}} — never raw executable HTML.
 * Every save creates a new version; historical email snapshots never change.
 */
export const TemplateEditorCard: React.FC = () => {
  const { invoices, clients } = useDataStore();
  const { showToast } = useToast();

  const [data, setData] = useState<TemplateResponse | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewTab, setPreviewTab] = useState<'html' | 'text'>('html');
  const [previewInvoiceId, setPreviewInvoiceId] = useState('');
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const loadTemplate = useCallback(async () => {
    try {
      const res = await fetch('/api/email/templates?type=initial_request', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setError(payload?.error || 'Failed to load the email template');
        return;
      }
      setData(payload as TemplateResponse);
      setSubject(payload.template.subject_template);
      setBody(payload.template.body_template);
    } catch {
      setError('Network error while loading the template');
    }
  }, []);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  const handlePreview = async () => {
    setIsPreviewing(true);
    setError(null);
    try {
      const res = await fetch('/api/email/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: previewInvoiceId || undefined,
          subjectTemplate: subject,
          bodyTemplate: body,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setError(payload?.error || 'Failed to render the preview');
        setPreview(null);
        return;
      }
      setPreview({
        subject: payload.subject,
        bodyText: payload.bodyText,
        bodyHtml: payload.bodyHtml,
        warnings: payload.warnings || [],
        sample: Boolean(payload.sample),
      });
      setWarnings(payload.warnings || []);
    } catch {
      setError('Network error while rendering the preview');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/email/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_type: 'initial_request',
          subject_template: subject,
          body_template: body,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setError(payload?.error || 'Failed to save the template');
        return;
      }
      setWarnings(payload.warnings || []);
      showToast('success', `Template saved as version ${payload.version}. Historical emails are unchanged.`);
      await loadTemplate();
    } catch {
      setError('Network error while saving the template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreDefault = async () => {
    setIsRestoring(true);
    setError(null);
    try {
      const res = await fetch('/api/email/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_type: 'initial_request', restore_default: true }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setError(payload?.error || 'Failed to restore the default template');
        return;
      }
      showToast('success', `System default restored as version ${payload.version}.`);
      setShowRestoreConfirm(false);
      await loadTemplate();
    } catch {
      setError('Network error while restoring the default');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <FileText className="w-5 h-5 text-navy" />
            <CardTitle>Email Templates — Request for Payment</CardTitle>
          </div>
          {data && (
            <Badge variant={data.isSystemDefault ? 'neutral' : 'navy'} size="sm">
              v{data.template.version} {data.isSystemDefault ? '(system default)' : '(customized)'}
            </Badge>
          )}
        </div>
        <CardDescription>
          Edit the Initial Request for Payment wording. Placeholders are replaced with authoritative
          invoice data when each email is sent. Saving creates a new version — previously sent
          emails keep their exact stored content.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        {!data && !error && <div className="text-ink-secondary p-2">Loading template…</div>}

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-status-danger flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {data && (
          <>
            <div className="p-3 rounded-xl bg-surface-inset/60 border border-surface-border">
              <div className="font-bold text-navy uppercase text-[11px] mb-2">Supported Placeholders</div>
              <div className="flex flex-wrap gap-1.5">
                {data.supportedPlaceholders.map((placeholder) => (
                  <span
                    key={placeholder}
                    className={`px-2 py-0.5 rounded-md font-mono text-[10px] border ${
                      data.importantPlaceholders.includes(placeholder)
                        ? 'bg-navy/5 border-navy/30 text-navy font-bold'
                        : 'bg-white border-surface-border text-ink-secondary'
                    }`}
                  >
                    {'{{'}{placeholder}{'}}'}
                  </span>
                ))}
              </div>
              <div className="text-[10px] text-ink-muted mt-2">
                Bold placeholders are important billing fields — removing them triggers a warning.
                Unknown placeholders are rejected.
              </div>
            </div>

            {warnings.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                Warning: important billing placeholders missing from the template:{' '}
                <span className="font-mono font-semibold">{warnings.join(', ')}</span>
              </div>
            )}

            <Input
              label="Subject Template"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <Textarea
              label="Body Template (plain text with placeholders)"
              rows={14}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="font-mono text-[11px]"
            />

            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1">
                <Select
                  label="Preview Data Source"
                  value={previewInvoiceId}
                  onChange={(e) => setPreviewInvoiceId(e.target.value)}
                >
                  <option value="">Safe sample data</option>
                  {invoices
                    .filter((inv) => inv.status !== 'cancelled')
                    .map((inv) => {
                      const client = clients.find((c) => c.id === inv.client_id);
                      return (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoice_number} — {client?.name || 'Unknown client'}
                        </option>
                      );
                    })}
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePreview}
                  isLoading={isPreviewing}
                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                >
                  Preview
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  isLoading={isSaving}
                  leftIcon={<Save className="w-3.5 h-3.5" />}
                >
                  Save New Version
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRestoreConfirm(true)}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  Restore Default
                </Button>
              </div>
            </div>

            {preview && (
              <div className="space-y-2 pt-2 border-t border-surface-border/60">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-navy uppercase text-[11px] tracking-wider">
                    Rendered Preview {preview.sample ? '(sample data)' : '(real invoice data)'}
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('html')}
                      className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        previewTab === 'html'
                          ? 'bg-navy text-white'
                          : 'bg-surface-inset text-ink-secondary hover:text-navy'
                      }`}
                    >
                      HTML
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('text')}
                      className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        previewTab === 'text'
                          ? 'bg-navy text-white'
                          : 'bg-surface-inset text-ink-secondary hover:text-navy'
                      }`}
                    >
                      Plain Text
                    </button>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-surface-border">
                  <span className="text-ink-secondary">Subject: </span>
                  <span className="font-semibold text-navy">{preview.subject}</span>
                </div>
                {previewTab === 'html' ? (
                  <iframe
                    title="Template HTML preview"
                    sandbox=""
                    srcDoc={preview.bodyHtml}
                    className="w-full h-72 rounded-xl border border-surface-border bg-white"
                  />
                ) : (
                  <pre className="w-full h-72 overflow-auto rounded-xl border border-surface-border bg-slate-50 p-4 text-[11px] leading-relaxed whitespace-pre-wrap font-mono text-ink-primary">
                    {preview.bodyText}
                  </pre>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* RESTORE DEFAULT CONFIRMATION */}
      <Modal
        isOpen={showRestoreConfirm}
        onClose={() => setShowRestoreConfirm(false)}
        title="Restore System Default Template?"
        description="Your customized wording will be replaced by the BALE system default."
      >
        <div className="space-y-4 text-xs">
          <p className="text-ink-secondary leading-relaxed">
            This saves the system default as a <span className="font-semibold text-navy">new
            version</span> of the Initial Request for Payment template. Emails that were already
            sent keep their exact stored content and are not affected.
          </p>
          <div className="flex justify-end space-x-2">
            <Button variant="secondary" size="sm" onClick={() => setShowRestoreConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleRestoreDefault}
              isLoading={isRestoring}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Yes, Restore Default
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
};
