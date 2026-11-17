/**
 * Package entry point.
 *
 * `require('@orangebeard-io/javascript-client')` returns the client class itself (unchanged
 * CommonJS shape), and every model type and enum is available from the package root:
 *
 *   import OrangebeardAsyncV3Client, { StartTest, Log } from '@orangebeard-io/javascript-client';
 *
 * Deep imports from `dist/client/...` keep working, but are no longer needed.
 */
import BaseClient from './OrangebeardAsyncV3Client';
import OrangebeardClientClass from './OrangebeardClient';
import * as AnnounceTestRunModule from './models/AnnounceTestRun';
import * as AttachmentModule from './models/Attachment';
import * as AttributeModule from './models/Attribute';
import * as ChangedComponentModule from './models/ChangedComponent';
import * as ClientOptionsModule from './models/ClientOptions';
import * as FinishStepModule from './models/FinishStep';
import * as FinishTestModule from './models/FinishTest';
import * as FinishTestRunModule from './models/FinishTestRun';
import * as LogModule from './models/Log';
import * as OrangebeardParametersModule from './models/OrangebeardParameters';
import * as StartStepModule from './models/StartStep';
import * as StartSuiteModule from './models/StartSuite';
import * as StartTestModule from './models/StartTest';
import * as StartTestRunModule from './models/StartTestRun';
import * as SuiteModule from './models/Suite';
import * as SUTComponentModule from './models/SUTComponent';

/** The public client; see OrangebeardAsyncV3Client in ./OrangebeardAsyncV3Client. */
class OrangebeardAsyncV3Client extends BaseClient {}

// Merged with the class so that `export =` can carry the models as well (types and enums).
namespace OrangebeardAsyncV3Client {
  /** The low-level, request-per-call client the async client is built on. */
  export const OrangebeardClient = OrangebeardClientClass;
  export type OrangebeardClient = OrangebeardClientClass;

  export type AnnounceTestRun = AnnounceTestRunModule.AnnounceTestRun;
  export type Attachment = AttachmentModule.Attachment;
  export type AttachmentFile = AttachmentModule.AttachmentFile;
  export type AttachmentMetaData = AttachmentModule.AttachmentMetaData;
  export type Attribute = AttributeModule.Attribute;
  export type ChangedComponent = ChangedComponentModule.ChangedComponent;
  export type ClientOptions = ClientOptionsModule.ClientOptions;
  export type FinishTestRun = FinishTestRunModule.FinishTestRun;
  export type OrangebeardParameters = OrangebeardParametersModule.OrangebeardParameters;
  export type StartStep = StartStepModule.StartStep;
  export type StartSuite = StartSuiteModule.StartSuite;
  export type StartTestRun = StartTestRunModule.StartTestRun;
  export type Suite = SuiteModule.Suite;

  // models with enums: type and value (e.g. StartTest.TestType.TEST)
  export import FinishStep = FinishStepModule.FinishStep;
  export import FinishTest = FinishTestModule.FinishTest;
  export import Log = LogModule.Log;
  export import StartTest = StartTestModule.StartTest;
  export import SUTComponent = SUTComponentModule.SUTComponent;
}

export = OrangebeardAsyncV3Client;
