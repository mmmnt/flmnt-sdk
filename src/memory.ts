import { queryMemory } from './client.ts';

const ENTRY_FIELDS = 'id causationId entryType timestamp tokenSize content';
const STREAM_FIELDS =
  'streamId projectId streamName streamType version entryCount lastKeyframeVersion tokenSizeTotal';
const WRITE_RESULT = 'entryId type';
const TRAJECTORY_ENTRY = 'id type content relevance timestamp status';
const TRAJECTORY_FIELDS = `anchor results { ${TRAJECTORY_ENTRY} } recentMistakes { ${TRAJECTORY_ENTRY} } adjacentTotal trajectoryDepth { past future } tokenCount tokenBudget topRelevance rlmSteps`;

export interface SurfaceResult {
  result: unknown;
}

async function operation(
  field: string,
  document: string,
  variables: Record<string, unknown>,
): Promise<SurfaceResult> {
  const { data } = await queryMemory(document, variables);
  const body = (data ?? {}) as Record<string, unknown>;
  return { result: body[field] ?? null };
}

export async function listStreams(args: { projectId: string }): Promise<SurfaceResult> {
  return operation(
    'memoryStreams',
    `query($projectId: ID!){ memoryStreams(projectId: $projectId){ ${STREAM_FIELDS} } }`,
    args,
  );
}

export async function getStreamMetadata(args: { streamId: string }): Promise<SurfaceResult> {
  return operation(
    'memoryStream',
    `query($streamId: ID!, $projectId: ID!){ memoryStream(streamId: $streamId, projectId: $projectId){ ${STREAM_FIELDS} } }`,
    { streamId: args.streamId, projectId: args.streamId.split('::')[0] },
  );
}

export async function peekStream(args: { streamId: string; limit?: number }): Promise<SurfaceResult> {
  return operation(
    'memoryEntries',
    `query($streamId: ID!, $limit: Int){ memoryEntries(streamId: $streamId, limit: $limit){ ${ENTRY_FIELDS} } }`,
    args,
  );
}

export async function searchEvents(args: { streamId: string; query: string }): Promise<SurfaceResult> {
  return operation(
    'memorySearch',
    `query($streamId: ID!, $query: String!){ memorySearch(streamId: $streamId, query: $query){ ${ENTRY_FIELDS} } }`,
    args,
  );
}

export async function sliceEvents(args: {
  streamId: string;
  startPos?: number;
  endPos?: number;
  startTime?: string;
  endTime?: string;
}): Promise<SurfaceResult> {
  return operation(
    'memorySlice',
    `query($streamId: ID!, $startPos: Int, $endPos: Int, $startTime: String, $endTime: String){ memorySlice(streamId: $streamId, startPos: $startPos, endPos: $endPos, startTime: $startTime, endTime: $endTime){ ${ENTRY_FIELDS} } }`,
    args,
  );
}

export async function getNeighborhood(args: {
  streamId: string;
  entryId: string;
  depth?: number;
}): Promise<SurfaceResult> {
  return operation(
    'memoryNeighborhood',
    `query($streamId: ID!, $entryId: ID!, $depth: Int){ memoryNeighborhood(streamId: $streamId, entryId: $entryId, depth: $depth){ past{ ${ENTRY_FIELDS} } future{ ${ENTRY_FIELDS} } adjacent edges{ entryId relationship } } }`,
    args,
  );
}

export async function readKeyframe(args: { streamId: string; position?: number }): Promise<SurfaceResult> {
  return operation(
    'memoryKeyframe',
    'query($streamId: ID!, $position: Int){ memoryKeyframe(streamId: $streamId, position: $position){ entryId position content createdAt } }',
    args,
  );
}

export async function readPlan(args: { streamId: string; position?: number }): Promise<SurfaceResult> {
  return operation(
    'memoryPlan',
    'query($streamId: ID!, $position: Int){ memoryPlan(streamId: $streamId, position: $position){ entryId position content } }',
    args,
  );
}

