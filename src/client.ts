import { WireNetworkError, wireBackend, type WireAnswer } from './wire.ts';

export const TOKEN_EXPIRY_SKEW_MS = 60_000;

const KEY_PATTERN = /^flmnt_sk_(conn_[A-Za-z0-9-]+)\.([A-Za-z0-9_-]+)$/;

export interface ParsedKey {
  clientId: string;
  clientSecret: string;
}

export class MalformedKeyError extends Error {}

export class ExchangeRefusedError extends Error {
  readonly status: number;
  readonly oauthError: string;

  constructor(status: number, oauthError: string) {
    super(`The broker refused the exchange: ${oauthError}`);
    this.status = status;
    this.oauthError = oauthError;
  }
}

export class GraphRefusedError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function parseApiKey(apiKey: string): ParsedKey {
  const match = KEY_PATTERN.exec(apiKey);
  if (match === null) {
    throw new MalformedKeyError(`Not a flmnt API key: expected flmnt_sk_{connectionId}.{secret}`);
  }
  return { clientId: match[1] as string, clientSecret: match[2] as string };
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let currentKey: string | null = null;
const tokenCache = new Map<string, CachedToken>();

export function resetClientState(): void {
  currentKey = null;
  tokenCache.clear();
}

async function exchange(apiKey: string): Promise<CachedToken> {
  const { clientId, clientSecret } = parseApiKey(apiKey);
  const answer = await wireBackend()({
    method: 'POST',
    path: '/token',
    body: { grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret },
  });
  if (answer.status !== 200) {
    throw new ExchangeRefusedError(answer.status, String(answer.body['error'] ?? 'exchange_failed'));
  }
  const cached: CachedToken = {
    accessToken: String(answer.body['access_token']),
    expiresAt: Date.now() + Number(answer.body['expires_in']) * 1000,
  };
  tokenCache.set(apiKey, cached);
  return cached;
}

export async function acquireToken(apiKey: string): Promise<{ accessToken: string }> {
  currentKey = apiKey;
  const cached = tokenCache.get(apiKey);
  if (cached !== undefined && Date.now() < cached.expiresAt - TOKEN_EXPIRY_SKEW_MS) {
    return { accessToken: cached.accessToken };
  }
  const fresh = await exchange(apiKey);
  return { accessToken: fresh.accessToken };
}

async function graphPost(document: string, variables: Record<string, unknown> | undefined, token: string): Promise<WireAnswer> {
  const request = {
    method: 'POST',
    path: '/graphql',
    body: { query: document, ...(variables !== undefined ? { variables } : {}) },
    headers: { authorization: `Bearer ${token}` },
  };
  try {
    return await wireBackend()(request);
  } catch (cause) {
    if (!(cause instanceof WireNetworkError)) throw cause;
    return await wireBackend()(request);
  }
}

function joinedErrors(body: Record<string, unknown>): string | null {
  const errors = body['errors'];
  if (!Array.isArray(errors) || errors.length === 0) return null;
  return errors
    .map((e) => (typeof e === 'object' && e !== null && 'message' in e ? String((e as { message: unknown }).message) : String(e)))
    .join('; ');
}

export async function queryMemory(
  document: string,
  variables?: Record<string, unknown>,
): Promise<{ data: unknown }> {
  if (currentKey === null) throw new Error('No API key acquired');
  let token = (await acquireToken(currentKey)).accessToken;
  let answer = await graphPost(document, variables, token);
  if (answer.status === 401) {
    tokenCache.delete(currentKey);
    token = (await acquireToken(currentKey)).accessToken;
    answer = await graphPost(document, variables, token);
  }
  const refusal = joinedErrors(answer.body);
  if (refusal !== null) {
    throw new GraphRefusedError(answer.status === 200 ? 400 : answer.status, refusal);
  }
  return { data: answer.body['data'] ?? {} };
}
