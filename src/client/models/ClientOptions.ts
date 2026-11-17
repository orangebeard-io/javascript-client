/**
 * Tuning for how the client talks to Orangebeard. All fields are optional; defaults favour
 * low impact on test execution time.
 */
export type ClientOptions = {
  /** Maximum number of requests to Orangebeard in flight at the same time. Default: 10. */
  maxConcurrentRequests?: number;
  /** Timeout for a single request, in ms. Default: 10 000. */
  requestTimeoutMs?: number;
  /** Timeout for a single attachment upload, in ms. Default: 120 000. */
  attachmentTimeoutMs?: number;
  /** Number of retries for a failed request. Default: 4. */
  retries?: number;
  /** Base back-off delay in ms; retry n waits `retryBaseDelayMs * 2^n`. Default: 1 000. */
  retryBaseDelayMs?: number;
  /**
   * Maximum time `finishTestRun` waits for pending requests before finishing the run anyway,
   * in ms. Default: 120 000.
   */
  finishTimeoutMs?: number;
};

export const DEFAULT_CLIENT_OPTIONS: Required<ClientOptions> = {
  maxConcurrentRequests: 10,
  requestTimeoutMs: 10_000,
  attachmentTimeoutMs: 120_000,
  retries: 4,
  retryBaseDelayMs: 1_000,
  finishTimeoutMs: 120_000,
};

export function resolveClientOptions(options: ClientOptions = {}): Required<ClientOptions> {
  const resolved = { ...DEFAULT_CLIENT_OPTIONS };
  (Object.keys(options) as Array<keyof ClientOptions>).forEach((key) => {
    if (options[key] !== undefined) {
      resolved[key] = options[key];
    }
  });
  return resolved;
}
