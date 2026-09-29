'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useDataStore } from '@/lib/data/store';
import { useAuth } from '@/lib/auth/authContext';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import { Expense, ExpenseCategory } from '@/types';
import {
  CreditCard,
  Plus,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  FileText,
  DollarSign,
  Calendar,
  Layers,
  ArrowRight,
  Eye,
  Check,
  X,
  Bot,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { AICategorizationResult } from '@/lib/ai/groq';

export default function ExpensesPage() {
  const { isFounder, user } = useAuth();
  const {
    expenses,
    projects,
    createExpense,
    updateExpense,
    createAdvance,
    workers,
  } = useDataStore();
  const { showToast } = useToast();
  const supabase = createClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    project_id: '',
    description: '',
    amount: '',
    category: 'materials' as ExpenseCategory,
    expense_date: new Date().toISOString().split('T')[0],
    notes: '',
    receipt_url: '' as string | null,
  });

  // AI Assistant Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AICategorizationResult | null>(null);
  const [aiAccepted, setAiAccepted] = useState(false);

  // Receipt upload / submission state
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatPHP = (amount: number) =>
    `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const filteredExpenses = expenses.filter((exp) => {
    const proj = projects.find((p) => p.id === exp.project_id);
    const matchesSearch =
      exp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proj?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.notes && exp.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;
    const matchesProject = projectFilter === 'all' || exp.project_id === projectFilter;

    return matchesSearch && matchesCategory && matchesProject;
  });

  // AI Trigger
  const handleAnalyzeWithAI = async () => {
    if (!formData.description) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description,
          amount: parseFloat(formData.amount) || 0,
        }),
      });
      if (res.ok) {
        const data: AICategorizationResult = await res.json();
        setAiResult(data);
        setAiAccepted(false);
      } else {
        const body = await res.json().catch(() => null);
        showToast('error', body?.error || `AI categorization failed (HTTP ${res.status}).`);
      }
    } catch (e: any) {
      console.error('AI categorization error:', e);
      showToast('error', `AI categorization request failed: ${e?.message || 'network error'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAcceptAISuggestion = () => {
    if (!aiResult) return;
    setFormData({
      ...formData,
      category: aiResult.category,
      notes: formData.notes
        ? `${formData.notes} (AI: ${aiResult.reasoning})`
        : `AI Note: ${aiResult.reasoning}`,
    });
    setAiAccepted(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_id || !formData.description || !formData.amount) return;
    if (!user) {
      showToast('error', 'You must be signed in to record expenses.');
      return;
    }

    setIsSubmitting(true);
    const amountNum = parseFloat(formData.amount);

    const newExp = await createExpense({
      project_id: formData.project_id,
      description: formData.description,
      category: formData.category,
      amount: amountNum,
      expense_date: formData.expense_date,
      receipt_url: formData.receipt_url || null,
      notes: formData.notes || null,
      ai_category_suggestion: aiResult?.category || null,
      ai_bale_detection: aiResult?.isBale || false,
      ai_approval_suggestion: aiResult?.approvalRouting || null,
      ai_confirmed: true, // Founder explicitly confirmed by submitting
      created_by: user.id,
    });

    if (newExp) {
      // If Bale was detected & confirmed, automatically create a linked Bale entry in Advances ledger
      if (aiResult?.isBale) {
        // Find worker mentioned in description or default to first worker
        const lower = formData.description.toLowerCase();
        const matchedWorker = workers.find((w) => lower.includes(w.name.toLowerCase().split(' ')[0]));
        const targetWorkerId = matchedWorker ? matchedWorker.id : workers[0]?.id;

        if (targetWorkerId) {
          await createAdvance({
            worker_id: targetWorkerId,
            project_id: formData.project_id,
            amount: amountNum,
            reason: formData.description,
            date: formData.expense_date,
          });
        }
      }

      setIsAddModalOpen(false);
      setFormData({
        project_id: '',
        description: '',
        amount: '',
        category: 'materials',
        expense_date: new Date().toISOString().split('T')[0],
        notes: '',
        receipt_url: null,
      });
      setAiResult(null);
      setAiAccepted(false);
    }
    setIsSubmitting(false);
  };

  // Upload the receipt photo directly to the Supabase Storage `receipts`
  // bucket and persist its public URL on expenses.receipt_url.
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Receipt must be an image file (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Receipt photo must be smaller than 5MB.');
      return;
    }

    setIsUploadingReceipt(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user?.id || 'unattributed'}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('receipts').getPublicUrl(path);
      setFormData((prev) => ({ ...prev, receipt_url: data.publicUrl }));
      showToast('success', 'Receipt photo uploaded to Supabase Storage.');
    } catch (err: any) {
      console.error('Receipt upload failed:', err);
      showToast('error', `Receipt upload failed: ${err?.message || 'unknown storage error'}`);
    } finally {
      setIsUploadingReceipt(false);
      // Allow re-selecting the same file after a failure.
      e.target.value = '';
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
                Cost Control & AI Ledger
              </span>
              <span className="text-xs text-ink-muted">·</span>
              <span className="text-xs text-ink-secondary">Groq AI Assisted</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight mt-1">
              Project Expenses & Disbursements
            </h1>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Record Expense
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Search expense description, notes, supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />

          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { label: 'All Categories', value: 'all' },
              { label: 'Materials', value: 'materials' },
              { label: 'Labor', value: 'labor' },
              { label: 'Equipment', value: 'equipment' },
              { label: 'Permits', value: 'permits' },
              { label: 'Transportation', value: 'transportation' },
              { label: 'Other', value: 'other' },
            ]}
          />

          <Select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="all">All Project Sites</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Expenses List */}
        <div className="bg-white rounded-3xl border border-surface-border shadow-[6px_6px_18px_rgba(11,31,58,0.06),-6px_-6px_18px_rgba(255,255,255,0.95)] overflow-hidden">
          <div className="divide-y divide-surface-border/70">
            {filteredExpenses.map((exp) => {
              const proj = projects.find((p) => p.id === exp.project_id);

              return (
                <div
                  key={exp.id}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  {/* Left info */}
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-navy">{exp.description}</span>
                      <Badge variant="navy" size="sm" className="capitalize">
                        {exp.category}
                      </Badge>
                      {exp.ai_bale_detection && (
                        <Badge variant="warning" size="sm">
                          Worker Bale
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-ink-secondary">
                      Site: <span className="font-semibold text-navy">{proj?.name}</span> · Date: {exp.expense_date}
                    </div>

                    {exp.notes && (
                      <div className="text-xs text-ink-muted italic">{exp.notes}</div>
                    )}

                    {/* AI Verification Indicator */}
                    <div className="flex items-center space-x-2 pt-1 text-[11px] text-ink-secondary">
                      <span className="inline-flex items-center space-x-1 text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Founder Confirmed</span>
                      </span>
                      {exp.ai_approval_suggestion && (
                        <span className="text-ink-muted truncate">
                          · {exp.ai_approval_suggestion}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount & Receipt Preview */}
                  <div className="flex items-center justify-between lg:justify-end space-x-4">
                    <div className="text-left lg:text-right">
                      <div className="text-base font-extrabold text-navy">{formatPHP(exp.amount)}</div>
                      <div className="text-[11px] text-ink-secondary">Disbursed</div>
                    </div>

                    {exp.receipt_url ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedReceiptUrl(exp.receipt_url)}
                        leftIcon={<ImageIcon className="w-3.5 h-3.5 text-navy" />}
                      >
                        Receipt Photo
                      </Button>
                    ) : (
                      <span className="text-xs text-ink-muted italic px-2">No photo</span>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredExpenses.length === 0 && (
              <div className="p-12 text-center text-xs text-ink-secondary">
                No expense records found matching current criteria.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RECORD EXPENSE MODAL WITH GROQ AI ASSISTANT */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Site Expense & AI Categorization"
        description="Enter expense details. The Groq AI engine will analyze category and bale advance detection."
        maxWidth="lg"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
          <Select
            label="Associated Project Site"
            value={formData.project_id}
            onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
            required
          >
            <option value="">Select Project Site...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-navy uppercase tracking-wider">
                Expense Description
              </label>
              <button
                type="button"
                onClick={handleAnalyzeWithAI}
                disabled={!formData.description || isAnalyzing}
                className="text-[11px] text-navy font-bold hover:underline inline-flex items-center space-x-1"
              >
                <Sparkles className="w-3 h-3 text-navy" />
                <span>{isAnalyzing ? 'Analyzing with AI...' : 'Analyze with Groq AI'}</span>
              </button>
            </div>
            <Input
              placeholder="e.g. Advance cash ₱3,000 for Danilo Magpantay emergency medical"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              onBlur={handleAnalyzeWithAI}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (PHP ₱)"
              type="number"
              placeholder="5000"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />

            <Input
              label="Expense Date"
              type="date"
              value={formData.expense_date}
              onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
              required
            />
          </div>

          {/* GROQ AI SUGGESTION BOX */}
          {aiResult && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-sky-50/40 border border-sky-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-navy font-bold text-xs">
                  <Bot className="w-4 h-4 text-navy" />
                  <span>Groq AI Ledger Suggestions</span>
                </div>
                <Badge variant="navy" size="sm">
                  {Math.round(aiResult.confidence * 100)}% Confidence
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-ink-secondary">Suggested Category:</span>
                  <div className="font-bold text-navy uppercase">{aiResult.category}</div>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-ink-secondary">Possible Worker Bale:</span>
                  <div className={`font-bold ${aiResult.isBale ? 'text-amber-800' : 'text-emerald-800'}`}>
                    {aiResult.isBale ? 'YES (Advance Detected)' : 'No (Standard Expense)'}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-ink-secondary bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="font-semibold text-navy">Routing: </span>
                {aiResult.approvalRouting}
              </div>

              {/* Founder Confirmation Actions */}
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[10px] text-ink-muted italic">
                  * AI suggestions require Founder confirmation before recording
                </span>

                {!aiAccepted ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleAcceptAISuggestion}
                    leftIcon={<Check className="w-3.5 h-3.5" />}
                  >
                    Accept AI Suggestions
                  </Button>
                ) : (
                  <span className="text-emerald-800 font-bold text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Suggestions Applied
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Expense Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
            >
              <option value="materials">Materials</option>
              <option value="labor">Labor</option>
              <option value="equipment">Equipment</option>
              <option value="permits">Permits</option>
              <option value="transportation">Transportation</option>
              <option value="other">Other</option>
            </Select>

            <div>
              <label className="text-xs font-semibold text-navy uppercase tracking-wider block mb-1.5">
                Receipt / Invoice Photo
              </label>
              <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-surface-inset border border-surface-border hover:bg-slate-200 cursor-pointer text-xs font-semibold text-navy transition-all shadow-[inset_1px_1px_2px_rgba(11,31,58,0.05)]">
                {isUploadingReceipt ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading to Supabase…</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>{formData.receipt_url ? 'Receipt Attached ✓' : 'Attach Photo'}</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleReceiptUpload}
                  disabled={isUploadingReceipt}
                />
              </label>
            </div>
          </div>

          <Textarea
            label="Site Notes / Official Receipt Number"
            placeholder="Official Receipt # / Supplier Delivery Slip info"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
          />

          <div className="pt-4 flex justify-end space-x-2">
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Confirm & Save Expense
            </Button>
          </div>
        </form>
      </Modal>

      {/* RECEIPT PREVIEW MODAL */}
      <Modal
        isOpen={Boolean(selectedReceiptUrl)}
        onClose={() => setSelectedReceiptUrl(null)}
        title="Official Receipt Photo"
        description="Captured proof of purchase & supplier receipt."
      >
        {selectedReceiptUrl && (
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden border border-surface-border bg-slate-100 flex items-center justify-center max-h-[70vh]">
              <img
                src={selectedReceiptUrl}
                alt="Receipt Voucher"
                className="w-full h-auto object-contain max-h-[60vh]"
              />
            </div>
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setSelectedReceiptUrl(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
