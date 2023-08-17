/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { Attribute } from './Attribute';
import type { ChangedComponent } from './ChangedComponent';

/**
 * Start test run request body
 */
export type StartTestRun = {
    testSetName?: string;
    description?: string;
    startTime?: string;
    attributes?: Array<Attribute>;
    changedComponents?: Array<ChangedComponent>;
};
