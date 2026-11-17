import axios, { AxiosError } from 'axios';

/** The request never reached the server, so it is safe to send again whatever the method. */
const CONNECTION_NOT_ESTABLISHED = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EHOSTUNREACH',
  'ENETUNREACH',
]);

/** Transient failures where the server may or may not have processed the request. */
const TRANSIENT_NETWORK_ERRORS = new Set([
  ...Array.from(CONNECTION_NOT_ESTABLISHED),
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNABORTED', // axios request timeout
  'EPIPE',
]);

/** Responses that indicate the server did not process the request. */
const NOT_PROCESSED_STATUSES = new Set([408, 502, 503]);

const IDEMPOTENT_METHODS = new Set(['get', 'head', 'options', 'put', 'delete']);

/**
 * Decides whether a failed request may be sent again.
 *
 * - Client errors (4xx except 408) are never retried: sending the same request won't help.
 * - Idempotent requests (the `finish*` PUTs) are retried on any transient failure.
 * - POSTs create entities (tests, steps, logs, ...), so they are only retried when the server
 *   certainly did not process them; retrying after e.g. a timeout could create duplicates.
 */
export function isRetryable(error: AxiosError): boolean {
  if (axios.isCancel(error)) {
    return false;
  }
  const idempotent = IDEMPOTENT_METHODS.has(error.config?.method?.toLowerCase() ?? '');
  const status = error.response?.status;

  if (status !== undefined) {
    return NOT_PROCESSED_STATUSES.has(status) || (idempotent && status >= 500);
  }

  const code = error.code ?? '';
  return idempotent ? TRANSIENT_NETWORK_ERRORS.has(code) : CONNECTION_NOT_ESTABLISHED.has(code);
}
