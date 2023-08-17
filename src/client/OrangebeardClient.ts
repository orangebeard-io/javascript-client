import type { OrangebeardParameters } from './models/OrangebeardParameters';

import { AttachmentV3ControllerService } from './services/AttachmentV3ControllerService';
import { LogV3ControllerService } from './services/LogV3ControllerService';
import { StepV3ControllerService } from './services/StepV3ControllerService';
import { SuiteV3ControllerService } from './services/SuiteV3ControllerService';
import { TestRunV3ControllerService } from './services/TestRunV3ControllerService';
import { TestV3ControllerService } from './services/TestV3ControllerService';
import { StartTestRun } from './models/StartTestRun';
import { ListenerCall } from './models/ListenerCall';
import { StartSuiteRQ } from './models/StartSuiteRQ';
import { Attribute } from './models/Attribute';
import { StartTest } from './models/StartTest';
import { StartStep } from './models/StartStep';
import { LogRQ } from './models/LogRQ';

import UniqId from 'uniqid';
import fs from 'fs';
import mime from 'mime';
import path from 'path';
import { AttachmentFile, AttachmentMetaData } from './models/Attachment';
import { OpenAPIConfig } from './core/OpenAPI';
import { FinishStep } from './models/FinishStep';
import { FinishTest } from './models/FinishTest';
import { CancelablePromise } from './core/CancelablePromise';

export class OrangebeardClient {
    testrunState: Map<string, ListenerCall>;
    config: OrangebeardParameters;
    testrunTempid: string;
    testrunUuid: string;
    openApiConfig: OpenAPIConfig;

    constructor(params: OrangebeardParameters) {
        this.config = params;
        this.testrunState = new Map();
        this.openApiConfig = {
            BASE: [params.endpoint, 'listener'].join('/'),
            VERSION: '1.0',
            WITH_CREDENTIALS: false,
            CREDENTIALS: 'include',
        }

    }

    private saveRealUuid(response: any, tempId: string) {
        this.testrunState[tempId].realUuid = response.data;
    }
    private saveRealSuiteUuids(response: any, tempIds: Array<string>) {
        tempIds.forEach((tempId, i) => {
            this.testrunState[tempId].realUuid = response.data[i]['suiteUUID'];
        });
    }

    private base64EncodeFile(fileName: string): string {
        const fileData = fs.readFileSync(fileName);
        return Buffer.from(fileData).toString('base64');
    };

    public startTestRun(): string {
        const tempId = UniqId();
        this.testrunTempid = tempId;

        const testRunInfo: StartTestRun = {
            testSetName: this.config.testset,
            description: this.config.description,
            startTime: new Date().toUTCString(),
            attributes: this.config.attributes,
        };

        this.testrunState[tempId] = {
            promise: TestRunV3ControllerService.startTestRun(this.openApiConfig, this.config.token, this.config.project, testRunInfo)
        };

        this.testrunState[tempId].promise.then((response: { data: any; }) => {
            this.saveRealUuid(response, tempId);
            this.testrunUuid = this.testrunState[tempId].realUuid;
        });

        return tempId;
    }

    public finishTestRun() {
        const finishTime = new Date().toUTCString();
        let promises: CancelablePromise<any>[] = [];
        this.testrunState.forEach((values) => {
            promises.push(values.promise);
        });
        Promise.all(promises).then(() => {
            TestRunV3ControllerService.finishTestRun(this.openApiConfig, this.config.token, this.config.project, this.testrunUuid, { endTime: finishTime });
        });
    }

    public startSuite(suiteNames: Array<string>, parentTempId?: string, description?: string, attributes?: Array<Attribute>): Array<string> {
        const tempIds: Array<string> = [];
        suiteNames.forEach(() => {
            tempIds.push(UniqId());
        });

        const parentId: string = parentTempId ?? this.testrunTempid;


        this.testrunState[parentId].promise.then(() => {

            const suiteInfo: StartSuiteRQ = {
                testRunUUID: this.testrunUuid,
                parentSuiteUUID: parentTempId === undefined ? undefined : this.testrunState[parentId].realUuid,
                description: description,
                attributes: attributes,
                suiteNames: suiteNames
            };

            const suitesPromise = SuiteV3ControllerService.startSuite(this.openApiConfig, this.config.token, this.config.project, suiteInfo);
            tempIds.forEach((tempId) => {
                this.testrunState[tempId] = { promise: suitesPromise };
            });

            suitesPromise.then((response: { data: any }) => {
                this.saveRealSuiteUuids(response, tempIds);
            });
        });
        return tempIds;
    }

