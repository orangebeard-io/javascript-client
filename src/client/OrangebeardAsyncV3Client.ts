import { randomUUID, UUID } from 'crypto';

import { OrangebeardClient } from './OrangebeardClient';
import { StartTestRun } from './models/StartTestRun';
import { FinishTestRun } from './models/FinishTestRun';
import { StartSuite } from './models/StartSuite';
import { StartTest } from './models/StartTest';
import { FinishTest } from './models/FinishTest';
import { StartStep } from './models/StartStep';
import { FinishStep } from './models/FinishStep';
import { Log } from './models/Log';
import { Attachment } from './models/Attachment';

export class OrangebeardAsyncV3Client {
    readonly _promises = new Map<UUID, Promise<any>>;
    readonly _uuidMap = new Map<UUID, UUID>;
    readonly client: OrangebeardClient;

    constructor(endpoint: string, accessToken: UUID, projectName: string) {
        console.log('CREATING ORANGEBEARD ASYNC V3 CLIENT!');
        this.client = new OrangebeardClient(endpoint, accessToken, projectName);
    }

    private parentPromise(promiseUUID: UUID): Promise<any> {
        const parentPromise = this._promises[promiseUUID];
        return parentPromise;
    }

    public startTestRun(startTestRun: StartTestRun): UUID {
        const temporaryUUID = randomUUID();
        console.log('STARTING RUN. FAKEUUID: ' + temporaryUUID);
        this._promises[temporaryUUID] = this.client.startTestRun(startTestRun);
        this._promises[temporaryUUID].then((testRunUUID: UUID) => {
            this._uuidMap[temporaryUUID] = testRunUUID;
            console.log('STARTED RUN. REALUUID: ' + testRunUUID);
        });
        return temporaryUUID;
    }

    public startAnnouncedTestRun(testRunUUID: UUID): void {
        const temporaryUUID = randomUUID();
        this._promises[temporaryUUID] = this.client.startAnnouncedTestRun(testRunUUID);
    }

    public async finishTestRun(testRunUUID: UUID, finishTestRun: FinishTestRun): Promise<void> {
        console.log(`Waiting for ${Object.values(this._promises).length} Orangebeard requests to be processed..`);
        await Promise.all(Object.values(this._promises));
        console.log('All done! Finishing Run...');
        await this.client.finishTestRun(this._uuidMap[testRunUUID], finishTestRun);
        console.log('Test Run Finished!');
    }

    public startSuite(startSuite: StartSuite): UUID[] {
        const tempUUIDs: UUID[] = startSuite.suiteNames.map(() => {
            return randomUUID();
        });

        const parent = startSuite.parentSuiteUUID != undefined ?
            this.parentPromise(startSuite.parentSuiteUUID) :
            this.parentPromise(startSuite.testRunUUID);

        const suitesPromise = new Promise<UUID[]>((resolve) => {
            parent.then((parentUUID) => {
                let realStartSuite: StartSuite;
                let testRunUUID: UUID;
                let parentSuiteUUID: UUID | undefined;

                if (!startSuite.parentSuiteUUID) {
                    testRunUUID = parentUUID as UUID;
                } else {
                    testRunUUID = this._uuidMap[startSuite.testRunUUID];
                    parentSuiteUUID = parentUUID instanceof Array ?
                        parentUUID[parentUUID.length - 1] as UUID :
                        parentUUID as UUID;
                }

                realStartSuite = {
                    ...startSuite,
                    testRunUUID: testRunUUID,
                    parentSuiteUUID: parentSuiteUUID
                };

                const suites = this.client.startSuite(realStartSuite);
                suites.then((s) => {
                    const actualUUIDs: UUID[] = s.map((suite) => suite.suiteUUID);
                    tempUUIDs.forEach((key, index) => {
                        this._uuidMap[key] = actualUUIDs[index]
                    })
                    resolve(actualUUIDs);
                });
            })
        })
        tempUUIDs.forEach((tempUUID) => {
            this._promises[tempUUID] = suitesPromise;
        });
        return tempUUIDs;
    }

    public startTest(startTest: StartTest): UUID {
        const temporaryUUID = randomUUID();

        const startTestPromise = new Promise<UUID | null>((resolve) => {
            const parent = this.parentPromise(startTest.suiteUUID);
            parent.then((parentUUID) => {
                let realStartTest: StartTest;
                let parentSuiteUUID: UUID;

                parentSuiteUUID = parentUUID instanceof Array ?
                    parentUUID[parentUUID.length - 1] as UUID :
                    parentUUID as UUID;

                realStartTest = {
                    ...startTest,
                    testRunUUID: this._uuidMap[startTest.testRunUUID],
                    suiteUUID: parentSuiteUUID,
                };

                const startTestCall = this.client.startTest(realStartTest);
                startTestCall.then((actualUUID) => {
                    this._uuidMap[temporaryUUID] = actualUUID;
                    resolve(actualUUID);
                });
            });
        });
        this._promises[temporaryUUID] = startTestPromise;
        return temporaryUUID;
    }

