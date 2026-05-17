import { describe, it, expect } from 'vitest';
import { computeCharge } from '../domain/charge';

const base = {
  event: 'BookingCompleted' as const,
  bookingId: 'bk',
  userId: 'u',
  preAuthId: 'a',
  preAuthAmountCents: 50000,
};

describe('computeCharge', () => {
  it('returns base only when no overage and not late', () => {
    const r = computeCharge({
      ...base,
      scheduledEnd: '2026-04-10T18:00:00Z',
      actualEnd:    '2026-04-10T18:00:00Z',
      includedUnits: 200, actualUnits: 100, baseFareCents: 8500,
    });
    expect(r).toEqual({ baseFareCents: 8500, overageCents: 0, lateFeeCents: 0, totalCents: 8500 });
  });

  it('charges $0.25 per overage unit', () => {
    const r = computeCharge({
      ...base,
      scheduledEnd: '2026-04-10T18:00:00Z',
      actualEnd:    '2026-04-10T18:00:00Z',
      includedUnits: 200, actualUnits: 237, baseFareCents: 0,
    });
    expect(r.overageCents).toBe(37 * 25);
  });

  it('rounds up partial late hours', () => {
    const r = computeCharge({
      ...base,
      scheduledEnd: '2026-04-10T18:00:00Z',
      actualEnd:    '2026-04-10T19:30:00Z',
      includedUnits: 0, actualUnits: 0, baseFareCents: 0,
    });
    expect(r.lateFeeCents).toBe(2 * 1500);
  });

  it('matches the example event from the spec', () => {
    const r = computeCharge({
      ...base,
      scheduledEnd: '2026-04-10T18:00:00Z',
      actualEnd:    '2026-04-10T19:30:00Z',
      includedUnits: 200, actualUnits: 237, baseFareCents: 8500,
    });
    expect(r).toEqual({
      baseFareCents: 8500,
      overageCents: 925,
      lateFeeCents: 3000,
      totalCents: 12425,
    });
  });

  it('returns zero late fee when actualEnd before scheduledEnd', () => {
    const r = computeCharge({
      ...base,
      scheduledEnd: '2026-04-10T18:00:00Z',
      actualEnd:    '2026-04-10T17:00:00Z',
      includedUnits: 0, actualUnits: 0, baseFareCents: 0,
    });
    expect(r.lateFeeCents).toBe(0);
  });
});
