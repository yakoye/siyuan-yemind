import { normalizeLineStyle, themeOptionsHtml } from '../core/themePresets';
import { layoutOptionsHtml } from '../core/layoutPresets';
export function createEditorTemplate(title: string, theme: unknown = 'kmind-default', lineStyle: unknown = 'curve'): string {
  return `
    <div class="ymz-editor" data-zen="false" data-readonly="false" data-view="map">
      <div class="ymz-canvas-wrap">
        <div class="ymz-floating ymz-topbar" role="toolbar" aria-label="YeMind Zen 工具栏">
          <button class="ymz-brand" data-action="fit" title="适配视图">YeMind</button>
          <span class="ymz-separator"></span>
          <button class="is-active" data-action="view-map">导图</button>
          <button data-action="view-split">分屏</button>
          <button data-action="view-outline">大纲</button>
          <button data-action="open-search" title="项目内搜索">⌕</button>
          <button data-action="checkpoints" title="检查点与安全恢复">检查点</button>
          <span class="ymz-separator"></span>
          <button data-action="undo" title="撤销">↶</button>
          <button data-action="redo" title="重做">↷</button>
          <button data-action="add-child" title="添加子节点">＋子</button>
          <button data-action="add-sibling" title="添加同级节点">＋同</button>
          <button class="is-danger" data-action="remove" title="删除节点">删除</button>
          <select data-action="layout" aria-label="布局" title="布局">
            ${layoutOptionsHtml('logicalStructure')}
          </select>
          <select data-action="theme" aria-label="主题" title="主题">
            ${themeOptionsHtml(theme)}
          </select>
          <select data-action="line-style" aria-label="线型" title="父子节点线型">
            <option value="curve"${normalizeLineStyle(lineStyle) === 'curve' ? ' selected' : ''}>弧线</option>
            <option value="straight"${normalizeLineStyle(lineStyle) === 'straight' ? ' selected' : ''}>圆角折线</option>
            <option value="direct"${normalizeLineStyle(lineStyle) === 'direct' ? ' selected' : ''}>直线</option>
          </select>
          <span class="ymz-save-state" data-role="save-state">已保存</span>
        </div>

        <div class="ymz-search-panel" data-role="search-panel" hidden>
          <div class="ymz-search-panel__row">
            <input class="b3-text-field" data-role="search-input" placeholder="搜索节点内容">
            <button data-search-action="previous" title="上一个">↑</button>
            <button data-search-action="next" title="下一个">↓</button>
            <span data-role="search-info">0 / 0</span>
            <button data-search-action="close" title="关闭">×</button>
          </div>
          <div class="ymz-search-panel__row">
            <input class="b3-text-field" data-role="replace-input" placeholder="替换为">
            <button data-search-action="replace">替换</button>
            <button data-search-action="replace-all">全部替换</button>
          </div>
        </div>

        <div class="ymz-workspace">
          <div class="ymz-canvas" data-role="canvas"></div>
          <div class="ymz-split-divider" data-role="split-divider" role="separator" aria-orientation="vertical" aria-label="调整导图和大纲宽度" aria-valuemin="25" aria-valuemax="70" aria-valuenow="42" tabindex="0"></div>
          <aside class="ymz-outline" data-role="outline" role="tree" aria-label="导图大纲"></aside>
        </div>

        <div class="ymz-floating ymz-leftbar" role="toolbar" aria-label="画布工具">
          <button data-action="fit" title="适配视图">⌖</button>
          <button data-action="reset" title="重置视图（100%）">↺</button>
          <button data-action="reset-layout" title="整理布局">整</button>
          <button data-action="toggle-selection-mode" title="平移优先：左键拖动画布；Ctrl/Cmd + 左键框选" aria-pressed="false">框</button>
          <button data-action="undo" title="撤销">↶</button>
          <button data-action="redo" title="重做">↷</button>
        </div>

        <button class="ymz-zen-exit" data-action="zen-exit" title="退出禅模式" aria-label="退出禅模式"><span class="ymz-zen-exit__idle"><span class="ymz-zen-exit__icon ymz-zen-exit__dot" aria-hidden="true">●</span><span>禅</span></span><span class="ymz-zen-exit__label"><span class="ymz-zen-exit__icon ymz-zen-exit__dot" aria-hidden="true">●</span><span>退出禅模式</span></span></button>

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
          <button data-action="open-search" title="搜索">⌕</button>
          <button data-action="fit" title="适配视图">⌖</button>
          <button data-action="readonly" title="只读模式">锁</button>
          <button data-action="zen" title="禅模式">禅</button>
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
