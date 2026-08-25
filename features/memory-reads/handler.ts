import { surface } from '../../src/surface.ts';
import * as memory from '../../src/memory.ts';

export const listStreams = surface(memory.listStreams);
export const getStreamMetadata = surface(memory.getStreamMetadata);
export const peekStream = surface(memory.peekStream);
export const searchEvents = surface(memory.searchEvents);
export const sliceEvents = surface(memory.sliceEvents);
export const getNeighborhood = surface(memory.getNeighborhood);
export const readKeyframe = surface(memory.readKeyframe);
export const readPlan = surface(memory.readPlan);
