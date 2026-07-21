import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('YeMind Dock icon theme adaptation', () => {
  const source = readFileSync(resolve('src/plugin/YeMindPlugin.ts'), 'utf8');

  it('registers the interactive YeMind icon as vector currentColor artwork', () => {
    const symbol = source.match(/<symbol id="\$\{ICON_ID\}"[\s\S]*?<\/symbol>/)?.[0] ?? '';
    expect(symbol).toContain('stroke="currentColor"');
    expect(symbol).toContain('<rect');
    expect(symbol).toContain('<circle');
    expect(symbol).not.toContain('<image');
    expect(symbol).not.toContain('#176B50');
  });

  it('keeps the brand PNG for the About page instead of the Dock symbol', () => {
    const about = readFileSync(resolve('src/settings/settingsDialogTemplate.ts'), 'utf8');
    expect(about).toContain('ROOT_ICON_URL');
    expect(source).not.toContain("from './yemindIcon'");
  });
});
