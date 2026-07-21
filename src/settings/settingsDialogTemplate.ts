import {
  DEFAULT_SHORTCUTS,
  type ShortcutCommand,
  type ShortcutMap,
  type YeMindSettings,
} from './SettingsStore';

export const SHORTCUT_ROWS: Array<{ key: ShortcutCommand; label: string; group: string }> = [
  { key: 'search', label: '项目内搜索', group: '导图命令' },
  { key: 'toggleZen', label: '切换禅模式', group: '导图命令' },
  { key: 'toggleReadonly', label: '切换只读模式', group: '导图命令' },
  { key: 'undo', label: '撤销', group: '导图命令' },
  { key: 'redo', label: '重做', group: '导图命令' },
  { key: 'fit', label: '适配视图', group: '导图命令' },
  { key: 'reset', label: '重置视图（100%）', group: '导图命令' },
  { key: 'addParent', label: '添加父节点', group: '节点命令' },
  { key: 'comments', label: '打开批注', group: '节点命令' },
  { key: 'summary', label: '概要', group: '节点命令' },
  { key: 'relation', label: '关联线', group: '节点命令' },
];

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function checked(value: boolean): string {
  return value ? ' checked' : '';
}

function option(value: string, label: string, current: string): string {
  return `<option value="${escapeHtml(value)}"${value === current ? ' selected' : ''}>${escapeHtml(label)}</option>`;
}

function switchRow(title: string, description: string, key: keyof YeMindSettings, value: boolean): string {
  return `<label class="ymz-settings-row ymz-settings-row--switch">
    <span><b>${escapeHtml(title)}</b><small>${escapeHtml(description)}</small></span>
    <input class="b3-switch" type="checkbox" data-setting="${String(key)}"${checked(value)}>
  </label>`;
}

function selectRow(title: string, description: string, key: keyof YeMindSettings, options: string): string {
  return `<label class="ymz-settings-row">
    <span><b>${escapeHtml(title)}</b><small>${escapeHtml(description)}</small></span>
    <select class="b3-select fn__size200" data-setting="${String(key)}">${options}</select>
  </label>`;
}


function textRow(title: string, description: string, key: keyof YeMindSettings, value: string): string {
  return `<label class="ymz-settings-row">
    <span><b>${escapeHtml(title)}</b><small>${escapeHtml(description)}</small></span>
    <input class="b3-text-field fn__size200" type="text" data-setting="${String(key)}" value="${escapeHtml(value)}">
  </label>`;
}

function numberRow(title: string, description: string, key: keyof YeMindSettings, value: number, min: number, max: number, step: number, suffix: string): string {
  return `<label class="ymz-settings-row">
    <span><b>${escapeHtml(title)}</b><small>${escapeHtml(description)}</small></span>
    <span class="ymz-settings-number"><input class="b3-text-field" type="number" data-setting="${String(key)}" value="${value}" min="${min}" max="${max}" step="${step}"><em>${escapeHtml(suffix)}</em></span>
  </label>`;
}

function shortcutsHtml(shortcuts: ShortcutMap): string {
  let currentGroup = '';
  return SHORTCUT_ROWS.map((row) => {
    const group = row.group !== currentGroup
      ? `<h3 class="ymz-settings-shortcuts__group">${escapeHtml(row.group)}</h3>`
      : '';
    currentGroup = row.group;
    return `${group}<div class="ymz-shortcut-row" data-shortcut-row="${row.key}">
      <span class="ymz-shortcut-row__label">${escapeHtml(row.label)}</span>
      <input class="b3-text-field" data-shortcut="${row.key}" value="${escapeHtml(shortcuts[row.key])}" placeholder="未设置">
      <button class="b3-button b3-button--outline" data-shortcut-action="record" data-shortcut-key="${row.key}">录制</button>
      <button class="b3-button b3-button--cancel" data-shortcut-action="disable" data-shortcut-key="${row.key}">禁用</button>
      <button class="b3-button b3-button--outline" data-shortcut-action="restore" data-shortcut-key="${row.key}">恢复默认</button>
      <small class="ymz-shortcut-row__conflict" data-shortcut-conflict="${row.key}"></small>
    </div>`;
  }).join('');
}

