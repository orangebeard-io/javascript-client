import { UUID } from 'crypto';
import nock from 'nock';

import OrangebeardClient from '../src/client/OrangebeardClient';
import { StartTestRun } from '../src/client/models/StartTestRun';
import { StartSuite } from '../src/client/models/StartSuite';
import { FinishTest } from '../src/client/models/FinishTest';
import { Log } from '../src/client/models/Log';
import { Attachment } from '../src/client/models/Attachment';

const finishTest = {
  testRunUUID: 'run',
  status: FinishTest.Status.PASSED,
  endTime: new Date().toISOString(),
} as unknown as FinishTest;

describe('OrangebeardClient error logging', () => {
  const baseURL = 'https://fake-orangebeard.test';
  const project = 'my-project';
  const token = 'super-secret-token-should-never-be-logged';

  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    nock.cleanAll();
  });

  it('does not leak the auth token or the raw request when a call fails', async () => {
    nock(baseURL)
      .post(`/listener/v3/${project}/test-run/start`)
      .reply(401, { message: 'Unauthorized' });

    const client = new OrangebeardClient(baseURL, token, project);

    await client.startTestRun({
      testSetName: 'Some test set',
      startTime: new Date().toISOString(),
    } as StartTestRun);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

    const loggedArgs = consoleErrorSpy.mock.calls[0];
    const serializedLog = JSON.stringify(loggedArgs);

    expect(serializedLog).not.toContain(token);
    expect(serializedLog.toLowerCase()).not.toContain('authorization');

    const [, loggedPayload] = loggedArgs;
    expect(loggedPayload).not.toHaveProperty('config');
    expect(loggedPayload).not.toHaveProperty('request');
    expect(loggedPayload).not.toHaveProperty('headers');

    expect(loggedPayload).toMatchObject({
      status: 401,
      method: 'POST',
    });
    expect(loggedPayload.url).toContain(`/listener/v3/${project}/test-run/start`);
  });
});

describe('OrangebeardClient User-Agent header', () => {
  const baseURL = 'https://fake-orangebeard.test';
  const project = 'my-project';
  const token = 'super-secret-token-should-never-be-logged';

  afterEach(() => {
    nock.cleanAll();
  });

  it('sends the base user agent when no listenerId is provided', async () => {
    let seenUserAgent: string | undefined;
    nock(baseURL)
      .post(`/listener/v3/${project}/test-run/start`)
      .reply(function replyFn() {
        seenUserAgent = this.req.headers['user-agent'];
        return [200, 'some-uuid'];
      });

    const client = new OrangebeardClient(baseURL, token, project);
    await client.startTestRun({
      testSetName: 'Some test set',
      startTime: new Date().toISOString(),
    } as StartTestRun);

    expect(seenUserAgent).toEqual('orangebeard-javascript-client');
  });

  it('appends the listenerId to the user agent when provided', async () => {
    let seenUserAgent: string | undefined;
    nock(baseURL)
      .post(`/listener/v3/${project}/test-run/start`)
      .reply(function replyFn() {
        seenUserAgent = this.req.headers['user-agent'];
        return [200, 'some-uuid'];
      });

    const client = new OrangebeardClient(baseURL, token, project, 'jest-orangebeard-listener');
    await client.startTestRun({
      testSetName: 'Some test set',
      startTime: new Date().toISOString(),
    } as StartTestRun);

    expect(seenUserAgent).toEqual('orangebeard-javascript-client/jest-orangebeard-listener');
  });
});

