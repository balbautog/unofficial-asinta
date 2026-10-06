/**
 * Shared, dependency-free formatting helpers for BALE communications.
 * Safe to import from both server and client code (contains no secrets).
 */

/** Philippine Peso currency, e.g. "₱1,250,000.00". */
export function formatPeso(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return `₱${value.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Compact Philippine Peso for dense lists and stat cards, e.g. "₱1,250,000".
 * Use this instead of inlining `toLocaleString('en-PH', …)` at the call site.
 */
export function formatPesoCompact(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return `₱${Math.round(value).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/** GSM-friendly Philippine Peso for SMS bodies, e.g. "PHP 1,250,000.00". */
export function formatPesoForSMS(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return `PHP ${value.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Shared ISO-date parsing for every display format. A date-only string is
 * anchored to Asia/Manila so it never shifts a day in other timezones.
 */
export function parseManilaDate(isoDate: string | null | undefined): Date | null {
  if (!isoDate) return null;
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? `${isoDate}T00:00:00+08:00` : isoDate
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Human-readable Philippine date, e.g. "January 15, 2026".
 * Accepts an ISO date string (YYYY-MM-DD) or timestamp.
 */
export function formatDatePH(isoDate: string | null | undefined): string {
  const date = parseManilaDate(isoDate);
  if (!date) return '';
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  });
}

/** HTML-escapes database-derived or user-derived content. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Basic RFC-5322-ish email validation (no display names, no injection). */
export function isValidEmail(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length > 254) return false;
  // Reject header-injection characters outright.
  if (/[\r\n,;<>()\s]/.test(trimmed)) return false;
  return /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(
    trimmed
  );
}
