import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { traceStore, logger } from '../logger';

export function traceMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header('x-trace-id');
  const traceId = incoming && incoming.length > 0 ? incoming : randomUUID();
  res.setHeader('x-trace-id', traceId);
  traceStore.run({ traceId }, () => {
    logger.info({ method: req.method, path: req.path }, 'request_received');
    next();
  });
}
