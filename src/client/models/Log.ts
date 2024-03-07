import { UUID } from 'crypto';

export type Log = {
  testRunUUID: UUID;
  testUUID: UUID;
  stepUUID?: UUID;
  logTime: string;
  message: string;
  logLevel: Log.LogLevel;
  logFormat: Log.LogFormat;
};

export namespace Log {
  export enum LogLevel {
    ERROR = 'ERROR',
    WARN = 'WARN',
    INFO = 'INFO',
    DEBUG = 'DEBUG',
  }

  export enum LogFormat {
    PLAIN_TEXT = 'PLAIN_TEXT',
    HTML = 'HTML',
    MARKDOWN = 'MARKDOWN',
  }
}
