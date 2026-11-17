import axios from 'axios';
import nock from 'nock';

import { applyConcurrencyLimit } from '../src/client/util/concurrency';
import { applyRetry } from '../src/client/util/retry';

describe('applyConcurrencyLimit', () => {
  const baseURL = 'http://fake-concurrency.test';

  afterEach(() => {
    nock.cleanAll();
  });

  const serveTracking = (status: number, times: number) => {
    const stats = { inFlight: 0, maxInFlight: 0, served: 0 };
    nock(baseURL)
      .post('/x')
      .times(times)
      .reply((_uri, _body, callback) => {
        stats.inFlight += 1;
        stats.maxInFlight = Math.max(stats.maxInFlight, stats.inFlight);
        setTimeout(() => {
          stats.inFlight -= 1;
          stats.served += 1;
          callback(null, [status, 'ok']);
        }, 30);
      });
    return stats;
  };

  it('never has more than the maximum number of requests in flight', async () => {
    const stats = serveTracking(200, 12);
    const client = axios.create({ baseURL });
    applyConcurrencyLimit(client, 3);

    await Promise.all(Array.from({ length: 12 }, () => client.post('/x')));

    expect(stats.served).toBe(12);
    expect(stats.maxInFlight).toBe(3);
  });

  it('frees a slot when a request fails', async () => {
    const stats = serveTracking(500, 6);
    const client = axios.create({ baseURL });
    applyConcurrencyLimit(client, 2);

    const results = await Promise.allSettled(Array.from({ length: 6 }, () => client.post('/x')));

    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    expect(stats.served).toBe(6);
    expect(stats.maxInFlight).toBe(2);
  });

  it('does not hold a slot while a retry is backing off', async () => {
    nock(baseURL).get('/failing').reply(500).get('/failing').reply(200);
    nock(baseURL).get('/other').reply(200, 'other');
    const client = axios.create({ baseURL });
    applyConcurrencyLimit(client, 1);
    applyRetry(client, { retries: 1, retryDelay: () => 300 });

    const failing = client.get('/failing');
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    const started = Date.now();
    await client.get('/other');

    expect(Date.now() - started).toBeLessThan(200);
    await failing;
  });
});
