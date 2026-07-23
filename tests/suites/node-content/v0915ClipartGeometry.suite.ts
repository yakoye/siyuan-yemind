import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CLIPART_GEOMETRY_VERSION,
  LEGACY_DEFAULT_CLIPART_BOX_SIZE,
  fitClipartSize,
  isLegacyDefaultClipartGeometry,
  parseSvgIntrinsicSize,
} from '../../../src/core/clipartGeometry';

const pickerSource = readFileSync(resolve(process.cwd(), 'src/ui/localAssetDialogs.ts'), 'utf8');
const commandSource = readFileSync(resolve(process.cwd(), 'src/core/commands.ts'), 'utf8');
const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');

describe('v0.9.16 clipart aspect-ratio geometry', () => {
  it('reads explicit SVG intrinsic dimensions before falling back to viewBox', () => {
    expect(parseSvgIntrinsicSize('<svg width="160" height="80" viewBox="0 0 24 24"></svg>')).toEqual({ width: 160, height: 80 });
    expect(parseSvgIntrinsicSize('<svg width="100%" height="100%" viewBox="0 0 80 120"></svg>')).toEqual({ width: 80, height: 120 });
  });

  it('fits landscape and portrait clipart into the 48px box without stretching', () => {
    expect(fitClipartSize({ width: 160, height: 80 })).toEqual({ width: 48, height: 24 });
    expect(fitClipartSize({ width: 80, height: 160 })).toEqual({ width: 24, height: 48 });
    expect(fitClipartSize({ width: 100, height: 100 })).toEqual({ width: 48, height: 48 });
  });

  it('recognizes only the old hard-coded square default as a migration candidate', () => {
    expect(isLegacyDefaultClipartGeometry({
      image: '/plugins/siyuan-yemind/assets/clipart/01_动物/003_牛.svg',
      yemindClipartId: 'animal-003',
      imageSize: { width: LEGACY_DEFAULT_CLIPART_BOX_SIZE, height: LEGACY_DEFAULT_CLIPART_BOX_SIZE, custom: true },
    })).toBe(true);
    expect(isLegacyDefaultClipartGeometry({
      image: '/plugins/siyuan-yemind/assets/clipart/01_动物/003_牛.svg',
      yemindClipartId: 'animal-003',
      yemindClipartGeometryVersion: CLIPART_GEOMETRY_VERSION,
      imageSize: { width: 48, height: 24, custom: true },
    })).toBe(false);
  });

  it('resolves insertion geometry asynchronously and repairs legacy nodes on editor mount', () => {
    expect(pickerSource).toContain('await resolveClipartDisplaySize(url, img)');
    expect(pickerSource).not.toContain('width: 72,\n          height: 72');
    expect(pickerSource).not.toContain('width: 48,\n          height: 48');
    expect(commandSource).toContain('yemindClipartGeometryVersion: CLIPART_GEOMETRY_VERSION');
    expect(editorSource).toContain('window.requestAnimationFrame(() =>');
    expect(editorSource).toContain('void this.repairLegacyClipartGeometry()');
    expect(editorSource).toContain('this.repairLegacyClipartGeometry(attempt + 1)');
    expect(editorSource).toContain("'clipart-geometry-repaired'");
  });
});