export function createSettingsDialogTemplate(settings: YeMindSettings): string {
  return `<div class="ymz-settings-shell">
    <aside class="ymz-settings-nav" aria-label="设置分类">
      <button class="is-active" data-settings-page="general">常规</button>
      <button data-settings-page="drag-layout">拖拽与布局</button>
      <button data-settings-page="content">节点与内容</button>
      <button data-settings-page="shortcuts">快捷键</button>
    </aside>
    <main class="ymz-settings-main">
      <section class="ymz-settings-page" data-settings-panel="general">
        <header><h2>常规</h2><p>修改后点击保存，将应用到所有已打开的 YeMind Zen 标签页。</p></header>
        <div class="ymz-settings-group"><h3>默认视图模式</h3>
          ${selectRow('默认视图', '新打开导图时使用导图、大纲或分屏。', 'defaultViewMode', [
            option('map', '导图', settings.defaultViewMode),
            option('split', '分屏', settings.defaultViewMode),
            option('outline', '大纲', settings.defaultViewMode),
          ].join(''))}
          ${numberRow('分屏大纲宽度', '分屏模式中右侧大纲占工作区的比例；也可直接拖动分隔条。', 'splitOutlineRatio', settings.splitOutlineRatio, 0.25, 0.7, 0.01, '比例')}
          ${selectRow('默认布局', '新建导图时使用的结构。', 'defaultLayout', [
            option('logicalStructure', '向右逻辑图', settings.defaultLayout),
            option('logicalStructureLeft', '向左逻辑图', settings.defaultLayout),
            option('mindMap', '双向思维导图', settings.defaultLayout),
            option('organizationStructure', '组织结构图', settings.defaultLayout),
            option('catalogOrganization', '目录组织图', settings.defaultLayout),
          ].join(''))}
          ${switchRow('默认禅模式', '隐藏上、左、下三组工具栏。', 'defaultZenMode', settings.defaultZenMode)}
          ${switchRow('默认只读模式', '禁止编辑，保留平移、缩放和展开折叠。', 'defaultReadonlyMode', settings.defaultReadonlyMode)}
        </div>
        <div class="ymz-settings-group"><h3>画布操作习惯</h3>
          ${selectRow('画布操作模式', '选（选择优先）：左键框选，右键拖动画布；拖（拖动优先）：左键拖动画布，Ctrl/Cmd + 左键框选。', 'canvasMode', [
            option('select', '选（选择优先）', settings.canvasMode),
            option('pan', '拖（拖动优先）', settings.canvasMode),
          ].join(''))}
          ${selectRow('滚轮行为', '控制滚轮平移和缩放。', 'wheelMode', [
            option('pan', '滚轮平移，Ctrl/Cmd 缩放', settings.wheelMode),
            option('zoom', '直接缩放', settings.wheelMode),
            option('none', '关闭滚轮缩放', settings.wheelMode),
          ].join(''))}
          ${switchRow('打开时适配视图', '打开导图后完整显示全部节点。', 'autoFitOnOpen', settings.autoFitOnOpen)}
          ${switchRow('恢复上次视图位置', '重新打开时恢复上次缩放比例和画布位置。关闭后使用默认视图。', 'restoreSavedView', settings.restoreSavedView)}
          ${numberRow('自动保存延迟', '停止编辑后多久写入数据。', 'autosaveDelayMs', settings.autosaveDelayMs, 100, 5000, 50, '毫秒')}
        </div>
      </section>

      <section class="ymz-settings-page" data-settings-panel="drag-layout" hidden>
        <header><h2>拖拽与布局</h2><p>节点移动、子树跟随、同级插入和重新排版全部使用 simple-mind-map 原生拖拽。</p></header>
        <div class="ymz-settings-group"><h3>节点拖拽</h3>
          ${switchRow('边缘自动平移', '拖拽到画布边缘时自动移动画布。关闭可避免画布意外飞走。', 'dragEdgeAutoPan', settings.dragEdgeAutoPan)}
          ${switchRow('限制导图在画布内', '限制画布拖动范围，避免导图完全移出可视区域。', 'limitMindMapInCanvas', settings.limitMindMapInCanvas)}
        </div>
        <div class="ymz-settings-group"><h3>节点间距</h3>
          ${numberRow('二级节点横向间距', '根节点与二级节点之间的距离。', 'secondLevelMarginX', settings.secondLevelMarginX, 20, 300, 2, 'px')}
          ${numberRow('二级节点纵向间距', '同一根节点下二级节点之间的距离。', 'secondLevelMarginY', settings.secondLevelMarginY, 0, 200, 2, 'px')}
          ${numberRow('下级节点横向间距', '三级及以下父子节点之间的距离。', 'nodeMarginX', settings.nodeMarginX, 10, 240, 2, 'px')}
          ${numberRow('下级节点纵向间距', '三级及以下同级节点之间的距离。', 'nodeMarginY', settings.nodeMarginY, 0, 160, 2, 'px')}
        </div>
        <div class="ymz-settings-group"><h3>视图范围</h3>
          ${numberRow('最小缩放', '快捷键和滚轮允许缩小到的最小比例。', 'minZoomRatio', settings.minZoomRatio, 5, 100, 5, '%')}
          ${numberRow('最大缩放', '快捷键和滚轮允许放大的最大比例。', 'maxZoomRatio', settings.maxZoomRatio, 100, 1000, 10, '%')}
          ${numberRow('适配视图留白', '执行适配视图时，导图四周保留的空白。', 'fitPadding', settings.fitPadding, 0, 300, 5, 'px')}
        </div>
      </section>

      <section class="ymz-settings-page" data-settings-panel="content" hidden>
        <header><h2>节点与内容</h2><p>控制节点入口、富文本、代码和模糊显示。</p></header>
        <div class="ymz-settings-group"><h3>节点入口控件</h3>
          ${switchRow('显示添加子节点按钮', '节点激活后显示快速添加入口。', 'showQuickCreate', settings.showQuickCreate)}
          ${switchRow('显示待办标记', '节点文字前显示待办状态。', 'showTodoBadge', settings.showTodoBadge)}
          ${switchRow('显示批注标记', '节点右侧显示批注图标。', 'showCommentBadge', settings.showCommentBadge)}
        </div>
        <div class="ymz-settings-group"><h3>概要与关联线</h3>
          ${textRow('默认概要文字', '使用原生 ADD_GENERALIZATION 创建概要时的默认文字。', 'defaultSummaryText', settings.defaultSummaryText)}
          ${textRow('默认关联线文字', '首次激活新关联线时显示的默认文字。', 'defaultRelationText', settings.defaultRelationText)}
          ${switchRow('关联线始终显示在节点上层', '关闭后，未激活的关联线回到节点下方。', 'relationAlwaysAboveNode', settings.relationAlwaysAboveNode)}
          ${switchRow('允许调整关联线端点和控制点', '选中关联线后可拖动端点和两个贝塞尔控制点。', 'relationAdjustPoints', settings.relationAdjustPoints)}
        </div>
        <div class="ymz-settings-group"><h3>外框</h3>
          ${textRow('默认外框文字', '新建外框首次激活时显示的默认文字。', 'defaultOuterFrameText', settings.defaultOuterFrameText)}
          ${numberRow('外框横向留白', '外框左右两侧相对节点范围保留的距离。', 'outerFramePaddingX', settings.outerFramePaddingX, 0, 80, 1, 'px')}
          ${numberRow('外框纵向留白', '外框上下两侧相对节点范围保留的距离。', 'outerFramePaddingY', settings.outerFramePaddingY, 0, 80, 1, 'px')}
        </div>
        <div class="ymz-settings-group"><h3>富文本与代码</h3>
          ${switchRow('富文本选区工具栏', '选中文字后显示格式、链接、公式和代码工具。', 'showRichTextToolbar', settings.showRichTextToolbar)}
          ${switchRow('裸域名自动补 HTTPS', '输入 example.com 时补全为安全链接。', 'inlineLinkAutoHttps', settings.inlineLinkAutoHttps)}
          ${selectRow('外部链接打开方式', '思源 siyuan:// 链接不受影响。', 'externalLinkMode', [
            option('new-window', '新窗口打开', settings.externalLinkMode),
            option('current-window', '当前窗口打开', settings.externalLinkMode),
          ].join(''))}
          ${selectRow('默认代码语言', '新建代码块时预选。', 'defaultCodeLanguage', [
            option('plain', '纯文本', settings.defaultCodeLanguage),
            option('javascript', 'JavaScript', settings.defaultCodeLanguage),
            option('typescript', 'TypeScript', settings.defaultCodeLanguage),
            option('python', 'Python', settings.defaultCodeLanguage),
            option('bash', 'Bash / Shell', settings.defaultCodeLanguage),
            option('json', 'JSON', settings.defaultCodeLanguage),
            option('cpp', 'C++', settings.defaultCodeLanguage),
            option('rust', 'Rust', settings.defaultCodeLanguage),
            option('go', 'Go', settings.defaultCodeLanguage),
            option('sql', 'SQL', settings.defaultCodeLanguage),
            option('markdown', 'Markdown', settings.defaultCodeLanguage),
          ].join(''))}
          ${selectRow('代码 Tab 宽度', '代码编辑器与节点代码块缩进宽度。', 'codeBlockTabSize', [
            option('2', '2 个空格', String(settings.codeBlockTabSize)),
            option('4', '4 个空格', String(settings.codeBlockTabSize)),
          ].join(''))}
          ${switchRow('代码块自动换行', '关闭时使用水平滚动。', 'codeBlockWrap', settings.codeBlockWrap)}
          ${switchRow('显示代码语言', '在代码块上方显示语言标签。', 'codeBlockShowLanguage', settings.codeBlockShowLanguage)}
          ${numberRow('代码字号', '代码编辑器和节点代码块字号。', 'codeBlockFontSize', settings.codeBlockFontSize, 10, 24, 1, 'px')}
        </div>
        <div class="ymz-settings-group"><h3>模糊</h3>
          ${selectRow('模糊显示方式', '完全隐藏或保留模糊轮廓。', 'clozeMode', [
            option('hidden', '完全隐藏', settings.clozeMode),
            option('blur', '模糊显示', settings.clozeMode),
          ].join(''))}
          ${switchRow('悬停显示答案', '鼠标移入模糊内容时临时显示。', 'clozeRevealOnHover', settings.clozeRevealOnHover)}
        </div>
      </section>

      <section class="ymz-settings-page" data-settings-panel="shortcuts" hidden>
        <header><h2>快捷键</h2><p>可直接编辑组合键，也可以录制、禁用或恢复默认。</p></header>
        <div class="ymz-settings-shortcuts">${shortcutsHtml(settings.shortcutMap)}</div>
      </section>
      <footer class="ymz-settings-footer">
        <button class="b3-button b3-button--cancel" data-settings-action="reset">恢复全部默认值</button>
        <span class="fn__flex-1"></span>
        <button class="b3-button b3-button--cancel" data-settings-action="cancel">取消</button>
        <button class="b3-button b3-button--text" data-settings-action="save">保存</button>
      </footer>
    </main>
  </div>`;
}
