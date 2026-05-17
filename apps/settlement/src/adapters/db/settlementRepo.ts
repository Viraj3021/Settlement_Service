import type { Pool } from 'pg';
import type { SettlementRepo, Settlement } from '../../ports';

function mapRow(r: any): Settlement {
  return {
    bookingId: r.booking_id,
    userId: r.user_id,
    baseFareCents: r.base_fare_cents,
    overageCents: r.overage_cents,
    lateFeeCents: r.late_fee_cents,
    totalCents: r.total_cents,
    preAuthId: r.pre_auth_id,
    captureId: r.capture_id,
    status: r.status,
    createdAt: r.created_at,
  };
}

export class PgSettlementRepo implements SettlementRepo {
  constructor(private readonly pool: Pool) {}

  async findByBookingId(id: string) {
    const r = await this.pool.query('SELECT * FROM settlements WHERE booking_id = $1', [id]);
    return r.rows[0] ? mapRow(r.rows[0]) : null;
  }

  async insertIfAbsent(s: Settlement) {
    const r = await this.pool.query(
      `INSERT INTO settlements
         (booking_id, user_id, base_fare_cents, overage_cents, late_fee_cents,
          total_cents, pre_auth_id, capture_id, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (booking_id) DO NOTHING
       RETURNING *`,
      [s.bookingId, s.userId, s.baseFareCents, s.overageCents, s.lateFeeCents,
       s.totalCents, s.preAuthId, s.captureId, s.status, s.createdAt],
    );
    if (r.rowCount === 1) return { inserted: true, row: mapRow(r.rows[0]) };
    const existing = await this.findByBookingId(s.bookingId);
    return { inserted: false, row: existing! };
  }
}
