import { UUID } from 'crypto';

export type Log = {
    testRunUUID: UUID;
    testUUID: UUID;
    stepUUID?: UUID;
    logTime: string;
    message: string;
    logLevel: Log.logLevel;
    logFormat: Log.logFormat;
};

export namespace Log {

    export enum logLevel {
        ERROR = 'ERROR',
        WARN = 'WARN',
        INFO = 'INFO',
        DEBUG = 'DEBUG',
    }

    export enum logFormat {
        PLAIN_TEXT = 'PLAIN_TEXT',
        HTML = 'HTML',
        MARKDOWN = 'MARKDOWN',
    }


}
