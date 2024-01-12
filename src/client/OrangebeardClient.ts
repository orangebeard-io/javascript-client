import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { UUID } from 'crypto';

import { StartTestRun } from './models/StartTestRun';
import { FinishTestRun } from './models/FinishTestRun';
import { Suite } from './models/Suite';
import { StartSuite } from './models/StartSuite';
import { StartTest } from './models/StartTest';
import { FinishTest } from './models/FinishTest';
import { StartStep } from './models/StartStep';
import { FinishStep } from './models/FinishStep';
import { Log } from './models/Log';
import { Attachment } from './models/Attachment';
import FormData from 'form-data';

interface HttpHeaders {
    [key: string]: string;
}

export class OrangebeardClient {
    private readonly accessToken: string;
    private readonly projectName: string;
    private connectionWithOrangebeardIsValid: boolean;
    private readonly httpClient: AxiosInstance;

    constructor(baseURL: string, accessToken: string, projectName: string) {
        this.accessToken = accessToken;
        this.projectName = projectName;
        this.connectionWithOrangebeardIsValid = true;

        this.httpClient = axios.create({
            baseURL,
            timeout: 10000
        });
    }

    private getAuthorizationHeaders(accessToken: string): HttpHeaders {
        return {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        };
    }

    private handleError(error) {
        console.error('Failed to communicate with Orangebeard!', error);
        this.connectionWithOrangebeardIsValid = false;
    }

    public async startTestRun(testRun: StartTestRun): Promise<UUID | null> {
        if (this.connectionWithOrangebeardIsValid) {
            try {
                const response: AxiosResponse<UUID> = await this.httpClient.post(
                    `/listener/v3/${this.projectName}/test-run/start`,
                    testRun,
                    {
                        headers: this.getAuthorizationHeaders(String(this.accessToken)),
                    }
                );
                return response.data ?? null;
            } catch (error) {
                this.handleError(error);
            }
        }
        return null;
    }

    public async startAnnouncedTestRun(testRunUUID: UUID): Promise<void> {
        if (this.connectionWithOrangebeardIsValid) {
            try {
                await this.httpClient.put(
                    `/listener/v3/${this.projectName}/test-run/start/${testRunUUID}`,
                    {
                        headers: this.getAuthorizationHeaders(String(this.accessToken)),
                    }
                );
            } catch (error) {
                this.handleError(error);
            }
        }
    }

    public async finishTestRun(testRunUUID: UUID, finishTestRun: FinishTestRun): Promise<void> {
        if (this.connectionWithOrangebeardIsValid) {
            try {
                await this.httpClient.put(
                    `/listener/v3/${this.projectName}/test-run/finish/${testRunUUID}`, finishTestRun,
                    {
                        headers: this.getAuthorizationHeaders(String(this.accessToken)),
                    }
                );
            } catch (error) {
                this.handleError(error);
            }
        }
    }

    public async startSuite(suite: StartSuite): Promise<Array<Suite>> {
        if (this.connectionWithOrangebeardIsValid) {
            try {
                const response: AxiosResponse<Array<Suite>> = await this.httpClient.post(
                    `/listener/v3/${this.projectName}/suite/start`, suite,
                    {
                        headers: this.getAuthorizationHeaders(String(this.accessToken)),
                    }
                );
                return response.data ?? null;
            } catch (error) {
                this.handleError(error);
            }
        }
        return new Array<Suite>();
    }

    public async startTest(test: StartTest): Promise<UUID | null> {
        if (this.connectionWithOrangebeardIsValid) {
            try {
                const response: AxiosResponse<UUID> = await this.httpClient.post(
                    `/listener/v3/${this.projectName}/test/start`, test,
                    {
                        headers: this.getAuthorizationHeaders(String(this.accessToken)),
                    }
                );
                return response.data ?? null;
            } catch (error) {
                this.handleError(error);
            }
        }
        return null;
    }

    public async finishTest(testUUID: UUID, finishTest: FinishTest): Promise<void> {
        if (this.connectionWithOrangebeardIsValid) {
            try {
                await this.httpClient.put(
                    `/listener/v3/${this.projectName}/test/finish/${testUUID}`, finishTest,
                    {
                        headers: this.getAuthorizationHeaders(String(this.accessToken)),
                    }
                );
            } catch (error) {
                this.handleError(error);
            }
        }
    }

    public async startStep(step: StartStep): Promise<UUID | null> {
        if (this.connectionWithOrangebeardIsValid) {
            try {
                const response: AxiosResponse<UUID> = await this.httpClient.post(
                    `/listener/v3/${this.projectName}/step/start`, step,
                    {
                        headers: this.getAuthorizationHeaders(String(this.accessToken)),
                    }
                );
                return response.data ?? null;
            } catch (error) {
                this.handleError(error);
            }
        }
        return null;
    }

    public async finishStep(stepUUID: UUID, finishStep: FinishStep): Promise<void> {
        if (this.connectionWithOrangebeardIsValid) {
            try {
                await this.httpClient.put(
                    `/listener/v3/${this.projectName}/step/finish/${stepUUID}`, finishStep,
                    {
                        headers: this.getAuthorizationHeaders(String(this.accessToken)),
                    }
                );
            } catch (error) {
                this.handleError(error);
            }
        }
    }

    public async log(log: Log): Promise<UUID | null> {
        if (this.connectionWithOrangebeardIsValid) {
            try {
                const response: AxiosResponse<UUID> = await this.httpClient.post(
                    `/listener/v3/${this.projectName}/log`, log,
                    {
                        headers: this.getAuthorizationHeaders(String(this.accessToken)),
                    }
                );
                return response.data ?? null;
            } catch (error) {
                this.handleError(error);
            }
        }
        return null;
    }

    public async sendAttachment(attachment: Attachment): Promise<UUID | null> {
        try {
            const formData = new FormData();
            const fileBlob = new Blob([attachment.file.content], { type: attachment.file.contentType });
            const metaBlob = new Blob([JSON.stringify(attachment.metaData)], { type: 'application/json' });

            formData.append('json', metaBlob);
            formData.append('attachment', fileBlob, attachment.file.name);

            const headers = {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'multipart/form-data',
            };

            const response: AxiosResponse<UUID> = await this.httpClient.post(
                `/listener/v3/${this.projectName}/attachment`, formData,
                {
                    headers: headers,
                }
            );
            return response.data ?? null;
        } catch (error) {
            this.handleError(error);
        }
        return null;
    }
}