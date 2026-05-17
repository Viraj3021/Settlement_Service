import type { BookingCompleted } from '../domain/eventSchema';
import { computeCharge } from '../domain/charge';
import type { SettlementRepo, PaymentGateway, Settlement } from '../ports';
import { logger } from '../logger';

export class SettlementService {
  constructor(
    private readonly repo: SettlementRepo,
    private readonly gateway: PaymentGateway,
  ) {}

  async handle(event: BookingCompleted): Promise<Settlement> {
    const log = logger.child({ bookingId: event.bookingId });

    const existing = await this.repo.findByBookingId(event.bookingId);
    if (existing && existing.status === 'SETTLED') {
      log.info('idempotent_hit');
      return existing;
    }

    const charge = computeCharge(event);
    log.info({ ...charge }, 'charge_computed');

    const capture = await this.gateway.capture({
      preAuthId: event.preAuthId,
      amountCents: charge.totalCents,
      idempotencyKey: event.bookingId,
    });
    log.info({ captureId: capture.captureId }, 'gateway_captured');

    const { row, inserted } = await this.repo.insertIfAbsent({
      bookingId: event.bookingId,
      userId: event.userId,
      preAuthId: event.preAuthId,
      ...charge,
      captureId: capture.captureId,
      status: 'SETTLED',
      createdAt: new Date(),
    });
    log.info({ inserted }, inserted ? 'settlement_persisted' : 'settlement_already_existed');
    return row;
  }
}
