import { GatewayError, GatewayTimeoutError } from '../../errors';

export interface RetryOptions {
  attempts: number;
  baseMs: number;
  capMs: number;
}

const DEFAULTS: RetryOptions = { attempts: 3, baseMs: 200, capMs: 2000 };

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: Partial<RetryOptions> = {},
): Promise<T> {
  const o = { ...DEFAULTS, ...opts };
  let lastErr: unknown;
  for (let i = 0; i < o.attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      if (!isRetryable(e)) throw e;
      lastErr = e;
      if (i === o.attempts - 1) break;
      const delay = Math.min(o.capMs, o.baseMs * 2 ** i) * (0.5 + Math.random());
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

function isRetryable(e: unknown): boolean {
  if (e instanceof GatewayTimeoutError) return true;
  if (e instanceof GatewayError && e.status && e.status >= 500 && e.status < 600) return true;
  return false;
}
