import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildApp } from '../app';
import type { SettlementRepo, PaymentGateway, Settlement, CaptureRequest, CaptureResult } from '../ports';
import { GatewayError } from '../errors';

class InMemoryRepo implements SettlementRepo {
  store = new Map<string, Settlement>();
  async findByBookingId(id: string) { return this.store.get(id) ?? null; }
  async insertIfAbsent(s: Settlement) {
    if (this.store.has(s.bookingId)) return { inserted: false, row: this.store.get(s.bookingId)! };
    this.store.set(s.bookingId, s);
    return { inserted: true, row: s };
  }
}

class FlakyGateway implements PaymentGateway {
  callCount = 0;
  uniqueKeys = new Set<string>();
  failFirstN: number;
  constructor(failFirstN = 0) { this.failFirstN = failFirstN; }
  async capture(req: CaptureRequest): Promise<CaptureResult> {
    this.callCount++;
    this.uniqueKeys.add(req.idempotencyKey);
    if (this.callCount <= this.failFirstN) throw new GatewayError('flaky', 500);
    return { captureId: `cap_${req.idempotencyKey}`, status: 'captured', amountCents: req.amountCents };
  }
}

const event = {
  event: 'BookingCompleted',
  bookingId: 'bk_idem_test',
  userId: 'user_test',
  scheduledEnd: '2026-04-10T18:00:00Z',
  actualEnd:    '2026-04-10T19:30:00Z',
  includedUnits: 200, actualUnits: 237, baseFareCents: 8500,
  preAuthId: 'auth_test', preAuthAmountCents: 50000,
};

describe('idempotency under retry', () => {
  it('10 sequential same-event requests → 1 row, 1 gateway capture', async () => {
    const repo = new InMemoryRepo();
    const gateway = new FlakyGateway(0);
    const app = buildApp({ repo, gateway });

    for (let i = 0; i < 10; i++) {
      const res = await request(app).post('/events/booking-completed').send(event);
      expect(res.status).toBe(200);
    }

    expect(repo.store.size).toBe(1);
    expect(gateway.callCount).toBe(1);
  });

  it('retries through transient 5xx, still exactly 1 row', async () => {
    const repo = new InMemoryRepo();
    const gateway = new FlakyGateway(2);
    const app = buildApp({ repo, gateway });

    const res = await request(app).post('/events/booking-completed').send(event);
    expect(res.status).toBe(200);

    expect(repo.store.size).toBe(1);
    expect(gateway.callCount).toBe(3);
    expect(gateway.uniqueKeys.size).toBe(1);
  });

  it('10 concurrent same-event requests → 1 row', async () => {
    const repo = new InMemoryRepo();
    const gateway = new FlakyGateway(0);
    const app = buildApp({ repo, gateway });

    const reqs = Array.from({ length: 10 }, () =>
      request(app).post('/events/booking-completed').send(event));
    const results = await Promise.all(reqs);

    for (const r of results) expect(r.status).toBe(200);
    expect(repo.store.size).toBe(1);
    expect(gateway.uniqueKeys.size).toBe(1);
  });
});
