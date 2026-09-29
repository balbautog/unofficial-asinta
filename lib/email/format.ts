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

/** GSM-friendly Philippine Peso for SMS bodies, e.g. "PHP 1,250,000.00". */
export function formatPesoForSMS(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return `PHP ${value.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Human-readable Philippine date, e.g. "January 15, 2026".
 * Accepts an ISO date string (YYYY-MM-DD) or timestamp.
 */
export function formatDatePH(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? `${isoDate}T00:00:00+08:00` : isoDate
  );
  if (Number.isNaN(date.getTime())) return '';
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
