import axios from 'axios';
import nock from 'nock';

import { applyRetry } from '../src/client/util/retry';

describe('applyRetry', () => {
  const baseURL = 'http://fake-retry.test';

  afterEach(() => {
    nock.cleanAll();
  });

  const createClient = (retries = 2, retryCondition?: (e: unknown) => boolean) => {
    const client = axios.create({ baseURL });
    const delays: number[] = [];
    applyRetry(client, {
      retries,
      retryDelay: (count) => {
        delays.push(count);
        return 0;
      },
      retryCondition: retryCondition as never,
    });
    return { client, delays };
  };

  it('retries failed requests until one succeeds', async () => {
    nock(baseURL).post('/x').reply(500).post('/x').reply(502).post('/x').reply(200, 'ok');
    const { client, delays } = createClient(3);

    const response = await client.post('/x', { a: 1 });

    expect(response.data).toBe('ok');
    expect(delays).toEqual([1, 2]);
  });

  it('resends the request body on retry', async () => {
    let body: unknown;
    nock(baseURL)
      .post('/x')
      .reply(500)
      .post('/x', (b) => {
        body = b;
        return true;
      })
      .reply(200);
    const { client } = createClient();

    await client.post('/x', { a: 1 });

    expect(body).toEqual({ a: 1 });
  });

  it('gives up after the configured number of retries and rejects', async () => {
    const scope = nock(baseURL).get('/x').times(3).reply(500);
    const { client } = createClient(2);

    await expect(client.get('/x')).rejects.toMatchObject({ response: { status: 500 } });
    expect(scope.isDone()).toBe(true);
  });

  it('does not retry when retryCondition returns false', async () => {
    const scope = nock(baseURL).get('/x').reply(401).get('/x').reply(200);
    const { client } = createClient(3, (e) => (e as any).response?.status !== 401);

    await expect(client.get('/x')).rejects.toMatchObject({ response: { status: 401 } });
    expect(scope.isDone()).toBe(false);
  });

  it('does not retry when retryCondition turns false during the back-off delay', async () => {
    const scope = nock(baseURL).get('/x').reply(500).get('/x').reply(200);
    let allowRetry = true;
    const client = axios.create({ baseURL });
    applyRetry(client, {
      retries: 3,
      retryDelay: () => 100,
      retryCondition: () => allowRetry,
    });

    const request = client.get('/x');
    setTimeout(() => {
      allowRetry = false;
    }, 50);

    await expect(request).rejects.toMatchObject({ response: { status: 500 } });
    expect(scope.isDone()).toBe(false);
  });

  it('retries network errors', async () => {
    nock(baseURL).get('/x').replyWithError('boom').get('/x').reply(200, 'ok');
    const { client } = createClient();

    expect((await client.get('/x')).data).toBe('ok');
  });
});
