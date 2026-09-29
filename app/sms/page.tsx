'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useDataStore } from '@/lib/data/store';
import {
  Send,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';

export default function SMSPage() {
  const { smsLogs, invoices, clients, sendSMS } = useDataStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);

  // Compose State
  const [formData, setFormData] = useState({
    recipient: '',
    phone: '',
    message: '',
    invoice_id: '',
  });
  const [isSending, setIsSending] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  const filteredLogs = smsLogs.filter(
    (log) =>
      log.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.phone.includes(searchQuery)
  );

  const handleComposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.recipient || !formData.phone || !formData.message) return;

    setIsSending(true);
    const sent = await sendSMS(formData.recipient, formData.phone, formData.message, formData.invoice_id || undefined);
    setIsSending(false);
    if (!sent) return;
    setSuccessNotice(true);
    setTimeout(() => {
      setIsComposeModalOpen(false);
      setSuccessNotice(false);
      setFormData({ recipient: '', phone: '', message: '', invoice_id: '' });
    }, 1500);
  };

  const handleClientSelectInForm = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setFormData({
        ...formData,
        recipient: client.name,
        phone: client.phone,
      });
    }
  };

  return (
    <AppShell requireFounder={true}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-border/60">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-navy uppercase tracking-widest">
                Client Communication
              </span>
              <span className="text-xs text-ink-muted">·</span>
              <span className="text-xs text-ink-secondary">PhilSMS Telecommunications Gateway</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight mt-1">
              Payment Reminders & SMS Queue
            </h1>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsComposeModalOpen(true)}
            leftIcon={<Send className="w-4 h-4" />}
          >
            Compose SMS Notice
          </Button>
        </div>

        {/* SMS Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-3xl bg-white border border-surface-border shadow-sm">
            <div className="text-xs font-semibold text-ink-secondary uppercase">PhilSMS Gateway Status</div>
            <div className="text-xl font-bold text-emerald-800 mt-1 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected & Active
            </div>
            <div className="text-[11px] text-ink-muted mt-0.5">Sender ID: ASINTA</div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-surface-border shadow-sm">
            <div className="text-xs font-semibold text-ink-secondary uppercase">Total Dispatched</div>
            <div className="text-2xl font-bold text-navy mt-1">{smsLogs.length} Messages</div>
            <div className="text-[11px] text-ink-muted mt-0.5">Automated and manual alerts</div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-surface-border shadow-sm">
            <div className="text-xs font-semibold text-ink-secondary uppercase">Delivery Rate</div>
            <div className="text-2xl font-bold text-navy mt-1">100%</div>
            <div className="text-[11px] text-emerald-700 mt-0.5">Confirmed by telco networks</div>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-md">
          <Input
            placeholder="Search recipient, mobile number, or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Logs List */}
        <div className="bg-white rounded-3xl border border-surface-border shadow-[6px_6px_18px_rgba(11,31,58,0.06),-6px_-6px_18px_rgba(255,255,255,0.95)] overflow-hidden">
          <div className="p-4 border-b border-surface-border/60">
            <h3 className="font-bold text-navy text-sm">Dispatched SMS Transmission History</h3>
          </div>

          <div className="divide-y divide-surface-border/70">
            {filteredLogs.map((log) => {
              const inv = invoices.find((i) => i.id === log.invoice_id);

              return (
                <div
                  key={log.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-navy">{log.recipient}</span>
                      <span className="text-xs font-mono text-ink-secondary">{log.phone}</span>
                      <Badge variant="success" size="sm">
                        {log.status}
                      </Badge>
                    </div>

                    <p className="text-xs text-ink-primary bg-surface-inset/50 p-3 rounded-xl border border-surface-border/60 font-sans leading-relaxed">
                      &ldquo;{log.message}&rdquo;
                    </p>

                    {inv && (
                      <div className="text-[11px] text-ink-muted">
                        Associated Milestone: <span className="font-mono text-navy font-semibold">{inv.invoice_number}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-left sm:text-right text-xs text-ink-secondary shrink-0">
                    <div className="font-semibold text-navy">
                      {new Date(log.sent_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="text-[11px] text-ink-muted mt-0.5">
                      {new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredLogs.length === 0 && (
              <div className="p-12 text-center text-xs text-ink-secondary">
                No SMS transmission logs found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* COMPOSE SMS MODAL */}
      <Modal
        isOpen={isComposeModalOpen}
        onClose={() => setIsComposeModalOpen(false)}
        title="Compose SMS Notification"
        description="Transmit instant SMS message via PhilSMS Gateway (Sender ID: ASINTA)."
      >
        <form onSubmit={handleComposeSubmit} className="space-y-4 text-xs">
          {successNotice ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center font-bold flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>SMS Dispatched Successfully via PhilSMS!</span>
            </div>
          ) : (
            <>
              <Select
                label="Quick Select Client"
                onChange={(e) => handleClientSelectInForm(e.target.value)}
              >
                <option value="">Choose an existing client or enter manually...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </Select>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Recipient Name"
                  placeholder="e.g. Dr. Eduardo Laurel"
                  value={formData.recipient}
                  onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                  required
                />

                <Input
                  label="Mobile Number (Philippine +63)"
                  placeholder="+63 917 842 1190"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>

              <Textarea
                label="Message Content (Max 160 chars recommended)"
                rows={4}
                placeholder="Good day! This is Asinta Architects regarding progress invoice..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
              />

              <div className="pt-3 flex justify-end space-x-2">
                <Button variant="secondary" onClick={() => setIsComposeModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  isLoading={isSending}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Send via PhilSMS
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </AppShell>
  );
}
