import { setWireBackend, WireNetworkError, type WireRequest } from '../src/wire.ts';
import { resetClientState } from '../src/client.ts';

interface Stub {
  method: string;
  path: string;
  body: {
    status?: number;
    error?: string;
    errors?: string[];
    data?: Record<string, unknown>;
    once?: boolean;
    networkFailure?: boolean;
  };
  consumed: boolean;
}

interface SeedRecord {
  type: string;
  schemaName: string;
  values: { method: string; path: string; body?: Stub['body'] };
}

interface CapturedRecord {
  type: string;
  key: string;
  payload: unknown;
  timestamp: number;
}

interface JournalEntry {
  method: string;
  path: string;
  body?: Record<string, unknown>;
}

class WireFeatAdapter {
  private journal: JournalEntry[] = [];
  private stubs: Stub[] = [];
  private captureFrom = 0;
  private mintedTokens = 0;

  private answer(request: WireRequest): { status: number; body: Record<string, unknown> } {
    const stub = this.stubs.find((s) => !s.consumed && s.path === request.path);
    if (stub !== undefined) {
      if (stub.body.once === true || stub.body.networkFailure !== true) stub.consumed = true;
      if (stub.body.networkFailure === true) {
        stub.consumed = false;
        throw new WireNetworkError(`socket died on ${request.path}`);
      }
      const status = stub.body.status ?? 500;
      if (stub.body.data !== undefined) {
        return { status, body: { data: stub.body.data } };
      }
      if (stub.body.errors !== undefined) {
        return { status, body: { errors: stub.body.errors.map((message) => ({ message })) } };
      }
      if (stub.body.error !== undefined) {
        return { status, body: { error: stub.body.error } };
      }
      return { status, body: {} };
    }
    if (request.path === '/token') {
      this.mintedTokens += 1;
      return {
        status: 200,
        body: { access_token: `tok_${this.mintedTokens}`, token_type: 'Bearer', expires_in: 900 },
      };
    }
    return { status: 200, body: { data: {} } };
  }

  private install(): void {
    setWireBackend(async (request) => {
      this.journal.push({
        method: request.method,
        path: request.path,
        ...(request.body !== undefined ? { body: request.body } : {}),
      });
      return this.answer(request);
    });
    resetClientState();
  }

  async setup(): Promise<void> {
    this.install();
  }

  async teardown(): Promise<void> {}

  async reset(): Promise<void> {
    this.journal = [];
    this.stubs = [];
    this.captureFrom = 0;
    this.mintedTokens = 0;
    this.install();
  }

  async seed(records: SeedRecord[]): Promise<void> {
    for (const r of records) {
      this.stubs.push({ method: r.values.method, path: r.values.path, body: r.values.body ?? {}, consumed: false });
    }
  }

  async startCapture(): Promise<void> {
    this.captureFrom = this.journal.length;
  }

  async stopCapture(): Promise<CapturedRecord[]> {
    return this.journal.slice(this.captureFrom).map((entry, i) => ({
      type: 'http.request',
      key: String(this.captureFrom + i),
      payload: entry,
      timestamp: this.captureFrom + i,
    }));
  }

  async read(): Promise<CapturedRecord[]> {
    return this.journal.map((entry, i) => ({
      type: 'http.request',
      key: String(i),
      payload: entry,
      timestamp: i,
    }));
  }
}

export function createAdapter(): WireFeatAdapter {
  return new WireFeatAdapter();
}
