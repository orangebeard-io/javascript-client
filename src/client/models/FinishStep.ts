import { UUID } from 'crypto';

export type FinishStep = {
    testRunUUID: UUID;
    status: FinishStep.status;
    endTime: string;
};

export namespace FinishStep {

    export enum status {
        PASSED = 'PASSED',
        FAILED = 'FAILED',
        SKIPPED = 'SKIPPED',
        STOPPED = 'STOPPED',
        TIMED_OUT = 'TIMED_OUT',
    }


}
