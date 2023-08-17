/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

/**
 * Log request body
 */
export type LogRQ = {
    testRunUUID: string;
    testUUID: string;
    stepUUID?: string;
    logTime: string;
    message: string;
    logLevel: LogRQ.logLevel;
    logFormat: LogRQ.logFormat;
};

export namespace LogRQ {

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
