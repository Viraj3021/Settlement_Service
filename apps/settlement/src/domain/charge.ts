import type { BookingCompleted } from './eventSchema';

export interface ChargeBreakdown {
  baseFareCents: number;
  overageCents: number;
  lateFeeCents: number;
  totalCents: number;
}

const OVERAGE_RATE_CENTS = 25;
const LATE_FEE_PER_HOUR_CENTS = 1500;
const MS_PER_HOUR = 1000 * 60 * 60;

export function computeCharge(e: BookingCompleted): ChargeBreakdown {
  const overageUnits = Math.max(0, e.actualUnits - e.includedUnits);
  const overageCents = overageUnits * OVERAGE_RATE_CENTS;

  const lateMs = Math.max(0, Date.parse(e.actualEnd) - Date.parse(e.scheduledEnd));
  const lateHours = Math.ceil(lateMs / MS_PER_HOUR);
  const lateFeeCents = lateHours * LATE_FEE_PER_HOUR_CENTS;

  return {
    baseFareCents: e.baseFareCents,
    overageCents,
    lateFeeCents,
    totalCents: e.baseFareCents + overageCents + lateFeeCents,
  };
}
