/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FinishTest } from '../models/FinishTest';
import type { StartTest } from '../models/StartTest';

import type { CancelablePromise } from '../core/CancelablePromise';
import { request as __request } from '../core/request';
import { OpenAPIConfig } from '../core/OpenAPI';

export class TestV3ControllerService {

    /**
     * Finish test run for specified project
     * @param authorization 
     * @param projectName 
     * @param testUuid 
     * @param requestBody 
     * @returns any Test run finished for specified project
     * @throws ApiError
     */
    public static finishTest(
        OpenAPI: OpenAPIConfig,
        authorization: string,
        projectName: string,
        testUuid: string,
        requestBody: FinishTest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/v3/{projectName}/test/finish/{testUUID}',
            path: {
                'projectName': projectName,
                'testUUID': testUuid,
            },
            headers: {
                'Authorization': authorization,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }

    /**
     * Starts a test for specified project
     * @param authorization 
     * @param projectName 
     * @param requestBody 
     * @returns any Test started for specified project
     * @throws ApiError
     */
    public static startTest(
        OpenAPI: OpenAPIConfig,
        authorization: string,
        projectName: string,
        requestBody: StartTest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v3/{projectName}/test/start',
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
