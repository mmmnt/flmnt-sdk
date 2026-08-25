# @mmmnt/flmnt-sdk

Programmatic access to a flmnt workspace's memory plane through an API connection —
no MCP server, no interactive OAuth. One key, one exchange, typed methods.

```ts
import { connect, acquireToken, queryContext, recordEntry } from '@mmmnt/flmnt-sdk';

connect({
  brokerTokenUrl: 'https://oauth.production.flmnt.ai/token',
  graphqlUrl: 'https://api.production.flmnt.ai/graphql',
});
await acquireToken(process.env.FLMNT_API_KEY);

const { result } = await queryContext({ query: 'why did the deploy fail', tokenBudget: 4000 });
await recordEntry({ streamId: '<workspaceId>::domain', content: 'Use PostgreSQL', kind: 'decision' });
```

## How it works

- Your **API key** (`flmnt_sk_…`) is issued by a workspace owner or admin. It exchanges at the
  broker (`client_credentials`) for a 15-minute token — there is no refresh token; the SDK
  re-exchanges automatically, so revoking the key ends access within one token lifetime.
- Every call rides the router, which enforces the key's workspace binding and scopes. The SDK
  never reshapes what the router answers: each method returns the operation's field value
  untouched.
- Refusals arrive in the router's own words (`GraphRefusedError`); a dead wire is retried once
  and then surfaces as `WireNetworkError` — never as a fabricated answer.

## Surface

Reads: `listStreams` · `getStreamMetadata` · `peekStream` · `searchEvents` · `sliceEvents` ·
`getNeighborhood` · `readKeyframe` · `readPlan`
Writes: `recordEntry` · `writeKeyframe` · `recordMistake` · `recordSupersession` · `recordPlan` ·
`recordMetric` · `createStream`
Retrieval: `queryContext` · `materializeContext` (the same RLM operation with an empty query)

Transport overrides for tests: `setWireBackend` accepts any `WireBackend`.

MIT
