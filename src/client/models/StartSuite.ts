import { UUID } from 'crypto';
import type { Attribute } from './Attribute';

export type StartSuite = {
  testRunUUID: UUID;
  parentSuiteUUID?: UUID;
  description?: string;
  attributes?: Array<Attribute>;
  suiteNames: Array<string>;
};
