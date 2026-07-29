import { normalizeLineStyle, themeOptionsHtml } from '../core/themePresets';
import { layoutOptionsHtml } from '../core/layoutPresets';
import { rainbowSchemeOptionsHtml } from '../core/colorSchemes';
import { appearanceIcon, brandIcon, canvasModeIcon, fitViewIcon, fullscreenIcon, helpIcon, historyIcon, lockIcon, meditationIcon, miniMapIcon, panelCloseIcon, pinIcon, presentationIcon, primaryViewIcon, projectControlIcon, projectStyleIcon, redoIcon, resetZoomIcon, saveIcon, searchIcon, shareIcon, transferIcon, undoIcon, zoomIcon } from './projectControls';
import { EXPORT_CATEGORIES, EXPORT_FORMATS, IMPORT_ACCEPT } from '../transfer/formatCatalog';
export function createEditorTemplate(
  title: string,
  theme: unknown = 'yemind-default',
  lineStyle: unknown = 'curve',
  pluginBaseUrl?: string,
  transferCapabilities: { fullBackup?: boolean; fullRestore?: boolean } = {},
): string {
  return `
    <div class="ymz-editor" data-zen="false" data-readonly="false" data-view="map" data-study-view="none" data-toolbars-pinned="true" data-topbar-visible="true" data-statusbar-visible="true" data-leftbar-visible="true" data-status-overflow-open="false" data-minimap-visible="false">
      <div class="ymz-canvas-wrap">
        <div class="ymz-floating ymz-topbar" role="toolbar" aria-label="YeMind 工具栏">
          <span class="ymz-brand" aria-label="YeMind">${brandIcon(pluginBaseUrl)}<span class="ymz-brand__name">YeMind</span></span>
          <span class="ymz-separator"></span>
          <button class="ymz-primary-view is-active" data-primary-view data-action="view-map" title="导图" aria-label="导图">${primaryViewIcon('map')}<span>导图</span></button>
          <button class="ymz-primary-view" data-primary-view data-action="view-outline" title="大纲" aria-label="大纲">${primaryViewIcon('outline')}<span>大纲</span></button>
          <button class="ymz-primary-view" data-primary-view data-action="view-cards" title="卡片" aria-label="卡片">${primaryViewIcon('cards')}<span>卡片</span></button>
          <button class="ymz-primary-view" data-primary-view data-action="view-review" title="复习" aria-label="复习">${primaryViewIcon('review')}<span>复习</span></button>
          <span class="ymz-separator ymz-topbar__desktop-utility"></span>
          <button class="ymz-project-control ymz-project-button ymz-topbar__desktop-utility" data-project-control="layout" data-action="layout-gallery" title="结构">
            ${projectControlIcon('layout')}<span data-role="layout-label">结构</span>
          </button>
          <select data-action="layout" aria-label="结构" hidden>
            ${layoutOptionsHtml('logicalStructure')}
          </select>
          <button class="ymz-project-control ymz-project-button ymz-topbar__desktop-utility" data-project-control="theme" data-action="theme-gallery" title="主题" aria-haspopup="listbox" aria-expanded="false">
            ${projectControlIcon('theme')}<span>主题</span>
          </button>
          <select data-action="theme" aria-label="主题" hidden>
            ${themeOptionsHtml(theme)}
          </select>
          <select data-action="line-style" aria-label="线型" hidden>
            <option value="curve"${normalizeLineStyle(lineStyle) === 'curve' ? ' selected' : ''}>曲线</option>
            <option value="direct"${normalizeLineStyle(lineStyle) === 'direct' ? ' selected' : ''}>直线</option>
            <option value="polyline"${normalizeLineStyle(lineStyle) === 'polyline' ? ' selected' : ''}>折线</option>
            <option value="straight"${normalizeLineStyle(lineStyle) === 'straight' ? ' selected' : ''}>圆角折线</option>
          </select>
          <button class="ymz-project-control ymz-project-button ymz-topbar__desktop-utility" data-action="project-style" title="整图样式">${projectStyleIcon()}<span>样式</span></button>
          <span class="ymz-separator ymz-topbar__desktop-utility"></span>
          <button class="ymz-search-action ymz-topbar__desktop-utility" data-action="open-search" title="项目内搜索" aria-label="项目内搜索">${searchIcon()}<span>搜索</span><kbd data-role="search-shortcut">Ctrl+K</kbd></button>
          <span class="ymz-toolbar-spacer"></span>
          <button class="ymz-transfer-action ymz-topbar__desktop-utility" data-action="import-file" title="导入导图文件" aria-label="导入导图文件">${transferIcon('import')}<span>导入</span></button>
          <button class="ymz-transfer-action ymz-topbar__desktop-utility" data-action="export-file" title="导出当前导图" aria-label="导出当前导图">${transferIcon('export')}<span>导出</span></button>
          <button class="ymz-share-action ymz-topbar__desktop-utility" data-action="share" title="分享当前导图" aria-label="分享当前导图">${shareIcon()}<span>分享</span></button>
          <span class="ymz-separator ymz-topbar__desktop-utility"></span>
          <button class="ymz-icon-button ymz-topbar__desktop-utility" data-action="cycle-appearance" title="当前跟随系统；切换为明亮外观" aria-label="当前跟随系统；切换为明亮外观"><span data-role="appearance-icon">${appearanceIcon('system')}</span></button>
          <button class="ymz-save-state ymz-topbar__desktop-utility" data-role="save-state" data-action="save" title="立即保存">${saveIcon()}<span data-role="save-state-label">已保存</span></button>
          <button class="ymz-topbar__overflow-trigger" data-action="toggle-top-overflow" title="更多操作" aria-label="更多操作" aria-haspopup="menu" aria-expanded="false">•••</button>
        </div>

        <div class="ymz-topbar__overflow-menu" data-role="top-overflow-menu" role="menu" aria-label="更多操作" hidden>
          <button role="menuitem" data-action="layout-gallery">${projectControlIcon('layout')}<span>结构</span></button>
          <button role="menuitem" data-action="theme-gallery">${projectControlIcon('theme')}<span>主题</span></button>
          <button role="menuitem" data-action="project-style">${projectStyleIcon()}<span>样式</span></button>
          <span class="ymz-topbar__overflow-separator"></span>
          <button role="menuitem" data-action="open-search">${searchIcon()}<span>搜索</span><kbd>Ctrl+K</kbd></button>
          <button role="menuitem" data-action="import-file">${transferIcon('import')}<span>导入</span></button>
          <button role="menuitem" data-action="export-file">${transferIcon('export')}<span>导出</span></button>
          <button role="menuitem" data-action="share">${shareIcon()}<span>分享</span></button>
          <span class="ymz-topbar__overflow-separator"></span>
          <button role="menuitem" data-action="cycle-appearance"><span data-role="appearance-icon">${appearanceIcon('system')}</span><span>明暗主题</span></button>
          <button role="menuitem" data-action="save">${saveIcon()}<span>立即保存</span></button>
        </div>

        <div class="ymz-search-panel" data-role="search-panel" data-replace-expanded="false" hidden>
          <div class="ymz-search-panel__row ymz-search-panel__row--find">
            <button class="ymz-search-panel__disclosure" data-search-action="toggle-replace" title="展开替换" aria-label="展开替换" aria-expanded="false">${searchPanelIcon('disclosure')}</button>
            <label class="ymz-search-panel__field ymz-search-panel__field--find">
              <input data-role="search-input" placeholder="查找" aria-label="查找">
              <span class="ymz-search-panel__options" role="group" aria-label="查找选项">
                <button type="button" data-search-option="case-sensitive" title="区分大小写" aria-label="区分大小写" aria-pressed="false">Aa</button>
                <button type="button" data-search-option="whole-word" title="全字匹配" aria-label="全字匹配" aria-pressed="false"><u>ab</u></button>
                <button type="button" data-search-option="regex" title="使用正则表达式" aria-label="使用正则表达式" aria-pressed="false">.*</button>
              </span>
            </label>
            <button type="button" class="ymz-search-panel__scope" data-search-option="selection-scope" title="仅在选中节点中查找" aria-label="仅在选中节点中查找" aria-pressed="false">选中节点</button>
            <span data-role="search-info">无结果</span>
            <span class="ymz-search-panel__nav" role="group" aria-label="搜索导航">
              <button data-search-action="previous" title="上一个" aria-label="上一个">${searchPanelIcon('previous')}</button>
              <button data-search-action="next" title="下一个" aria-label="下一个">${searchPanelIcon('next')}</button>
              <button data-search-action="close" title="关闭" aria-label="关闭">${searchPanelIcon('close')}</button>
            </span>
          </div>
          <div class="ymz-search-panel__row ymz-search-panel__row--replace" data-role="replace-row" hidden>
            <span class="ymz-search-panel__replace-indent" aria-hidden="true"></span>
            <label class="ymz-search-panel__field ymz-search-panel__field--replace">
              <input data-role="replace-input" placeholder="替换" aria-label="替换">
              <button type="button" data-search-option="preserve-case" title="保留大小写" aria-label="保留大小写" aria-pressed="false">AB</button>
            </label>
            <span class="ymz-search-panel__replace-actions" role="group" aria-label="替换操作">
              <button data-search-action="replace" title="替换当前">替换</button>
              <button data-search-action="replace-all" title="全部替换">全部替换</button>
            </span>
          </div>
          <div class="ymz-search-panel__error" data-role="search-error" role="status" hidden></div>
        </div>

        <input type="file" data-role="import-file-input" accept="${IMPORT_ACCEPT}" hidden>
        <aside class="ymz-transfer-panel ymz-transfer-panel--import" data-role="import-panel" aria-label="导入与恢复" hidden>
          <header><strong>导入与恢复</strong><button type="button" data-action="close-import-panel" aria-label="关闭导入面板">×</button></header>
          <div class="ymz-transfer-panel__import-groups">
            <section${transferCapabilities.fullRestore ? '' : ' hidden'}>
              <h4>恢复完整备份</h4>
              <p>恢复网页版全部导图、设置和检查点；恢复前会再次确认。</p>
              <button type="button" data-import-kind="host-backup"><strong>选择完整备份</strong><small>.json · YeMind 网页完整备份</small></button>
            </section>
            <section>
              <h4>恢复可编辑导图</h4>
              <p>识别 YeMind、KMindZ、XMind 及带恢复数据的 SVG、PNG、ZIP，并创建新的导图副本。</p>
              <button type="button" data-import-kind="map-backup"><strong>选择导图备份</strong><small>.yemind.svg / .yemind.zip / .kmindz / .xmind</small></button>
            </section>
            <section>
              <h4>从其他格式导入</h4>
              <p>把 Markdown、OPML、TXT、FreeMind MM 或旧 JSON 转换成可编辑导图。</p>
              <button type="button" data-import-kind="other"><strong>选择其他文件</strong><small>.md / .opml / .txt / .mm / .json</small></button>
            </section>
          </div>
        </aside>
        <aside class="ymz-transfer-panel" data-role="export-panel" aria-label="导出导图" hidden>
          <header><strong>导出导图</strong><button type="button" data-action="close-export-panel" aria-label="关闭导出面板">×</button></header>
          <section class="ymz-transfer-panel__backup"${transferCapabilities.fullBackup ? '' : ' hidden'}>
            <h4>完整备份</h4>
            <p>包含网页版全部导图、设置和检查点，可通过“导入 → 恢复完整备份”恢复。</p>
            <button type="button" data-export-host-backup><strong>导出完整备份</strong><small>.json</small></button>
          </section>
          <p class="ymz-transfer-panel__hint"><strong>.yemind.zip / .yemind.svg</strong> 是当前导图的可恢复备份；SVG、PDF 等用于分享与发布。</p>
          <nav class="ymz-transfer-panel__categories" aria-label="导出类型">
            ${EXPORT_CATEGORIES.map((category, index) => `<button type="button" data-export-category="${category.id}" aria-pressed="${index === 0}">${category.label}</button>`).join('')}
          </nav>
          <div class="ymz-transfer-panel__formats">
            ${EXPORT_FORMATS.map((format) => `<button type="button" data-export-format="${format.id}" data-export-category-group="${format.category}"${format.default ? ' data-default="true"' : ''}><span><strong>${format.label}</strong><small>${format.extension}</small></span><em>${format.description}</em></button>`).join('')}
          </div>
        </aside>

        <div class="ymz-workspace">
          <div class="ymz-canvas" data-role="canvas"></div>
          <div class="ymz-split-divider" data-role="split-divider" role="separator" aria-orientation="vertical" aria-label="调整导图和大纲宽度" aria-valuemin="25" aria-valuemax="70" aria-valuenow="42" tabindex="0"></div>
          <aside class="ymz-outline" data-role="outline" aria-label="导图大纲">
            <header class="ymz-outline-panel__header"><div class="ymz-outline-panel__title">${primaryViewIcon('outline')}<span><strong>大纲</strong><small><span data-role="outline-node-count">0</span> 个节点</small></span></div><span><button type="button" data-action="outline-fullscreen" title="切换全屏大纲" aria-label="切换全屏大纲">${fullscreenIcon()}</button><button type="button" data-action="close-side-panel" title="关闭大纲" aria-label="关闭大纲">${panelCloseIcon()}</button></span></header>
            <div class="ymz-outline-panel__tools"><label>${searchIcon()}<input data-role="outline-search" placeholder="搜索大纲" aria-label="搜索大纲"></label><button type="button" data-action="outline-expand-all" title="展开全部" aria-label="展开全部">＋</button><button type="button" data-action="outline-collapse-all" title="折叠全部" aria-label="折叠全部">−</button></div>
            <div class="ymz-outline-tree ymz-structured-outline" data-role="outline-tree" role="tree" aria-label="结构化大纲编辑器" spellcheck="false"></div>
            <footer class="ymz-outline-panel__footer"><span><b data-role="outline-footer-count">0</b> 个节点</span><span>最大 <b data-role="outline-max-depth">1</b> 层</span></footer>
          </aside>
          <aside class="ymz-study-panel" data-role="study-panel" aria-label="卡片与复习" hidden></aside>
        </div>

        <div class="ymz-floating ymz-leftbar" role="toolbar" aria-label="画布工具">
          <button class="ymz-icon-button" data-action="checkpoints" title="检查点与历史" aria-label="检查点与历史">${historyIcon()}</button>
          <button class="ymz-icon-button" data-action="undo" title="撤销" aria-label="撤销">${undoIcon()}</button>
          <button class="ymz-icon-button" data-action="redo" title="重做" aria-label="重做">${redoIcon()}</button>
        </div>

        <button class="ymz-zen-exit" data-action="zen-exit" title="退出禅模式" aria-label="退出禅模式"><span class="ymz-zen-exit__idle"><span class="ymz-zen-exit__icon" aria-hidden="true">${meditationIcon()}</span></span><span class="ymz-zen-exit__label"><span class="ymz-zen-exit__icon" aria-hidden="true">${meditationIcon()}</span><span>退出禅模式</span></span></button>

        <aside class="ymz-layout-gallery" data-role="layout-gallery-panel" aria-label="导图结构" hidden>
          <header class="ymz-layout-gallery__header"><strong>导图结构</strong><button type="button" data-layout-gallery-action="close" aria-label="关闭结构面板">×</button></header>
          <div class="ymz-layout-gallery__body" data-role="layout-gallery-body"></div>
        </aside>

        <aside class="ymz-project-choice-panel" data-role="theme-choice-panel" aria-label="主题" role="listbox" hidden>
          <header class="ymz-project-choice-panel__header"><strong>主题</strong><button type="button" data-project-choice-action="close" aria-label="关闭主题面板">×</button></header>
          <div class="ymz-project-choice-panel__body" data-project-choice-body></div>
        </aside>

        <aside class="ymz-project-style-panel" data-role="project-style-panel" aria-label="整图样式" hidden>
          <header class="ymz-project-style-panel__header"><strong>样式</strong><button type="button" data-project-style-action="close" aria-label="关闭样式">×</button></header>
          <section><h4>密度</h4><div class="ymz-density-options" role="group" aria-label="节点密度"><button type="button" data-project-density="compact"><strong>紧凑</strong></button><button type="button" data-project-density="default"><strong>默认</strong></button><button type="button" data-project-density="comfortable"><strong>舒展</strong></button></div><div class="ymz-custom-spacing" aria-label="自定义节点间距"><label><span>左右</span><input type="number" min="12" max="240" step="1" data-project-spacing="horizontal" aria-label="水平间距"></label><label><span>上下</span><input type="number" min="2" max="100" step="1" data-project-spacing="vertical" aria-label="垂直间距"></label></div></section>
          <section class="ymz-project-style-panel__rainbow"><h4>彩虹连线配色</h4><div class="ymz-project-style-panel__rainbow-row"><label class="ymz-project-style-panel__switch"><input type="checkbox" data-project-style="rainbowLines"><strong>启用</strong></label><span class="ymz-project-style-panel__rainbow-separator" aria-hidden="true"></span><button type="button" class="ymz-rainbow-trigger" data-rainbow-trigger aria-haspopup="listbox" aria-expanded="false"><span data-rainbow-current-label>彩虹</span><i data-project-rainbow-preview aria-hidden="true"></i><span class="ymz-rainbow-trigger__arrow" aria-hidden="true">⌄</span></button><select data-project-style="rainbowScheme" aria-label="彩虹连线配色" hidden>${rainbowSchemeOptionsHtml('rainbow')}</select><div data-rainbow-picker hidden></div></div></section>
          <section class="ymz-project-style-panel__lines"><h4>线型</h4><div class="ymz-project-line-options" role="radiogroup" aria-label="导图连线线型"><button type="button" data-project-line-style="curve" role="radio">曲线</button><button type="button" data-project-line-style="direct" role="radio">直线</button><button type="button" data-project-line-style="polyline" role="radio">折线</button><button type="button" data-project-line-style="straight" role="radio">圆角</button></div></section>
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

        <div class="ymz-floating ymz-statusbar" role="toolbar" aria-label="导图状态与视图工具">
          <button class="ymz-status-title" data-role="title" title="点击重命名">${escapeHtml(title)}</button><input class="ymz-status-title-input" data-role="title-input" value="${escapeHtml(title)}" aria-label="导图标题" hidden>
          <span class="ymz-stats" data-role="stats">根节点 1 · 节点 0 · 字数 0</span>
          <span class="ymz-selection-count" data-role="selection-count" hidden></span>
          <span class="ymz-statusbar__spacer"></span>
          <span class="ymz-statusbar__group ymz-statusbar__group--core">
            <button class="ymz-icon-button" data-action="fit" title="适配视图" aria-label="适配视图">${fitViewIcon()}</button>
            <button class="ymz-canvas-mode ymz-icon-button" data-action="toggle-selection-mode" title="切换为拖动优先：左键拖动画布，Ctrl/Cmd + 左键框选" aria-label="切换为拖动优先：左键拖动画布，Ctrl/Cmd + 左键框选" aria-pressed="false"><span data-role="canvas-mode-icon">${canvasModeIcon('select')}</span></button>
            <button class="ymz-icon-button" data-action="readonly" title="进入只读模式" aria-label="进入只读模式" aria-pressed="false">${lockIcon(false)}</button>
          </span>
          <span class="ymz-statusbar__overflow-panel" data-role="status-overflow-menu" role="menu" aria-label="更多底栏操作">
            <span class="ymz-statusbar__group ymz-statusbar__group--secondary">
              <button class="ymz-icon-button" data-action="zen" title="禅模式" aria-label="禅模式">${meditationIcon()}</button>
              <button class="ymz-icon-button ymz-toolbar-pin" data-action="toggle-toolbar-pin" title="工具栏已固定" aria-label="工具栏已固定" aria-pressed="true">${pinIcon(true)}</button>
              <button class="ymz-icon-button" data-action="presentation" title="演示模式" aria-label="进入演示模式" aria-pressed="false">${presentationIcon()}</button>
            </span>
            <span class="ymz-statusbar__separator" aria-hidden="true"></span>
            <span class="ymz-statusbar__group ymz-statusbar__group--zoom">
              <button class="ymz-icon-button" data-action="zoom-out" title="缩小" aria-label="缩小">${zoomIcon('out')}</button>
              <input class="ymz-zoom" data-role="zoom" value="100%" inputmode="decimal" aria-label="缩放百分比" title="点击输入缩放百分比">
              <button class="ymz-icon-button" data-action="zoom-in" title="放大" aria-label="放大">${zoomIcon('in')}</button>
              <button class="ymz-icon-button" data-action="reset" title="重置缩放" aria-label="重置缩放">${resetZoomIcon()}</button>
            </span>
            <span class="ymz-statusbar__separator" aria-hidden="true"></span>
            <span class="ymz-statusbar__group ymz-statusbar__group--utility">
              <button class="ymz-icon-button" data-action="toggle-minimap" title="显示缩略图" aria-label="显示缩略图" aria-pressed="false">${miniMapIcon()}</button>
              <button class="ymz-icon-button" data-action="help" title="帮助" aria-label="帮助">${helpIcon()}</button>
            </span>
          </span>
          <button class="ymz-icon-button ymz-statusbar__overflow-trigger" data-action="toggle-status-overflow" title="更多底栏操作" aria-label="更多底栏操作" aria-haspopup="menu" aria-expanded="false">•••</button>
        </div>
        <aside class="ymz-minimap" data-role="minimap" aria-label="导图缩略图" hidden>
          <div class="ymz-minimap__content" data-role="minimap-content" aria-hidden="true"></div>
          <div class="ymz-minimap__viewport" data-role="minimap-viewport" aria-label="当前可视区域"></div>
          <span class="ymz-minimap__label" aria-hidden="true">MINIMAP</span>
        </aside>
        <button type="button" class="ymz-toolbar-edge ymz-toolbar-edge--top" data-toolbar-edge="top" aria-label="显示顶部工具栏"><span aria-hidden="true"></span></button>
        <button type="button" class="ymz-toolbar-edge ymz-toolbar-edge--left" data-toolbar-edge="left" aria-label="显示左侧工具栏"><span aria-hidden="true"></span></button>
        <button type="button" class="ymz-toolbar-edge ymz-toolbar-edge--bottom" data-toolbar-edge="bottom" aria-label="显示底部工具栏"><span aria-hidden="true"></span></button>
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

function searchPanelIcon(kind: 'disclosure' | 'previous' | 'next' | 'close'): string {
  const path = {
    disclosure: '<path d="m9 6 6 6-6 6"/>',
    previous: '<path d="m6 14 6-6 6 6"/>',
    next: '<path d="m6 10 6 6 6-6"/>',
    close: '<path d="m7 7 10 10M17 7 7 17"/>',
  }[kind];
  return `<svg class="ymz-search-panel__icon ymz-search-panel__icon--${kind}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}
