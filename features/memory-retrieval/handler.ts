import { surface } from '../../src/surface.ts';
import * as memory from '../../src/memory.ts';

export const queryContext = surface(memory.queryContext);
export const materializeContext = surface(memory.materializeContext);
