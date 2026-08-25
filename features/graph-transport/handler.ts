import { GraphRefusedError, queryMemory as query } from '../../src/client.ts';
import { WireNetworkError } from '../../src/wire.ts';

interface QueryMemoryInput {
  document: string;
  variables?: Record<string, unknown>;
}

interface HandlerResult {
  status: number;
  body: Record<string, unknown>;
}

export async function queryMemory(input: QueryMemoryInput): Promise<HandlerResult> {
  try {
    const result = await query(input.document, input.variables);
    return { status: 200, body: { data: result.data } };
  } catch (cause) {
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
}
