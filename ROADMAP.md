# BALE — Roadmap & Open Work

Tracked in-repo because the GitHub issue list is empty, which meant the next
planned work lived nowhere. Sections are ordered by intended sequence.

## Done (this pass)

**Truth & safety**
- Detected bale advances no longer auto-create a ledger entry. The old code fell
  back to `workers[0]` when no name matched, which could create a debt against
  an unrelated worker. A Founder now names the recipient explicitly.
- Expense categories have a single definition (`lib/ai/categories.ts`), validated
  in code before any write, with a test asserting it matches the SQL `CHECK`.
- Removed the decorative `approvalRouting` / "% confidence" output. Suggestions
  now carry `evidence` ("matched \"cement\"") and a `source` (`llm` | `rules`).
- AI degradation is visible: the API returns why the built-in rules were used
  instead of the model, and the UI shows it.
- `sms_logs` writes consolidated into `lib/sms/deliver.ts` (was 4 copies). An
  attempt is never sent without being recorded, and a simulated send is never
  reported as success.
- Unrecognised descriptions now fall to `other` instead of silently being filed
  as `materials`.

**Cleanup**
- Deleted `confirmAIExpense` (zero call sites), unused `.no-print`/`.print-only`
  CSS, and the never-implemented `darkMode: ["class"]`.
- `ai_confirmed` now records whether an AI suggestion was actually applied,
  instead of being hardcoded `true` on every row.
- Reminder stage boundaries live in `lib/reminders/scheduler.ts`; the reminders
  page no longer disagrees with the cadence that fires.
- Currency/date formatting routed through `lib/email/format.ts` (was inlined in
  9 files); one shared ISO-date parser.
- Status colours unified on the semantic `status-*` tokens (140 replacements
  across 23 files). Categorical chart hues on the dashboard are intentionally
  left as a separate scale.

**Accessibility & UX**
- `ink-muted` / `ink-secondary` darkened to meet WCAG AA (2.85:1 → 5.98:1 and
  higher) across white, surface and inset backgrounds.
- Modal: focus trap, initial focus, focus restore, `aria-labelledby`,
  `aria-describedby`, labelled close button, `role`/`dismissOnBackdrop` props.
- Inputs/Textarea/Select: `useId` ids (fixes duplicate DOM ids), `aria-invalid`
  and `aria-describedby`.
- `aria-current="page"` on both navigation surfaces.
- `prefers-reduced-motion` guard in `globals.css`.
- Empty states (including filtered-to-zero) on expenses, tools, clients, users
  and attendance; skeleton shell while the ledger loads instead of a spinner.
- Native `confirm()` replaced with an in-app `ConfirmDialog` (3 sites).
- Horizontal scroll on the invoice milestone and payroll breakdown tables.

**Engineering hygiene**
- GitHub Actions CI: typecheck, lint, tests, build.
- `supabase/config.toml` so the documented `supabase start` works.
- 22 new tests (71 → 93) covering categories, the categorizer's degradation
  paths, the SMS delivery helper, formatters and reminder stage boundaries.

## Next: Track E — description → draft → confirmation

The highest-value addition and the cheapest entry into the extraction engine.
One messy line ("12 bags cement at JMC for Casa Batangas, 4800, kahapon") prefills
project, category, amount, date, vendor and notes; the Founder confirms. B, D and
E below all reduce to one "structured draft from messy input" function.

Rules for it: never invent a value (missing amount stays empty, never guessed),
and map to real database ids only — a model returning free-text project names is
unusable and would fail the insert.

## Later: AI tracks

| Track | What | Notes |
| --- | --- | --- |
| A | Vendor memory — learn category per supplier from Founder overrides | Count-based, inspectable. Must **not** become embeddings/vector search. |
| C | Duplicate & outlier detection | Arithmetic. "Same supplier + amount within N days". |
| B | Receipt photo → draft | Groq vision (Llama 4 Scout, currently Preview). Assistive only. |
| D | Voice → draft | Whisper large-v3-turbo, seeded with worker/supplier names for Taglish. |

### Schema decision required before Track A/E

- `ai_approval_suggestion` — decorative, no longer written. **Drop it** (needs a
  migration) or keep the column unused.
- `ai_confirmed` — now meaningful (set only when a suggestion was applied). Keep.

## Security (separate workstream)

Not started, tracked for its own pass:

- **Critical:** Next.js 14.2.35 carries RCE/DoS advisories, one with no 14.x
  patch (GHSA-2xp9-vwfh-vxw4, AVIF image optimizer). `next/image` is unused, so
  disable the optimizer now (`images: { unoptimized: true }`) and plan the
  upgrade to 16.3.3+/15.5.24+. If `sharp` is ever added, require ≥0.35.4.
- **High:** receipts storage bucket is `public: true` → private + signed URLs.
- **High:** no security headers (clickjacking risk on approve/pay actions).
- **High:** no rate limiting; no MFA on Founder accounts; SMTP `requireTLS`
  unset.
- **Medium:** no audit log for financial mutations; backups/PITR unverified.
- **Compliance:** PH Data Privacy Act (RA 10173) obligations — privacy notice,
  retention, 72-hour breach notification, DPO, NPC registration.
- Session security: Supabase inactivity + absolute timeouts, and the
  "are you still there?" warning dialog (`role="alertdialog"`,
  `dismissOnBackdrop={false}` — both props already exist on `Modal`).

## Backlog

- `store.tsx` and component tests (coverage is server-logic only).
- Adopt `isSupabaseConfigured()` fail-fast path in more entry points if needed.
- Navbar timestamp still uses a raw `toLocaleString` (datetime, not currency).
