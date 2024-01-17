import { UUID } from 'crypto';

export type FinishStep = {
  testRunUUID: UUID;
  status: FinishStep.Status;
  endTime: string;
};

export namespace FinishStep {
  export enum Status {
    PASSED = 'PASSED',
    FAILED = 'FAILED',
    SKIPPED = 'SKIPPED',
    STOPPED = 'STOPPED',
    TIMED_OUT = 'TIMED_OUT',
  }
}
