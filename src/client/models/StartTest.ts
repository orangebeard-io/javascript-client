import { UUID } from 'crypto';
import type { Attribute } from './Attribute';

export type StartTest = {
  testRunUUID: UUID;
  suiteUUID: UUID;
  testName: string;
  testType: StartTest.TestType;
  description?: string;
  attributes?: Array<Attribute>;
  startTime: string;
};

export namespace StartTest {
  export enum TestType {
    TEST = 'TEST',
    BEFORE = 'BEFORE',
    AFTER = 'AFTER',
  }
}
