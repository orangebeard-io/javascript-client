import { UUID } from 'crypto';

export type FinishTest = {
    testRunUUID: UUID;
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
