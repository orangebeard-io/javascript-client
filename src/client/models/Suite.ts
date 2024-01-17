import { UUID } from 'crypto';

export type Suite = {
  suiteUUID: UUID;
  parentUUID?: UUID;
  localSuiteName: string;
  fullSuitePath: Array<string>;
};
