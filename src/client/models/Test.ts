/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type Test = {
    status?: Test.status;
    testId?: string;
    startTime?: number;
    endTime?: number;
    suiteId?: string;
    testName?: string;
    testType?: Test.testType;
    testRunId?: string;
    suiteNames?: Array<string>;
    description?: string;
    projectName?: string;
    testSetName?: string;
    testSetDisplayName?: string;
    testRunUserFacingId?: string;
};

export namespace Test {

    export enum status {
        IN_PROGRESS = 'IN_PROGRESS',
        ANNOUNCED = 'ANNOUNCED',
        PASSED = 'PASSED',
        FAILED = 'FAILED',
        SKIPPED = 'SKIPPED',
        STOPPED = 'STOPPED',
        INTERRUPTED = 'INTERRUPTED',
        TIMED_OUT = 'TIMED_OUT',
    }

    export enum testType {
        TEST = 'TEST',
        BEFORE = 'BEFORE',
        AFTER = 'AFTER',
    }


}
