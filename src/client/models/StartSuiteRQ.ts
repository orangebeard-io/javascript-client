/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { Attribute } from './Attribute';

/**
 * Start suite request body
 */
export type StartSuiteRQ = {
    testRunUUID: string;
    parentSuiteUUID?: string;
    description?: string;
    attributes?: Array<Attribute>;
    suiteNames: Array<string>;
};
