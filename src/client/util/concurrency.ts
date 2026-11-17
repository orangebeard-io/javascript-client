import { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

type LimitedConfig = InternalAxiosRequestConfig & { __holdsSlot?: boolean };

/**
 * Caps the number of requests an axios instance has in flight; further requests wait in FIFO
 * order. A slot is held only while a request is on the wire, so requests that are backing off
 * before a retry (see `applyRetry`) don't block others. Apply this before `applyRetry`, so the
 * slot is released before the retry interceptor waits.
 */
export function applyConcurrencyLimit(client: AxiosInstance, maxConcurrent: number): void {
  let inFlight = 0;
  const waiting: Array<() => void> = [];

  const acquire = (): Promise<void> => {
    if (inFlight < maxConcurrent) {
      inFlight += 1;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      waiting.push(resolve);
    });
  };

  const release = (config: LimitedConfig | undefined) => {
    if (!config?.__holdsSlot) {
      return;
    }
    config.__holdsSlot = false;
    const next = waiting.shift();
    if (next) {
      next(); // hand the slot over directly; inFlight stays the same
    } else {
      inFlight -= 1;
    }
  };

  client.interceptors.request.use(async (config: LimitedConfig) => {
    await acquire();
    config.__holdsSlot = true;
    return config;
  });

  client.interceptors.response.use(
    (response: AxiosResponse) => {
      release(response.config);
      return response;
    },
    (error: AxiosError) => {
      release(error.config);
      throw error;
    },
  );
}
