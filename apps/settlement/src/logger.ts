import pino from 'pino';
import { AsyncLocalStorage } from 'node:async_hooks';
import { config } from './config';

export const traceStore = new AsyncLocalStorage<{ traceId: string }>();

export const logger = pino({
  level: config.LOG_LEVEL,
  mixin() {
    const s = traceStore.getStore();
    return s ? { traceId: s.traceId } : {};
  },
});
