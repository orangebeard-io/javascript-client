/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type SUTComponent = {
    componentId?: string;
    componentName?: string;
    version?: string;
    status?: SUTComponent.status;
    createdDateTime?: string;
    updatedDateTime?: string;
};

export namespace SUTComponent {

    export enum status {
        NEW = 'NEW',
        EXISTING = 'EXISTING',
    }


}
