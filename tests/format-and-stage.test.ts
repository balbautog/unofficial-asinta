import { describe, expect, it } from 'vitest';
import {
  formatDatePH,
  formatPeso,
  formatPesoCompact,
  formatPesoForSMS,
  parseManilaDate,
} from '@/lib/email/format';
import { formatDateForSMS } from '@/lib/sms/templates';
import { addDaysIso, classifyReminderStage } from '@/lib/reminders/scheduler';

describe('shared currency and date formatters', () => {
  it('formats pesos with and without decimals', () => {
    expect(formatPeso(1250)).toBe('₱1,250.00');
    expect(formatPesoCompact(1_250_000)).toBe('₱1,250,000');
    expect(formatPesoForSMS(1250)).toBe('PHP 1,250.00');
  });

  it('degrades to zero instead of NaN for bad input', () => {
    expect(formatPeso(Number.NaN)).toBe('₱0.00');
    expect(formatPesoCompact(Number.POSITIVE_INFINITY)).toBe('₱0');
  });

  it('parses date-only strings in Manila time and rejects junk', () => {
    expect(parseManilaDate('2026-01-15')).toBeInstanceOf(Date);
    expect(parseManilaDate('not a date')).toBeNull();
    expect(parseManilaDate(null)).toBeNull();
  });

  it('formats dates for humans and for SMS bodies', () => {
    expect(formatDatePH('2026-01-15')).toBe('January 15, 2026');
    expect(formatDatePH(null)).toBe('');
    expect(formatDateForSMS('2026-01-15')).toBe('Jan 15, 2026');
  });

  it('does not shift a date-only value across timezones', () => {
    // Anchored to Asia/Manila, so the day never changes.
    expect(formatDatePH('2026-01-01')).toContain('January 1, 2026');
  });
});

describe('reminder stage boundaries', () => {
  const due = '2026-03-10';
  const day = (offset: number) => addDaysIso(due, offset);

  it('classifies each stage consistently with the reminder cadence', () => {
    expect(classifyReminderStage(due, day(-1))).toBe('upcoming');
    expect(classifyReminderStage(due, day(0))).toBe('due_today');
    expect(classifyReminderStage(due, day(1))).toBe('overdue');
    expect(classifyReminderStage(due, day(3))).toBe('overdue');
    // Past the overdue reminder the pipeline switches to weekly follow-ups.
    expect(classifyReminderStage(due, day(4))).toBe('follow_up');
    expect(classifyReminderStage(due, day(30))).toBe('follow_up');
  });
});
