import { suppliedIcon, suppliedIconNames } from '../../src/editor/suppliedIcons';

(globalThis as typeof globalThis & { __yemindIconGallery?: string })
  .__yemindIconGallery = suppliedIconNames.map((name) => suppliedIcon(name)).join('');

export default suppliedIconNames.length;
