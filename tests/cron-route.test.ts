import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/cron/reminders/route';

const URL_ = 'http://localhost:3000/api/cron/reminders';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('/api/cron/reminders authorization', () => {
  it('rejects requests without an Authorization header', async () => {
    vi.stubEnv('CRON_SECRET', 'top-secret');
    const res = await GET(new NextRequest(URL_));
    expect(res.status).toBe(401);
  });

  it('rejects requests with an invalid secret', async () => {
    vi.stubEnv('CRON_SECRET', 'top-secret');
    const res = await POST(
      new NextRequest(URL_, { headers: { authorization: 'Bearer wrong-secret' } } as never)
    );
    expect(res.status).toBe(401);
  });

  it('fails closed when CRON_SECRET is not configured', async () => {
    vi.stubEnv('CRON_SECRET', '');
    const res = await GET(
      new NextRequest(URL_, { headers: { authorization: 'Bearer anything' } } as never)
    );
    expect(res.status).toBe(401);
  });

  it('does nothing while automatic reminders are globally disabled', async () => {
    vi.stubEnv('CRON_SECRET', 'top-secret');
    vi.stubEnv('AUTOMATIC_REMINDERS_ENABLED', 'false');
    const res = await GET(
      new NextRequest(URL_, { headers: { authorization: 'Bearer top-secret' } } as never)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ran).toBe(false);
    expect(body.reason).toBe('automatic_reminders_globally_disabled');
  });
});
