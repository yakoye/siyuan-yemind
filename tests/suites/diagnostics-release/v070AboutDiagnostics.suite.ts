import JSZip from 'jszip';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RELEASE_INFO, resolveVersionConsistency } from '../../../src/releaseInfo';
import { createSettingsDialogTemplate } from '../../../src/settings/settingsDialogTemplate';
import { DEFAULT_SETTINGS } from '../../../src/settings/SettingsStore';
import { DiagnosticsService } from '../../../src/diagnostics/DiagnosticsService';
import { CheckpointRepository } from '../../../src/model/CheckpointRepository';
import { MapRepository } from '../../../src/model/MapRepository';
import { SettingsStore } from '../../../src/settings/SettingsStore';

function storage() {
  let value: unknown = null;
  return { load: async () => structuredClone(value), save: async (next: unknown) => { value = structuredClone(next); } };
}

function service() {
  const maps = new MapRepository(storage());
  const checkpoints = new CheckpointRepository(storage());
  const settings = new SettingsStore(storage());
  return { maps, checkpoints, settings, diagnostics: new DiagnosticsService({
    pluginId: 'siyuan-yemind', pluginVersion: RELEASE_INFO.version,
    maps, checkpoints, settings,
    storageProbe: { run: async () => ({ write: true, read: true, remove: true }) },
    lifecycleProbe: { run: async () => ({ create: true, update: true, checkpoint: true, restore: true, cleanup: true }) },
    manifestVersionProbe: async () => RELEASE_INFO.version,
  }) };
}

describe('v0.7.x about and diagnostics release contract', () => {
  it('keeps About as a standalone release and support surface', () => {
    const settingsHtml = createSettingsDialogTemplate(DEFAULT_SETTINGS);
    const aboutSource = readFileSync(resolve(process.cwd(), 'src/ui/aboutDialog.ts'), 'utf8');
    expect(settingsHtml).not.toContain('data-settings-page="about"');
    expect(aboutSource).toContain('RELEASE_INFO.releaseSummary');
    expect(aboutSource).toContain('data-about-action="copy-version"');
    expect(aboutSource).toContain('data-about-action="export-diagnostics"');
    expect(aboutSource).toContain('data-about-version="manifest"');
    expect(aboutSource).toContain('RELEASE_INFO.hostBaseline');
  });

  it('uses the current semantic version consistently', () => {
    expect(RELEASE_INFO.version).toBe('0.9.20');
    expect(resolveVersionConsistency('0.9.20')).toEqual({ manifest: '0.9.20', runtime: '0.9.20', build: '0.9.20', consistent: true });
  });

  it('keeps package, lockfile, manifest, runtime metadata and release docs on one identity', () => {
    const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as { version: string };
    const packageLock = JSON.parse(readFileSync(resolve(process.cwd(), 'package-lock.json'), 'utf8')) as { version: string; packages: Record<string, { version?: string }> };
    const manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'plugin.json'), 'utf8')) as { version: string };
    const readme = readFileSync(resolve(process.cwd(), 'README_zh_CN.md'), 'utf8');
    const changelog = readFileSync(resolve(process.cwd(), 'CHANGELOG.md'), 'utf8');
    for (const version of [packageJson.version, packageLock.version, packageLock.packages[''].version, manifest.version, RELEASE_INFO.version, RELEASE_INFO.buildVersion]) {
      expect(version).toBe('0.9.20');
    }
    expect(readme).toContain('当前版本：`0.9.20`');
    expect(changelog).toContain('## 0.9.20');
  });

  it('exports structured diagnostics files for direct analysis', async () => {
    const { maps, checkpoints, settings, diagnostics } = service();
    await Promise.all([maps.load(), checkpoints.load(), settings.load()]);
    await maps.create('Private map');
    diagnostics.start();
    diagnostics.updateGlobalSearchState({ observed: true, queryLength: 5, nativeResultCount: 0, yemindResultCount: 1, listMounted: true, previewMounted: true, previewVisible: true, selectedType: 'yemind', lastNavigationStep: 'target-node-highlighted', lastNavigationSuccess: true });
    diagnostics.record('global-search', 'query-change', undefined, { queryLength: 5, queryHash: 'abc' });
    diagnostics.markProblem('搜索 Enter 后未跳转');
    document.body.innerHTML = `<div class="b3-dialog__container"><div class="fn__flex-column"><input id="searchInput" value="Sensitive query"><div class="search__layout"><div id="searchList"><button data-type="search-item" data-yemind-global-map="private-map" data-yemind-global-node="private-node">Sensitive result</button></div><div id="searchPreview">Sensitive preview</div></div></div></div>`;
    const archive = await diagnostics.buildArchive(false);
    const zip = await JSZip.loadAsync(archive.bytes);
    const names = Object.keys(zip.files);
    for (const name of ['summary.md','environment.json','version-consistency.json','event-timeline.jsonl','search-state.json','active-map-state.json','regression-results.json','errors.json','diagnostic-marker.json','dom-structure-snapshot.html','diagnostics.json']) {
      expect(names).toContain(name);
    }
    expect(await zip.file('summary.md')!.async('string')).toContain('全局搜索');
    expect(await zip.file('search-state.json')!.async('string')).not.toContain('Private map');
    const domSnapshot = await zip.file('dom-structure-snapshot.html')!.async('string');
    expect(domSnapshot).toContain('searchList');
    expect(domSnapshot).not.toContain('Sensitive query');
    expect(domSnapshot).not.toContain('Sensitive result');
    expect(domSnapshot).not.toContain('private-map');
    document.body.innerHTML = '';
  });
});
