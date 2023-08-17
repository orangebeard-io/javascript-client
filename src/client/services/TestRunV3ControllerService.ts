/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnounceTestRun } from '../models/AnnounceTestRun';
import type { FinishTestRun } from '../models/FinishTestRun';
import type { StartTestRun } from '../models/StartTestRun';

import type { CancelablePromise } from '../core/CancelablePromise';
import { request as __request } from '../core/request';
import { OpenAPIConfig } from '../core/OpenAPI';

export class TestRunV3ControllerService {

    /**
     * Update properties of an existing created test-run.
     * @param authorization 
     * @param projectName 
     * @param testRunUuid 
     * @returns any OK
     * @throws ApiError
     */
    public static updateAnnouncedTestRunStatus(
        OpenAPI: OpenAPIConfig,
        authorization: string,
        projectName: string,
        testRunUuid: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/v3/{projectName}/test-run/start/{testRunUUID}',
            path: {
                'projectName': projectName,
                'testRunUUID': testRunUuid,
            },
            headers: {
                'Authorization': authorization,
            },
        });
    }

    /**
     * Finish test run for specified project
     * @param authorization 
     * @param projectName 
     * @param testRunUuid 
     * @param requestBody 
     * @returns any Test run finished for specified project.
     * @throws ApiError
     */
    public static finishTestRun(
        OpenAPI: OpenAPIConfig,
        authorization: string,
        projectName: string,
        testRunUuid: string,
        requestBody: FinishTestRun,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/v3/{projectName}/test-run/finish/{testRunUUID}',
            path: {
                'projectName': projectName,
                'testRunUUID': testRunUuid,
            },
            headers: {
                'Authorization': authorization,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }

    /**
     * Starts a test run for specified project
     * @param authorization 
     * @param projectName 
     * @param requestBody 
     * @returns any Test Run started for specified project.
     * @throws ApiError
     */
    public static startTestRun(
        OpenAPI: OpenAPIConfig,
        authorization: string,
        projectName: string,
        requestBody: StartTestRun,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v3/{projectName}/test-run/start',
            path: {
                'projectName': projectName,
            },
            headers: {
                'Authorization': authorization,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }

    /**
     * Announce a testrun for a specified project
     * @param authorization 
     * @param projectName 
     * @param requestBody 
     * @returns any Announce a testrun, including a list of changed components.
     * @throws ApiError
     */
    public static announceTestRun(
        OpenAPI: OpenAPIConfig,
        authorization: string,
        projectName: string,
        requestBody: AnnounceTestRun,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v3/{projectName}/test-run/announce',
            path: {
                'projectName': projectName,
            },
            headers: {
                'Authorization': authorization,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }

}
