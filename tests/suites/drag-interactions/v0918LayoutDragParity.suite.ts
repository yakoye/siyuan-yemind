import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { YEMIND_LAYOUT_ASSET_PRESETS } from '../../../src/core/layoutAssetPresets';
import {
  emptyOfficialDragCandidate,
  resolveOfficialDragCandidate,
  resolveOfficialDragGrowthDirection,
  resolveOfficialDragSiblingAxis,
  supportsOfficialDragGeometry,
} from '../../../src/core/officialDragIntent';

function node(uid: string, left: number, top: number, width = 80, height = 32, extra: Record<string, any> = {}) {
  return {
    uid,
    left,
    top,
    width,
    height,
    children: [] as any[],
    parent: null as any,
    layerIndex: 1,
    getData(key: string) { return key === 'uid' ? uid : (this as any)[key]; },
    ...extra,
  } as any;
}

function link(parent: any, ...children: any[]) {
  parent.children = children;
  children.forEach((child) => { child.parent = parent; });
  return parent;
}

function resolve(layout: string, pointer: { x: number; y: number }, nodes: any[]) {
  return resolveOfficialDragCandidate({
    layout,
    pointer,
    nodes,
    excludedNodes: [],
    current: emptyOfficialDragCandidate(),
    getRect: (item) => ({ x: item.left, y: item.top, width: item.width, height: item.height }),
  });
}

const dragSource = fs.readFileSync(path.resolve('src/core/YeMindDrag.ts'), 'utf8');
const registerSource = fs.readFileSync(path.resolve('src/core/registerLayouts.ts'), 'utf8');
const fishboneSource = fs.readFileSync(path.resolve('src/core/RightFishbone.ts'), 'utf8');

describe('v0.9.18 layout drag parity', () => {
  it('mirrors the right-logical local zones for the left logical layout', () => {
    const root = node('root', 360, 100);
    const target = node('target', 220, 100);
    link(root, target);
    const child = resolve('logicalStructureLeft', { x: 206, y: 116 }, [root, target]);
    expect(child.kind).toBe('child');
    expect(child.parentNode).toBe(target);

    const before = resolve('logicalStructureLeft', { x: 292, y: 102 }, [root, target]);
    expect(before.kind).toBe('before');
    expect(before.targetNode).toBe(target);
  });

  it('uses branch direction for mind maps and horizontal sibling axes for down layouts', () => {
    const root = node('root', 300, 160, 100, 44, { layerIndex: 0 });
    const left = node('left', 150, 100, 80, 32, { dir: 'left' });
    const right = node('right', 470, 100, 80, 32, { dir: 'right' });
    link(root, left, right);
    expect(resolve('mindMap', { x: 138, y: 116 }, [root, left, right]).parentNode).toBe(left);
    expect(resolve('mindMap', { x: 562, y: 116 }, [root, left, right]).parentNode).toBe(right);
    expect(resolveOfficialDragSiblingAxis('organizationStructure', root)).toBe('x');
    expect(resolveOfficialDragGrowthDirection('organizationStructure', root)).toBe('bottom');
  });

  it('keeps same-axis timeline and catalog sibling ordering distinct from child tails', () => {
    const timelineRoot = node('timeline-root', 160, 160, 90, 36, { layerIndex: 0 });
    const timelineParent = node('timeline-parent', 300, 160, 90, 36, { layerIndex: 1, dir: 'top' });
    const nativeFirst = node('native-first', 340, 230, 80, 32, { layerIndex: 2, dir: 'top' });
    const nativeSecond = node('native-second', 340, 100, 80, 32, { layerIndex: 2, dir: 'top' });
    link(timelineRoot, timelineParent);
    link(timelineParent, nativeFirst, nativeSecond);
    const timelineNodes = [timelineRoot, timelineParent, nativeFirst, nativeSecond];
    const beforeVisualTop = resolve('timeline2', { x: 380, y: 104 }, timelineNodes);
    expect(beforeVisualTop.kind).toBe('before');
    expect(beforeVisualTop.targetNode).toBe(nativeSecond);
    expect(beforeVisualTop.index).toBe(2);
    const topChild = resolve('timeline2', { x: 380, y: 70 }, timelineNodes);
    expect(topChild.kind).toBe('child');
    expect(topChild.parentNode).toBe(nativeSecond);

    const catalogParent = node('catalog-parent', 300, 80, 90, 36, { layerIndex: 1 });
    const catalogChild = node('catalog-child', 340, 150, 80, 32, { layerIndex: 2 });
    link(catalogParent, catalogChild);
    const catalogBefore = resolve('catalogOrganization', { x: 380, y: 154 }, [catalogParent, catalogChild]);
    expect(catalogBefore.kind).toBe('before');
    const catalogTail = resolve('catalogOrganization', { x: 380, y: 200 }, [catalogParent, catalogChild]);
    expect(catalogTail.kind).toBe('child');
    expect(catalogTail.parentNode).toBe(catalogChild);
  });

  it('covers timelines and both fishbone directions with official immediate geometry', () => {
    ['timeline', 'timeline2', 'verticalTimeline', 'verticalTimeline2', 'verticalTimeline3',
      'fishbone', 'fishbone2', 'rightFishbone', 'rightFishbone2'].forEach((layout) => {
      expect(supportsOfficialDragGeometry(layout)).toBe(true);
    });
    expect(resolveOfficialDragGrowthDirection('fishbone2', { layerIndex: 0 })).toBe('right');
    expect(resolveOfficialDragGrowthDirection('rightFishbone2', { layerIndex: 0 })).toBe('left');
    expect(resolveOfficialDragGrowthDirection('fishbone2', { layerIndex: 1, dir: 'top' })).toBe('top');
    expect(resolveOfficialDragGrowthDirection('rightFishbone2', { layerIndex: 2, dir: 'top' })).toBe('left');
  });

  it('uses one immediate candidate and generalized room preview for every adapted layout', () => {
    expect(dragSource).toContain('supportsOfficialDragGeometry(layout)');
    expect(dragSource).toContain('{ stable: candidate, pending: null }');
    expect(dragSource).toContain('this.updateLayoutRoomPreview(stable)');
    expect(dragSource).toContain('resolveOfficialDragSiblingAxis');
    expect(dragSource).toContain('createShiftedIncomingLineOverlays(');
    expect(dragSource).toContain('{ deltaX, deltaY }');
    expect(dragSource).not.toContain("if (layout === 'logicalStructure') this.updateLogicalRoomPreview");
  });

  it('routes tree-table and other gallery presets through adapted engine layouts', () => {
    const unadapted = YEMIND_LAYOUT_ASSET_PRESETS.filter(
      (preset) => !supportsOfficialDragGeometry(preset.engineLayout),
    );
    expect(unadapted).toEqual([]);
    expect(YEMIND_LAYOUT_ASSET_PRESETS.find((preset) => preset.id === 'tree-table-top-title')?.engineLayout)
      .toBe('catalogOrganization');
    expect(YEMIND_LAYOUT_ASSET_PRESETS.find((preset) => preset.id === 'bracket-left')?.engineLayout)
      .toBe('logicalStructureLeft');
  });

  it('registers right fishbone renderers before MindMap construction and mirrors paths', () => {
    expect(registerSource).toContain('rightFishbone');
    expect(registerSource).toContain('rightFishbone2');
    expect(registerSource).toContain('RightFishbone');
    expect(fishboneSource).toContain('mirrorPathHorizontally');
    expect(fishboneSource).toContain('mirrorTreeGeometry');
    expect(fishboneSource).toContain("return this.layout === 'rightFishbone2'");
  });
});
