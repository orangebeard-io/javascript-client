import { UUID } from 'crypto';
import nock from 'nock';

import OrangebeardAsyncV3Client from '../src/client/OrangebeardAsyncV3Client';
import { OrangebeardParameters } from '../src/client/models/OrangebeardParameters';
import { StartTestRun } from '../src/client/models/StartTestRun';
import { StartTest } from '../src/client/models/StartTest';
import { FinishTest } from '../src/client/models/FinishTest';
import { FinishStep } from '../src/client/models/FinishStep';
import { Log } from '../src/client/models/Log';

const baseURL = 'http://fake-orangebeard.test';
const project = 'my-project';
const api = `/listener/v3/${project}`;
const config: OrangebeardParameters = {
  endpoint: baseURL,
  token: 'token',
  project,
  testset: 'testset',
};

const RUN_UUID = '11111111-1111-1111-1111-111111111111' as UUID;
const UNKNOWN_UUID = '99999999-9999-9999-9999-999999999999' as UUID;

const now = () => new Date().toISOString();
const startTestRun = { testSetName: 'set', startTime: now() } as StartTestRun;
const finishTestRun = { endTime: now() };

const startTestFor = (testRunUUID: UUID, suiteUUID: UUID) =>
  ({ testRunUUID, suiteUUID, testName: 't', startTime: now() }) as StartTest;
const logFor = (testRunUUID: UUID, testUUID: UUID) =>
  ({ testRunUUID, testUUID, message: 'm', logTime: now() }) as Log;
const finishTestFor = (testRunUUID: UUID) => ({ testRunUUID, endTime: now() }) as FinishTest;

const withinMs = <T>(promise: Promise<T>, ms: number): Promise<T | 'TIMED_OUT'> =>
  Promise.race([
    promise,
    new Promise<'TIMED_OUT'>((resolve) => {
      setTimeout(() => resolve('TIMED_OUT'), ms);
    }),
  ]);

