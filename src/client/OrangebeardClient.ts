import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { UUID } from 'crypto';
import http from 'http';
import https from 'https';

import { StartTestRun } from './models/StartTestRun';
import { FinishTestRun } from './models/FinishTestRun';
import { Suite } from './models/Suite';
import { StartSuite } from './models/StartSuite';
import { StartTest } from './models/StartTest';
import { FinishTest } from './models/FinishTest';
import { StartStep } from './models/StartStep';
import { FinishStep } from './models/FinishStep';
import { Log } from './models/Log';
import { Attachment } from './models/Attachment';
import { ClientOptions, resolveClientOptions } from './models/ClientOptions';
import { applyRetry } from './util/retry';
import { isRetryable } from './util/retryPolicy';
import { applyConcurrencyLimit } from './util/concurrency';

type HttpHeaders = {
  [key: string]: string;
};

const USER_AGENT_BASE = 'orangebeard-javascript-client';

export default class OrangebeardClient {
  private readonly accessToken: string;

  private readonly projectName: string;

  private connectionWithOrangebeardIsValid: boolean;

  private readonly httpClient: AxiosInstance;

  private readonly attachmentTimeoutMs: number;

  /** Set once pending work was given up on; only finishing the test run is still allowed. */
  private abandoned = false;

  private abortController = new AbortController();

  constructor(
    baseURL: string,
    accessToken: string,
    projectName: string,
    listenerId?: string,
    options: ClientOptions = {},
  ) {
    this.accessToken = accessToken;
    this.projectName = encodeURIComponent(projectName ?? '');
    this.connectionWithOrangebeardIsValid = OrangebeardClient.checkConfiguration(
      baseURL,
      accessToken,
      projectName,
    );

    const settings = resolveClientOptions(options);
    this.attachmentTimeoutMs = settings.attachmentTimeoutMs;

    const userAgent = listenerId ? `${USER_AGENT_BASE}/${listenerId}` : USER_AGENT_BASE;
    // keep-alive avoids a TCP/TLS handshake per request; maxSockets backs up the limiter below
    const agentOptions = { keepAlive: true, maxSockets: settings.maxConcurrentRequests };

    this.httpClient = axios.create({
      baseURL,
      timeout: settings.requestTimeoutMs,
      headers: { 'User-Agent': userAgent },
      httpAgent: new http.Agent(agentOptions),
      httpsAgent: new https.Agent(agentOptions),
    });

    // order matters: the limiter must release its slot before the retry interceptor backs off
    applyConcurrencyLimit(this.httpClient, settings.maxConcurrentRequests);

    // lets abandonPendingRequests() cancel everything in flight or waiting for a slot
    this.httpClient.interceptors.request.use((config) => {
      config.signal ??= this.abortController.signal;
      return config;
    });

    applyRetry(this.httpClient, {
      retries: settings.retries,
      retryDelay: (retryCount) => 2 ** retryCount * settings.retryBaseDelayMs,
      retryCondition: (error) => this.connectionWithOrangebeardIsValid && isRetryable(error),
    });
  }

