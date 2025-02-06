import type { Attribute } from './Attribute';

export type OrangebeardParameters = {
  token: string;
  endpoint: string;
  testset: string;
  project: string;
  description?: string;
  attributes?: Array<Attribute>;
  referenceUrl?: string;
};
