import type { Attribute } from './Attribute';
import type { SUTComponent } from './SUTComponent';

export type StartTestRun = {
    testSetName?: string;
    description?: string;
    startTime?: string;
    attributes?: Array<Attribute>;
    sutComponents?: Array<SUTComponent>;
};
