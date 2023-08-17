export type AttachmentMetaData = {
    testRunUUID: string;
    testUUID: string;
    logUUID: string;
    stepUUID?: string;
    attachmentTime: string;
}

export type AttachmentFile = {
    name: string;
    content: string;
    contentType: string;
}