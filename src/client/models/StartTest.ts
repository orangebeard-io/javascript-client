import type { Attribute } from './Attribute';
import { UUID } from 'crypto';

export type StartTest = {
    testRunUUID: UUID;
    suiteUUID: UUID;
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
