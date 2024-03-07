import { UUID } from 'crypto';

export type StartStep = {
  testRunUUID: UUID;
  testUUID: UUID;
  parentStepUUID?: UUID;
  stepName: string;
  description?: string;
  startTime: string;
};
