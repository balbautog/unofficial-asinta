import { describe, expect, it, vi } from 'vitest';
import {
  RECEIPT_ALLOWED_MIME_TYPES,
  RECEIPT_MAX_BYTES,
  buildReceiptObjectPath,
  createReceiptSignedUrl,
  receiptPathFromStoredValue,
  validateReceiptFile,
} from '@/lib/supabase/receipts';

/**
 * Receipt storage: the bucket is private, `expenses.receipt_url` holds a PATH,
 * and the extension comes from the MIME allowlist. These tests pin those three
 * properties — the first is the security fix from this pass, and the third
 * closes the "extension taken from the filename" finding.
 */

describe('receipt file validation', () => {
  it('accepts the allowlisted image types and returns the stored extension', () => {
    expect(validateReceiptFile({ type: 'image/jpeg', size: 1024 })).toEqual({ ok: true, extension: 'jpg' });
    expect(validateReceiptFile({ type: 'image/png', size: 1024 })).toEqual({ ok: true, extension: 'png' });
    expect(validateReceiptFile({ type: 'image/webp', size: 1024 })).toEqual({ ok: true, extension: 'webp' });
  });

  it('rejects anything outside the allowlist', () => {
    expect(validateReceiptFile({ type: 'image/gif', size: 10 }).ok).toBe(false);
    expect(validateReceiptFile({ type: 'application/pdf', size: 10 }).ok).toBe(false);
    expect(validateReceiptFile({ type: 'image/svg+xml', size: 10 }).ok).toBe(false);
    // Only the three bucket-allowed types (plus the jpg alias) may appear.
    expect([...RECEIPT_ALLOWED_MIME_TYPES].sort()).toEqual([
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ]);
  });

  it('rejects empty and oversized files with a usable message', () => {
    expect(validateReceiptFile({ type: 'image/jpeg', size: 0 }).ok).toBe(false);
    const big = validateReceiptFile({ type: 'image/jpeg', size: RECEIPT_MAX_BYTES + 1 });
    expect(big.ok).toBe(false);
    expect(big.error).toMatch(/5 MB/);
  });
});

describe('object paths', () => {
  it('builds a path under the uploader id with a random suffix', () => {
    const path = buildReceiptObjectPath('user-abc', 'jpg', { now: 1700000000000, random: 'zz9' });
    expect(path).toBe('user-abc/1700000000000-zz9.jpg');
  });

  it('strips characters that could break out of the path', () => {
    const path = buildReceiptObjectPath('../evil', 'jpg', { now: 1, random: 'x' });
    expect(path.startsWith('..')).toBe(false);
    expect(path).not.toMatch(/\.\./);
  });
});

describe('stored value → storage path', () => {
  it('passes a bare path through', () => {
    expect(receiptPathFromStoredValue('user-1/123-ab.jpg')).toBe('user-1/123-ab.jpg');
  });

  it('converts a legacy public URL (the pre-migration format)', () => {
    expect(
      receiptPathFromStoredValue(
        'https://xyz.supabase.co/storage/v1/object/public/receipts/user-1/123-ab.jpg'
      )
    ).toBe('user-1/123-ab.jpg');
  });

  it('strips the token from a legacy signed URL', () => {
    expect(
      receiptPathFromStoredValue(
        'https://xyz.supabase.co/storage/v1/object/sign/receipts/user-1/123-ab.jpg?token=abc.def'
      )
    ).toBe('user-1/123-ab.jpg');
  });

  it('refuses traversal and foreign URLs', () => {
    expect(receiptPathFromStoredValue('user-1/../../etc/passwd')).toBeNull();
    expect(receiptPathFromStoredValue('https://evil.example.com/receipts/x.jpg')).toBeNull();
    expect(receiptPathFromStoredValue('')).toBeNull();
    expect(receiptPathFromStoredValue(null)).toBeNull();
  });
});

describe('signed URL minting', () => {
  const client = (impl: (path: string, expiresIn: number) => any) => ({
    storage: {
      from: () => ({ createSignedUrl: impl }),
    },
  });

  it('signs the path with a short lifetime', async () => {
    const createSignedUrl = vi.fn(async (path: string, expiresIn: number) => ({
      data: { signedUrl: `https://signed/${path}?exp=${expiresIn}` },
      error: null,
    }));

    const result = await createReceiptSignedUrl(
      client(createSignedUrl) as any,
      'user-1/123-ab.jpg'
    );

    expect(result.url).toBe('https://signed/user-1/123-ab.jpg?exp=300');
    expect(createSignedUrl).toHaveBeenCalledWith('user-1/123-ab.jpg', 300);
  });

  it('reports a signing failure instead of returning a broken image', async () => {
    const result = await createReceiptSignedUrl(
      client(async () => ({ data: null, error: { message: 'Object not found' } })) as any,
      'user-1/missing.jpg'
    );
    expect(result.url).toBeNull();
    expect(result.error).toMatch(/Object not found/);
  });

  it('does not call storage at all when there is no receipt', async () => {
    const createSignedUrl = vi.fn();
    const result = await createReceiptSignedUrl(client(createSignedUrl) as any, null);
    expect(result.url).toBeNull();
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('never throws when the storage client explodes', async () => {
    const result = await createReceiptSignedUrl(
      client(async () => {
        throw new Error('network down');
      }) as any,
      'user-1/123-ab.jpg'
    );
    expect(result.url).toBeNull();
    expect(result.error).toMatch(/network down/);
  });
});
