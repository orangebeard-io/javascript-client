import { randomUUID, UUID } from 'crypto';

import OrangebeardClient from './OrangebeardClient';
import { StartTestRun } from './models/StartTestRun';
import { FinishTestRun } from './models/FinishTestRun';
import { StartSuite } from './models/StartSuite';
import { StartTest } from './models/StartTest';
import { FinishTest } from './models/FinishTest';
import { StartStep } from './models/StartStep';
import { FinishStep } from './models/FinishStep';
import { Log } from './models/Log';
import { Attachment } from './models/Attachment';
import { OrangebeardParameters } from './models/OrangebeardParameters';
import autoConfig from './util/autoConfig';
import { Suite } from './models/Suite';

export default class OrangebeardAsyncV3Client {
  readonly promises: { [key: UUID]: Promise<any> } = {};

  readonly uuidMap: { [key: UUID]: UUID } = {};

  readonly client: OrangebeardClient;

  readonly config: OrangebeardParameters;

  constructor(orangebeardConfig: OrangebeardParameters = undefined) {
    this.config = orangebeardConfig ?? autoConfig;
    this.client = new OrangebeardClient(
      this.config.endpoint,
      this.config.token,
      this.config.project,
    );
  }

  private parentPromise(promiseUUID: UUID): Promise<any> {
    return this.promises[promiseUUID];
  }

  public startTestRun(startTestRun: StartTestRun): UUID {
    const temporaryUUID = randomUUID();
    this.promises[temporaryUUID] = this.client.startTestRun(startTestRun);
    this.promises[temporaryUUID].then((testRunUUID: UUID) => {
      this.uuidMap[temporaryUUID] = testRunUUID;
    });
    return temporaryUUID;
  }

  public startAnnouncedTestRun(testRunUUID: UUID): void {
    const temporaryUUID = randomUUID();
    this.promises[temporaryUUID] = this.client.startAnnouncedTestRun(testRunUUID);
  }

  /* eslint-disable no-console */
  public async finishTestRun(testRunUUID: UUID, finishTestRun: FinishTestRun): Promise<void> {
    console.log(
      `Waiting for ${Object.values(this.promises).length} Orangebeard requests to be processed..`,
    );
    await Promise.all(Object.values(this.promises));
    console.log('All done! Finishing Run...');
    await this.client.finishTestRun(this.uuidMap[testRunUUID], finishTestRun);
    console.log('Test Run Finished!');
  }

  /* eslint-enable no-console */

  public startSuite(startSuite: StartSuite): UUID[] {
    const tempUUIDs: UUID[] = startSuite.suiteNames.map(() => randomUUID());

    const parent =
      startSuite.parentSuiteUUID != null
        ? this.parentPromise(startSuite.parentSuiteUUID)
        : this.parentPromise(startSuite.testRunUUID);

    const suitesPromise = new Promise<UUID[]>((resolve) => {
      parent.then((parentUUID) => {
        let testRunUUID: UUID;
        let parentSuiteUUID: UUID | undefined;

        if (!startSuite.parentSuiteUUID) {
          testRunUUID = parentUUID as UUID;
        } else {
          testRunUUID = this.uuidMap[startSuite.testRunUUID];
          parentSuiteUUID =
            parentUUID instanceof Array
              ? (parentUUID[parentUUID.length - 1] as UUID)
              : (parentUUID as UUID);
        }

        const realStartSuite: StartSuite = {
          ...startSuite,
          testRunUUID,
          parentSuiteUUID,
        };

        const suites = this.client.startSuite(realStartSuite);
        suites.then((s: Suite[]) => {
          const actualUUIDs: UUID[] = s.map((suite: Suite) => suite.suiteUUID);
          tempUUIDs.forEach((key, index) => {
            this.uuidMap[key] = actualUUIDs[index];
          });
          resolve(actualUUIDs);
        });
      });
    });
    tempUUIDs.forEach((tempUUID) => {
      this.promises[tempUUID] = suitesPromise;
    });
    return tempUUIDs;
  }

  public startTest(startTest: StartTest): UUID {
    const temporaryUUID = randomUUID();

    this.promises[temporaryUUID] = new Promise<UUID | null>((resolve) => {
      const parent = this.parentPromise(startTest.suiteUUID);
      parent.then((parentUUID) => {
        const parentSuiteUUID: UUID =
          parentUUID instanceof Array
            ? (parentUUID[parentUUID.length - 1] as UUID)
            : (parentUUID as UUID);

        const realStartTest: StartTest = {
          ...startTest,
          testRunUUID: this.uuidMap[startTest.testRunUUID],
          suiteUUID: parentSuiteUUID,
        };

        const startTestCall = this.client.startTest(realStartTest);
        startTestCall.then((actualUUID: UUID) => {
          this.uuidMap[temporaryUUID] = actualUUID;
          resolve(actualUUID);
        });
      });
    });
    return temporaryUUID;
  }

