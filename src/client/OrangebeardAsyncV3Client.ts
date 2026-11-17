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
import { ClientOptions, resolveClientOptions } from './models/ClientOptions';
import autoConfig from './util/autoConfig';

/**
 * Reports to Orangebeard without making the caller wait for server responses.
 *
 * Every call returns a temporary UUID immediately; the matching request is sent in the background
 * as soon as its parent has been created. Each background promise always resolves (never rejects):
 * to the real UUID on success, or to null when the request failed, its parent is unknown, or its
 * parent failed. Children of a null parent are skipped, so a single failure never breaks the chain
 * or leaves `finishTestRun` waiting forever.
 *
 * Finishing a test or step is sent only after everything reported inside it (steps, logs,
 * attachments and their finishes) has been processed, so the server never receives children of
 * an already finished entity.
 */
export default class OrangebeardAsyncV3Client {
  readonly promises: { [key: UUID]: Promise<any> } = {};

  readonly uuidMap: { [key: UUID]: UUID } = {};

  readonly client: OrangebeardClient;

  readonly config: OrangebeardParameters;

  /** Temporary UUID of a step, log or attachment → temporary UUID of its direct parent. */
  private readonly parentOf: { [key: UUID]: UUID } = {};

  /** Temporary UUID of a test or step → pending work inside it that its finish must wait for. */
  private readonly pendingDescendants: { [key: UUID]: Promise<unknown>[] } = {};

  /** Background work that has not settled yet; what `finishTestRun` actually waits for. */
  private readonly unsettled = new Set<Promise<unknown>>();

  private readonly finishTimeoutMs: number;

  constructor(
    orangebeardConfig: OrangebeardParameters = undefined,
    listenerId?: string,
    options: ClientOptions = {},
  ) {
    this.config = orangebeardConfig ?? autoConfig;
    this.finishTimeoutMs = resolveClientOptions(options).finishTimeoutMs;
    this.client = new OrangebeardClient(
      this.config.endpoint,
      this.config.token,
      this.config.project,
      listenerId,
      options,
    );
  }

  private static reportUnexpectedError(error: unknown): null {
    console.error(
      'Unexpected error while reporting to Orangebeard:',
      error instanceof Error ? error.message : error,
    );
    return null;
  }

  /** Makes sure a background promise never rejects. */
  private static safe<T>(promise: Promise<T>): Promise<T | null> {
    return promise.catch(OrangebeardAsyncV3Client.reportUnexpectedError);
  }

  /**
   * Runs `action` with the real UUID of the parent identified by `parentUUID`.
   * Resolves to null without calling `action` when the parent is unknown or failed.
   */
  private afterParent<T>(
    parentUUID: UUID | null | undefined,
    action: (actualParentUUID: UUID) => Promise<T | null>,
  ): Promise<T | null> {
    const parent = parentUUID != null ? this.lookupParent(parentUUID) : undefined;
    if (parent === undefined) {
      console.warn(
        `Orangebeard: unknown or failed parent UUID ${parentUUID}; item is not reported.`,
      );
      return Promise.resolve(null);
    }
    return OrangebeardAsyncV3Client.safe(
      parent.then((actualParentUUID) => (actualParentUUID ? action(actualParentUUID) : null)),
    );
  }

  private trackedAfterParent<T>(
    parentUUID: UUID | null | undefined,
    action: (actualParentUUID: UUID) => Promise<T | null>,
  ): Promise<T | null> {
    return this.track(this.afterParent(parentUUID, action));
  }

  /** A pending parent's promise, or, once it was released, its already known real UUID. */
  private lookupParent(parentUUID: UUID): Promise<UUID | null> | undefined {
    const pending = this.promises[parentUUID];
    if (pending !== undefined) {
      return pending;
    }
    const actualUUID = this.uuidMap[parentUUID];
    return actualUUID ? Promise.resolve(actualUUID) : undefined;
  }

  /** Counts `promise` as pending background work until it settles. */
  private track<T>(promise: Promise<T>): Promise<T> {
    this.unsettled.add(promise);
    const settled = () => {
      this.unsettled.delete(promise);
    };
    promise.then(settled, settled);
    return promise;
  }

  /** Removes `key` from `promises` once `settled` has settled, unless it was replaced meanwhile. */
  private releaseAfter(key: UUID, settled: Promise<unknown>, expected = this.promises[key]): void {
    const release = () => {
      if (this.promises[key] === expected) {
        delete this.promises[key];
      }
    };
    settled.then(release, release);
  }

  /**
   * Registers a promise that nothing else will wait on once it has settled (logs, attachments,
   * finish calls), and drops it from `promises` as soon as it settles so a long run doesn't keep
   * every request around. A released entity can still be a parent: see `lookupParent`.
   */
  private keepUntilSettled(key: UUID, promise: Promise<unknown>): void {
    this.promises[key] = this.track(promise);
    this.releaseAfter(key, promise, promise);
  }

