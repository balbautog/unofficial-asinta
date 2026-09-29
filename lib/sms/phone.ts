/**
 * Philippine mobile number validation and normalization.
 * Pure module — safe on server and client, unit-testable.
 */

/**
 * Normalizes a Philippine mobile number to E.164 (+639XXXXXXXXX).
 * Accepts 09XXXXXXXXX, 639XXXXXXXXX, +639XXXXXXXXX and common
 * spacing/dash/parenthesis formatting. Returns null when invalid.
 */
export function normalizePhilippineMobile(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/[\s\-().]/g, '');
  if (!/^\+?\d+$/.test(digits)) return null;

  let national: string;
  if (digits.startsWith('+63')) {
    national = digits.slice(3);
  } else if (digits.startsWith('63') && digits.length === 12) {
    national = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    national = digits.slice(1);
  } else if (digits.length === 10 && digits.startsWith('9')) {
    national = digits;
  } else {
    return null;
  }

  // PH mobile numbers: 10 digits starting with 9.
  if (!/^9\d{9}$/.test(national)) return null;
  return `+63${national}`;
}

/** Digits-only form (639XXXXXXXXX) expected by the PhilSMS gateway. */
export function toPhilSMSRecipient(normalized: string): string {
  return normalized.replace(/^\+/, '');
}
