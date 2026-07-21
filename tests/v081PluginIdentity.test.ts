import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

interface DecodedPng { width: number; height: number; pixels: Uint8Array }

function decodeRgbaPng(path: string): DecodedPng {
  const input = readFileSync(path);
  expect(input.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = -1;
  let bitDepth = -1;
  const idat: Buffer[] = [];
  while (offset < input.length) {
    const length = input.readUInt32BE(offset); offset += 4;
    const type = input.subarray(offset, offset + 4).toString('ascii'); offset += 4;
    const data = input.subarray(offset, offset + length); offset += length + 4;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
  }
  expect(bitDepth).toBe(8);
  expect(colorType).toBe(6);
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const raw = inflateSync(Buffer.concat(idat));
  const pixels = new Uint8Array(width * height * bytesPerPixel);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[sourceOffset++];
    const rowStart = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const encoded = raw[sourceOffset++];
      const left = x >= bytesPerPixel ? pixels[rowStart + x - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[rowStart - stride + x] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? pixels[rowStart - stride + x - bytesPerPixel] : 0;
      let value = encoded;
      if (filter === 1) value = (encoded + left) & 255;
      else if (filter === 2) value = (encoded + up) & 255;
      else if (filter === 3) value = (encoded + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
        value = (encoded + predictor) & 255;
      }
      pixels[rowStart + x] = value;
    }
  }
  return { width, height, pixels };
}

function pixel(image: DecodedPng, x: number, y: number): [number, number, number, number] {
  const index = (y * image.width + x) * 4;
  return [image.pixels[index], image.pixels[index + 1], image.pixels[index + 2], image.pixels[index + 3]];
}

describe('YeMind v0.8.4 plugin identity and install layout', () => {
  it('uses siyuan-yemind for the current manifest, package and installed directory', () => {
    const manifest = JSON.parse(readFileSync(resolve('plugin.json'), 'utf8'));
    const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
    expect(manifest.name).toBe('siyuan-yemind');
    expect(manifest.displayName.default).toBe('YeMind');
    expect(manifest.displayName.zh_CN).toBe('YeMind');
    expect(packageJson.name).toBe('siyuan-yemind');
    expect(manifest.version).toBe('0.8.4');
    expect(packageJson.version).toBe('0.8.4');
  });

  it('uses the renamed YeMindPlugin source entry and removes the old current source filename', () => {
    expect(existsSync(resolve('src/plugin/YeMindPlugin.ts'))).toBe(true);
    expect(existsSync(resolve('src/plugin/YeMindZenPlugin.ts'))).toBe(false);
    const entry = readFileSync(resolve('src/index.ts'), 'utf8');
    expect(entry).toContain("from './plugin/YeMindPlugin'");
    expect(entry).toContain('export default YeMindPlugin');
  });

  it.each([
    ['assets/yemind-icon-32.png', 32],
    ['assets/yemind-icon-64.png', 64],
    ['assets/yemind-icon-128.png', 128],
    ['icon.png', 512],
  ])('generates %s as transparent exact #176B50 artwork', (path, size) => {
    const image = decodeRgbaPng(resolve(path));
    expect(image.width).toBe(size);
    expect(image.height).toBe(size);
    let visible = 0;
    for (let index = 0; index < image.pixels.length; index += 4) {
      const alpha = image.pixels[index + 3];
      if (alpha === 0) continue;
      visible += 1;
      expect([image.pixels[index], image.pixels[index + 1], image.pixels[index + 2]]).toEqual([0x17, 0x6b, 0x50]);
    }
    expect(visible).toBeGreaterThan(size * size * 0.12);
    expect(pixel(image, Math.floor(size / 2), Math.max(1, Math.floor(size * 0.03)))[3]).toBe(0);
  });

  it('uses the generated logo asset for the SiYuan icon symbol and About page', () => {
    const pluginSource = readFileSync(resolve('src/plugin/YeMindPlugin.ts'), 'utf8');
    const aboutTemplate = readFileSync(resolve('src/settings/settingsDialogTemplate.ts'), 'utf8');
    expect(pluginSource).toContain('stroke="currentColor"');
    expect(pluginSource).not.toContain('<image href="${YEMIND_ICON_DATA_URL}"');
    expect(pluginSource).toContain('<circle cx="5.5" cy="5.5" r="2.5"/>');
    expect(aboutTemplate).toContain('ROOT_ICON_URL');
    expect(existsSync(resolve('src/plugin/yemindIcon.ts'))).toBe(true);
  });

  it('uses YeMind in current runtime UI and release information', () => {
    const files = [
      'src/releaseInfo.ts',
      'src/plugin/dock.ts',
      'src/plugin/globalSearch.ts',
      'src/settings/settingsDialog.ts',
      'src/settings/settingsDialogTemplate.ts',
      'src/ui/diagnosticsDialog.ts',
    ];
    const currentSource = files.map((file) => readFileSync(resolve(file), 'utf8')).join('\n');
    expect(currentSource).not.toContain('YeMind Zen');
    expect(currentSource).toContain('YeMind');
  });
});
