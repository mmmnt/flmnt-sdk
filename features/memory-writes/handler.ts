import { surface } from '../../src/surface.ts';
import * as memory from '../../src/memory.ts';

export const recordEntry = surface(memory.recordEntry);
export const writeKeyframe = surface(memory.writeKeyframe);
export const recordMistake = surface(memory.recordMistake);
export const recordSupersession = surface(memory.recordSupersession);
export const recordPlan = surface(memory.recordPlan);
export const recordMetric = surface(memory.recordMetric);
export const createStream = surface(memory.createStream);
