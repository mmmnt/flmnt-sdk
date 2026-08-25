import { describe, it, expect, vi } from 'vitest';
import { createFetchBackend } from './fetch-backend.ts';
import { WireNetworkError } from './wire.ts';

const ENDPOINTS = {
  brokerTokenUrl: 'https://broker.example/token',
  graphqlUrl: 'https://api.example/graphql',
};

describe('createFetchBackend', () => {
  it('form-encodes /token requests at the broker token url', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ status: 200, json: async () => ({ access_token: 't' }) });
    const answer = await createFetchBackend(ENDPOINTS, fetchImpl)({
      method: 'POST',
      path: '/token',
      body: { grant_type: 'client_credentials', client_id: 'conn_a', client_secret: 's' },
    });
    const [url, init] = fetchImpl.mock.calls[0] as [string, { headers: Record<string, string>; body: string }];
    expect(url).toBe(ENDPOINTS.brokerTokenUrl);
    expect(init.headers['content-type']).toBe('application/x-www-form-urlencoded');
    expect(init.body).toContain('grant_type=client_credentials');
    expect(answer).toEqual({ status: 200, body: { access_token: 't' } });
  });

  it('sends /graphql requests as JSON with the caller headers', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ status: 403, json: async () => ({ errors: [{ message: 'forbidden' }] }) });
    const answer = await createFetchBackend(ENDPOINTS, fetchImpl)({
      method: 'POST',
      path: '/graphql',
      body: { query: 'query { __typename }' },
      headers: { authorization: 'Bearer tok' },
    });
    const [url, init] = fetchImpl.mock.calls[0] as [string, { headers: Record<string, string>; body: string }];
    expect(url).toBe(ENDPOINTS.graphqlUrl);
    expect(init.headers['content-type']).toBe('application/json');
    expect(init.headers['authorization']).toBe('Bearer tok');
    expect(answer.status).toBe(403);
    expect(answer.body['errors']).toBeDefined();
  });

  it('a socket death surfaces as WireNetworkError', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(
      createFetchBackend(ENDPOINTS, fetchImpl)({ method: 'POST', path: '/graphql', body: {} }),
    ).rejects.toBeInstanceOf(WireNetworkError);
  });

  it('a non-JSON body reads as an empty object, status preserved', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ status: 502, json: async () => { throw new Error('not json'); } });
    const answer = await createFetchBackend(ENDPOINTS, fetchImpl)({ method: 'POST', path: '/graphql', body: {} });
    expect(answer).toEqual({ status: 502, body: {} });
  });
});