describe('OrangebeardClient request handling', () => {
  const baseURL = 'https://fake-orangebeard.test';
  const project = 'my-project';
  const api = `/listener/v3/${project}`;
  const token = 'token';
  const log = {
    testRunUUID: 'run',
    testUUID: 'test',
    message: 'm',
    logTime: new Date().toISOString(),
  } as unknown as Log;
  const attachment = {
    file: { name: 'a.txt', content: Buffer.from('a'), contentType: 'text/plain' },
    metaData: {
      testRunUUID: 'run',
      testUUID: 'test',
      logUUID: 'log',
      attachmentTime: new Date().toISOString(),
    },
  } as unknown as Attachment;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    nock.cleanAll();
  });

  it('limits the number of concurrent requests to Orangebeard (issue 8)', async () => {
    const stats = { inFlight: 0, maxInFlight: 0 };
    nock(baseURL)
      .post(`${api}/log`)
      .times(20)
      .reply((_uri, _body, callback) => {
        stats.inFlight += 1;
        stats.maxInFlight = Math.max(stats.maxInFlight, stats.inFlight);
        setTimeout(() => {
          stats.inFlight -= 1;
          callback(null, [200, 'log-real']);
        }, 20);
      });
    const client = new OrangebeardClient(baseURL, token, project, undefined, {
      maxConcurrentRequests: 4,
    });

    const results = await Promise.all(Array.from({ length: 20 }, () => client.log(log)));

    expect(results).toEqual(Array(20).fill('log-real'));
    expect(stats.maxInFlight).toBe(4);
  });

  it('reuses connections through keep-alive agents capped at the concurrency limit (issue 8)', () => {
    const client = new OrangebeardClient(baseURL, token, project, undefined, {
      maxConcurrentRequests: 6,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { defaults } = (client as any).httpClient;

    [defaults.httpAgent, defaults.httpsAgent].forEach((agent) => {
      expect(agent.keepAlive).toBe(true);
      expect(agent.maxSockets).toBe(6);
    });
  });

  it('gives attachment uploads a longer timeout than other requests (issue 9)', async () => {
    nock(baseURL)
      .post(`${api}/log`)
      .delay(300)
      .reply(200, 'log-real')
      .post(`${api}/attachment`)
      .delay(300)
      .reply(200, 'attachment-real');
    const client = new OrangebeardClient(baseURL, token, project, undefined, {
      requestTimeoutMs: 100,
      attachmentTimeoutMs: 2000,
      retries: 0,
    });

    expect(await client.log(log)).toBeNull();
    expect(await client.sendAttachment(attachment)).toEqual('attachment-real');
  });

  it('stops retrying in-flight requests once reporting has been disabled (issue 10)', async () => {
    let finishAttempts = 0;
    nock(baseURL)
      .put(`${api}/test/finish/test`)
      .times(5)
      .reply(() => {
        finishAttempts += 1;
        return [500];
      })
      .post(`${api}/suite/start`)
      .delay(50)
      .reply(401);
    const client = new OrangebeardClient(baseURL, token, project, undefined, {
      retries: 4,
      retryBaseDelayMs: 100,
    });

    await Promise.all([
      client.finishTest('test' as UUID, finishTest),
      client.startSuite({ testRunUUID: 'run', suiteNames: ['A'] } as unknown as StartSuite),
    ]);

    expect(finishAttempts).toBe(1);
  });

  it('uploads the attachment content without copying it (issue 11)', async () => {
    let uploaded = '';
    nock(baseURL)
      .post(`${api}/attachment`, (body: string) => {
        uploaded = body;
        return true;
      })
      .reply(200, 'attachment-real');
    const copySpy = jest.spyOn(Uint8Array, 'from');
    const client = new OrangebeardClient(baseURL, token, project);

    await client.sendAttachment({
      ...attachment,
      file: { ...attachment.file, content: Buffer.from('attachment-content') },
    });

    expect(uploaded).toContain('attachment-content');
    expect(copySpy).not.toHaveBeenCalled();
  });
});

