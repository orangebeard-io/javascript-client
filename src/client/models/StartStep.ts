/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

/**
 * Start step request body
 */
export type StartStep = {
    testRunUUID: string;
    testUUID: string;
    parentStepUUID?: string;
    stepName: string;
    description?: string;
    startTime: string;
};
