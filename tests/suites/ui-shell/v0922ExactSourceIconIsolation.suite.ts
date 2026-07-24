import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { suppliedIcon, suppliedIconSourceNames } from '../../../src/editor/suppliedIcons';

const expectedSourceHashes = {
  insertParent: '296879b7eeca4a9c0d98cf084d662dfd856af69be41ad2c0f9163744f4deeb75',
  insertSibling: '2ff22e07b3c68b2c482634c509e290931e7f4fd1e1bb46924018c1a935c53824',
  insertChild: '296879b7eeca4a9c0d98cf084d662dfd856af69be41ad2c0f9163744f4deeb75',
  outerFrame: '8d03e3bfbc1d1eeec5343cff6e8714b1fc0d999a71a380b2eca3fc6cd63b0065',
  summary: '985b13a0bcf242f94622010b38f78a2bc7bb0786647aa498ce9c9b55bb5ae1a6',
  relation: '62824ccdeb45b06bc86758df7d12b878866d677f6c6fabae341b4b3caaf85ae1',
  projectStyle: '2d48244af9aef9709e5057f9cc7a72614be4105b8cb03be77d5e2a264165117e',
  nodeStyle: '049ad25272c52dbe8f4461e9ed4d4d6b31f31308bcc03651563b089f31dc0bc1',
  clipart: 'a444e7f498849258280b051d5ff522c5fc5f6da85f1ff44b821f8ee0e2078e64',
  marker: '00fffb97d61889c7799d13f35d5204f582022d8ed3e0c8b94d6ddbd9fede15c2',
  search: '5cdd2b8d16cdc3f1809b47bb3abae84f6e7a4964d35d979c571757eb42732d56',
  redo: '587e546afba0df6057ffba8ff40fa74e9dad2c56a756aec527b2c42e8a03ba16',
  undo: '705ba920d1198a39478c2ed1da1ec5f3c9f8cd9ba74db9df571859cdb1d4d452',
  fullscreen: '9757ba3a29432f827874269a3b82d4a2676e0d2cea84f3890cea6e64b3598a0f',
} as const;

const expectedClasses = {
  insertParent: 'ymz-icon-insert-parent',
  insertSibling: 'ymz-icon-insert-sibling',
  insertChild: 'ymz-icon-insert-child',
  outerFrame: 'ymz-icon-outer-frame',
  summary: 'ymz-icon-summary',
  relation: 'ymz-icon-relation',
  projectStyle: 'ymz-icon-project-style',
  nodeStyle: 'ymz-icon-node-style',
  clipart: 'ymz-icon-clipart',
  marker: 'ymz-icon-marker',
  search: 'ymz-icon-search',
  redo: 'ymz-icon-redo',
  undo: 'ymz-icon-undo',
  fullscreen: 'ymz-icon-fullscreen',
} as const;

type IconName = keyof typeof expectedSourceHashes;

function extractSource(html: string): string {
  const match = html.match(/\ssrc="([^"]+)"/);
  expect(match, html).not.toBeNull();
  return match![1];
}

describe('v0.9.22 exact supplied SVG isolation', () => {
  it.each(Object.keys(expectedSourceHashes) as IconName[])('%s renders the exact supplied Base64 SVG through an image boundary', (name) => {
    const html = suppliedIcon(name);
    const source = extractSource(html);

    expect(html).toMatch(/^<img\b/);
    expect(html).toContain('ymz-operation-icon');
    expect(html).toContain(expectedClasses[name]);
    expect(html).toContain('alt=""');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('draggable="false"');
    expect(html).not.toContain('<svg');
    expect(html).not.toContain('<path');
    expect(html).not.toContain('currentColor');
    expect(source).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(createHash('sha256').update(source).digest('hex')).toBe(expectedSourceHashes[name]);
  });

  it('keeps the user-facing source labels for traceability', () => {
    expect(suppliedIconSourceNames.insertParent).toContain('插入父节点图标');
    expect(suppliedIconSourceNames.insertSibling).toContain('插入同级节点图标');
    expect(suppliedIconSourceNames.insertChild).toContain('插入子节点图标');
    expect(suppliedIconSourceNames.search).toBe('搜索图标');
    expect(suppliedIconSourceNames.marker).toBe('图标的图标');
  });
});