describe('OrangebeardAsyncV3Client', () => {
  const unhandledRejections: unknown[] = [];
  const onUnhandledRejection = (reason: unknown) => unhandledRejections.push(reason);

  beforeAll(() => {
    process.on('unhandledRejection', onUnhandledRejection);
  });

  afterAll(() => {
    process.off('unhandledRejection', onUnhandledRejection);
  });

  beforeEach(() => {
    unhandledRejections.length = 0;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    // give any stray rejections a chance to surface before asserting on them
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
    expect(unhandledRejections).toEqual([]);
    jest.restoreAllMocks();
    nock.abortPendingRequests(); // clears delayed replies of requests the client abandoned
    nock.cleanAll();
  });

  describe('robustness of the background chain (issue 1)', () => {
    it('finishes the run when a child references an unknown parent UUID', async () => {
      const finish = nock(baseURL)
        .post(`${api}/test-run/start`)
        .reply(200, RUN_UUID)
        .put(`${api}/test-run/finish/${RUN_UUID}`)
        .reply(200);
      const client = new OrangebeardAsyncV3Client(config);

      const run = client.startTestRun(startTestRun);
      client.log(logFor(run, UNKNOWN_UUID));
      client.finishTest(UNKNOWN_UUID, finishTestFor(run));

      await expect(client.finishTestRun(run, finishTestRun)).resolves.toBeUndefined();
      expect(finish.isDone()).toBe(true);
    });

    it('does not hang when the suite start response has no body', async () => {
      const finish = nock(baseURL)
        .post(`${api}/test-run/start`)
        .reply(200, RUN_UUID)
        .post(`${api}/suite/start`)
        .reply(200)
        .put(`${api}/test-run/finish/${RUN_UUID}`)
        .reply(200);
      const client = new OrangebeardAsyncV3Client(config);

      const run = client.startTestRun(startTestRun);
      const [suite] = client.startSuite({ testRunUUID: run, suiteNames: ['A'] });
      const test = client.startTest(startTestFor(run, suite));
      client.finishTest(test, finishTestFor(run));

      expect(await withinMs(client.finishTestRun(run, finishTestRun), 2000)).toBeUndefined();
      expect(finish.isDone()).toBe(true);
    });

    it('skips the children of an entity that failed to start, but still finishes the run', async () => {
      const finish = nock(baseURL)
        .post(`${api}/test-run/start`)
        .reply(200, RUN_UUID)
        .post(`${api}/suite/start`)
        .reply(200, [{ suiteUUID: 'suite-real' }])
        .post(`${api}/test/start`)
        .reply(404)
        .put(`${api}/test-run/finish/${RUN_UUID}`)
        .reply(200);
      const logCall = nock(baseURL).post(`${api}/log`).reply(200, 'log-real');
      const client = new OrangebeardAsyncV3Client(config);

      const run = client.startTestRun(startTestRun);
      const [suite] = client.startSuite({ testRunUUID: run, suiteNames: ['A'] });
      const test = client.startTest(startTestFor(run, suite));
      client.log(logFor(run, test));
      client.finishTest(test, finishTestFor(run));

      await client.finishTestRun(run, finishTestRun);
      expect(finish.isDone()).toBe(true);
      expect(logCall.isDone()).toBe(false);
    });
  });

  describe('disabling the client on errors (issue 2)', () => {
    it('keeps reporting after a single request fails with a non-auth error', async () => {
      const scope = nock(baseURL)
        .post(`${api}/test-run/start`)
        .reply(200, RUN_UUID)
        .post(`${api}/suite/start`)
        .reply(200, [{ suiteUUID: 'suite-real' }])
        .post(`${api}/test/start`)
        .reply(200, 'test-real')
        .post(`${api}/log`)
        .reply(404)
        .put(`${api}/test/finish/test-real`)
        .reply(200)
        .put(`${api}/test-run/finish/${RUN_UUID}`)
        .reply(200);
      const client = new OrangebeardAsyncV3Client(config);

      const run = client.startTestRun(startTestRun);
      const [suite] = client.startSuite({ testRunUUID: run, suiteNames: ['A'] });
      const test = client.startTest(startTestFor(run, suite));
      client.log(logFor(run, test));
      await withinMs(new Promise(() => undefined), 100);
      client.finishTest(test, finishTestFor(run));

      await client.finishTestRun(run, finishTestRun);
      expect(scope.isDone()).toBe(true);
    });

    it('stops reporting after an authentication failure', async () => {
      nock(baseURL)
        .post(`${api}/test-run/start`)
        .reply(200, RUN_UUID)
        .post(`${api}/suite/start`)
        .reply(401);
      const finish = nock(baseURL).put(`${api}/test-run/finish/${RUN_UUID}`).reply(200);
      const client = new OrangebeardAsyncV3Client(config);

      const run = client.startTestRun(startTestRun);
      client.startSuite({ testRunUUID: run, suiteNames: ['A'] });

      await client.finishTestRun(run, finishTestRun);
      expect(finish.isDone()).toBe(false);
    });
  });

  describe('finish ordering (issue 3)', () => {
    it('finishes steps and tests only after their children have been reported', async () => {
      const order: string[] = [];
      const record = (name: string, status: number, body?: string) => () => {
        order.push(name);
        return [status, body] as [number, string];
      };
      nock(baseURL)
        .post(`${api}/test-run/start`)
        .reply(200, RUN_UUID)
        .post(`${api}/suite/start`)
        .reply(200, [{ suiteUUID: 'suite-real' }])
        .post(`${api}/test/start`)
        .reply(200, 'test-real')
        .post(`${api}/step/start`, (b) => !b.parentStepUUID)
        .reply(record('outer-step-start', 200, 'outer-real'))
        .post(`${api}/step/start`, (b) => b.parentStepUUID === 'outer-real')
        .delay(50)
        .reply(record('inner-step-start', 200, 'inner-real'))
        .post(`${api}/log`)
        .delay(50)
        .reply(record('log', 200, 'log-real'))
        .post(`${api}/attachment`)
        .delay(50)
        .reply(record('attachment', 200, 'attachment-real'))
        .put(`${api}/step/finish/inner-real`)
        .delay(50)
        .reply(record('inner-step-finish', 200))
        .put(`${api}/step/finish/outer-real`)
        .reply(record('outer-step-finish', 200))
        .put(`${api}/test/finish/test-real`)
        .reply(record('test-finish', 200))
        .put(`${api}/test-run/finish/${RUN_UUID}`)
        .reply(200);
      const client = new OrangebeardAsyncV3Client(config);

      const run = client.startTestRun(startTestRun);
      const [suite] = client.startSuite({ testRunUUID: run, suiteNames: ['A'] });
      const test = client.startTest(startTestFor(run, suite));
      const outer = client.startStep({ testRunUUID: run, testUUID: test, stepName: 'o', startTime: now() });
      const inner = client.startStep({
        testRunUUID: run,
        testUUID: test,
        parentStepUUID: outer,
        stepName: 'i',
        startTime: now(),
      });
      const log = client.log({ ...logFor(run, test), stepUUID: inner });
      client.sendAttachment({
        file: { name: 'a.txt', content: Buffer.from('a'), contentType: 'text/plain' },
        metaData: { testRunUUID: run, testUUID: test, stepUUID: inner, logUUID: log, attachmentTime: now() },
      });
      client.finishStep(inner, { testRunUUID: run, status: FinishStep.Status.PASSED, endTime: now() });
      client.finishStep(outer, { testRunUUID: run, status: FinishStep.Status.PASSED, endTime: now() });
      client.finishTest(test, finishTestFor(run));

      await client.finishTestRun(run, finishTestRun);

      const before = (a: string, b: string) => {
        expect(order).toContain(a);
        expect(order).toContain(b);
        expect(order.indexOf(a)).toBeLessThan(order.indexOf(b));
      };
      before('log', 'inner-step-finish');
      before('attachment', 'inner-step-finish');
      before('inner-step-start', 'outer-step-finish');
      before('inner-step-finish', 'outer-step-finish');
      before('log', 'test-finish');
      before('attachment', 'test-finish');
      before('outer-step-finish', 'test-finish');
    });

    it('still finishes a test when one of its children failed', async () => {
      const scope = nock(baseURL)
        .post(`${api}/test-run/start`)
        .reply(200, RUN_UUID)
        .post(`${api}/suite/start`)
        .reply(200, [{ suiteUUID: 'suite-real' }])
        .post(`${api}/test/start`)
        .reply(200, 'test-real')
        .post(`${api}/log`)
        .reply(404)
        .put(`${api}/test/finish/test-real`)
        .reply(200)
        .put(`${api}/test-run/finish/${RUN_UUID}`)
        .reply(200);
      const client = new OrangebeardAsyncV3Client(config);

      const run = client.startTestRun(startTestRun);
      const [suite] = client.startSuite({ testRunUUID: run, suiteNames: ['A'] });
      const test = client.startTest(startTestFor(run, suite));
      client.log(logFor(run, test));
      client.finishTest(test, finishTestFor(run));

      await client.finishTestRun(run, finishTestRun);
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('suite paths (issue 5)', () => {
    const startRunAndSuitePath = (bodies: { test?: any; suite?: any }) => {
      nock(baseURL)
        .post(`${api}/test-run/start`)
        .reply(200, RUN_UUID)
        .post(`${api}/suite/start`, (b) => !b.parentSuiteUUID)
        .reply(200, [{ suiteUUID: 'suite-a' }, { suiteUUID: 'suite-b' }])
        .put(`${api}/test-run/finish/${RUN_UUID}`)
        .reply(200);
      nock(baseURL)
        .post(`${api}/test/start`, (b) => {
          bodies.test = b;
          return true;
        })
        .optionally()
        .reply(200, 'test-real')
        .post(`${api}/suite/start`, (b) => {
          if (!b.parentSuiteUUID) return false;
          bodies.suite = b;
          return true;
        })
        .optionally()
        .reply(200, [{ suiteUUID: 'suite-c' }]);
      const client = new OrangebeardAsyncV3Client(config);
      const run = client.startTestRun(startTestRun);
      const [a, b] = client.startSuite({ testRunUUID: run, suiteNames: ['A', 'B'] });
      return { client, run, a, b };
    };

    it('starts a test in the intermediate suite whose UUID was given', async () => {
      const bodies: { test?: any } = {};
      const { client, run, a } = startRunAndSuitePath(bodies);

      client.startTest(startTestFor(run, a));
      await client.finishTestRun(run, finishTestRun);

      expect(bodies.test?.suiteUUID).toEqual('suite-a');
    });

    it('starts a test in the deepest suite when its UUID is given', async () => {
      const bodies: { test?: any } = {};
      const { client, run, b } = startRunAndSuitePath(bodies);

      client.startTest(startTestFor(run, b));
      await client.finishTestRun(run, finishTestRun);

      expect(bodies.test?.suiteUUID).toEqual('suite-b');
    });

    it('starts a child suite under the intermediate suite whose UUID was given', async () => {
      const bodies: { suite?: any } = {};
      const { client, run, a } = startRunAndSuitePath(bodies);

      client.startSuite({ testRunUUID: run, parentSuiteUUID: a, suiteNames: ['C'] });
      await client.finishTestRun(run, finishTestRun);

      expect(bodies.suite?.parentSuiteUUID).toEqual('suite-a');
      expect(bodies.suite?.testRunUUID).toEqual(RUN_UUID);
    });
  });

  describe('null optional parent UUIDs (issue 6)', () => {
    const startRunWithTest = () => {
      nock(baseURL)
        .post(`${api}/test-run/start`)
        .reply(200, RUN_UUID)
        .post(`${api}/suite/start`)
        .reply(200, [{ suiteUUID: 'suite-real' }])
        .post(`${api}/test/start`)
        .reply(200, 'test-real')
        .put(`${api}/test-run/finish/${RUN_UUID}`)
        .reply(200);
      const client = new OrangebeardAsyncV3Client(config);
      const run = client.startTestRun(startTestRun);
      const [suite] = client.startSuite({ testRunUUID: run, suiteNames: ['A'] });
      const test = client.startTest(startTestFor(run, suite));
      return { client, run, test };
    };

    const capture = (method: 'post', path: string, response: string) => {
      const captured: { body?: any } = {};
      nock(baseURL)
        [method](path, (b) => {
          captured.body = b;
          return true;
        })
        .reply(200, response);
      return captured;
    };

    it('treats a log with stepUUID null as a test-level log', async () => {
      const { client, run, test } = startRunWithTest();
      const log = capture('post', `${api}/log`, 'log-real');

      client.log({ ...logFor(run, test), stepUUID: null });
      await client.finishTestRun(run, finishTestRun);

      expect(log.body?.testUUID).toEqual('test-real');
      expect(log.body?.stepUUID ?? null).toBeNull();
    });

    it('treats a step with parentStepUUID null as a top-level step', async () => {
      const { client, run, test } = startRunWithTest();
      const step = capture('post', `${api}/step/start`, 'step-real');

      client.startStep({
        testRunUUID: run,
        testUUID: test,
        parentStepUUID: null,
        stepName: 's',
        startTime: now(),
      });
      await client.finishTestRun(run, finishTestRun);

      expect(step.body?.testUUID).toEqual('test-real');
      expect(step.body?.parentStepUUID ?? null).toBeNull();
    });

    it('sends an attachment with stepUUID null without a step', async () => {
      const { client, run, test } = startRunWithTest();
      capture('post', `${api}/log`, 'log-real');
      let attachmentJson: any;
      nock(baseURL)
        .post(`${api}/attachment`, (b: string) => {
          const match = /name="json"\r\n\r\n(.*)\r\n/.exec(b);
          attachmentJson = match ? JSON.parse(match[1]) : undefined;
          return true;
        })
        .reply(200, 'attachment-real');

      const log = client.log(logFor(run, test));
      client.sendAttachment({
        file: { name: 'a.txt', content: Buffer.from('a'), contentType: 'text/plain' },
        metaData: { testRunUUID: run, testUUID: test, stepUUID: null, logUUID: log, attachmentTime: now() },
      });
      await client.finishTestRun(run, finishTestRun);

      expect(attachmentJson?.testUUID).toEqual('test-real');
      expect(attachmentJson?.logUUID).toEqual('log-real');
      expect(attachmentJson?.stepUUID ?? null).toBeNull();
    });
  });

  describe('memory use (issue 11)', () => {
    const settle = () =>
      new Promise((resolve) => {
        setImmediate(resolve);
      });

    const startRunWithTest = () => {
      nock(baseURL)
        .post(`${api}/test-run/start`)
        .reply(200, RUN_UUID)
        .post(`${api}/suite/start`)
        .reply(200, [{ suiteUUID: 'suite-real' }])
        .post(`${api}/test/start`)
        .reply(200, 'test-real')
        .put(`${api}/test-run/finish/${RUN_UUID}`)
        .reply(200);
      const client = new OrangebeardAsyncV3Client(config);
      const run = client.startTestRun(startTestRun);
      const [suite] = client.startSuite({ testRunUUID: run, suiteNames: ['A'] });
      const test = client.startTest(startTestFor(run, suite));
      return { client, run, suite, test };
    };

    it('releases finished tests and steps, keeping their real UUIDs resolvable', async () => {
      const { client, run, suite, test } = startRunWithTest();
      nock(baseURL)
        .post(`${api}/step/start`)
        .reply(200, 'step-real')
        .put(`${api}/step/finish/step-real`)
        .reply(200)
        .put(`${api}/test/finish/test-real`)
        .reply(200);

      const step = client.startStep({ testRunUUID: run, testUUID: test, stepName: 's', startTime: now() });
      client.finishStep(step, { testRunUUID: run, status: FinishStep.Status.PASSED, endTime: now() });
      client.finishTest(test, finishTestFor(run));
      await Promise.all(Object.values(client.promises));
      await settle();

      expect(client.promises[step]).toBeUndefined();
      expect(client.promises[test]).toBeUndefined();
      expect(Object.keys(client.promises).sort()).toEqual([run, suite].sort());
      expect(client.uuidMap[test]).toEqual('test-real');

      await client.finishTestRun(run, finishTestRun);
    });

    it('still reports logs and attachments sent after their test was finished', async () => {
      // the Playwright reporter reads attachment files after calling finishTest
      const { client, run, test } = startRunWithTest();
      let attachmentTestUUID: string | undefined;
      nock(baseURL)
        .put(`${api}/test/finish/test-real`)
        .reply(200)
        .post(`${api}/log`)
        .reply(200, 'log-real')
        .post(`${api}/attachment`, (b: string) => {
          attachmentTestUUID = /"testUUID":"([^"]+)"/.exec(b)?.[1];
          return true;
        })
        .reply(200, 'attachment-real');

      client.finishTest(test, finishTestFor(run));
      await Promise.all(Object.values(client.promises));
      await settle();
      const log = client.log(logFor(run, test));
      client.sendAttachment({
        file: { name: 'a.txt', content: Buffer.from('a'), contentType: 'text/plain' },
        metaData: { testRunUUID: run, testUUID: test, logUUID: log, attachmentTime: now() },
      });
      await client.finishTestRun(run, finishTestRun);

      expect(attachmentTestUUID).toEqual('test-real');
    });

    it('reports only the requests that are still pending when finishing the run', async () => {
      const { client, run, test } = startRunWithTest();
      nock(baseURL)
        .post(`${api}/log`)
        .reply(200, 'log-real')
        .post(`${api}/log`)
        .delay(200)
        .reply(200, 'slow-log-real');

      client.log(logFor(run, test));
      await Promise.all(Object.values(client.promises));
      await settle();
      client.log(logFor(run, test));
      await client.finishTestRun(run, finishTestRun);

      const messages = (console.log as jest.Mock).mock.calls.map((call) => String(call[0]));
      expect(messages).toContainEqual(expect.stringMatching(/Waiting for 1 pending Orangebeard request\b/));
    });

    it('does not report waiting when nothing is pending', async () => {
      const { client, run } = startRunWithTest();
      await Promise.all(Object.values(client.promises));
      await settle();

      await client.finishTestRun(run, finishTestRun);

      const messages = (console.log as jest.Mock).mock.calls.map((call) => String(call[0]));
      expect(messages.some((m) => m.startsWith('Waiting for'))).toBe(false);
    });

    it('releases settled logs, attachments and finish calls before the run ends', async () => {
      const { client, run, suite, test } = startRunWithTest();
      nock(baseURL)
        .post(`${api}/log`)
        .reply(200, 'log-real')
        .post(`${api}/attachment`)
        .reply(200, 'attachment-real')
        .put(`${api}/test/finish/test-real`)
        .reply(200);

      const log = client.log(logFor(run, test));
      const attachment = client.sendAttachment({
        file: { name: 'a.txt', content: Buffer.from('a'), contentType: 'text/plain' },
        metaData: { testRunUUID: run, testUUID: test, logUUID: log, attachmentTime: now() },
      });
      client.finishTest(test, finishTestFor(run));
      const pending = Object.values(client.promises);
      await Promise.all(pending);
      await settle();

      expect(client.promises[log]).toBeUndefined();
      expect(client.promises[attachment]).toBeUndefined();
      expect(Object.keys(client.promises).sort()).toEqual([run, suite].sort());

      await client.finishTestRun(run, finishTestRun);
    });

    it('still sends an attachment for a log that has already been reported', async () => {
      const { client, run, test } = startRunWithTest();
      let attachmentLogUUID: string | undefined;
      nock(baseURL)
        .post(`${api}/log`)
        .reply(200, 'log-real')
        .post(`${api}/attachment`, (b: string) => {
          attachmentLogUUID = /"logUUID":"([^"]+)"/.exec(b)?.[1];
          return true;
        })
        .reply(200, 'attachment-real');

      const log = client.log(logFor(run, test));
      await client.promises[log];
      await settle();
      client.sendAttachment({
        file: { name: 'a.txt', content: Buffer.from('a'), contentType: 'text/plain' },
        metaData: { testRunUUID: run, testUUID: test, logUUID: log, attachmentTime: now() },
      });
      await client.finishTestRun(run, finishTestRun);

      expect(attachmentLogUUID).toEqual('log-real');
    });

    it('releases all bookkeeping once the run is finished', async () => {
      const { client, run, test } = startRunWithTest();
      nock(baseURL).post(`${api}/log`).reply(200, 'log-real');
      client.log(logFor(run, test));

      await client.finishTestRun(run, finishTestRun);

      expect(Object.keys(client.promises)).toEqual([]);
      expect(Object.keys(client.uuidMap)).toEqual([]);
    });
  });

  describe('finish deadline (issue 10)', () => {
    it('finishes the run after the deadline even when requests are still pending', async () => {
      const finish = nock(baseURL)
        .post(`${api}/test-run/start`)
        .reply(200, RUN_UUID)
        .post(`${api}/suite/start`)
        .reply(200, [{ suiteUUID: 'suite-real' }])
        .post(`${api}/test/start`)
        .reply(200, 'test-real')
        .post(`${api}/log`)
        .delay(3000)
        .reply(200, 'log-real')
        .put(`${api}/test-run/finish/${RUN_UUID}`)
        .reply(200);
      const client = new OrangebeardAsyncV3Client(config, undefined, { finishTimeoutMs: 300 });

      const run = client.startTestRun(startTestRun);
      const [suite] = client.startSuite({ testRunUUID: run, suiteNames: ['A'] });
      const test = client.startTest(startTestFor(run, suite));
      client.log(logFor(run, test));

      const started = Date.now();
      await client.finishTestRun(run, finishTestRun);

      expect(Date.now() - started).toBeLessThan(1500);
      expect(finish.isDone()).toBe(true);
    });

    it('aborts requests that are still pending after the deadline', async () => {
      nock(baseURL)
        .post(`${api}/test-run/start`)
        .reply(200, RUN_UUID)
        .post(`${api}/suite/start`)
        .reply(200, [{ suiteUUID: 'suite-real' }])
        .post(`${api}/test/start`)
        .reply(200, 'test-real')
        .post(`${api}/log`)
        .delay(3000)
        .reply(200, 'log-real')
        .put(`${api}/test-run/finish/${RUN_UUID}`)
        .reply(200);
      const client = new OrangebeardAsyncV3Client(config, undefined, { finishTimeoutMs: 300 });

      const run = client.startTestRun(startTestRun);
      const [suite] = client.startSuite({ testRunUUID: run, suiteNames: ['A'] });
      const test = client.startTest(startTestFor(run, suite));
      const log = client.log(logFor(run, test));
      const logReported = client.promises[log];
      await client.finishTestRun(run, finishTestRun);

      expect(await withinMs(logReported, 500)).toBeNull();
    });
  });

  describe('announced test runs (issue 4)', () => {
    it('starts the announced run with an authorization header and no headers in the body', async () => {
      let authorization: string | undefined;
      let body: unknown;
      nock(baseURL)
        .put(`${api}/test-run/start/${RUN_UUID}`)
        .reply(function reply(_uri, requestBody) {
          authorization = this.req.headers.authorization;
          body = requestBody;
          return [200];
        })
        .put(`${api}/test-run/finish/${RUN_UUID}`)
        .reply(200);
      const client = new OrangebeardAsyncV3Client(config);

      client.startAnnouncedTestRun(RUN_UUID);
      await client.finishTestRun(RUN_UUID, finishTestRun);

      expect(authorization).toEqual('Bearer token');
      expect(JSON.stringify(body ?? '')).not.toContain('Authorization');
    });

    it('lets children and finishTestRun use the announced run UUID', async () => {
      let suiteBody: { testRunUUID?: string } | undefined;
      const scope = nock(baseURL)
        .put(`${api}/test-run/start/${RUN_UUID}`)
        .reply(200)
        .post(`${api}/suite/start`, (b) => {
          suiteBody = b;
          return true;
        })
        .reply(200, [{ suiteUUID: 'suite-real' }])
        .put(`${api}/test-run/finish/${RUN_UUID}`)
        .reply(200);
      const client = new OrangebeardAsyncV3Client(config);

      client.startAnnouncedTestRun(RUN_UUID);
      client.startSuite({ testRunUUID: RUN_UUID, suiteNames: ['A'] });
      await client.finishTestRun(RUN_UUID, finishTestRun);

      expect(suiteBody?.testRunUUID).toEqual(RUN_UUID);
      expect(scope.isDone()).toBe(true);
    });
  });
});
