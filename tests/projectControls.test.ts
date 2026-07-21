import { describe, expect, it } from 'vitest';
import {
  CANVAS_PROJECT_MENU_LABELS,
  lineStyleIcon,
  projectControlIcon,
} from '../src/editor/projectControls';

describe('project controls', () => {
  it('exposes structure, theme, line style and style as canvas-level project actions', () => {
    expect(CANVAS_PROJECT_MENU_LABELS).toEqual(['结构', '主题', '线型', '样式']);
  });

  it('provides dedicated toolbar icons', () => {
    expect(projectControlIcon('layout')).toContain('ymz-icon-structure');
    expect(projectControlIcon('theme')).toContain('ymz-icon-theme');
    expect(lineStyleIcon('curve')).toContain('ymz-line-icon--curve');
    expect(lineStyleIcon('straight')).toContain('ymz-line-icon--straight');
    expect(lineStyleIcon('direct')).toContain('ymz-line-icon--direct');
  });
});
