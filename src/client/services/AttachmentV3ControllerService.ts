/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPIConfig } from '../core/OpenAPI';
import { request as __request } from '../core/request';
import { AttachmentFile, AttachmentMetaData } from '../models/Attachment';

export class AttachmentV3ControllerService {

    /**
     * Attach a file to a log
     * @param authorization 
     * @param projectName 
     * @returns any Attach a file to a log
     * @throws ApiError
     */
    public static logWithAttachment(
OpenAPI: OpenAPIConfig,
authorization: string,
projectName: string,
attachmentMetaData: AttachmentMetaData,
attachmentFile: AttachmentFile
): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v3/{projectName}/attachment',
            path: {
                'projectName': projectName,
            },
            headers: {
                'Authorization': authorization,
                'Content-Type': 'multipart/form-data',
            },
            formData: {
                'json': JSON.stringify(attachmentMetaData),
                'attachment': attachmentFile,
            }
        });
    }

}
