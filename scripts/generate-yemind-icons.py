#!/usr/bin/env python3
"""Generate deterministic YeMind icon assets from the supplied source artwork."""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image

TARGET_RGB = (0x17, 0x6B, 0x50)
OUTPUTS = {
    32: Path('assets/yemind-icon-32.png'),
    64: Path('assets/yemind-icon-64.png'),
    128: Path('assets/yemind-icon-128.png'),
    512: Path('icon.png'),
}


def extract_alpha(source: Image.Image) -> Image.Image:
    if 'A' in source.getbands():
        existing_alpha = source.getchannel('A')
        if existing_alpha.getextrema()[0] < 255:
            return existing_alpha
    rgb = np.asarray(source.convert('RGB'), dtype=np.float32)
    red, green, blue = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    dominance = green - (red + blue) / 2.0
    alpha = np.clip((dominance - 2.0) / 120.0, 0.0, 1.0)
    alpha[dominance >= 120.0] = 1.0
    alpha[dominance <= 3.0] = 0.0
    return Image.fromarray(np.rint(alpha * 255.0).astype(np.uint8), mode='L')


def square_alpha(alpha: Image.Image, padding_ratio: float = 0.055) -> Image.Image:
    array = np.asarray(alpha)
    ys, xs = np.where(array > 4)
    if len(xs) == 0 or len(ys) == 0:
        raise ValueError('No green YeMind artwork was detected in the source image.')
    left, right = int(xs.min()), int(xs.max()) + 1
    top, bottom = int(ys.min()), int(ys.max()) + 1
    cropped = alpha.crop((left, top, right, bottom))
    padding = max(1, round(max(cropped.size) * padding_ratio))
    side = max(cropped.size) + padding * 2
    canvas = Image.new('L', (side, side), 0)
    canvas.paste(cropped, ((side - cropped.width) // 2, (side - cropped.height) // 2))
    return canvas


def colored_icon(alpha: Image.Image, size: int) -> Image.Image:
    resized_alpha = alpha.resize((size, size), Image.Resampling.LANCZOS)
    alpha_array = np.asarray(resized_alpha, dtype=np.uint8)
    rgba = np.zeros((size, size, 4), dtype=np.uint8)
    rgba[..., 0] = TARGET_RGB[0]
    rgba[..., 1] = TARGET_RGB[1]
    rgba[..., 2] = TARGET_RGB[2]
    rgba[..., 3] = alpha_array
    return Image.fromarray(rgba, mode='RGBA')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path, help='User-supplied YeMind source logo')
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()

    source = Image.open(args.source)
    prepared_alpha = square_alpha(extract_alpha(source))
    for size, relative_path in OUTPUTS.items():
        output = args.root / relative_path
        output.parent.mkdir(parents=True, exist_ok=True)
        colored_icon(prepared_alpha, size).save(output, format='PNG', optimize=True)
        print(f'generated {output} ({size}x{size})')
    import base64
    data = base64.b64encode((args.root / OUTPUTS[32]).read_bytes()).decode('ascii')
    module = args.root / 'src/plugin/yemindIcon.ts'
    module.write_text("export const YEMIND_ICON_DATA_URL = 'data:image/png;base64," + data + "';\n", encoding='utf-8')
    print(f'generated {module}')


if __name__ == '__main__':
    main()