  /** Drops all bookkeeping of a finished run. */
  private releaseAll(): void {
    [this.promises, this.uuidMap, this.parentOf, this.pendingDescendants].forEach((map) => {
      Object.keys(map).forEach((key) => {
        delete (map as Record<string, unknown>)[key];
      });
    });
    this.unsettled.clear();
  }

  private remember(temporaryUUID: UUID, actualUUID: UUID | null | undefined): UUID | null {
    if (actualUUID) {
      this.uuidMap[temporaryUUID] = actualUUID;
    }
    return actualUUID ?? null;
  }

  /** Registers `promise` as pending work inside `parentUUID` and all of its ancestors. */
  private trackUnder(parentUUID: UUID | undefined, promise: Promise<unknown>): void {
    let ancestor = parentUUID;
    while (ancestor !== undefined) {
      (this.pendingDescendants[ancestor] ??= []).push(promise);
      ancestor = this.parentOf[ancestor];
    }
  }

  private registerChild(temporaryUUID: UUID, parentUUID: UUID, promise: Promise<unknown>): void {
    this.parentOf[temporaryUUID] = parentUUID;
    this.trackUnder(parentUUID, promise);
  }

  /** Resolves once all work registered inside `uuid` so far has settled. */
  private descendantsOf(uuid: UUID): Promise<unknown> {
    const pending = this.pendingDescendants[uuid] ?? [];
    delete this.pendingDescendants[uuid];
    return Promise.all(pending);
  }

  public startTestRun(startTestRun: StartTestRun): UUID {
    const temporaryUUID = randomUUID();
    this.promises[temporaryUUID] = this.track(
      OrangebeardAsyncV3Client.safe(
        this.client
          .startTestRun(startTestRun)
          .then((testRunUUID) => this.remember(temporaryUUID, testRunUUID)),
      ),
    );
    return temporaryUUID;
  }

  /**
   * Starts a test run that was announced earlier. The announced UUID is used as-is: pass it as
   * `testRunUUID` to child calls and to `finishTestRun`.
   * @returns the announced test run UUID
   */
  public startAnnouncedTestRun(testRunUUID: UUID): UUID {
    this.promises[testRunUUID] = this.track(
      OrangebeardAsyncV3Client.safe(
        this.client
          .startAnnouncedTestRun(testRunUUID)
          .then((startedUUID) => this.remember(testRunUUID, startedUUID)),
      ),
    );
    return testRunUUID;
  }

  /**
   * Waits for pending requests (at most `finishTimeoutMs`, see ClientOptions), then finishes the
   * run. Requests still pending after the deadline are abandoned so the test process is not held
   * up by a slow or unreachable Orangebeard.
   */
  public async finishTestRun(testRunUUID: UUID, finishTestRun: FinishTestRun): Promise<void> {
    const pending = Array.from(this.unsettled);
    if (pending.length > 0) {
      const plural = pending.length === 1 ? '' : 's';
      console.log(`Waiting for ${pending.length} pending Orangebeard request${plural}..`);
    }

    let deadline: ReturnType<typeof setTimeout> | undefined;
    const allSettled = Promise.all(pending.map(OrangebeardAsyncV3Client.safe)).then(() => true);
    const timedOut = new Promise<boolean>((resolve) => {
      deadline = setTimeout(() => resolve(false), this.finishTimeoutMs);
    });
    const completed = await Promise.race([allSettled, timedOut]);
    clearTimeout(deadline);
    if (!completed) {
      console.warn(
        `Orangebeard requests still pending after ${this.finishTimeoutMs} ms; finishing the run without them.`,
      );
      this.client.abandonPendingRequests();
    }

    const actualTestRunUUID = this.uuidMap[testRunUUID];
    this.releaseAll();
    if (!actualTestRunUUID) {
      console.error('Orangebeard test run was not started; it cannot be finished.');
      return;
    }
    console.log('All done! Finishing Run...');
    await OrangebeardAsyncV3Client.safe(
      this.client.finishTestRun(actualTestRunUUID, finishTestRun),
    );
    console.log('Test Run Finished!');
  }

  /**
   * Starts a path of nested suites (each name is a child of the previous one).
   * @returns one temporary UUID per suite name, in the same order
   */
  public startSuite(startSuite: StartSuite): UUID[] {
    const tempUUIDs: UUID[] = startSuite.suiteNames.map(() => randomUUID());
    const parentSuiteUUID = startSuite.parentSuiteUUID ?? undefined;

    const suitesPromise = this.trackedAfterParent<UUID[]>(
      parentSuiteUUID ?? startSuite.testRunUUID,
      async (actualParentUUID) => {
        const suites = await this.client.startSuite({
          ...startSuite,
          testRunUUID:
            parentSuiteUUID === undefined ? actualParentUUID : this.uuidMap[startSuite.testRunUUID],
          parentSuiteUUID: parentSuiteUUID === undefined ? undefined : actualParentUUID,
        });
        return suites.map((suite) => suite?.suiteUUID);
      },
    );

    tempUUIDs.forEach((tempUUID, index) => {
      this.promises[tempUUID] = suitesPromise.then((actualUUIDs) =>
        this.remember(tempUUID, actualUUIDs?.[index]),
      );
    });
    return tempUUIDs;
  }

