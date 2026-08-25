import { WireNetworkError, setWireBackend, type WireBackend, type WireRequest } from './wire.ts';

export interface FlmntEndpoints {
  brokerTokenUrl: string;
  graphqlUrl: string;
}

type FetchLike = (url: string, init: {
  method: string;
  headers: Record<string, string>;
  body: string;
}) => Promise<{ status: number; json(): Promise<unknown> }>;

export function createFetchBackend(endpoints: FlmntEndpoints, fetchImpl?: FetchLike): WireBackend {
  const doFetch: FetchLike = fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  return async (request: WireRequest) => {
    const isToken = request.path === '/token';
    const url = isToken ? endpoints.brokerTokenUrl : endpoints.graphqlUrl;
    const body = isToken
      ? new URLSearchParams((request.body ?? {}) as Record<string, string>).toString()
      : JSON.stringify(request.body ?? {});
    const headers = {
      'content-type': isToken ? 'application/x-www-form-urlencoded' : 'application/json',
      ...(request.headers ?? {}),
    };
    let response: { status: number; json(): Promise<unknown> };
    try {
      response = await doFetch(url, { method: request.method, headers, body });
    } catch (cause) {
      throw new WireNetworkError(String(cause));
    }
    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      parsed = {};
    }
    return { status: response.status, body: (parsed ?? {}) as Record<string, unknown> };
  };
}

export function connect(endpoints: FlmntEndpoints, fetchImpl?: FetchLike): void {
  setWireBackend(createFetchBackend(endpoints, fetchImpl));
}
