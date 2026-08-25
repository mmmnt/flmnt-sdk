export interface WireRequest {
  method: string;
  path: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface WireAnswer {
  status: number;
  body: Record<string, unknown>;
}

export type WireBackend = (request: WireRequest) => Promise<WireAnswer>;

export class WireNetworkError extends Error {}

let backend: WireBackend | null = null;

export function setWireBackend(b: WireBackend): void {
  backend = b;
}

export function wireBackend(): WireBackend {
  if (backend === null) throw new Error('Wire backend is not installed');
  return backend;
}
