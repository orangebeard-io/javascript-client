export type SUTComponent = {
    componentId?: string;
    componentName?: string;
    version?: string;
    status?: SUTComponent.Status;
    createdDateTime?: string;
    updatedDateTime?: string;
};

export namespace SUTComponent {

    export enum Status {
        NEW = 'NEW',
        EXISTING = 'EXISTING',
    }


}