  /**
   * Validates the configuration once, up front. Reporting is disabled with a single clear message
   * when it cannot work; a token that would travel unencrypted only triggers a warning.
   */
  private static checkConfiguration(
    endpoint: string | undefined,
    token: string | undefined,
    project: string | undefined,
  ): boolean {
    const disable = (problem: string) => {
      console.error(`Orangebeard reporting is disabled: ${problem}`);
      return false;
    };

    let url: URL;
    try {
      url = new URL(endpoint ?? '');
    } catch {
      return disable('no valid endpoint configured (orangebeard.json or ORANGEBEARD_ENDPOINT).');
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return disable(`the endpoint must be an http(s) URL, got protocol "${url.protocol}".`);
    }
    if (!token) {
      return disable('no access token configured (orangebeard.json or ORANGEBEARD_TOKEN).');
    }
    if (!project) {
      return disable('no project configured (orangebeard.json or ORANGEBEARD_PROJECT).');
    }

    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.protocol === 'http:' && !local) {
      console.warn(
        `Orangebeard endpoint ${url.origin} uses plain http: the access token is sent unencrypted. Use https.`,
      );
    }
    return true;
  }

  private static getAuthorizationHeaders(accessToken: string): HttpHeaders {
    return {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private static sanitizeError(error: Error | AxiosError): Record<string, unknown> {
    if (axios.isAxiosError(error)) {
      return {
        message: error.message,
        code: error.code,
        method: error.config?.method?.toUpperCase(),
        url: error.config?.url,
        status: error.response?.status,
        statusText: error.response?.statusText,
      };
    }
    return { name: error.name, message: error.message };
  }

  /**
   * Logs a failed request. Reporting is only disabled for the rest of the run when continuing is
   * pointless: on authentication/authorization failures, or when `fatal` is set (e.g. the test run
   * itself could not be started). Any other failure only affects the entity it concerns.
   */
  private handleError(error: Error | AxiosError, fatal = false) {
    if (axios.isCancel(error)) {
      return; // deliberately abandoned, see abandonPendingRequests()
    }
    console.error(
      'Failed to communicate with Orangebeard!',
      OrangebeardClient.sanitizeError(error),
    );
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (fatal || status === 401 || status === 403) {
      this.connectionWithOrangebeardIsValid = false;
    }
  }

  private acceptsRequests(): boolean {
    return this.connectionWithOrangebeardIsValid && !this.abandoned;
  }

  /**
   * Cancels all requests that are in flight or queued, and refuses new ones except
   * `finishTestRun`. Used when the run has to be finished before all pending work is done.
   */
  public abandonPendingRequests(): void {
    this.abandoned = true;
    this.abortController.abort();
    this.abortController = new AbortController();
  }

  public async startTestRun(testRun: StartTestRun): Promise<UUID | null> {
    if (this.acceptsRequests()) {
      try {
        const response: AxiosResponse<UUID> = await this.httpClient.post(
          `/listener/v3/${this.projectName}/test-run/start`,
          testRun,
          {
            headers: OrangebeardClient.getAuthorizationHeaders(String(this.accessToken)),
          },
        );
        return response.data ?? null;
      } catch (error) {
        this.handleError(error, true);
      }
    }
    return null;
  }

  /**
   * @returns the announced test run UUID once started, or null if starting it failed
   */
  public async startAnnouncedTestRun(testRunUUID: UUID): Promise<UUID | null> {
    if (this.acceptsRequests()) {
      try {
        await this.httpClient.put(
          `/listener/v3/${this.projectName}/test-run/start/${testRunUUID}`,
          undefined,
          {
            headers: OrangebeardClient.getAuthorizationHeaders(String(this.accessToken)),
          },
        );
        return testRunUUID;
      } catch (error) {
        this.handleError(error, true);
      }
    }
    return null;
  }

  public async finishTestRun(testRunUUID: UUID, finishTestRun: FinishTestRun): Promise<void> {
    if (this.connectionWithOrangebeardIsValid) {
      try {
        await this.httpClient.put(
          `/listener/v3/${this.projectName}/test-run/finish/${testRunUUID}`,
          finishTestRun,
          {
            headers: OrangebeardClient.getAuthorizationHeaders(String(this.accessToken)),
          },
        );
      } catch (error) {
        this.handleError(error);
      }
    }
  }

  public async startSuite(suite: StartSuite): Promise<Array<Suite>> {
    if (this.acceptsRequests()) {
      try {
        const response: AxiosResponse<Array<Suite>> = await this.httpClient.post(
          `/listener/v3/${this.projectName}/suite/start`,
          suite,
          {
            headers: OrangebeardClient.getAuthorizationHeaders(String(this.accessToken)),
          },
        );
        return Array.isArray(response.data) ? response.data : [];
      } catch (error) {
        this.handleError(error);
      }
    }
    return new Array<Suite>();
  }

  public async startTest(test: StartTest): Promise<UUID | null> {
    if (this.acceptsRequests()) {
      try {
        const response: AxiosResponse<UUID> = await this.httpClient.post(
          `/listener/v3/${this.projectName}/test/start`,
          test,
          {
            headers: OrangebeardClient.getAuthorizationHeaders(String(this.accessToken)),
          },
        );
        return response.data ?? null;
      } catch (error) {
        this.handleError(error);
      }
    }
    return null;
  }

  public async finishTest(testUUID: UUID, finishTest: FinishTest): Promise<void> {
    if (this.acceptsRequests()) {
      try {
        await this.httpClient.put(
          `/listener/v3/${this.projectName}/test/finish/${testUUID}`,
          finishTest,
          {
            headers: OrangebeardClient.getAuthorizationHeaders(String(this.accessToken)),
          },
        );
      } catch (error) {
        this.handleError(error);
      }
    }
  }

  public async startStep(step: StartStep): Promise<UUID | null> {
    if (this.acceptsRequests()) {
      try {
        const response: AxiosResponse<UUID> = await this.httpClient.post(
          `/listener/v3/${this.projectName}/step/start`,
          step,
          {
            headers: OrangebeardClient.getAuthorizationHeaders(String(this.accessToken)),
          },
        );
        return response.data ?? null;
      } catch (error) {
        this.handleError(error);
      }
    }
    return null;
  }

  public async finishStep(stepUUID: UUID, finishStep: FinishStep): Promise<void> {
    if (this.acceptsRequests()) {
      try {
        await this.httpClient.put(
          `/listener/v3/${this.projectName}/step/finish/${stepUUID}`,
          finishStep,
          {
            headers: OrangebeardClient.getAuthorizationHeaders(String(this.accessToken)),
          },
        );
      } catch (error) {
        this.handleError(error);
      }
    }
  }

  public async log(log: Log): Promise<UUID | null> {
    if (this.acceptsRequests()) {
      try {
        const response: AxiosResponse<UUID> = await this.httpClient.post(
          `/listener/v3/${this.projectName}/log`,
          log,
          {
            headers: OrangebeardClient.getAuthorizationHeaders(String(this.accessToken)),
          },
        );
        return response.data ?? null;
      } catch (error) {
        this.handleError(error);
      }
    }
    return null;
  }

  public async sendAttachment(attachment: Attachment): Promise<UUID | null> {
    if (!this.acceptsRequests()) {
      return null;
    }
    try {
      const formData = new FormData();
      const { content } = attachment.file;
      // a view on the Buffer's memory: no copy of (possibly large) attachment content
      const bytes = new Uint8Array(content.buffer, content.byteOffset, content.byteLength);
      const fileBlob = new Blob([bytes as Uint8Array<ArrayBuffer>], {
        type: attachment.file.contentType,
      });

      formData.append('json', JSON.stringify(attachment.metaData));
      formData.append('attachment', fileBlob, attachment.file.name);

      const headers = {
        Authorization: `Bearer ${this.accessToken}`,
      };

      const response: AxiosResponse<UUID> = await this.httpClient.post(
        `/listener/v3/${this.projectName}/attachment`,
        formData,
        {
          headers,
          timeout: this.attachmentTimeoutMs,
        },
      );
      return response.data ?? null;
    } catch (error) {
      this.handleError(error);
    }
    return null;
  }
}
