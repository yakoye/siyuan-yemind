import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function source(file: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
}

describe('checkpoint plugin integration', () => {
  it('uses a separate storage file and loads it during bootstrap', () => {
    const constants = source('src/plugin/constants.ts');
    const plugin = source('src/plugin/YeMindZenPlugin.ts');
    expect(constants).toContain("CHECKPOINT_STORAGE_NAME = 'checkpoints.json'");
    expect(plugin).toContain('new CheckpointRepository');
    expect(plugin).toContain('this.checkpointRepository.load()');
  });

  it('injects checkpoint services into map tabs and cleans checkpoints after map deletion', () => {
    const plugin = source('src/plugin/YeMindZenPlugin.ts');
    const tabs = source('src/plugin/tabs.ts');
    expect(tabs).toContain('checkpointRepository: host.checkpointRepository');
    expect(tabs).toContain('checkpointService: host.checkpointService');
    expect(plugin).toContain('await this.checkpointRepository.removeForMap(mapId)');
  });
});