export async function recordEntry(args: {
  streamId: string;
  content: string;
  kind: 'decision' | 'exploration';
  causalRefs?: string[];
}): Promise<SurfaceResult> {
  return operation(
    'recordMemoryEntry',
    `mutation($streamId: ID!, $content: String!, $causalRefs: [ID!]){ recordMemoryEntry(streamId: $streamId, type: "${args.kind}", content: $content, causalRefs: $causalRefs){ ${WRITE_RESULT} } }`,
    { streamId: args.streamId, content: args.content, causalRefs: args.causalRefs },
  );
}

export async function writeKeyframe(args: {
  streamId: string;
  content: string;
  causalRefs?: string[];
}): Promise<SurfaceResult> {
  return operation(
    'writeMemoryKeyframe',
    `mutation($streamId: ID!, $content: String!, $causalRefs: [ID!]){ writeMemoryKeyframe(streamId: $streamId, content: $content, causalRefs: $causalRefs){ ${WRITE_RESULT} } }`,
    args,
  );
}

export async function recordMistake(args: {
  workspaceId: string;
  content: string;
  wasCorrected?: boolean;
  targetEntryId?: string;
  corrects?: string;
}): Promise<SurfaceResult> {
  const { workspaceId, ...rest } = args;
  return operation(
    'recordMemoryMistake',
    `mutation($streamId: ID!, $content: String!, $wasCorrected: Boolean, $targetEntryId: ID, $corrects: ID){ recordMemoryMistake(streamId: $streamId, content: $content, wasCorrected: $wasCorrected, targetEntryId: $targetEntryId, corrects: $corrects){ ${WRITE_RESULT} } }`,
    { streamId: `${workspaceId}::mistake`, ...rest },
  );
}

export async function recordSupersession(args: {
  streamId: string;
  content: string;
  supersedes: string;
}): Promise<SurfaceResult> {
  return operation(
    'recordMemorySupersession',
    `mutation($streamId: ID!, $content: String!, $supersedes: ID!){ recordMemorySupersession(streamId: $streamId, content: $content, supersedes: $supersedes){ ${WRITE_RESULT} } }`,
    args,
  );
}

export async function recordPlan(args: { streamId: string; content: string }): Promise<SurfaceResult> {
  return operation(
    'recordMemoryPlan',
    `mutation($streamId: ID!, $content: String!){ recordMemoryPlan(streamId: $streamId, content: $content){ ${WRITE_RESULT} } }`,
    args,
  );
}

export async function recordMetric(args: {
  streamId: string;
  metricName: string;
  value: number;
  labels?: Record<string, string>;
}): Promise<SurfaceResult> {
  const labels =
    args.labels === undefined
      ? undefined
      : Object.entries(args.labels).map(([key, value]) => ({ key, value }));
  return operation(
    'recordMemoryMetric',
    `mutation($streamId: ID!, $metricName: String!, $value: Float!, $labels: [MemoryLabelInput!]){ recordMemoryMetric(streamId: $streamId, metricName: $metricName, value: $value, labels: $labels){ ${WRITE_RESULT} } }`,
    { streamId: args.streamId, metricName: args.metricName, value: args.value, labels },
  );
}

export async function createStream(args: {
  projectId: string;
  streamType: string;
  name: string;
  sessionId?: string;
}): Promise<SurfaceResult> {
  return operation(
    'createMemoryStream',
    'mutation($projectId: ID!, $type: String!, $name: String!, $sessionId: ID){ createMemoryStream(projectId: $projectId, type: $type, name: $name, sessionId: $sessionId){ streamId projectId streamName streamType } }',
    { projectId: args.projectId, type: args.streamType, name: args.name, sessionId: args.sessionId },
  );
}

export async function queryContext(args: {
  query: string;
  streamId?: string;
  tokenBudget?: number;
}): Promise<SurfaceResult> {
  return operation(
    'memoryQueryContext',
    `query($query: String!, $streamId: ID!, $tokenBudget: Int){ memoryQueryContext(query: $query, streamId: $streamId, tokenBudget: $tokenBudget){ ${TRAJECTORY_FIELDS} } }`,
    { query: args.query, streamId: args.streamId ?? '', tokenBudget: args.tokenBudget },
  );
}

export async function materializeContext(args: {
  streamId?: string;
  tokenBudget?: number;
}): Promise<SurfaceResult> {
  return queryContext({ query: '', streamId: args.streamId, tokenBudget: args.tokenBudget });
}
