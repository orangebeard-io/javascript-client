import nock from 'nock';

import OrangebeardClient from '../src/client/OrangebeardClient';
import { StartTestRun } from '../src/client/models/StartTestRun';

describe('OrangebeardClient error logging', () => {
  const baseURL = 'http://fake-orangebeard.test';
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
