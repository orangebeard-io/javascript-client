import type { Attribute } from './Attribute';
import type { SUTComponent } from './SUTComponent';

export type AnnounceTestRun = {
    testSetName?: string;
    description?: string;
    startTime?: string;
    attributes?: Array<Attribute>;
    sutComponents?: Array<SUTComponent>;
};
