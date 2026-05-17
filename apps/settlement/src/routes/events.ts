import { Router } from 'express';
import { bookingCompletedSchema } from '../domain/eventSchema';
import type { SettlementService } from '../services/settlementService';

export const eventsRouter = (svc: SettlementService) => {
  const r = Router();
  r.post('/booking-completed', async (req, res, next) => {
    try {
      const event = bookingCompletedSchema.parse(req.body);
      const row = await svc.handle(event);
      res.status(200).json(row);
    } catch (e) {
      next(e);
    }
  });
  return r;
};