  public startTest(startTest: StartTest): UUID {
    const temporaryUUID = randomUUID();
    this.promises[temporaryUUID] = this.trackedAfterParent<UUID>(
      startTest.suiteUUID,
      (actualSuiteUUID) =>
        this.client
          .startTest({
            ...startTest,
            testRunUUID: this.uuidMap[startTest.testRunUUID],
            suiteUUID: actualSuiteUUID,
          })
          .then((actualUUID) => this.remember(temporaryUUID, actualUUID)),
    );
    return temporaryUUID;
  }

  public finishTest(testUUID: UUID, finishTest: FinishTest): void {
    const finished = this.descendantsOf(testUUID).then(() =>
      this.afterParent<void>(testUUID, (actualTestUUID) =>
        this.client.finishTest(actualTestUUID, {
          ...finishTest,
          testRunUUID: this.uuidMap[finishTest.testRunUUID],
        }),
      ),
    );
    this.keepUntilSettled(randomUUID(), finished);
    // the test's real UUID stays in uuidMap for anything reported after its finish
    this.releaseAfter(testUUID, finished);
  }

  public startStep(startStep: StartStep): UUID {
    const temporaryUUID = randomUUID();
    const parentStepUUID = startStep.parentStepUUID ?? undefined;
    const parentUUID = parentStepUUID ?? startStep.testUUID;

    const promise = this.trackedAfterParent<UUID>(parentUUID, (actualParentUUID) =>
      this.client
        .startStep({
          ...startStep,
          testRunUUID: this.uuidMap[startStep.testRunUUID],
          testUUID:
            parentStepUUID === undefined ? actualParentUUID : this.uuidMap[startStep.testUUID],
          parentStepUUID: parentStepUUID === undefined ? undefined : actualParentUUID,
        })
        .then((actualUUID) => this.remember(temporaryUUID, actualUUID)),
    );

    this.promises[temporaryUUID] = promise;
    this.registerChild(temporaryUUID, parentUUID, promise);
    return temporaryUUID;
  }

  public finishStep(stepUUID: UUID, finishStep: FinishStep): void {
    const promise = this.descendantsOf(stepUUID).then(() =>
      this.afterParent<void>(stepUUID, (actualStepUUID) =>
        this.client.finishStep(actualStepUUID, {
          ...finishStep,
          testRunUUID: this.uuidMap[finishStep.testRunUUID],
        }),
      ),
    );
    this.keepUntilSettled(randomUUID(), promise);
    this.trackUnder(this.parentOf[stepUUID], promise);
    this.releaseAfter(stepUUID, promise);
  }

  public log(log: Log): UUID {
    const temporaryUUID = randomUUID();
    const stepUUID = log.stepUUID ?? undefined;
    const parentUUID = stepUUID ?? log.testUUID;

    const promise = this.afterParent<UUID>(parentUUID, (actualParentUUID) =>
      this.client
        .log({
          ...log,
          testRunUUID: this.uuidMap[log.testRunUUID],
          testUUID: stepUUID === undefined ? actualParentUUID : this.uuidMap[log.testUUID],
          stepUUID: stepUUID === undefined ? undefined : actualParentUUID,
        })
        .then((actualUUID) => this.remember(temporaryUUID, actualUUID)),
    );

    this.keepUntilSettled(temporaryUUID, promise);
    this.registerChild(temporaryUUID, parentUUID, promise);
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
    const { logUUID } = attachment.metaData;
    const stepUUID = attachment.metaData.stepUUID ?? undefined;

    const promise = this.afterParent<UUID>(logUUID, (actualLogUUID) =>
      this.client
        .sendAttachment({
          ...attachment,
          metaData: {
            ...attachment.metaData,
            testRunUUID: this.uuidMap[attachment.metaData.testRunUUID],
            testUUID: this.uuidMap[attachment.metaData.testUUID],
            stepUUID: stepUUID === undefined ? undefined : this.uuidMap[stepUUID],
            logUUID: actualLogUUID,
          },
        })
        .then((actualUUID) => this.remember(temporaryUUID, actualUUID)),
    );

    this.keepUntilSettled(temporaryUUID, promise);
    this.trackUnder(logUUID, promise); // nothing is reported under an attachment
    return temporaryUUID;
  }
}
