import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { GatewayError, GatewayTimeoutError, ValidationError } from '../errors';
import { logger } from '../logger';

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    logger.warn({ issues: err.issues }, 'validation_error');
    return res.status(400).json({ error: 'invalid_payload', issues: err.issues });
  }
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: 'validation_error', message: err.message });
  }
  if (err instanceof GatewayTimeoutError) {
    logger.error('gateway_timeout_after_retries');
    return res.status(504).json({ error: 'gateway_timeout' });
  }
  if (err instanceof GatewayError) {
    logger.error({ status: err.status }, 'gateway_error_after_retries');
    return res.status(502).json({ error: 'gateway_error', status: err.status });
  }
  logger.error({ err: String(err) }, 'unhandled_error');
  res.status(500).json({ error: 'internal_error' });
};