    public finishTest(testUUID: UUID, finishTest: FinishTest): void {
        const finishTestPromise = new Promise((resolve) => {
            const parent = this.parentPromise(testUUID);
            parent.then((actualTestUUID) => {
                let realFinishTest: FinishTest;
                realFinishTest = {
                    ...finishTest,
                    testRunUUID: this._uuidMap[finishTest.testRunUUID]
                };
                const finishTestCall = this.client.finishTest(actualTestUUID, realFinishTest);
                finishTestCall.then(() => resolve(undefined));
            });
        });
        this._promises[randomUUID()] = finishTestPromise;
    }

    public startStep(startStep: StartStep): UUID {
        const temporaryUUID = randomUUID();

        const startStepPromise = new Promise<UUID | null>((resolve) => {
            const parent = startStep.parentStepUUID != undefined ? this.parentPromise(startStep.parentStepUUID) : this.parentPromise(startStep.testUUID);
            parent.then((parentUUID) => {
                let realStartStep: StartStep;
                let testUUID: UUID;
                let parentStepUUID: UUID | undefined;

                if (startStep.parentStepUUID === undefined) {
                    testUUID = parentUUID;
                } else {
                    testUUID = this._uuidMap[startStep.testUUID];
                    parentStepUUID = this._uuidMap[startStep.parentStepUUID];
                }

                realStartStep = {
                    ...startStep,
                    testRunUUID: this._uuidMap[startStep.testRunUUID],
                    testUUID: testUUID,
                    parentStepUUID: parentStepUUID
                };

                const startStepCall = this.client.startStep(realStartStep);
                startStepCall.then((actualUUID) => {
                    this._uuidMap[temporaryUUID] = actualUUID;
                    resolve(actualUUID);
                });
            });
        });
        this._promises[temporaryUUID] = startStepPromise;
        return temporaryUUID;
    }

    public finishStep(stepUUID: UUID, finishStep: FinishStep): void {
        const finishStepPromise = new Promise((resolve) => {
            const parent = this.parentPromise(stepUUID);
            parent.then((actualStepUUID) => {

                const realFinishStep = {
                    ...finishStep,
                    testRunUUID: this._uuidMap[finishStep.testRunUUID]
                };
                const finishStepCall = this.client.finishStep(actualStepUUID, realFinishStep);
                finishStepCall.then(() => resolve(undefined));
            });
        });
        this._promises[randomUUID()] = finishStepPromise;
    }

    public log(log: Log): UUID {
        const temporaryUUID = randomUUID();
        const logPromise = new Promise<UUID | null>((resolve) => {
            const parent = log.stepUUID != undefined ? this.parentPromise(log.stepUUID) : this.parentPromise(log.testUUID);
            parent.then((parentUUID) => {
                let testUUID: UUID;
                let stepUUID: UUID | undefined;


                if (log.stepUUID === undefined) {
                    testUUID = parentUUID;
                } else {
                    testUUID = this._uuidMap[log.testUUID];
                    stepUUID = parentUUID;
                }

                const realLog = {
                    ...log,
                    testRunUUID: this._uuidMap[log.testRunUUID],
                    testUUID: testUUID,
                    stepUUID: stepUUID
                }

                const logCall = this.client.log(realLog);
                logCall.then((actualUUID) => {
                    this._uuidMap[temporaryUUID] = actualUUID;
                    resolve(actualUUID);
                });
            });
        });

        this._promises[temporaryUUID] = logPromise;
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
        const attachmentPromise = new Promise<UUID | null>((resolve) => {
            const parent = this.parentPromise(attachment.metaData.logUUID);
            parent.then((actualLogUUID) => {
                const realAttachment = {
                    ...attachment,
                    metadata: {
                        ...attachment.metaData,
                        testRunUUID: this._uuidMap[attachment.metaData.testRunUUID],
                        testUUID: this._uuidMap[attachment.metaData.testUUID],
                        stepUUID: attachment.metaData.stepUUID === undefined ? undefined : this._uuidMap[attachment.metaData.stepUUID],
                        logUUID: actualLogUUID
                    }
                }

                const attachmentCall = this.client.sendAttachment(realAttachment);
                attachmentCall.then((actualUUID) => {
                    this._uuidMap[temporaryUUID] = actualUUID;
                    resolve(actualUUID);
                })
            });
        })
        this._promises[temporaryUUID] = attachmentPromise;
        return temporaryUUID;
    }
}