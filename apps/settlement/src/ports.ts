import type { ChargeBreakdown } from './domain/charge';

export interface Settlement extends ChargeBreakdown {
  bookingId: string;
  userId: string;
  preAuthId: string;
  captureId: string | null;
  status: 'SETTLED' | 'FAILED';
  createdAt: Date;
}

export interface SettlementRepo {
  findByBookingId(id: string): Promise<Settlement | null>;
  insertIfAbsent(s: Settlement): Promise<{ inserted: boolean; row: Settlement }>;
}

export interface CaptureRequest {
  preAuthId: string;
  amountCents: number;
  idempotencyKey: string;
}

export interface CaptureResult {
  captureId: string;
  status: 'captured';
  amountCents: number;
}

export interface PaymentGateway {
  capture(req: CaptureRequest): Promise<CaptureResult>;
}
