import { GraphRefusedError, MalformedKeyError } from './client.ts';
import { WireNetworkError } from './wire.ts';
import type { SurfaceResult } from './memory.ts';

export interface HandlerResult {
  status: number;
  body: Record<string, unknown>;
}

export function surface<A>(method: (args: A) => Promise<SurfaceResult>): (args: A) => Promise<HandlerResult> {
  return async (args: A): Promise<HandlerResult> => {
    try {
      const { result } = await method(args);
      return { status: 200, body: { result } };
    } catch (cause) {
      if (cause instanceof MalformedKeyError) {
        return { status: 400, body: { code: 'SDK_KEY_MALFORMED', message: cause.message } };
      }
      if (cause instanceof GraphRefusedError) {
        return { status: cause.status, body: { code: 'SDK_GRAPH_REFUSED', message: cause.message } };
      }
      if (cause instanceof WireNetworkError) {
        return {
          status: 502,
          body: { code: 'SDK_NETWORK', message: `The wire failed after retry: ${cause.message}` },
        };
      }
      throw cause;
    }
  };
}
