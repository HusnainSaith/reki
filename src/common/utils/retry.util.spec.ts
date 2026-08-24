import { withRetry, resetCircuitBreaker, getCircuitBreakerStatus } from './retry.util';

describe('Retry Utility', () => {
  beforeEach(() => {
    resetCircuitBreaker('test');
  });

  it('should return result on first successful call', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await withRetry('test', fn, { maxRetries: 3, baseDelayMs: 10 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed on second attempt', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockResolvedValueOnce('success');

    const result = await withRetry('test', fn, { maxRetries: 3, baseDelayMs: 10 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should retry up to maxRetries times', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('always fails'));
    const result = await withRetry('test', fn, { maxRetries: 3, baseDelayMs: 10 });
    expect(result).toBeNull();
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should timeout if function takes too long', async () => {
    const fn = jest.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve('late'), 10000)),
    );
    const result = await withRetry('test', fn, { maxRetries: 1, baseDelayMs: 10, timeoutMs: 50 });
    expect(result).toBeNull();
  });

  it('should increment circuit breaker failures', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fail'));
    await withRetry('test', fn, { maxRetries: 1, baseDelayMs: 10 });

    const status = getCircuitBreakerStatus('test');
    expect(status).toBeDefined();
    expect(status.failures).toBe(1);
    expect(status.isOpen).toBe(false);
  });

  it('should open circuit breaker after 5 consecutive failures', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fail'));

    for (let i = 0; i < 5; i++) {
      await withRetry('test', fn, { maxRetries: 1, baseDelayMs: 10 });
    }

    const status = getCircuitBreakerStatus('test');
    expect(status.isOpen).toBe(true);
    expect(status.failures).toBe(5);
  });

  it('should skip calls when circuit is open', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fail'));

    // Open the circuit
    for (let i = 0; i < 5; i++) {
      await withRetry('test', fn, { maxRetries: 1, baseDelayMs: 10 });
    }

    // Next call should be skipped
    fn.mockClear();
    const result = await withRetry('test', fn, { maxRetries: 1, baseDelayMs: 10 });
    expect(result).toBeNull();
    expect(fn).not.toHaveBeenCalled();
  });

  it('should reset circuit breaker on success', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success');

    await withRetry('test', fn, { maxRetries: 1, baseDelayMs: 10 });
    const afterFail = getCircuitBreakerStatus('test');
    expect(afterFail.failures).toBe(1);

    await withRetry('test', fn, { maxRetries: 2, baseDelayMs: 10 });
    const afterSuccess = getCircuitBreakerStatus('test');
    expect(afterSuccess.failures).toBe(0);
  });

  it('resetCircuitBreaker should clear state', () => {
    resetCircuitBreaker('test');
    expect(getCircuitBreakerStatus('test')).toBeUndefined();
  });
});
