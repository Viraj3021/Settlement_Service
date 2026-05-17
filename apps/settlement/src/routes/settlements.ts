import { Router } from 'express';
import type { SettlementRepo } from '../ports';

export const settlementsRouter = (repo: SettlementRepo) => {
  const r = Router();
  r.get('/:bookingId', async (req, res, next) => {
    try {
      const row = await repo.findByBookingId(req.params.bookingId);
      if (!row) return res.status(404).json({ error: 'not_found' });
      res.json(row);
    } catch (e) {
      next(e);
    }
  });
  return r;
};
