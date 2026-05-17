import { withRetry, type RetryOptions } from './retry';
import type { PaymentGateway, CaptureRequest, CaptureResult } from '../../ports';

export class RetryingPaymentGateway implements PaymentGateway {
  constructor(
    private readonly inner: PaymentGateway,
    private readonly opts: Partial<RetryOptions> = {},
  ) {}

  capture(req: CaptureRequest): Promise<CaptureResult> {
    return withRetry(() => this.inner.capture(req), this.opts);
  }
}
