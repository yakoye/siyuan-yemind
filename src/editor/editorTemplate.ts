export function createEditorTemplate(title: string): string {
  return `
    <div class="ymz-editor" data-zen="false" data-readonly="false">
      <div class="ymz-canvas-wrap">
        <div class="ymz-floating ymz-topbar" role="toolbar" aria-label="YeMind Zen 工具栏">
          <button class="ymz-brand" data-action="fit" title="适配视图">YeMind</button>
          <span class="ymz-separator"></span>
          <button class="is-active" data-action="map">导图</button>
          <button data-action="undo" title="撤销">↶</button>
          <button data-action="redo" title="重做">↷</button>
          <button data-action="add-child" title="添加子节点">＋子</button>
          <button data-action="add-sibling" title="添加同级节点">＋同</button>
          <button class="is-danger" data-action="remove" title="删除节点">删除</button>
          <select data-action="layout" aria-label="布局">
            <option value="logicalStructure">向右逻辑图</option>
            <option value="logicalStructureLeft">向左逻辑图</option>
            <option value="mindMap">双向思维导图</option>
            <option value="organizationStructure">组织结构图</option>
            <option value="catalogOrganization">目录组织图</option>
          </select>
          <span class="ymz-save-state" data-role="save-state">已保存</span>
        </div>

        <div class="ymz-canvas" data-role="canvas"></div>

        <div class="ymz-floating ymz-leftbar" role="toolbar" aria-label="画布工具">
          <button data-action="fit" title="适配视图">⌖</button>
          <button data-action="reset" title="重置缩放">↺</button>
          <button data-action="undo" title="撤销">↶</button>
          <button data-action="redo" title="重做">↷</button>
        </div>

        <button class="ymz-zen-exit" data-action="zen-exit" title="退出禅模式">◉ <span>退出禅模式</span></button>

        <div class="ymz-floating ymz-statusbar">
          <button class="ymz-status-title" data-role="title" title="${escapeHtml(title)}">${escapeHtml(title)}</button>
          <span class="ymz-stats" data-role="stats">roots 1 · nodes 0 · words 0</span>
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
