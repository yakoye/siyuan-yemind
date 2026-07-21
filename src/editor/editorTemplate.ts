import { normalizeLineStyle, themeOptionsHtml } from '../core/themePresets';
import { layoutOptionsHtml } from '../core/layoutPresets';
import { canvasModeIcon, fitViewIcon, historyIcon, lineStyleIcon, lockIcon, meditationIcon, nodeStyleIcon, projectControlIcon, projectStyleIcon, redoIcon, searchIcon, undoIcon } from './projectControls';
export function createEditorTemplate(title: string, theme: unknown = 'kmind-default', lineStyle: unknown = 'curve'): string {
  return `
    <div class="ymz-editor" data-zen="false" data-readonly="false" data-view="map">
      <div class="ymz-canvas-wrap">
        <div class="ymz-floating ymz-topbar" role="toolbar" aria-label="YeMind 工具栏">
          <button class="ymz-brand" data-action="fit" title="适配视图">YeMind</button>
          <span class="ymz-separator"></span>
          <button class="is-active" data-action="view-map">导图</button>
          <button data-action="view-split">分屏</button>
          <button data-action="view-outline">大纲</button>
          <button class="ymz-icon-button" data-action="open-search" title="项目内搜索" aria-label="项目内搜索">${searchIcon()}</button>
          <span class="ymz-separator"></span>
          <label class="ymz-project-control" data-project-control="layout" title="结构">
            ${projectControlIcon('layout')}<span>结构</span>
            <select data-action="layout" aria-label="结构">
              ${layoutOptionsHtml('logicalStructure')}
            </select>
          </label>
          <label class="ymz-project-control" data-project-control="theme" title="主题">
            ${projectControlIcon('theme')}<span>主题</span>
            <select data-action="theme" aria-label="主题">
              ${themeOptionsHtml(theme)}
            </select>
          </label>
          <label class="ymz-project-control ymz-project-control--line" data-project-control="line-style" title="线型">
            <span data-role="line-style-icon">${lineStyleIcon(lineStyle)}</span><span>线型</span>
            <select data-action="line-style" aria-label="线型">
              <option value="curve"${normalizeLineStyle(lineStyle) === 'curve' ? ' selected' : ''}>弧线</option>
              <option value="straight"${normalizeLineStyle(lineStyle) === 'straight' ? ' selected' : ''}>圆角折线</option>
              <option value="direct"${normalizeLineStyle(lineStyle) === 'direct' ? ' selected' : ''}>直线</option>
            </select>
          </label>
          <button class="ymz-project-control ymz-project-button" data-action="project-style" title="整图样式">${projectStyleIcon()}<span>样式</span></button>
          <span class="ymz-save-state" data-role="save-state">已保存</span>
        </div>

        <div class="ymz-search-panel" data-role="search-panel" data-replace-expanded="false" hidden>
          <div class="ymz-search-panel__row ymz-search-panel__row--find">
            <button class="ymz-search-panel__disclosure" data-search-action="toggle-replace" title="展开替换" aria-label="展开替换" aria-expanded="false">›</button>
            <input class="b3-text-field" data-role="search-input" placeholder="查找">
            <span data-role="search-info">无结果</span>
            <button data-search-action="previous" title="上一个" aria-label="上一个">↑</button>
            <button data-search-action="next" title="下一个" aria-label="下一个">↓</button>
            <button data-search-action="close" title="关闭" aria-label="关闭">×</button>
          </div>
          <div class="ymz-search-panel__row ymz-search-panel__row--replace" data-role="replace-row" hidden>
            <span class="ymz-search-panel__replace-indent" aria-hidden="true"></span>
            <input class="b3-text-field" data-role="replace-input" placeholder="替换">
            <button data-search-action="replace" title="替换当前">替换</button>
            <button data-search-action="replace-all" title="全部替换">全部</button>
          </div>
        </div>

        <div class="ymz-workspace">
          <div class="ymz-canvas" data-role="canvas"></div>
          <div class="ymz-split-divider" data-role="split-divider" role="separator" aria-orientation="vertical" aria-label="调整导图和大纲宽度" aria-valuemin="25" aria-valuemax="70" aria-valuenow="42" tabindex="0"></div>
          <aside class="ymz-outline" data-role="outline" role="tree" aria-label="导图大纲"></aside>
        </div>

        <div class="ymz-floating ymz-leftbar" role="toolbar" aria-label="画布工具">
          <button class="ymz-icon-button" data-action="checkpoints" title="检查点与历史" aria-label="检查点与历史">${historyIcon()}</button>
          <button class="ymz-icon-button" data-action="undo" title="撤销" aria-label="撤销">${undoIcon()}</button>
          <button class="ymz-icon-button" data-action="redo" title="重做" aria-label="重做">${redoIcon()}</button>
        </div>

        <button class="ymz-zen-exit" data-action="zen-exit" title="退出禅模式" aria-label="退出禅模式"><span class="ymz-zen-exit__idle"><span class="ymz-zen-exit__icon" aria-hidden="true">${meditationIcon()}</span></span><span class="ymz-zen-exit__label"><span class="ymz-zen-exit__icon" aria-hidden="true">${meditationIcon()}</span><span>退出禅模式</span></span></button>

        <aside class="ymz-project-style-panel" data-role="project-style-panel" aria-label="整图样式" hidden>
          <header class="ymz-project-style-panel__header"><strong>样式</strong><button type="button" data-project-style-action="close" aria-label="关闭样式">×</button></header>
          <section><h4>密度</h4><div class="ymz-density-options" role="group" aria-label="节点密度"><button type="button" data-project-density="compact"><strong>紧凑</strong></button><button type="button" data-project-density="default"><strong>默认</strong></button><button type="button" data-project-density="comfortable"><strong>舒展</strong></button></div><div class="ymz-custom-spacing" aria-label="自定义节点间距"><label><span>左右</span><input type="number" min="12" max="240" step="1" data-project-spacing="horizontal" aria-label="水平间距"></label><label><span>上下</span><input type="number" min="2" max="100" step="1" data-project-spacing="vertical" aria-label="垂直间距"></label></div></section>
          <section><label class="ymz-project-style-panel__switch"><strong>彩虹连线</strong><input type="checkbox" data-project-style="rainbowLines"></label></section>
          <section><h4>背景色</h4><div class="ymz-background-options"><button type="button" data-project-background="" title="主题背景">主题</button><button type="button" data-project-background="#ffffff" title="白色"></button><button type="button" data-project-background="#e2e8f0" title="岩灰"></button><button type="button" data-project-background="#ffe7ba" title="暖色"></button><button type="button" data-project-background="#c8f0dc" title="薄荷"></button><button type="button" data-project-background="#d7e8ff" title="天空"></button><button type="button" data-project-background="#f7cbd5" title="玫瑰"></button><button type="button" data-project-background="#0f172a" title="深色"></button></div><label class="ymz-project-style-panel__custom"><span>自定义</span><button type="button" class="ymz-node-color-trigger ymz-project-color-trigger" data-project-color-trigger="backgroundColor"><i data-project-color-swatch="backgroundColor"></i><span data-project-color-label="backgroundColor">默认</span></button></label></section>
          <footer><button type="button" data-project-style-action="reset">恢复主题默认</button></footer>
        </aside>

        <aside class="ymz-node-style-panel" data-role="node-style-panel" aria-label="节点样式" hidden>
          <header class="ymz-node-style-panel__header"><strong>节点样式</strong><button type="button" data-node-style-action="close" aria-label="关闭节点样式">×</button></header>
          <section><h4>形状</h4><label><span>形状</span><select data-node-style="shape"><option value="roundedRectangle">圆角矩形</option><option value="rectangle">矩形</option><option value="diamond">菱形</option><option value="ellipse">椭圆</option><option value="pill">胶囊</option></select></label><label><span>填充</span><button type="button" class="ymz-node-color-trigger" data-node-color-trigger="fillColor"><i data-node-color-swatch="fillColor"></i><span data-node-color-label="fillColor">默认</span></button></label><label><span>边框</span><button type="button" class="ymz-node-color-trigger" data-node-color-trigger="borderColor"><i data-node-color-swatch="borderColor"></i><span data-node-color-label="borderColor">默认</span></button></label><label><span>线型</span><select data-node-style="borderDasharray"><option value="none">实线</option><option value="5,5">虚线</option><option value="2,3">点线</option></select></label><label><span>宽度</span><input type="number" data-node-style="borderWidth" min="0" max="12" step="1" value="1"></label><label><span>内容宽度</span><input type="number" data-node-style="width" min="40" max="1000" step="1"><button type="button" data-node-style-action="fit-width">适应</button></label></section>
          <section><h4>文本</h4><label><span>字体</span><select data-node-style="fontFamily"><option value="NeverMind">NeverMind</option><option value="system-ui">系统默认</option><option value="Arial">Arial</option><option value="Noto Sans SC">Noto Sans SC</option><option value="Noto Serif CJK SC">Noto Serif CJK SC</option></select></label><label><span>字号</span><input type="number" data-node-style="fontSize" min="8" max="96" step="1"></label><label><span>字重</span><select data-node-style="fontWeight"><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semibold</option><option value="700">Bold</option></select></label><label><span>颜色</span><button type="button" class="ymz-node-color-trigger" data-node-color-trigger="color"><i data-node-color-swatch="color"></i><span data-node-color-label="color">默认</span></button></label><div class="ymz-node-style-panel__buttons" aria-label="文字格式"><button type="button" data-node-style-toggle="fontWeight" data-node-style-value="700"><b>B</b></button><button type="button" data-node-style-toggle="fontStyle" data-node-style-value="italic"><i>I</i></button><button type="button" data-node-style-toggle="textDecoration" data-node-style-value="line-through"><s>S</s></button><button type="button" data-node-style-toggle="textDecoration" data-node-style-value="underline"><u>U</u></button></div><div class="ymz-node-style-panel__buttons" aria-label="文字对齐"><button type="button" data-node-style-set="textAlign" data-node-style-value="left">≡</button><button type="button" data-node-style-set="textAlign" data-node-style-value="center">≣</button><button type="button" data-node-style-set="textAlign" data-node-style-value="right">≡</button></div></section>
          <footer><button type="button" data-node-style-action="reset">恢复主题样式</button></footer>
        </aside>

        <div class="ymz-relation-panel" data-role="relation-panel" hidden data-mode="idle">
          <span data-role="relation-hint"></span>
          <button data-relation-action="edit">编辑文字</button>
          <button class="is-danger" data-relation-action="delete">删除关联线</button>
          <button data-relation-action="cancel">取消</button>
        </div>

        <div class="ymz-outer-frame-panel" data-role="outer-frame-panel" hidden data-readonly="false">
          <span data-role="outer-frame-hint"></span>
          <button data-outer-frame-action="edit">编辑文字</button>
          <label title="边框颜色"><span>边框</span><input type="color" data-outer-frame-setting="strokeColor" value="#0984e3"></label>
          <label title="填充颜色"><span>填充</span><input type="color" data-outer-frame-setting="fill" value="#0984e3"></label>
          <select data-outer-frame-setting="strokeDasharray" aria-label="外框线型">
            <option value="5,5">虚线</option>
            <option value="none">实线</option>
          </select>
          <select data-outer-frame-setting="textAlign" aria-label="外框文字对齐">
            <option value="left">左对齐</option>
            <option value="center">居中</option>
            <option value="right">右对齐</option>
          </select>
          <button class="is-danger" data-outer-frame-action="delete">删除外框</button>
        </div>

        <div class="ymz-floating ymz-statusbar">
          <button class="ymz-status-title" data-role="title" title="${escapeHtml(title)}">${escapeHtml(title)}</button>
          <span class="ymz-stats" data-role="stats">roots 1 · nodes 0 · words 0</span>
          <span class="ymz-selection-count" data-role="selection-count" hidden></span>
          <button class="ymz-icon-button" data-action="fit" title="适配视图" aria-label="适配视图">${fitViewIcon()}</button>
          <button class="ymz-canvas-mode ymz-icon-button" data-action="toggle-selection-mode" title="选（选择优先）：左键框选，右键拖动画布" aria-label="选（选择优先）：左键框选，右键拖动画布" aria-pressed="false"><span data-role="canvas-mode-icon">${canvasModeIcon('select')}</span></button>
          <button class="ymz-icon-button" data-action="readonly" title="只读模式" aria-label="只读模式">${lockIcon()}</button>
          <button class="ymz-icon-button" data-action="zen" title="禅模式" aria-label="禅模式">${meditationIcon()}</button>
          <button data-action="zoom-out" title="缩小">−</button>
          <span class="ymz-zoom" data-role="zoom">100%</span>
          <button data-action="zoom-in" title="放大">＋</button>
          <button data-action="fullscreen" title="全屏">⛶</button>
          <button data-action="help" title="帮助">?</button>
        </div>
      </div>
    </div>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
