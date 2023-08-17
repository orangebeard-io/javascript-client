/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { Attribute } from './Attribute';

/**
 * Start test request body
 */
export type StartTest = {
    testRunUUID: string;
    suiteUUID: string;
    testName: string;
    testType: StartTest.testType;
    description?: string;
    attributes?: Array<Attribute>;
    startTime: string;
};

export namespace StartTest {

    export enum testType {
        TEST = 'TEST',
        BEFORE = 'BEFORE',
        AFTER = 'AFTER',
    }


}