    public startTest(suiteId: string, testName: string, testType: StartTest.testType, description?: string, attributes?: Array<Attribute>): string {
        const tempId = UniqId();
        const startTime = new Date().toUTCString();

        this.testrunState[suiteId].promise.then(() => {
            const testInfo: StartTest = {
                testRunUUID: this.testrunUuid,
                suiteUUID: this.testrunState[suiteId].realUuid,
                testName: testName,
                testType: testType,
                description: description,
                attributes: attributes,
                startTime: startTime
            };

            this.testrunState[tempId] = {
                promise: TestV3ControllerService.startTest(this.openApiConfig, this.config.token, this.config.project, testInfo)
            };

            this.testrunState[tempId].promise.then((response: { data: any }) => {
                this.saveRealUuid(response, tempId);
            });
        });
        return tempId;
    }

    public finishTest(testId: string, status: FinishTest.status) {
        const finishTime = new Date().toUTCString();

        this.testrunState[testId].promise.then(() => {
            const finishTestInfo: FinishStep = {
                testRunUUID: this.testrunUuid,
                status: status,
                endTime: finishTime
            }
            const testUUID = this.testrunState[testId].realUuid;

            this.testrunState[UniqId()] = { promise: TestV3ControllerService.finishTest(this.openApiConfig, this.config.token, this.config.project, testUUID, finishTestInfo) }
        })
    }

    public startStep(testId: string, stepName: string, description?: string): string {
        const tempId = UniqId();
        const startTime = new Date().toUTCString();

        this.testrunState[testId].promise.then(() => {
            const stepInfo: StartStep = {
                testRunUUID: this.testrunUuid,
                testUUID: this.testrunState[testId].realUuid,
                stepName: stepName,
                description: description,
                startTime: startTime
            };

            this.testrunState[tempId] = { promise: StepV3ControllerService.startstep(this.openApiConfig, this.config.token, this.config.project, stepInfo) };

            this.testrunState[tempId].promise.then((response: { data: any }) => {
                this.saveRealUuid(response, tempId);
            });
        });
        return tempId;
    }

    public finishStep(stepId: string, status: FinishStep.status) {
        const finishTime = new Date().toUTCString();

        this.testrunState[stepId].promise.then(() => {
            const finishStepInfo: FinishStep = {
                testRunUUID: this.testrunUuid,
                status: status,
                endTime: finishTime
            }
            const stepUUID = this.testrunState[stepId].realUuid;

            this.testrunState[UniqId()] = { promise: StepV3ControllerService.finishstep(this.openApiConfig, this.config.token, this.config.project, stepUUID, finishStepInfo) }
        })
    }

    public sendLog(testId: string, message: string, level: LogRQ.logLevel, format: LogRQ.logFormat, stepId?: string): string {
        const tempId = UniqId();
        const logTime = new Date().toUTCString();

        const parentId: string = stepId ?? testId;

        this.testrunState[parentId].promise.then(() => {
            const logInfo: LogRQ = {
                testRunUUID: this.testrunUuid,
                testUUID: this.testrunState[testId].realUuid,
                stepUUID: stepId ? this.testrunState[stepId].realUuid : undefined,
                logTime: logTime,
                message: message,
                logLevel: level,
                logFormat: format
            }

            this.testrunState[tempId] = { promise: LogV3ControllerService.log(this.openApiConfig, this.config.token, this.config.project, logInfo) };

            this.testrunState[tempId].promise.then((response: { data: any }) => {
                this.saveRealUuid(response, tempId);
            });
        });
        return tempId;
    }

    public sendAttachment(testId: string, logId: string, filePath: string, stepId?: string, contentType?: string): string {
        const tempId = UniqId();
        const attachmentTime = new Date().toUTCString();

        this.testrunState[logId].promise.then(() => {
            const attachmentFile: AttachmentFile = {
                name: path.basename(filePath),
                content: this.base64EncodeFile(filePath),
                contentType: contentType ?? (mime.getType(filePath) || 'application/octest-stream')
            };

            const attachmentMeta: AttachmentMetaData = {
                testRunUUID: this.testrunUuid,
                testUUID: this.testrunState[testId].realUuid,
                logUUID: this.testrunState[logId].realUuid,
                stepUUID: stepId ? this.testrunState[stepId].realUuid : undefined,
                attachmentTime: attachmentTime
            };

            this.testrunState[tempId] = { promise: AttachmentV3ControllerService.logWithAttachment(this.openApiConfig, this.config.token, this.config.project, attachmentMeta, attachmentFile) };
            this.testrunState[tempId].promise.then((response: { data: any }) => {
                this.saveRealUuid(response, tempId);
            });
        })
        return tempId;
    }
}