import type { CancelablePromise } from "../core/CancelablePromise"

export type ListenerCall = {
    promise: CancelablePromise<any>,
    realUuid: string
}