describe('OrangebeardClient retry policy (issue 7)', () => {
  const baseURL = 'https://fake-orangebeard.test';
  const project = 'my-project';
  const api = `/listener/v3/${project}`;
  const log = { testRunUUID: 'run', testUUID: 'test', message: 'm' } as unknown as Log;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    nock.cleanAll();
  });

  const createClient = () =>
    new OrangebeardClient(baseURL, 'token', project, undefined, {
      retries: 2,
      retryBaseDelayMs: 1,
      requestTimeoutMs: 100,
    });

  type Outcome = { status?: number; error?: string; delayMs?: number };

  const countAttempts = (method: 'post' | 'put', path: string, outcome: Outcome) => {
    const counter = { attempts: 0 };
    const interceptor = nock(baseURL)[method](path).times(3);
    const scope = outcome.error
      ? interceptor.replyWithError({ code: outcome.error, message: outcome.error })
      : interceptor.delay(outcome.delayMs ?? 0).reply(outcome.status ?? 200, 'ok');
    scope.on('request', () => {
      counter.attempts += 1;
    });
    return counter;
  };

  const postLog = (outcome: Outcome) => {
    const counter = countAttempts('post', `${api}/log`, outcome);
    return createClient()
      .log(log)
      .then(() => counter.attempts);
  };

  const putFinishTest = (outcome: Outcome) => {
    const counter = countAttempts('put', `${api}/test/finish/test`, outcome);
    return createClient()
      .finishTest('test' as UUID, finishTest)
      .then(() => counter.attempts);
  };

  it.each([400, 409, 422])('never retries a %i client error', async (status) => {
    expect(await postLog({ status })).toBe(1);
    expect(await putFinishTest({ status })).toBe(1);
  });

  it.each([500, 502, 503, 504, 408])('retries an idempotent PUT on %i', async (status) => {
    expect(await putFinishTest({ status })).toBe(3);
  });

  it('retries an idempotent PUT on a timeout', async () => {
    expect(await putFinishTest({ delayMs: 300 })).toBe(3);
  });

  it.each([502, 503, 408])(
    'retries a POST on %i, which means the server did not process it',
    async (status) => {
      expect(await postLog({ status })).toBe(3);
    },
  );

  it.each([500, 504])(
    'does not retry a POST on %i, which may already have been processed',
    async (status) => {
      expect(await postLog({ status })).toBe(1);
    },
  );

  it('does not retry a POST on a timeout, which may already have been processed', async () => {
    expect(await postLog({ delayMs: 300 })).toBe(1);
  });

  it('retries a POST when the connection could not be established', async () => {
    expect(await postLog({ error: 'ECONNREFUSED' })).toBe(3);
  });
});

describe('OrangebeardClient configuration checks (issue 14)', () => {
  const project = 'my-project';
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    nock.cleanAll();
  });

  it.each([
    ['token', 'https://ob.test', undefined, project],
    ['endpoint', undefined, 'token', project],
    ['endpoint', 'not a url', 'token', project],
    ['endpoint', 'ftp://ob.test', 'token', project],
    ['project', 'https://ob.test', 'token', undefined],
  ])(
    'reports a missing or invalid %s once and sends nothing',
    async (field, endpoint, token, projectName) => {
      const scope = nock(/.*/).post(/.*/).reply(200, 'run');
      const client = new OrangebeardClient(endpoint, token, projectName);

      expect(await client.startTestRun({} as StartTestRun)).toBeNull();
      expect(await client.log(log())).toBeNull();

      expect(scope.isDone()).toBe(false);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(String(errorSpy.mock.calls[0])).toContain(field);
    },
  );

  it('warns that the token is sent unencrypted to a plain http endpoint', () => {
    // eslint-disable-next-line no-new
    new OrangebeardClient('http://orangebeard.example.com', 'token', project);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0])).toMatch(/http/i);
  });

  it.each(['http://localhost:8080', 'http://127.0.0.1', 'https://orangebeard.example.com'])(
    'does not warn for %s',
    (endpoint) => {
      // eslint-disable-next-line no-new
      new OrangebeardClient(endpoint, 'token', project);

      expect(warnSpy).not.toHaveBeenCalled();
    },
  );

  it('URL-encodes the project name in request paths', async () => {
    const scope = nock('http://localhost')
      .post('/listener/v3/my%20project%2Fother/test-run/start')
      .reply(200, 'run-real');
    const client = new OrangebeardClient('http://localhost', 'token', 'my project/other', undefined, {
      retries: 0,
    });

    expect(await client.startTestRun({} as StartTestRun)).toEqual('run-real');
    expect(scope.isDone()).toBe(true);
  });

  function log(): Log {
    return { testRunUUID: 'run', testUUID: 'test', message: 'm' } as unknown as Log;
  }
});

describe('OrangebeardClient when reporting is disabled', () => {
  const baseURL = 'https://fake-orangebeard.test';
  const project = 'my-project';
  const api = `/listener/v3/${project}`;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    nock.cleanAll();
  });

  it('does not upload attachments after an authentication failure', async () => {
    nock(baseURL).post(`${api}/test-run/start`).reply(401);
    const upload = nock(baseURL).post(`${api}/attachment`).reply(200, 'attachment-real');
    const client = new OrangebeardClient(baseURL, 'token', project);

    await client.startTestRun({} as StartTestRun);
    const result = await client.sendAttachment({
      file: { name: 'a.txt', content: Buffer.from('a'), contentType: 'text/plain' },
      metaData: { testRunUUID: 'run', testUUID: 'test', logUUID: 'log', attachmentTime: '' },
    } as unknown as Attachment);

    expect(result).toBeNull();
    expect(upload.isDone()).toBe(false);
  });
});
