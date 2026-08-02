import { describe, expect, it, vi } from 'vitest';
import { RichTextToolbar } from '../../../src/editor/RichTextToolbar';

function commands() {
  return {
    restoreSelection: vi.fn(),
    formatText: vi.fn(),
    clearTextFormat: vi.fn(),
    setCloze: vi.fn(),
    toggleInlineCode: vi.fn(),
    getSelectedText: vi.fn(() => 'selected'),
    getSelectedInlineLink: vi.fn(() => ''),
    setInlineLink: vi.fn(),
    getCodeBlock: vi.fn(() => null),
    saveCodeBlock: vi.fn(),
    removeCodeBlockFormat: vi.fn(),
    deleteCodeBlock: vi.fn(),
    insertFormula: vi.fn(),
  } as any;
}

function setup() {
  const root = document.createElement('div');
  root.style.width = '900px';
  root.style.height = '600px';
  document.body.appendChild(root);
  return root;
}

describe('RichTextToolbar', () => {
  it('stays inside the editor stacking context and applies native text formats', () => {
    const root = setup();
    const actions = commands();
    const toolbar = new RichTextToolbar(root, actions);

    toolbar.update(true, { left: 100, top: 100, right: 160, bottom: 120, width: 60 }, {});
    root.querySelector<HTMLButtonElement>('[data-rich-action="bold"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-rich-action="inline-code"]')!.click();
    expect(actions.formatText).toHaveBeenCalledWith({ bold: true });
    expect(actions.toggleInlineCode).toHaveBeenCalledOnce();
    expect(root.querySelector('.ymz-rich-toolbar')).not.toBeNull();
    expect(document.body.children).toContain(root);

    toolbar.destroy();
    root.remove();
  });

  it('owns toolbar clicks so the canvas body handler cannot close text editing', () => {
    const root = setup();
    const toolbar = new RichTextToolbar(root, commands());
    toolbar.update(true, { left: 10, top: 10, right: 80, bottom: 30, width: 70 }, {});
    const bodyClick = vi.fn();
    document.body.addEventListener('click', bodyClick);

    root.querySelector<HTMLButtonElement>('[data-rich-action="bold"]')!.click();

    expect(bodyClick).not.toHaveBeenCalled();
    document.body.removeEventListener('click', bodyClick);
    toolbar.destroy();
    root.remove();
  });

  it('opens link and code-block editors with the active formatting target', () => {
    const root = setup();
    const target = commands();
    const onLink = vi.fn();
    const onCodeBlock = vi.fn();
    const toolbar = new RichTextToolbar(root, target, { onLink, onCodeBlock });
    toolbar.update(true, { left: 1, top: 1, right: 2, bottom: 2, width: 1 }, {});
    root.querySelector<HTMLButtonElement>('[data-rich-action="link"]')!.click();
    toolbar.update(true, { left: 1, top: 1, right: 2, bottom: 2, width: 1 }, {});
    root.querySelector<HTMLButtonElement>('[data-rich-action="code-block"]')!.click();
    expect(onLink).toHaveBeenCalledWith(target);
    expect(onCodeBlock).toHaveBeenCalledWith(target);
    toolbar.destroy();
    root.remove();
  });

  it('hides when disabled or when the selection collapses', () => {
    const root = setup();
    const toolbar = new RichTextToolbar(root, commands());
    toolbar.update(true, { left: 1, top: 1, right: 2, bottom: 2, width: 1 }, {});
    toolbar.setEnabled(false);
    expect(root.querySelector('.ymz-rich-toolbar')?.hasAttribute('hidden')).toBe(true);
    toolbar.destroy();
    root.remove();
  });

  it('keeps the toolbar open while a select control temporarily owns focus', () => {
    const root = setup();
    const toolbar = new RichTextToolbar(root, commands());
    toolbar.update(true, { left: 1, top: 1, right: 2, bottom: 2, width: 1 }, {});
    const size = root.querySelector<HTMLSelectElement>('[data-rich-field="size"]')!;
    size.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    toolbar.update(false, null, null);
    expect(root.querySelector('.ymz-rich-toolbar')?.hasAttribute('hidden')).toBe(false);
    toolbar.destroy();
    root.remove();
  });

  it('uses a palette with HEX/RGB readouts, reset and native custom color', () => {
    const root = setup();
    const actions = commands();
    const toolbar = new RichTextToolbar(root, actions);
    toolbar.update(true, { left: 20, top: 20, right: 80, bottom: 40, width: 60 }, {});

    expect(root.querySelector('[data-rich-action="clear-color"]')).toBeNull();
    expect(root.querySelector('[data-rich-action="clear-background"]')).toBeNull();
    root.querySelector<HTMLButtonElement>('[data-rich-action="color-menu"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-color-value="#ff4d3d"]')!.click();
    expect(actions.formatText).toHaveBeenCalledWith({ color: '#ff4d3d' });

    toolbar.update(true, { left: 20, top: 20, right: 80, bottom: 40, width: 60 }, {});
    root.querySelector<HTMLButtonElement>('[data-rich-action="background-menu"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-color-action="reset"]')!.click();
    expect(actions.formatText).toHaveBeenCalledWith({ background: false });
    expect(root.querySelector('[data-color-action="custom"]')).not.toBeNull();
    expect(root.querySelector('[data-color-action="eyedropper"]')).toBeNull();
    expect(root.querySelector('[data-color-readout="hex"]')?.textContent).toBe('默认');
    expect(root.querySelector('[data-color-readout="rgb"]')?.textContent).toBe('继承节点颜色');

    toolbar.update(true, { left: 20, top: 20, right: 80, bottom: 40, width: 60 }, { color: '#ff4d3d' });
    root.querySelector<HTMLButtonElement>('[data-rich-action="color-menu"]')!.click();
    expect(root.querySelector('[data-color-readout="hex"]')?.textContent).toBe('#FF4D3D');
    expect(root.querySelector('[data-color-readout="rgb"]')?.textContent).toBe('RGB(255, 77, 61)');

    toolbar.destroy();
    root.remove();
  });

  it('routes size, font, cloze, clear and formula to the active target', () => {
    const root = setup();
    const actions = commands();
    const onFormula = vi.fn();
    const toolbar = new RichTextToolbar(root, actions, { onFormula });
    toolbar.update(true, { left: 20, top: 20, right: 80, bottom: 40, width: 60 }, {});

    const size = root.querySelector<HTMLSelectElement>('[data-rich-field="size"]')!;
    size.value = '18px';
    size.dispatchEvent(new Event('change', { bubbles: true }));
    const font = root.querySelector<HTMLSelectElement>('[data-rich-field="font"]')!;
    font.value = 'serif';
    font.dispatchEvent(new Event('change', { bubbles: true }));
    root.querySelector<HTMLButtonElement>('[data-rich-action="cloze"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-rich-action="clear"]')!.click();
    toolbar.update(true, { left: 20, top: 20, right: 80, bottom: 40, width: 60 }, {});
    root.querySelector<HTMLButtonElement>('[data-rich-action="formula"]')!.click();

    expect(actions.restoreSelection).toHaveBeenCalledTimes(5);
    expect(actions.formatText).toHaveBeenCalledWith({ size: '18px' });
    expect(actions.formatText).toHaveBeenCalledWith({ font: 'serif' });
    expect(actions.setCloze).toHaveBeenCalledWith(true);
    expect(actions.clearTextFormat).toHaveBeenCalledOnce();
    expect(onFormula).toHaveBeenCalledWith(actions);

    toolbar.destroy();
    root.remove();
  });
  it('waits until pointer selection finishes before showing the shared toolbar', async () => {
    const root = setup();
    const editor = document.createElement('div');
    editor.className = 'ql-editor';
    root.appendChild(editor);
    const toolbar = new RichTextToolbar(root, commands());
    editor.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    toolbar.update(
      true,
      { left: 30, top: 30, right: 90, bottom: 50, width: 60 },
      { font: 'serif', size: '18px' },
    );
    expect(root.querySelector('.ymz-rich-toolbar')?.hasAttribute('hidden')).toBe(true);
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 40));
    expect(root.querySelector('.ymz-rich-toolbar')?.hasAttribute('hidden')).toBe(true);
    toolbar.update(
      true,
      { left: 36, top: 34, right: 104, bottom: 54, width: 68 },
      { font: 'serif', size: '18px' },
    );
    await new Promise((resolve) => window.setTimeout(resolve, 40));
    expect(root.querySelector('.ymz-rich-toolbar')?.hasAttribute('hidden')).toBe(true);
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    expect(root.querySelector('.ymz-rich-toolbar')?.hasAttribute('hidden')).toBe(false);
    expect((root.querySelector('.ymz-rich-toolbar') as HTMLElement).style.left).not.toBe('');
    toolbar.destroy();
    root.remove();
  });

  it('shows visible default choices for inherited or unknown font and size values', () => {
    const root = setup();
    const toolbar = new RichTextToolbar(root, commands());
    toolbar.update(
      true,
      { left: 20, top: 20, right: 80, bottom: 40, width: 60 },
      { font: 'Unknown UI Font, sans-serif', size: '15px' },
    );
    expect(root.querySelector<HTMLSelectElement>('[data-rich-field="font"]')?.value).toBe('');
    expect(root.querySelector<HTMLSelectElement>('[data-rich-field="size"]')?.value).toBe('');
    expect(root.querySelector<HTMLSelectElement>('[data-rich-field="font"]')?.selectedOptions[0]?.textContent).toBe('默认字体');
    expect(root.querySelector<HTMLSelectElement>('[data-rich-field="size"]')?.selectedOptions[0]?.textContent).toBe('自动');
    toolbar.destroy();
    root.remove();
  });

  it('does not republish the previous selection after pressing a different static node', async () => {
    const root = setup();
    const oldEditor = document.createElement('div');
    oldEditor.className = 'ql-editor';
    const nextNode = document.createElement('div');
    nextNode.className = 'smm-node';
    root.append(oldEditor, nextNode);
    const toolbar = new RichTextToolbar(root, commands());
    const element = root.querySelector<HTMLElement>('.ymz-rich-toolbar')!;
    const oldSession = { sessionId: 1, uid: 'old', selectionEpoch: 1 };
    toolbar.update(
      true,
      { left: 30, top: 30, right: 90, bottom: 50, width: 60 },
      {},
      null,
      oldSession,
    );
    expect(element.hidden).toBe(false);

    nextNode.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    toolbar.update(
      true,
      { left: 30, top: 30, right: 90, bottom: 50, width: 60 },
      {},
      null,
      oldSession,
    );
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 1));

    expect(element.hidden).toBe(true);

    toolbar.update(
      true,
      { left: 230, top: 230, right: 290, bottom: 250, width: 60 },
      {},
      null,
      { sessionId: 2, uid: 'next', selectionEpoch: 1 },
    );
    expect(element.hidden).toBe(false);
    expect(element.style.left).not.toBe('30px');

    toolbar.destroy();
    root.remove();
  });

  it('does not reuse a far-away DOM range from the previous selection session', () => {
    const root = setup();
    Object.defineProperties(root, {
      clientWidth: { configurable: true, value: 900 },
      clientHeight: { configurable: true, value: 600 },
    });
    root.getBoundingClientRect = () => ({
      left: 100,
      top: 100,
      right: 1000,
      bottom: 700,
      width: 900,
      height: 600,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    });
    const selected = document.createTextNode('selected');
    root.appendChild(selected);
    const liveRect = {
      left: 220,
      top: 180,
      right: 340,
      bottom: 205,
      width: 120,
      height: 25,
      x: 220,
      y: 180,
      toJSON: () => ({}),
    };
    const getSelection = vi.spyOn(window, 'getSelection').mockReturnValue({
      anchorNode: selected,
      rangeCount: 1,
      getRangeAt: () => ({ getBoundingClientRect: () => liveRect }),
    } as any);
    const toolbar = new RichTextToolbar(root, commands());
    const element = root.querySelector<HTMLElement>('.ymz-rich-toolbar')!;
    Object.defineProperties(element, {
      scrollWidth: { configurable: true, value: 700 },
      offsetHeight: { configurable: true, value: 48 },
    });

    toolbar.update(
      true,
      { left: 220, top: 360, right: 340, bottom: 390, width: 120 },
      {},
    );

    expect(element.style.top).toBe('298px');
    getSelection.mockRestore();
    toolbar.destroy();
    root.remove();
  });

  it('uses the reported current anchor while the newly opened toolbar is still hidden', () => {
    const root = setup();
    Object.defineProperties(root, {
      clientWidth: { configurable: true, value: 900 },
      clientHeight: { configurable: true, value: 600 },
    });
    root.getBoundingClientRect = () => ({
      left: 100,
      top: 100,
      right: 1000,
      bottom: 700,
      width: 900,
      height: 600,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    });
    const editor = document.createElement('div');
    editor.className = 'ql-editor';
    const selected = document.createTextNode('selected');
    editor.appendChild(selected);
    root.appendChild(editor);
    const liveRect = {
      left: 220,
      top: 180,
      right: 340,
      bottom: 205,
      width: 120,
      height: 25,
      x: 220,
      y: 180,
      toJSON: () => ({}),
    };
    const getSelection = vi.spyOn(window, 'getSelection').mockReturnValue({
      anchorNode: selected,
      isCollapsed: false,
      rangeCount: 1,
      getRangeAt: () => ({ getBoundingClientRect: () => liveRect }),
    } as any);
    const toolbar = new RichTextToolbar(root, commands());
    const element = root.querySelector<HTMLElement>('.ymz-rich-toolbar')!;
    Object.defineProperties(element, {
      scrollWidth: { configurable: true, value: 700 },
      offsetHeight: { configurable: true, value: 48 },
    });

    toolbar.update(
      true,
      { left: 220, top: 360, right: 340, bottom: 390, width: 120 },
      {},
    );

    expect(element.style.top).toBe('298px');
    getSelection.mockRestore();
    toolbar.destroy();
    root.remove();
  });

  it('keeps the established below-selection placement when there is enough room', () => {
    const root = setup();
    Object.defineProperties(root, {
      clientWidth: { configurable: true, value: 900 },
      clientHeight: { configurable: true, value: 600 },
    });
    root.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 900,
      bottom: 600,
      width: 900,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const toolbar = new RichTextToolbar(root, commands());
    const element = root.querySelector<HTMLElement>('.ymz-rich-toolbar')!;
    Object.defineProperties(element, {
      scrollWidth: { configurable: true, value: 700 },
      offsetHeight: { configurable: true, value: 48 },
    });

    toolbar.update(
      true,
      { left: 220, top: 360, right: 340, bottom: 390, width: 120 },
      {},
    );

    expect(element.style.top).toBe('398px');
    toolbar.destroy();
    root.remove();
  });

  it('positions a hidden toolbar at the new anchor before making it visible', async () => {
    const root = setup();
    Object.defineProperties(root, {
      clientWidth: { configurable: true, value: 900 },
      clientHeight: { configurable: true, value: 600 },
    });
    root.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 900,
      bottom: 600,
      width: 900,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const toolbar = new RichTextToolbar(root, commands());
    const element = root.querySelector<HTMLElement>('.ymz-rich-toolbar')!;
    Object.defineProperties(element, {
      scrollWidth: { configurable: true, value: 300 },
      offsetHeight: { configurable: true, value: 44 },
    });
    element.style.left = '700px';
    element.style.top = '500px';
    const visibleSnapshots: Array<{ left: string; top: string }> = [];
    const observer = new MutationObserver(() => {
      if (!element.hidden) {
        visibleSnapshots.push({
          left: element.style.left,
          top: element.style.top,
        });
      }
    });
    observer.observe(element, {
      attributes: true,
      attributeFilter: ['hidden', 'style'],
    });

    toolbar.update(
      true,
      { left: 100, top: 100, right: 160, bottom: 120, width: 60 },
      {},
    );
    await Promise.resolve();
    observer.disconnect();

    expect(visibleSnapshots.length).toBeGreaterThan(0);
    expect(visibleSnapshots[0]).toEqual({
      left: element.style.left,
      top: element.style.top,
    });
    toolbar.destroy();
    root.remove();
  });

  it('keeps a newly opened toolbar visually hidden until its measured frame is committed', () => {
    const root = setup();
    Object.defineProperties(root, {
      clientWidth: { configurable: true, value: 900 },
      clientHeight: { configurable: true, value: 600 },
    });
    root.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 900,
      bottom: 600,
      width: 900,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const frames: FrameRequestCallback[] = [];
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frames.push(callback);
        return frames.length;
      });
    const cancelFrame = vi.spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => undefined);
    const toolbar = new RichTextToolbar(root, commands());
    const element = root.querySelector<HTMLElement>('.ymz-rich-toolbar')!;
    Object.defineProperties(element, {
      scrollWidth: { configurable: true, value: 700 },
      offsetHeight: { configurable: true, value: 48 },
    });

    toolbar.update(
      true,
      { left: 220, top: 360, right: 340, bottom: 390, width: 120 },
      {},
    );

    expect(element.hidden).toBe(false);
    expect(element.style.visibility).toBe('hidden');
    expect(frames).toHaveLength(1);
    frames.shift()!(0);
    expect(element.style.visibility).toBe('hidden');
    expect(frames).toHaveLength(1);
    frames.shift()!(16);
    expect(element.style.visibility).toBe('');

    toolbar.destroy();
    requestFrame.mockRestore();
    cancelFrame.mockRestore();
    root.remove();
  });

  it('does not treat a static canvas-node mouseup as an in-editor pointer selection', () => {
    vi.useFakeTimers();
    const root = setup();
    const staticNode = document.createElement('div');
    staticNode.className = 'smm-node';
    root.append(staticNode);
    const toolbar = new RichTextToolbar(root, commands());
    const element = root.querySelector<HTMLElement>('.ymz-rich-toolbar')!;
    const session = { sessionId: 7, uid: 'node-7', selectionEpoch: 1 };

    toolbar.update(false, null, null, null, session);
    staticNode.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    window.dispatchEvent(new MouseEvent('mouseup'));
    toolbar.update(
      true,
      { left: 100, top: 100, right: 180, bottom: 120, width: 80 },
      {},
      null,
      session,
    );

    expect(element.hidden).toBe(false);

    toolbar.destroy();
    root.remove();
    vi.useRealTimers();
  });

});
