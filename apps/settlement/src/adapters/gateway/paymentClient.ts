import { GatewayError, GatewayTimeoutError } from '../../errors';
import { logger } from '../../logger';
import type { PaymentGateway, CaptureRequest, CaptureResult } from '../../ports';

export class HttpPaymentGateway implements PaymentGateway {
  constructor(private readonly baseUrl: string, private readonly timeoutMs = 2000) {}

  async capture(req: CaptureRequest): Promise<CaptureResult> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/capture`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(req),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        logger.warn({ status: res.status }, 'gateway_non_ok');
        throw new GatewayError(`gateway returned ${res.status}`, res.status);
      }
      return (await res.json()) as CaptureResult;
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        logger.warn('gateway_timeout');
        throw new GatewayTimeoutError();
      }
      throw e;
    } finally {
      clearTimeout(t);
    }
  }
}
