/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LogRQ } from '../models/LogRQ';

import type { CancelablePromise } from '../core/CancelablePromise';
import { request as __request } from '../core/request';
import { OpenAPIConfig } from '../core/OpenAPI';

export class LogV3ControllerService {

    /**
     * Log a message to a test or step
     * @param authorization 
     * @param projectName 
     * @param requestBody 
     * @returns any Log a message to a test or step
     * @throws ApiError
     */
    public static log(
        OpenAPI: OpenAPIConfig,
        authorization: string,
        projectName: string,
        requestBody: LogRQ,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v3/{projectName}/log',
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

    /**
     * Log a message to a test or step (batch)
     * @param authorization 
     * @param projectName 
     * @param requestBody 
     * @returns any Log a message to a test or step
     * @throws ApiError
     */
    public static logBatch(
        OpenAPI: OpenAPIConfig,
        authorization: string,
        projectName: string,
        requestBody: Array<LogRQ>,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v3/{projectName}/log/batch',
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
