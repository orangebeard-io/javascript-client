/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { StartSuiteRQ } from '../models/StartSuiteRQ';

import type { CancelablePromise } from '../core/CancelablePromise';
import { request as __request } from '../core/request';
import { OpenAPIConfig } from '../core/OpenAPI';

export class SuiteV3ControllerService {

    /**
     * Starts a suite for specified project
     * @param authorization 
     * @param projectName 
     * @param requestBody 
     * @returns any Starts a suite for specified project
     * @throws ApiError
     */
    public static startSuite(
        OpenAPI: OpenAPIConfig,
        authorization: string,
        projectName: string,
        requestBody: StartSuiteRQ,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v3/{projectName}/suite/start',
            path: {
                'projectName': projectName,
            },
            headers: {
                'Authorization': authorization,
            },
            body: requestBody,
            mediaType: 'Application/Json',
        });
    }

}
