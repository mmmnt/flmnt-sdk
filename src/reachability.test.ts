import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sdk from './index.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, 'feat.config.json'), 'utf8')) as {
  response: { commands: Record<string, { module: string; export: string }> };
};

describe('reachability — every spec-registered command is invocable from the public surface', () => {
  const commands = Object.entries(config.response.commands);

  it('registers a non-zero command set', () => {
    expect(commands.length).toBeGreaterThan(0);
  });

  for (const [command, route] of commands) {
    it(`${command} resolves its handler export and is re-exported from the package entry`, async () => {
      const module = (await import(join(root, route.module))) as Record<string, unknown>;
      expect(typeof module[route.export], `${route.module}#${route.export}`).toBe('function');
      const publicSurface = sdk as unknown as Record<string, unknown>;
      expect(typeof publicSurface[route.export], `index re-export '${route.export}'`).toBe('function');
    });
  }
});
