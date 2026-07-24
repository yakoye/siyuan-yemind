import { readFileSync } from 'node:fs';
import { suppliedIcon, suppliedIconNames } from '../../src/editor/suppliedIcons';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const css = readFileSync('src/styles/index.css', 'utf8');

for (const name of suppliedIconNames) {
  const html = suppliedIcon(name);
  assert(html.startsWith('<span '), `${name} must expose a fixed icon slot`);
  assert(html.includes('ymz-icon-slot'), `${name} must use the shared icon slot`);
  assert(html.includes('ymz-operation-icon--light'), `${name} must contain a light source image`);
  assert(html.includes('ymz-operation-icon--dark'), `${name} must contain a dark source image`);
  assert((html.match(/<img /g) ?? []).length === 2, `${name} must contain exactly two isolated image variants`);
}

assert(/\.ymz-icon-slot\s*\{[^}]*width:22px[^}]*height:22px/s.test(css), 'icon slot must be 22px square');
assert(/\.ymz-icon-slot[^}]*>[^\{]*\.ymz-operation-icon\s*\{[^}]*width:15px[^}]*height:15px/s.test(css), 'source artwork must fit a 15px square');
assert(/svg\.b3-menu__icon\s*\{[^}]*width:22px[^}]*height:22px[^}]*padding:3\.5px/s.test(css), 'native SiYuan menu SVGs must use the same 22/15 geometry');
assert(css.includes('--ymz-outline-hover-bg:'), 'outline hover must use a theme-aware variable');
assert(css.includes('--ymz-outline-active-bg:'), 'outline selection must use a theme-aware variable');
assert(!css.includes('.ymz-outline-row:hover{background:#ececec}'), 'outline hover must not be hard-coded light gray');
assert(!css.includes('color:#000!important'), 'outline symbols must not be hard-coded black');
assert(css.includes('.ymz-editor[data-appearance="dark"]'), 'dark editor states must have explicit styling');
assert(css.includes('.ymz-operation-icon--dark'), 'dark source icon visibility must be controlled by CSS');

export default {
  icons: suppliedIconNames.length,
  slot: '22px',
  artwork: '15px',
  darkVariants: true,
  darkOutlineStates: true,
};
