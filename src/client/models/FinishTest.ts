/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type FinishTest = {
    testRunUUID: string;
    status: FinishTest.status;
    endTime: string;
};

export namespace FinishTest {

    export enum status {
        PASSED = 'PASSED',
        FAILED = 'FAILED',
        SKIPPED = 'SKIPPED',
        STOPPED = 'STOPPED',
        TIMED_OUT = 'TIMED_OUT',
    }


}
