import { UUID } from 'crypto';

export type Attachment = {
  file: AttachmentFile;
  metaData: AttachmentMetaData;
};

export type AttachmentMetaData = {
  testRunUUID: UUID;
  testUUID: UUID;
  logUUID: UUID;
  stepUUID?: UUID;
  attachmentTime: string;
};

export type AttachmentFile = {
  name: string;
  content: Buffer;
  contentType: string;
};
