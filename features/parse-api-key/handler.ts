import { MalformedKeyError, parseApiKey as parse } from '../../src/client.ts';

interface ParseApiKeyInput {
  apiKey: string;
}

interface HandlerResult {
  status: number;
  body: Record<string, unknown>;
}

export async function parseApiKey(input: ParseApiKeyInput): Promise<HandlerResult> {
  try {
    const parsed = parse(input.apiKey);
    return { status: 200, body: { clientId: parsed.clientId, clientSecret: parsed.clientSecret } };
  } catch (cause) {
    if (cause instanceof MalformedKeyError) {
      return { status: 400, body: { code: 'SDK_KEY_MALFORMED', message: cause.message } };
    }
    throw cause;
  }
}
