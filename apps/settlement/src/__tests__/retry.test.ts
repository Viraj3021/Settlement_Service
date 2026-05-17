import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../adapters/gateway/retry';
import { GatewayError, GatewayTimeoutError } from '../errors';

describe('withRetry', () => {
  it('returns value on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const r = await withRetry(fn, { attempts: 3, baseMs: 1, capMs: 2 });
    expect(r).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on 5xx', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new GatewayError('boom', 503))
      .mockResolvedValueOnce('ok');
    const r = await withRetry(fn, { attempts: 3, baseMs: 1, capMs: 2 });
    expect(r).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on timeout', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new GatewayTimeoutError())
      .mockResolvedValueOnce('ok');
    const r = await withRetry(fn, { attempts: 3, baseMs: 1, capMs: 2 });
    expect(r).toBe('ok');
  });

  it('does NOT retry on 4xx', async () => {
    const fn = vi.fn().mockRejectedValue(new GatewayError('bad', 400));
    await expect(withRetry(fn, { attempts: 3, baseMs: 1, capMs: 2 })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new GatewayError('boom', 500));
    await expect(withRetry(fn, { attempts: 3, baseMs: 1, capMs: 2 })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
