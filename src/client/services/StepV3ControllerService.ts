/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FinishStep } from '../models/FinishStep';
import type { StartStep } from '../models/StartStep';

import type { CancelablePromise } from '../core/CancelablePromise';
import { request as __request } from '../core/request';
import { OpenAPIConfig } from '../core/OpenAPI';

export class StepV3ControllerService {

    /**
     * Finish step run for specified project
     * @param authorization 
     * @param projectName 
     * @param stepUuid 
     * @param requestBody 
     * @returns any step run finished for specified project
     * @throws ApiError
     */
    public static finishstep(
        OpenAPI: OpenAPIConfig,
        authorization: string,
        projectName: string,
        stepUuid: string,
        requestBody: FinishStep,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/v3/{projectName}/step/finish/{stepUUID}',
            path: {
                'projectName': projectName,
                'stepUUID': stepUuid,
            },
            headers: {
                'Authorization': authorization,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }

    /**
     * Starts a step for specified project
     * @param authorization 
     * @param projectName 
     * @param requestBody 
     * @returns any Step started for specified project
     * @throws ApiError
     */
    public static startstep(
        OpenAPI: OpenAPIConfig,
        authorization: string,
        projectName: string,
        requestBody: StartStep,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v3/{projectName}/step/start',
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
