import {
  ExchangeRefusedError,
  MalformedKeyError,
  acquireToken as acquire,
} from '../../src/client.ts';

interface AcquireTokenInput {
  apiKey: string;
}

interface HandlerResult {
  status: number;
  body: Record<string, unknown>;
}

export async function acquireToken(input: AcquireTokenInput): Promise<HandlerResult> {
  try {
    const { accessToken } = await acquire(input.apiKey);
    return { status: 200, body: { accessToken, expiresIn: 900 } };
  } catch (cause) {
    if (cause instanceof MalformedKeyError) {
      return { status: 400, body: { code: 'SDK_KEY_MALFORMED', message: cause.message } };
    }
    if (cause instanceof ExchangeRefusedError) {
      return { status: cause.status, body: { code: 'SDK_EXCHANGE_REFUSED', message: cause.message } };
    }
    throw cause;
  }
}
