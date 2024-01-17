import { UUID } from 'crypto';

export type FinishTest = {
  testRunUUID: UUID;
  status: FinishTest.Status;
  endTime: string;
};

export namespace FinishTest {
  export enum Status {
    PASSED = 'PASSED',
    FAILED = 'FAILED',
    SKIPPED = 'SKIPPED',
    STOPPED = 'STOPPED',
    TIMED_OUT = 'TIMED_OUT',
  }
}
