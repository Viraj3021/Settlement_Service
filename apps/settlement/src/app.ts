import express from 'express';
import { pool } from './adapters/db/pool';
import { PgSettlementRepo } from './adapters/db/settlementRepo';
import { HttpPaymentGateway } from './adapters/gateway/paymentClient';
import { RetryingPaymentGateway } from './adapters/gateway/retryingGateway';
import { SettlementService } from './services/settlementService';
import { eventsRouter } from './routes/events';
import { settlementsRouter } from './routes/settlements';
import { healthRouter } from './routes/health';
import { traceMiddleware } from './middleware/trace';
import { errorMiddleware } from './middleware/error';
import { config } from './config';
import type { PaymentGateway, SettlementRepo } from './ports';

export interface AppDeps {
  repo?: SettlementRepo;
  gateway?: PaymentGateway;
}

export function buildApp(deps: AppDeps = {}) {
  const repo = deps.repo ?? new PgSettlementRepo(pool);
  const baseGateway = deps.gateway ?? new HttpPaymentGateway(config.GATEWAY_URL);
  const gateway = new RetryingPaymentGateway(baseGateway);
  const svc = new SettlementService(repo, gateway);

  const app = express();
  app.use(express.json());
  app.use(traceMiddleware);
  app.use('/healthz', healthRouter());
  app.use('/events', eventsRouter(svc));
  app.use('/settlements', settlementsRouter(repo));
  app.use(errorMiddleware);
  return app;
}
