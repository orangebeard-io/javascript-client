import { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

export type RetryOptions = {
  retries: number;
  retryDelay: (retryCount: number) => number;
  retryCondition?: (error: AxiosError) => boolean;
};

type RetryableConfig = InternalAxiosRequestConfig & { __retryCount?: number };

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Minimal retry support for an axios instance: failed requests are re-sent up to
 * `retries` times, waiting `retryDelay(attempt)` ms (attempt starts at 1) between tries.
 */
export function applyRetry(client: AxiosInstance, options: RetryOptions): void {
  client.interceptors.response.use(undefined, async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;
    if (!config) {
      throw error;
    }

    const retryCount = (config.__retryCount ?? 0) + 1;
    const shouldRetry = options.retryCondition ? options.retryCondition(error) : true;
    if (!shouldRetry || retryCount > options.retries) {
      throw error;
    }

    config.__retryCount = retryCount;
    await sleep(options.retryDelay(retryCount));
    return client.request(config);
  });
}
