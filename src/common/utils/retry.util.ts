import { Logger } from '@nestjs/common';

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

const circuitBreakers = new Map<string, CircuitBreakerState>();
const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_RESET_TIMEOUT_MS = 30000; // 30 seconds

const logger = new Logger('RetryUtil');

/**
 * Execute an async function with exponential backoff retry logic and circuit breaker.
 *
 * @param name - Identifier for the circuit breaker (e.g., 'weather-api', 'google-oauth')
 * @param fn - Async function to execute
 * @param options - Retry configuration
 * @returns Promise with the result of fn, or null if all retries + circuit breaker failed
 */
export async function withRetry<T>(
  name: string,
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T | null> {
  const { maxRetries = 3, baseDelayMs = 1000, timeoutMs = 5000 } = options;

  // Check circuit breaker
  const circuit = circuitBreakers.get(name) || { failures: 0, lastFailureTime: 0, isOpen: false };

  if (circuit.isOpen) {
    const elapsed = Date.now() - circuit.lastFailureTime;
    if (elapsed < CIRCUIT_RESET_TIMEOUT_MS) {
      logger.warn(`Circuit breaker OPEN for "${name}" — skipping call (resets in ${Math.ceil((CIRCUIT_RESET_TIMEOUT_MS - elapsed) / 1000)}s)`);
      return null;
    }
    // Half-open: allow one attempt
    logger.log(`Circuit breaker half-open for "${name}" — allowing test request`);
    circuit.isOpen = false;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs),
        ),
      ]);

      // Success — reset circuit breaker
      if (circuit.failures > 0) {
        circuit.failures = 0;
        circuit.isOpen = false;
        circuitBreakers.set(name, circuit);
        logger.log(`Circuit breaker CLOSED for "${name}" after successful call`);
      }

      return result;
    } catch (error: any) {
      const delay = baseDelayMs * Math.pow(2, attempt - 1); // 1s, 2s, 4s
      logger.warn(
        `"${name}" attempt ${attempt}/${maxRetries} failed: ${error.message}` +
        (attempt < maxRetries ? ` — retrying in ${delay}ms` : ' — giving up'),
      );

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted — update circuit breaker
  circuit.failures += 1;
  circuit.lastFailureTime = Date.now();
  if (circuit.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    circuit.isOpen = true;
    logger.error(`Circuit breaker OPEN for "${name}" after ${circuit.failures} consecutive failures`);
  }
  circuitBreakers.set(name, circuit);

  return null;
}

/**
 * Reset a specific circuit breaker (useful for testing).
 */
export function resetCircuitBreaker(name: string): void {
  circuitBreakers.delete(name);
}

/**
 * Get circuit breaker status.
 */
export function getCircuitBreakerStatus(name: string): CircuitBreakerState | undefined {
  return circuitBreakers.get(name);
}
