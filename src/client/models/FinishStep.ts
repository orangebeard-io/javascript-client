/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type FinishStep = {
    testRunUUID: string;
    status: FinishStep.status;
    endTime: string;
};

export namespace FinishStep {

    export enum status {
        PASSED = 'PASSED',
        FAILED = 'FAILED',
        SKIPPED = 'SKIPPED',
        STOPPED = 'STOPPED',
        TIMED_OUT = 'TIMED_OUT',
    }


}
