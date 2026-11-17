// The package entry point must let listeners import everything they need from the package root,
// with types, instead of deep imports from dist/client/... (issue 17).
import OrangebeardAsyncV3Client, {
  AnnounceTestRun,
  Attachment,
  AttachmentFile,
  AttachmentMetaData,
  Attribute,
  ChangedComponent,
  ClientOptions,
  FinishStep,
  FinishTest,
  FinishTestRun,
  Log,
  OrangebeardParameters,
  StartStep,
  StartSuite,
  StartTest,
  StartTestRun,
  Suite,
  SUTComponent,
} from '../src/client';
import BaseClient from '../src/client/OrangebeardAsyncV3Client';

describe('package entry point', () => {
  const config: OrangebeardParameters = {
    endpoint: 'https://ob.test',
    token: 'token',
    project: 'project',
    testset: 'testset',
  };

  it('keeps require() returning the client class, for existing JavaScript callers', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    const required = require('../src/client');

    expect(typeof required).toBe('function');
    expect(new required(config)).toBeInstanceOf(BaseClient);
  });

  it('exports the client as the default export', () => {
    const options: ClientOptions = { maxConcurrentRequests: 2 };

    expect(new OrangebeardAsyncV3Client(config, 'listener', options)).toBeInstanceOf(BaseClient);
  });

  it('exports the enums as values', () => {
    expect(StartTest.TestType.TEST).toBe('TEST');
    expect(FinishTest.Status.PASSED).toBe('PASSED');
    expect(FinishStep.Status.FAILED).toBe('FAILED');
    expect(Log.LogLevel.INFO).toBe('INFO');
    expect(Log.LogFormat.MARKDOWN).toBe('MARKDOWN');
    expect(SUTComponent).toBeDefined();
  });

  it('exports every model type', () => {
    // compile-time check: each of these must be importable from the package root
    const models: [
      AnnounceTestRun?,
      Attachment?,
      AttachmentFile?,
      AttachmentMetaData?,
      Attribute?,
      ChangedComponent?,
      FinishTestRun?,
      StartStep?,
      StartSuite?,
      StartTestRun?,
      Suite?,
    ] = [];

    expect(models).toEqual([]);
  });
});