  public finishTest(testUUID: UUID, finishTest: FinishTest): void {
    this.promises[randomUUID()] = new Promise((resolve) => {
      const parent = this.parentPromise(testUUID);
      parent.then((actualTestUUID) => {
        const realFinishTest: FinishTest = {
          ...finishTest,
          testRunUUID: this.uuidMap[finishTest.testRunUUID],
        };
        const finishTestCall = this.client.finishTest(actualTestUUID, realFinishTest);
        finishTestCall.then(() => resolve(undefined));
      });
    });
  }

  public startStep(startStep: StartStep): UUID {
    const temporaryUUID = randomUUID();

    this.promises[temporaryUUID] = new Promise<UUID | null>((resolve) => {
      const parent =
        startStep.parentStepUUID != null
          ? this.parentPromise(startStep.parentStepUUID)
          : this.parentPromise(startStep.testUUID);
      parent.then((parentUUID) => {
        let testUUID: UUID;
        let parentStepUUID: UUID | undefined;

        if (startStep.parentStepUUID === undefined) {
          testUUID = parentUUID;
        } else {
          testUUID = this.uuidMap[startStep.testUUID];
          parentStepUUID = this.uuidMap[startStep.parentStepUUID];
        }

        const realStartStep: StartStep = {
          ...startStep,
          testRunUUID: this.uuidMap[startStep.testRunUUID],
          testUUID,
          parentStepUUID,
        };

        const startStepCall = this.client.startStep(realStartStep);
        startStepCall.then((actualUUID: UUID) => {
          this.uuidMap[temporaryUUID] = actualUUID;
          resolve(actualUUID);
        });
      });
    });
    return temporaryUUID;
  }

  public finishStep(stepUUID: UUID, finishStep: FinishStep): void {
    this.promises[randomUUID()] = new Promise((resolve) => {
      const parent = this.parentPromise(stepUUID);
      parent.then((actualStepUUID) => {
        const realFinishStep = {
          ...finishStep,
          testRunUUID: this.uuidMap[finishStep.testRunUUID],
        };
        const finishStepCall = this.client.finishStep(actualStepUUID, realFinishStep);
        finishStepCall.then(() => resolve(undefined));
      });
    });
  }

  public log(log: Log): UUID {
    const temporaryUUID = randomUUID();
    this.promises[temporaryUUID] = new Promise<UUID | null>((resolve) => {
      const parent =
        log.stepUUID != null ? this.parentPromise(log.stepUUID) : this.parentPromise(log.testUUID);
      parent.then((parentUUID) => {
        let testUUID: UUID;
        let stepUUID: UUID | undefined;

        if (log.stepUUID === undefined) {
          testUUID = parentUUID;
        } else {
          testUUID = this.uuidMap[log.testUUID];
          stepUUID = parentUUID;
        }

        const realLog = {
          ...log,
          testRunUUID: this.uuidMap[log.testRunUUID],
          testUUID,
          stepUUID,
        };

        const logCall = this.client.log(realLog);
        logCall.then((actualUUID: UUID) => {
          this.uuidMap[temporaryUUID] = actualUUID;
          resolve(actualUUID);
        });
      });
    });
    return temporaryUUID;
  }

  /**
   * @param logs list of log entries to send
   * @deprecated Use single async log calls to ensure synchronization. This method now acts as a forwarder
   */
  public sendLogBatch(logs: Log[]): void {
    logs.forEach((log) => this.log(log));
  }

  public sendAttachment(attachment: Attachment): UUID {
    const temporaryUUID = randomUUID();
    this.promises[temporaryUUID] = new Promise<UUID | null>((resolve) => {
      const parent = this.parentPromise(attachment.metaData.logUUID);
      parent.then((actualLogUUID) => {
        const realAttachment = {
          ...attachment,
          metadata: {
            ...attachment.metaData,
            testRunUUID: this.uuidMap[attachment.metaData.testRunUUID],
            testUUID: this.uuidMap[attachment.metaData.testUUID],
            stepUUID:
              attachment.metaData.stepUUID === undefined
                ? undefined
                : this.uuidMap[attachment.metaData.stepUUID],
            logUUID: actualLogUUID,
          },
        };

        const attachmentCall = this.client.sendAttachment(realAttachment);
        attachmentCall.then((actualUUID: UUID) => {
          this.uuidMap[temporaryUUID] = actualUUID;
          resolve(actualUUID);
        });
      });
    });
    return temporaryUUID;
  }
}
