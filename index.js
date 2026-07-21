"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const siyuan = require("siyuan");
function createDefaultTree(title) {
  return {
    data: { text: title, expand: true },
    children: [
      { data: { text: "主要主题", expand: true }, children: [] },
      { data: { text: "另一个主题", expand: true }, children: [] }
    ]
  };
}
function createDefaultMap(title = "未命名导图", id = ((_b) => (_b = ((_a) => (_a = globalThis.crypto) == null ? void 0 : _a.randomUUID)()) == null ? void 0 : _b.call(_a))() ?? `map-${Date.now()}`, now = Date.now()) {
  const normalizedTitle = title.trim() || "未命名导图";
  return {
    id,
    title: normalizedTitle,
    createdAt: now,
    updatedAt: now,
    layout: "logicalStructure",
    theme: "default",
    data: createDefaultTree(normalizedTitle)
  };
}
const clone = (value) => JSON.parse(JSON.stringify(value));
function normalizeMap(value) {
  var _a;
  if (!value || typeof value !== "object") return null;
  const candidate = value;
  if (!candidate.id || !candidate.title || !((_a = candidate.data) == null ? void 0 : _a.data)) return null;
  return {
    id: String(candidate.id),
    title: String(candidate.title),
    createdAt: Number(candidate.createdAt) || Date.now(),
    updatedAt: Number(candidate.updatedAt) || Number(candidate.createdAt) || Date.now(),
    layout: typeof candidate.layout === "string" ? candidate.layout : "logicalStructure",
    theme: typeof candidate.theme === "string" ? candidate.theme : "default",
    data: clone(candidate.data),
    viewData: candidate.viewData ? clone(candidate.viewData) : void 0
  };
}
class MapRepository {
  constructor(storage, options = {}) {
    __publicField(this, "state", { version: 1, activeMapId: null, maps: [] });
    __publicField(this, "listeners", /* @__PURE__ */ new Set());
    __publicField(this, "now");
    __publicField(this, "id");
    this.storage = storage;
    this.now = options.now ?? (() => Date.now());
    this.id = options.id ?? (() => {
      var _a, _b;
      return ((_b = (_a = globalThis.crypto) == null ? void 0 : _a.randomUUID) == null ? void 0 : _b.call(_a)) ?? `map-${Date.now()}`;
    });
  }
  async load() {
    var _a;
    const raw = await this.storage.load();
    if (!raw || typeof raw !== "object") {
      this.state = { version: 1, activeMapId: null, maps: [] };
      this.emit();
      return;
    }
    const candidate = raw;
    const maps = Array.isArray(candidate.maps) ? candidate.maps.map(normalizeMap).filter((item) => Boolean(item)) : [];
    const activeMapId = maps.some((map2) => map2.id === candidate.activeMapId) ? String(candidate.activeMapId) : ((_a = maps[0]) == null ? void 0 : _a.id) ?? null;
    this.state = { version: 1, activeMapId, maps };
    this.emit();
  }
  list() {
    return clone(this.state.maps);
  }
  get(id) {
    const map2 = this.state.maps.find((item) => item.id === id);
    return map2 ? clone(map2) : void 0;
  }
  getActiveMapId() {
    return this.state.activeMapId;
  }
  async setActiveMap(id) {
    this.state.activeMapId = id && this.state.maps.some((map2) => map2.id === id) ? id : null;
    await this.persist();
  }
  async create(title) {
    const map2 = createDefaultMap(title, this.id(), this.now());
    this.state.maps.push(map2);
    this.state.activeMapId = map2.id;
    await this.persist();
    return clone(map2);
  }
  async rename(id, title) {
    const map2 = this.state.maps.find((item) => item.id === id);
    if (!map2) return;
    const normalized = title.trim();
    if (!normalized) return;
    map2.title = normalized;
    map2.updatedAt = this.now();
    await this.persist();
  }
  async update(id, patch) {
    const map2 = this.state.maps.find((item) => item.id === id);
    if (!map2) return;
    if (patch.data) map2.data = clone(patch.data);
    if (patch.layout) map2.layout = patch.layout;
    if (patch.theme) map2.theme = patch.theme;
    if (patch.viewData !== void 0) map2.viewData = clone(patch.viewData);
    map2.updatedAt = this.now();
    await this.persist();
  }
  async remove(id) {
    var _a, _b;
    const index = this.state.maps.findIndex((item) => item.id === id);
    if (index < 0) return;
    this.state.maps.splice(index, 1);
    if (this.state.activeMapId === id) {
      this.state.activeMapId = ((_a = this.state.maps[index]) == null ? void 0 : _a.id) ?? ((_b = this.state.maps[index - 1]) == null ? void 0 : _b.id) ?? null;
    }
    await this.persist();
  }
  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }
  snapshot() {
    return clone(this.state);
  }
  async persist() {
    await this.storage.save(this.snapshot());
    this.emit();
  }
  emit() {
    const snapshot = this.snapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
function escapeHtml$2(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function promptText(title, initialValue, placeholder = "") {
  return new Promise((resolve) => {
    const inputId = `ymz-input-${Date.now()}`;
    const dialog = new siyuan.Dialog({
      title,
      width: "440px",
      content: `<div class="b3-dialog__content"><input id="${inputId}" class="b3-text-field fn__block" value="${escapeHtml$2(initialValue)}" placeholder="${escapeHtml$2(placeholder)}"></div><div class="b3-dialog__action"><button class="b3-button b3-button--cancel">取消</button><button class="b3-button b3-button--text">确定</button></div>`,
      destroyCallback: () => resolve(null)
    });
    const element = dialog.element;
    const input = element.querySelector(`#${inputId}`);
    const cancel = element.querySelector(".b3-button--cancel");
    const confirm = element.querySelector(".b3-button--text");
    let completed = false;
    const finish = (value) => {
      if (completed) return;
      completed = true;
      resolve(value);
      dialog.destroy();
    };
    cancel.addEventListener("click", () => finish(null));
    confirm.addEventListener("click", () => finish(input.value.trim() || null));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") finish(input.value.trim() || null);
      if (event.key === "Escape") finish(null);
    });
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  });
}
function confirmAction(title, message, confirmText = "确定") {
  return new Promise((resolve) => {
    var _a, _b;
    const dialog = new siyuan.Dialog({
      title,
      width: "440px",
      content: `<div class="b3-dialog__content"><p>${escapeHtml$2(message)}</p></div><div class="b3-dialog__action"><button class="b3-button b3-button--cancel">取消</button><button class="b3-button b3-button--text">${escapeHtml$2(confirmText)}</button></div>`,
      destroyCallback: () => resolve(false)
    });
    let completed = false;
    const finish = (value) => {
      if (completed) return;
      completed = true;
      resolve(value);
      dialog.destroy();
    };
    (_a = dialog.element.querySelector(".b3-button--cancel")) == null ? void 0 : _a.addEventListener("click", () => finish(false));
    (_b = dialog.element.querySelector(".b3-button--text")) == null ? void 0 : _b.addEventListener("click", () => finish(true));
  });
}
function selectElement(options, onChange) {
  const select = document.createElement("select");
  select.className = "b3-select fn__size200";
  options.forEach(({ value, label }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  });
  select.addEventListener("change", () => onChange(select.value));
  return select;
}
function checkboxElement(onChange) {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "b3-switch";
  input.addEventListener("change", () => onChange(input.checked));
  return input;
}
function registerSettings(plugin, store) {
  const layout2 = selectElement([
    { value: "logicalStructure", label: "向右逻辑图" },
    { value: "logicalStructureLeft", label: "向左逻辑图" },
    { value: "mindMap", label: "双向思维导图" },
    { value: "organizationStructure", label: "组织结构图" },
    { value: "catalogOrganization", label: "目录组织图" }
  ], (value) => void store.update({ defaultLayout: value }));
  const canvas = selectElement([
    { value: "pan", label: "平移优先" },
    { value: "select", label: "选择优先" }
  ], (value) => void store.update({ canvasMode: value }));
  const wheel = selectElement([
    { value: "pan", label: "滚轮平移，Ctrl/Cmd 缩放" },
    { value: "zoom", label: "直接缩放" },
    { value: "none", label: "关闭滚轮缩放" }
  ], (value) => void store.update({ wheelMode: value }));
  const quickCreate = checkboxElement((checked) => void store.update({ showQuickCreate: checked }));
  const autoFit = checkboxElement((checked) => void store.update({ autoFitOnOpen: checked }));
  plugin.setting.addItem({ title: "默认布局", description: "新建导图默认使用的结构。", actionElement: layout2 });
  plugin.setting.addItem({ title: "画布拖拽习惯", description: "平移优先或框选优先。", actionElement: canvas });
  plugin.setting.addItem({ title: "滚轮行为", description: "控制画布滚轮与缩放方式。", actionElement: wheel });
  plugin.setting.addItem({ title: "显示添加子节点按钮", description: "节点选中后显示快速添加入口。", actionElement: quickCreate });
  plugin.setting.addItem({ title: "打开时适配视图", description: "打开导图后自动完整显示全部节点。", actionElement: autoFit });
  store.subscribe((settings) => {
    layout2.value = settings.defaultLayout;
    canvas.value = settings.canvasMode;
    wheel.value = settings.wheelMode;
    quickCreate.checked = settings.showQuickCreate;
    autoFit.checked = settings.autoFitOnOpen;
  });
}
const DEFAULT_SETTINGS = {
  defaultLayout: "logicalStructure",
  canvasMode: "pan",
  wheelMode: "pan",
  showQuickCreate: true,
  autoFitOnOpen: true
};
const LAYOUTS = /* @__PURE__ */ new Set(["logicalStructure", "logicalStructureLeft", "mindMap", "organizationStructure", "catalogOrganization"]);
const CANVAS_MODES = /* @__PURE__ */ new Set(["pan", "select"]);
const WHEEL_MODES = /* @__PURE__ */ new Set(["zoom", "pan", "none"]);
class SettingsStore {
  constructor(storage) {
    __publicField(this, "state", { ...DEFAULT_SETTINGS });
    __publicField(this, "listeners", /* @__PURE__ */ new Set());
    this.storage = storage;
  }
  async load() {
    const raw = await this.storage.load();
    if (raw && typeof raw === "object") {
      const value = raw;
      this.state = {
        defaultLayout: LAYOUTS.has(value.defaultLayout) ? value.defaultLayout : DEFAULT_SETTINGS.defaultLayout,
        canvasMode: CANVAS_MODES.has(value.canvasMode) ? value.canvasMode : DEFAULT_SETTINGS.canvasMode,
        wheelMode: WHEEL_MODES.has(value.wheelMode) ? value.wheelMode : DEFAULT_SETTINGS.wheelMode,
        showQuickCreate: typeof value.showQuickCreate === "boolean" ? value.showQuickCreate : DEFAULT_SETTINGS.showQuickCreate,
        autoFitOnOpen: typeof value.autoFitOnOpen === "boolean" ? value.autoFitOnOpen : DEFAULT_SETTINGS.autoFitOnOpen
      };
    }
    this.emit();
  }
  get() {
    return { ...this.state };
  }
  async update(patch) {
    this.state = { ...this.state, ...patch };
    await this.storage.save(this.get());
    this.emit();
  }
  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.get());
    return () => this.listeners.delete(listener);
  }
  emit() {
    const value = this.get();
    this.listeners.forEach((listener) => listener(value));
  }
}
const MAP_STORAGE_NAME = "maps.json";
const SETTINGS_STORAGE_NAME = "settings.json";
const TAB_TYPE = "yemind-map";
const DOCK_TYPE = "yemind-dock";
const ICON_ID = "iconYeMind";
class YeMindDockView {
  constructor(host, element) {
    __publicField(this, "unsubscribe", null);
    this.host = host;
    this.element = element;
    this.element.classList.add("ymz-dock");
    this.unsubscribe = this.host.repository.subscribe(() => this.render());
  }
  destroy() {
    var _a;
    (_a = this.unsubscribe) == null ? void 0 : _a.call(this);
    this.element.innerHTML = "";
  }
  render() {
    const maps = this.host.repository.list();
    const activeId = this.host.repository.getActiveMapId();
    this.element.innerHTML = `<div class="ymz-dock__head"><span>YeMind Zen</span><button data-action="new" aria-label="新建导图" title="新建导图">＋</button><button data-action="refresh" aria-label="刷新" title="刷新">↻</button></div><div class="ymz-dock__body"></div>`;
    const body = this.element.querySelector(".ymz-dock__body");
    if (maps.length === 0) {
      body.innerHTML = '<div class="ymz-dock__empty">暂无导图</div>';
    } else {
      maps.forEach((map2) => {
        const row = document.createElement("div");
        row.className = `ymz-dock__item${map2.id === activeId ? " is-active" : ""}`;
        row.dataset.mapId = map2.id;
        row.innerHTML = `<button class="ymz-dock__title" data-action="open" title="${escapeHtml$1(map2.title)}">${escapeHtml$1(map2.title)}</button><button class="ymz-dock__action" data-action="copy" title="复制链接"><svg><use xlink:href="#iconCopy"></use></svg></button><button class="ymz-dock__action" data-action="rename" title="重命名"><svg><use xlink:href="#iconEdit"></use></svg></button><button class="ymz-dock__action" data-action="delete" title="删除"><svg><use xlink:href="#iconTrashcan"></use></svg></button>`;
        body.appendChild(row);
      });
    }
    this.bindEvents();
  }
  bindEvents() {
    var _a, _b;
    (_a = this.element.querySelector('[data-action="new"]')) == null ? void 0 : _a.addEventListener("click", () => void this.host.createMap());
    (_b = this.element.querySelector('[data-action="refresh"]')) == null ? void 0 : _b.addEventListener("click", () => this.render());
    this.element.querySelectorAll(".ymz-dock__item").forEach((row) => {
      var _a2, _b2, _c, _d;
      const mapId = row.dataset.mapId;
      (_a2 = row.querySelector('[data-action="open"]')) == null ? void 0 : _a2.addEventListener("click", () => void this.host.openMap(mapId));
      (_b2 = row.querySelector('[data-action="copy"]')) == null ? void 0 : _b2.addEventListener("click", () => void this.host.copyMapLink(mapId));
      (_c = row.querySelector('[data-action="rename"]')) == null ? void 0 : _c.addEventListener("click", () => void this.host.renameMap(mapId));
      (_d = row.querySelector('[data-action="delete"]')) == null ? void 0 : _d.addEventListener("click", () => void this.host.deleteMap(mapId));
    });
  }
}
function registerYeMindDock(plugin, host) {
  const views = /* @__PURE__ */ new WeakMap();
  plugin.addDock({
    config: {
      position: "LeftBottom",
      size: { width: 280, height: 0 },
      icon: ICON_ID,
      title: "YeMind Zen",
      show: true
    },
    data: {},
    type: DOCK_TYPE,
    init() {
      const view = new YeMindDockView(host, this.element);
      views.set(this, view);
    },
    destroy() {
      var _a;
      (_a = views.get(this)) == null ? void 0 : _a.destroy();
      views.delete(this);
    },
    update() {
      var _a;
      (_a = views.get(this)) == null ? void 0 : _a.render();
    }
  });
}
function escapeHtml$1(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
const CONSTANTS = {
  CHANGE_THEME: "changeTheme",
  CHANGE_LAYOUT: "changeLayout",
  MODE: {
    READONLY: "readonly",
    EDIT: "edit"
  },
  LAYOUT: {
    LOGICAL_STRUCTURE: "logicalStructure",
    LOGICAL_STRUCTURE_LEFT: "logicalStructureLeft",
    MIND_MAP: "mindMap",
    ORGANIZATION_STRUCTURE: "organizationStructure",
    CATALOG_ORGANIZATION: "catalogOrganization",
    TIMELINE: "timeline",
    TIMELINE2: "timeline2",
    FISHBONE: "fishbone",
    FISHBONE2: "fishbone2",
    RIGHT_FISHBONE: "rightFishbone",
    RIGHT_FISHBONE2: "rightFishbone2",
    VERTICAL_TIMELINE: "verticalTimeline",
    VERTICAL_TIMELINE2: "verticalTimeline2",
    VERTICAL_TIMELINE3: "verticalTimeline3"
  },
  DIR: {
    UP: "up",
    LEFT: "left",
    DOWN: "down",
    RIGHT: "right"
  },
  SHAPE: {
    RECTANGLE: "rectangle",
    DIAMOND: "diamond",
    PARALLELOGRAM: "parallelogram",
    ROUNDED_RECTANGLE: "roundedRectangle",
    OCTAGONAL_RECTANGLE: "octagonalRectangle",
    OUTER_TRIANGULAR_RECTANGLE: "outerTriangularRectangle",
    INNER_TRIANGULAR_RECTANGLE: "innerTriangularRectangle",
    ELLIPSE: "ellipse",
    CIRCLE: "circle"
  },
  MOUSE_WHEEL_ACTION: {
    ZOOM: "zoom",
    MOVE: "move"
  },
  INIT_ROOT_NODE_POSITION: {
    LEFT: "left",
    TOP: "top",
    RIGHT: "right",
    BOTTOM: "bottom",
    CENTER: "center"
  },
  LAYOUT_GROW_DIR: {
    LEFT: "left",
    TOP: "top",
    RIGHT: "right",
    BOTTOM: "bottom"
  },
  CREATE_NEW_NODE_BEHAVIOR: {
    DEFAULT: "default",
    NOT_ACTIVE: "notActive",
    ACTIVE_ONLY: "activeOnly"
  },
  TAG_PLACEMENT: {
    RIGHT: "right",
    BOTTOM: "bottom"
  },
  IMG_PLACEMENT: {
    LEFT: "left",
    TOP: "top",
    RIGHT: "right",
    BOTTOM: "bottom"
  }
};
const initRootNodePositionMap = {
  [CONSTANTS.INIT_ROOT_NODE_POSITION.LEFT]: 0,
  [CONSTANTS.INIT_ROOT_NODE_POSITION.TOP]: 0,
  [CONSTANTS.INIT_ROOT_NODE_POSITION.RIGHT]: 1,
  [CONSTANTS.INIT_ROOT_NODE_POSITION.BOTTOM]: 1,
  [CONSTANTS.INIT_ROOT_NODE_POSITION.CENTER]: 0.5
};
const layoutValueList = [
  CONSTANTS.LAYOUT.LOGICAL_STRUCTURE,
  CONSTANTS.LAYOUT.LOGICAL_STRUCTURE_LEFT,
  CONSTANTS.LAYOUT.MIND_MAP,
  CONSTANTS.LAYOUT.CATALOG_ORGANIZATION,
  CONSTANTS.LAYOUT.ORGANIZATION_STRUCTURE,
  CONSTANTS.LAYOUT.TIMELINE,
  CONSTANTS.LAYOUT.TIMELINE2,
  CONSTANTS.LAYOUT.VERTICAL_TIMELINE,
  CONSTANTS.LAYOUT.VERTICAL_TIMELINE2,
  CONSTANTS.LAYOUT.VERTICAL_TIMELINE3,
  CONSTANTS.LAYOUT.FISHBONE,
  CONSTANTS.LAYOUT.FISHBONE2,
  CONSTANTS.LAYOUT.RIGHT_FISHBONE,
  CONSTANTS.LAYOUT.RIGHT_FISHBONE2
];
const nodeDataNoStylePropList = [
  "text",
  "image",
  "imageTitle",
  "imageSize",
  "icon",
  "tag",
  "hyperlink",
  "hyperlinkTitle",
  "note",
  "expand",
  "isActive",
  "generalization",
  "richText",
  "resetRichText",
  // 重新创建富文本内容，去掉原有样式
  "uid",
  "activeStyle",
  "associativeLineTargets",
  "associativeLineTargetControlOffsets",
  "associativeLinePoint",
  "associativeLineText",
  "attachmentUrl",
  "attachmentName",
  "notation",
  "outerFrame",
  "number",
  "range",
  "customLeft",
  "customTop",
  "customTextWidth",
  "checkbox",
  "dir",
  "needUpdate",
  // 重新创建节点内容
  "imgMap",
  "nodeLink"
];
const ERROR_TYPES = {
  READ_CLIPBOARD_ERROR: "read_clipboard_error",
  PARSE_PASTE_DATA_ERROR: "parse_paste_data_error",
  CUSTOM_HANDLE_CLIPBOARD_TEXT_ERROR: "custom_handle_clipboard_text_error",
  LOAD_CLIPBOARD_IMAGE_ERROR: "load_clipboard_image_error",
  BEFORE_TEXT_EDIT_ERROR: "before_text_edit_error",
  EXPORT_ERROR: "export_error",
  EXPORT_LOAD_IMAGE_ERROR: "export_load_image_error",
  DATA_CHANGE_DETAIL_EVENT_ERROR: "data_change_detail_event_error"
};
const cssContent = `
  /* 鼠标hover和激活时渲染的矩形 */
  .smm-hover-node{
    display: none;
    opacity: 0.6;
    stroke-width: 1;
  }

  .smm-node:not(.smm-node-dragging):hover .smm-hover-node{
    display: block;
  }

  .smm-node.active .smm-hover-node, .smm-node-highlight .smm-hover-node{
    display: block;
    opacity: 1;
    stroke-width: 2;
  }

  .smm-text-node-wrap, .smm-expand-btn-text {
    user-select: none;
  }
`;
const selfCloseTagList = [
  "img",
  "br",
  "hr",
  "input",
  "link",
  "meta",
  "area"
];
const noneRichTextNodeLineHeight = 1.2;
const richTextSupportStyleList = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "textDecoration",
  "color",
  "textAlign"
];
class View {
  //  构造函数
  constructor(opt = {}) {
    this.opt = opt;
    this.mindMap = this.opt.mindMap;
    this.scale = 1;
    this.sx = 0;
    this.sy = 0;
    this.x = 0;
    this.y = 0;
    this.firstDrag = true;
    this.setTransformData(this.mindMap.opt.viewData);
    this.bind();
  }
  //  绑定
  bind() {
    this.mindMap.keyCommand.addShortcut("Control+=", () => {
      this.enlarge();
    });
    this.mindMap.keyCommand.addShortcut("Control+-", () => {
      this.narrow();
    });
    this.mindMap.keyCommand.addShortcut("Control+i", () => {
      this.fit();
    });
    this.mindMap.event.on("mousedown", (e) => {
      const { isDisableDrag, mousedownEventPreventDefault } = this.mindMap.opt;
      if (isDisableDrag) return;
      if (mousedownEventPreventDefault) {
        e.preventDefault();
      }
      this.sx = this.x;
      this.sy = this.y;
    });
    this.mindMap.event.on("drag", (e, event) => {
      if (e.ctrlKey || e.metaKey || this.mindMap.opt.isDisableDrag) {
        return;
      }
      if (this.firstDrag) {
        this.firstDrag = false;
        if (this.mindMap.renderer.activeNodeList.length > 0) {
          this.mindMap.execCommand("CLEAR_ACTIVE_NODE");
        }
      }
      this.x = this.sx + event.mousemoveOffset.x;
      this.y = this.sy + event.mousemoveOffset.y;
      this.transform();
    });
    this.mindMap.event.on("mouseup", () => {
      this.firstDrag = true;
    });
    this.mindMap.event.on("mousewheel", (e, dirs, event, isTouchPad) => {
      const {
        customHandleMousewheel,
        mousewheelAction,
        mouseScaleCenterUseMousePosition,
        mousewheelMoveStep,
        mousewheelZoomActionReverse,
        disableMouseWheelZoom,
        translateRatio
      } = this.mindMap.opt;
      if (customHandleMousewheel && typeof customHandleMousewheel === "function") {
        return customHandleMousewheel(e);
      }
      if (mousewheelAction === CONSTANTS.MOUSE_WHEEL_ACTION.ZOOM || e.ctrlKey || e.metaKey) {
        if (disableMouseWheelZoom) return;
        const { x: clientX, y: clientY } = this.mindMap.toPos(
          e.clientX,
          e.clientY
        );
        const cx2 = mouseScaleCenterUseMousePosition ? clientX : void 0;
        const cy2 = mouseScaleCenterUseMousePosition ? clientY : void 0;
        if (isTouchPad && (dirs.includes(CONSTANTS.DIR.LEFT) || dirs.includes(CONSTANTS.DIR.RIGHT))) {
          dirs = dirs.filter((dir) => {
            return ![CONSTANTS.DIR.LEFT, CONSTANTS.DIR.RIGHT].includes(dir);
          });
        }
        switch (true) {
          // 鼠标滚轮，向上和向左，都是缩小
          case dirs.includes(CONSTANTS.DIR.UP):
            mousewheelZoomActionReverse ? this.enlarge(cx2, cy2, isTouchPad) : this.narrow(cx2, cy2, isTouchPad);
            break;
          // 鼠标滚轮，向下和向右，都是放大
          case dirs.includes(CONSTANTS.DIR.DOWN):
            mousewheelZoomActionReverse ? this.narrow(cx2, cy2, isTouchPad) : this.enlarge(cx2, cy2, isTouchPad);
            break;
        }
      } else {
        let stepX = 0;
        let stepY = 0;
        if (isTouchPad) {
          stepX = Math.abs(e.wheelDeltaX);
          stepY = Math.abs(e.wheelDeltaY);
        } else {
          stepX = stepY = mousewheelMoveStep;
        }
        let mx = 0;
        let my = 0;
        if (dirs.includes(CONSTANTS.DIR.DOWN)) {
          my = -stepY;
        }
        if (dirs.includes(CONSTANTS.DIR.UP)) {
          my = stepY;
        }
        if (dirs.includes(CONSTANTS.DIR.LEFT)) {
          mx = stepX;
        }
        if (dirs.includes(CONSTANTS.DIR.RIGHT)) {
          mx = -stepX;
        }
        this.translateXY(mx * translateRatio, my * translateRatio);
      }
    });
    this.mindMap.on("resize", () => {
      if (!this.checkNeedMindMapInCanvas()) return;
      this.transform();
    });
  }
  //  获取当前变换状态数据
  getTransformData() {
    return {
      transform: this.mindMap.draw.transform(),
      state: {
        scale: this.scale,
        x: this.x,
        y: this.y,
        sx: this.sx,
        sy: this.sy
      }
    };
  }
  //  动态设置变换状态数据
  setTransformData(viewData) {
    if (viewData) {
      Object.keys(viewData.state).forEach((prop) => {
        this[prop] = viewData.state[prop];
      });
      this.mindMap.draw.transform({
        ...viewData.transform
      });
      this.mindMap.emit("view_data_change", this.getTransformData());
      this.emitEvent("scale");
      this.emitEvent("translate");
    }
  }
  //  平移x,y方向
  translateXY(x2, y2) {
    if (x2 === 0 && y2 === 0) return;
    this.x += x2;
    this.y += y2;
    this.transform();
    this.emitEvent("translate");
  }
  //  平移x方向
  translateX(step) {
    if (step === 0) return;
    this.x += step;
    this.transform();
    this.emitEvent("translate");
  }
  //  平移x方式到
  translateXTo(x2) {
    this.x = x2;
    this.transform();
    this.emitEvent("translate");
  }
  //  平移y方向
  translateY(step) {
    if (step === 0) return;
    this.y += step;
    this.transform();
    this.emitEvent("translate");
  }
  //  平移y方向到
  translateYTo(y2) {
    this.y = y2;
    this.transform();
    this.emitEvent("translate");
  }
  //   应用变换
  transform() {
    try {
      this.limitMindMapInCanvas();
    } catch (error) {
    }
    this.mindMap.draw.transform({
      origin: [0, 0],
      scale: this.scale,
      translate: [this.x, this.y]
    });
    this.mindMap.emit("view_data_change", this.getTransformData());
  }
  //  恢复
  reset() {
    const scaleChange = this.scale !== 1;
    const translateChange = this.x !== 0 || this.y !== 0;
    this.scale = 1;
    this.x = 0;
    this.y = 0;
    this.transform();
    if (scaleChange) {
      this.emitEvent("scale");
    }
    if (translateChange) {
      this.emitEvent("translate");
    }
  }
  //  缩小
  narrow(cx2, cy2, isTouchPad) {
    let { scaleRatio, minZoomRatio } = this.mindMap.opt;
    scaleRatio = scaleRatio / (isTouchPad ? 5 : 1);
    const scale = Math.max(this.scale - scaleRatio, minZoomRatio / 100);
    this.scaleInCenter(scale, cx2, cy2);
    this.transform();
    this.emitEvent("scale");
  }
  //  放大
  enlarge(cx2, cy2, isTouchPad) {
    let { scaleRatio, maxZoomRatio } = this.mindMap.opt;
    scaleRatio = scaleRatio / (isTouchPad ? 5 : 1);
    let scale = 0;
    if (maxZoomRatio === -1) {
      scale = this.scale + scaleRatio;
    } else {
      scale = Math.min(this.scale + scaleRatio, maxZoomRatio / 100);
    }
    this.scaleInCenter(scale, cx2, cy2);
    this.transform();
    this.emitEvent("scale");
  }
  // 基于指定中心进行缩放，cx，cy 可不指定，此时会使用画布中心点
  scaleInCenter(scale, cx2, cy2) {
    if (cx2 === void 0 || cy2 === void 0) {
      cx2 = this.mindMap.width / 2;
      cy2 = this.mindMap.height / 2;
    }
    const prevScale = this.scale;
    const ratio = 1 - scale / prevScale;
    const dx2 = (cx2 - this.x) * ratio;
    const dy2 = (cy2 - this.y) * ratio;
    this.x += dx2;
    this.y += dy2;
    this.scale = scale;
  }
  //  设置缩放
  setScale(scale, cx2, cy2) {
    if (cx2 !== void 0 && cy2 !== void 0) {
      this.scaleInCenter(scale, cx2, cy2);
    } else {
      this.scale = scale;
    }
    this.transform();
    this.emitEvent("scale");
  }
  // 适应画布大小
  fit(getRbox = () => {
  }, enlarge = false, fitPadding) {
    fitPadding = fitPadding === void 0 ? this.mindMap.opt.fitPadding : fitPadding;
    const draw = this.mindMap.draw;
    const origTransform = draw.transform();
    const rect = getRbox() || draw.rbox();
    const drawWidth = rect.width / origTransform.scaleX;
    const drawHeight = rect.height / origTransform.scaleY;
    const drawRatio = drawWidth / drawHeight;
    let { width: elWidth, height: elHeight } = this.mindMap.elRect;
    elWidth = elWidth - fitPadding * 2;
    elHeight = elHeight - fitPadding * 2;
    const elRatio = elWidth / elHeight;
    let newScale = 0;
    let flag = "";
    if (drawWidth <= elWidth && drawHeight <= elHeight && !enlarge) {
      newScale = 1;
      flag = 1;
    } else {
      let newWidth = 0;
      if (drawRatio > elRatio) {
        newWidth = elWidth;
        flag = 2;
      } else {
        newWidth = elHeight * drawRatio;
        flag = 3;
      }
      newScale = newWidth / drawWidth;
    }
    this.setScale(newScale);
    const newRect = getRbox() || draw.rbox();
    newRect.x -= this.mindMap.elRect.left;
    newRect.y -= this.mindMap.elRect.top;
    let newX = 0;
    let newY = 0;
    if (flag === 1) {
      newX = -newRect.x + fitPadding + (elWidth - newRect.width) / 2;
      newY = -newRect.y + fitPadding + (elHeight - newRect.height) / 2;
    } else if (flag === 2) {
      newX = -newRect.x + fitPadding;
      newY = -newRect.y + fitPadding + (elHeight - newRect.height) / 2;
    } else if (flag === 3) {
      newX = -newRect.x + fitPadding + (elWidth - newRect.width) / 2;
      newY = -newRect.y + fitPadding;
    }
    this.translateXY(newX, newY);
  }
  // 判断是否需要将思维导图限制在画布内
  checkNeedMindMapInCanvas() {
    if (this.mindMap.demonstrate && this.mindMap.demonstrate.isInDemonstrate) {
      return false;
    }
    const { isLimitMindMapInCanvasWhenHasScrollbar, isLimitMindMapInCanvas } = this.mindMap.opt;
    if (this.mindMap.scrollbar) {
      return isLimitMindMapInCanvasWhenHasScrollbar;
    } else {
      return isLimitMindMapInCanvas;
    }
  }
  // 将思维导图限制在画布内
  limitMindMapInCanvas() {
    if (!this.checkNeedMindMapInCanvas()) return;
    let { scale, left, top, right, bottom } = this.getPositionLimit();
    const centerXChange = (this.mindMap.width - this.mindMap.initWidth) / 2 * scale;
    const centerYChange = (this.mindMap.height - this.mindMap.initHeight) / 2 * scale;
    const scaleRatio = this.scale / scale;
    left *= scaleRatio;
    right *= scaleRatio;
    top *= scaleRatio;
    bottom *= scaleRatio;
    const centerX = this.mindMap.width / 2;
    const centerY = this.mindMap.height / 2;
    const scaleOffset = this.scale - 1;
    left -= scaleOffset * centerX - centerXChange;
    right -= scaleOffset * centerX - centerXChange;
    top -= scaleOffset * centerY - centerYChange;
    bottom -= scaleOffset * centerY - centerYChange;
    if (this.x > left) {
      this.x = left;
    }
    if (this.x < right) {
      this.x = right;
    }
    if (this.y > top) {
      this.y = top;
    }
    if (this.y < bottom) {
      this.y = bottom;
    }
  }
  // 计算图形四个方向的位置边界值
  getPositionLimit() {
    const { scaleX, scaleY } = this.mindMap.draw.transform();
    const drawRect = this.mindMap.draw.rbox();
    const rootRect = this.mindMap.renderer.root.group.rbox();
    const rootCenterOffset = this.mindMap.renderer.layout.getRootCenterOffset(
      rootRect.width,
      rootRect.height
    );
    const left = rootRect.x - drawRect.x - rootCenterOffset.x * scaleX;
    const right = rootRect.x - drawRect.x2 - rootCenterOffset.x * scaleX;
    const top = rootRect.y - drawRect.y - rootCenterOffset.y * scaleY;
    const bottom = rootRect.y - drawRect.y2 - rootCenterOffset.y * scaleY;
    return {
      scale: scaleX,
      left,
      right,
      top,
      bottom
    };
  }
  // 派发事件
  emitEvent(type) {
    switch (type) {
      case "scale":
        this.mindMap.emit("scale", this.scale);
      case "translate":
        this.mindMap.emit("translate", this.x, this.y);
    }
  }
}
function getDefaultExportFromCjs(x2) {
  return x2 && x2.__esModule && Object.prototype.hasOwnProperty.call(x2, "default") ? x2["default"] : x2;
}
var eventemitter3 = { exports: {} };
var hasRequiredEventemitter3;
function requireEventemitter3() {
  if (hasRequiredEventemitter3) return eventemitter3.exports;
  hasRequiredEventemitter3 = 1;
  (function(module2) {
    var has = Object.prototype.hasOwnProperty, prefix = "~";
    function Events() {
    }
    if (Object.create) {
      Events.prototype = /* @__PURE__ */ Object.create(null);
      if (!new Events().__proto__) prefix = false;
    }
    function EE(fn, context, once) {
      this.fn = fn;
      this.context = context;
      this.once = once || false;
    }
    function addListener(emitter, event, fn, context, once) {
      if (typeof fn !== "function") {
        throw new TypeError("The listener must be a function");
      }
      var listener = new EE(fn, context || emitter, once), evt = prefix ? prefix + event : event;
      if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
      else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
      else emitter._events[evt] = [emitter._events[evt], listener];
      return emitter;
    }
    function clearEvent(emitter, evt) {
      if (--emitter._eventsCount === 0) emitter._events = new Events();
      else delete emitter._events[evt];
    }
    function EventEmitter2() {
      this._events = new Events();
      this._eventsCount = 0;
    }
    EventEmitter2.prototype.eventNames = function eventNames() {
      var names2 = [], events, name;
      if (this._eventsCount === 0) return names2;
      for (name in events = this._events) {
        if (has.call(events, name)) names2.push(prefix ? name.slice(1) : name);
      }
      if (Object.getOwnPropertySymbols) {
        return names2.concat(Object.getOwnPropertySymbols(events));
      }
      return names2;
    };
    EventEmitter2.prototype.listeners = function listeners(event) {
      var evt = prefix ? prefix + event : event, handlers = this._events[evt];
      if (!handlers) return [];
      if (handlers.fn) return [handlers.fn];
      for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
        ee[i] = handlers[i].fn;
      }
      return ee;
    };
    EventEmitter2.prototype.listenerCount = function listenerCount(event) {
      var evt = prefix ? prefix + event : event, listeners = this._events[evt];
      if (!listeners) return 0;
      if (listeners.fn) return 1;
      return listeners.length;
    };
    EventEmitter2.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
      var evt = prefix ? prefix + event : event;
      if (!this._events[evt]) return false;
      var listeners = this._events[evt], len = arguments.length, args, i;
      if (listeners.fn) {
        if (listeners.once) this.removeListener(event, listeners.fn, void 0, true);
        switch (len) {
          case 1:
            return listeners.fn.call(listeners.context), true;
          case 2:
            return listeners.fn.call(listeners.context, a1), true;
          case 3:
            return listeners.fn.call(listeners.context, a1, a2), true;
          case 4:
            return listeners.fn.call(listeners.context, a1, a2, a3), true;
          case 5:
            return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
          case 6:
            return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
        }
        for (i = 1, args = new Array(len - 1); i < len; i++) {
          args[i - 1] = arguments[i];
        }
        listeners.fn.apply(listeners.context, args);
      } else {
        var length2 = listeners.length, j;
        for (i = 0; i < length2; i++) {
          if (listeners[i].once) this.removeListener(event, listeners[i].fn, void 0, true);
          switch (len) {
            case 1:
              listeners[i].fn.call(listeners[i].context);
              break;
            case 2:
              listeners[i].fn.call(listeners[i].context, a1);
              break;
            case 3:
              listeners[i].fn.call(listeners[i].context, a1, a2);
              break;
            case 4:
              listeners[i].fn.call(listeners[i].context, a1, a2, a3);
              break;
            default:
              if (!args) for (j = 1, args = new Array(len - 1); j < len; j++) {
                args[j - 1] = arguments[j];
              }
              listeners[i].fn.apply(listeners[i].context, args);
          }
        }
      }
      return true;
    };
    EventEmitter2.prototype.on = function on2(event, fn, context) {
      return addListener(this, event, fn, context, false);
    };
    EventEmitter2.prototype.once = function once(event, fn, context) {
      return addListener(this, event, fn, context, true);
    };
    EventEmitter2.prototype.removeListener = function removeListener(event, fn, context, once) {
      var evt = prefix ? prefix + event : event;
      if (!this._events[evt]) return this;
      if (!fn) {
        clearEvent(this, evt);
        return this;
      }
      var listeners = this._events[evt];
      if (listeners.fn) {
        if (listeners.fn === fn && (!once || listeners.once) && (!context || listeners.context === context)) {
          clearEvent(this, evt);
        }
      } else {
        for (var i = 0, events = [], length2 = listeners.length; i < length2; i++) {
          if (listeners[i].fn !== fn || once && !listeners[i].once || context && listeners[i].context !== context) {
            events.push(listeners[i]);
          }
        }
        if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
        else clearEvent(this, evt);
      }
      return this;
    };
    EventEmitter2.prototype.removeAllListeners = function removeAllListeners(event) {
      var evt;
      if (event) {
        evt = prefix ? prefix + event : event;
        if (this._events[evt]) clearEvent(this, evt);
      } else {
        this._events = new Events();
        this._eventsCount = 0;
      }
      return this;
    };
    EventEmitter2.prototype.off = EventEmitter2.prototype.removeListener;
    EventEmitter2.prototype.addListener = EventEmitter2.prototype.on;
    EventEmitter2.prefixed = prefix;
    EventEmitter2.EventEmitter = EventEmitter2;
    {
      module2.exports = EventEmitter2;
    }
  })(eventemitter3);
  return eventemitter3.exports;
}
var eventemitter3Exports = requireEventemitter3();
const EventEmitter = /* @__PURE__ */ getDefaultExportFromCjs(eventemitter3Exports);
class Event extends EventEmitter {
  //  构造函数
  constructor(opt = {}) {
    super();
    this.opt = opt;
    this.mindMap = opt.mindMap;
    this.isLeftMousedown = false;
    this.isRightMousedown = false;
    this.isMiddleMousedown = false;
    this.mousedownPos = {
      x: 0,
      y: 0
    };
    this.mousemovePos = {
      x: 0,
      y: 0
    };
    this.mousemoveOffset = {
      x: 0,
      y: 0
    };
    this.bindFn();
    this.bind();
  }
  //  绑定函数上下文
  bindFn() {
    this.onBodyMousedown = this.onBodyMousedown.bind(this);
    this.onBodyClick = this.onBodyClick.bind(this);
    this.onDrawClick = this.onDrawClick.bind(this);
    this.onMousedown = this.onMousedown.bind(this);
    this.onMousemove = this.onMousemove.bind(this);
    this.onMouseup = this.onMouseup.bind(this);
    this.onNodeMouseup = this.onNodeMouseup.bind(this);
    this.onMousewheel = this.onMousewheel.bind(this);
    this.onContextmenu = this.onContextmenu.bind(this);
    this.onSvgMousedown = this.onSvgMousedown.bind(this);
    this.onKeyup = this.onKeyup.bind(this);
    this.onMouseenter = this.onMouseenter.bind(this);
    this.onMouseleave = this.onMouseleave.bind(this);
  }
  //  绑定事件
  bind() {
    document.body.addEventListener("mousedown", this.onBodyMousedown);
    document.body.addEventListener("click", this.onBodyClick);
    this.mindMap.svg.on("click", this.onDrawClick);
    this.mindMap.el.addEventListener("mousedown", this.onMousedown);
    this.mindMap.svg.on("mousedown", this.onSvgMousedown);
    window.addEventListener("mousemove", this.onMousemove);
    window.addEventListener("mouseup", this.onMouseup);
    this.on("node_mouseup", this.onNodeMouseup);
    this.mindMap.el.addEventListener("wheel", this.onMousewheel);
    this.mindMap.svg.on("contextmenu", this.onContextmenu);
    this.mindMap.svg.on("mouseenter", this.onMouseenter);
    this.mindMap.svg.on("mouseleave", this.onMouseleave);
    window.addEventListener("keyup", this.onKeyup);
  }
  //  解绑事件
  unbind() {
    document.body.removeEventListener("mousedown", this.onBodyMousedown);
    document.body.removeEventListener("click", this.onBodyClick);
    this.mindMap.svg.off("click", this.onDrawClick);
    this.mindMap.el.removeEventListener("mousedown", this.onMousedown);
    window.removeEventListener("mousemove", this.onMousemove);
    window.removeEventListener("mouseup", this.onMouseup);
    this.off("node_mouseup", this.onNodeMouseup);
    this.mindMap.el.removeEventListener("wheel", this.onMousewheel);
    this.mindMap.svg.off("contextmenu", this.onContextmenu);
    this.mindMap.svg.off("mouseenter", this.onMouseenter);
    this.mindMap.svg.off("mouseleave", this.onMouseleave);
    window.removeEventListener("keyup", this.onKeyup);
  }
  //   画布的单击事件
  onDrawClick(e) {
    this.emit("draw_click", e);
  }
  // 页面的鼠标按下事件
  onBodyMousedown(e) {
    this.emit("body_mousedown", e);
  }
  // 页面的单击事件
  onBodyClick(e) {
    this.emit("body_click", e);
  }
  //   svg画布的鼠标按下事件
  onSvgMousedown(e) {
    this.emit("svg_mousedown", e);
  }
  //  鼠标按下事件
  onMousedown(e) {
    if (e.which === 1) {
      this.isLeftMousedown = true;
    } else if (e.which === 3) {
      this.isRightMousedown = true;
    } else if (e.which === 2) {
      this.isMiddleMousedown = true;
    }
    this.mousedownPos.x = e.clientX;
    this.mousedownPos.y = e.clientY;
    this.emit("mousedown", e, this);
  }
  //  鼠标移动事件
  onMousemove(e) {
    let { useLeftKeySelectionRightKeyDrag } = this.mindMap.opt;
    this.mousemovePos.x = e.clientX;
    this.mousemovePos.y = e.clientY;
    this.mousemoveOffset.x = e.clientX - this.mousedownPos.x;
    this.mousemoveOffset.y = e.clientY - this.mousedownPos.y;
    this.emit("mousemove", e, this);
    if (this.isMiddleMousedown || (useLeftKeySelectionRightKeyDrag ? this.isRightMousedown : this.isLeftMousedown)) {
      e.preventDefault();
      this.emit("drag", e, this);
    }
  }
  //  鼠标松开事件
  onMouseup(e) {
    this.onNodeMouseup();
    this.emit("mouseup", e, this);
  }
  // 节点鼠标松开事件
  onNodeMouseup() {
    this.isLeftMousedown = false;
    this.isRightMousedown = false;
    this.isMiddleMousedown = false;
  }
  //  鼠标滚动/触控板滑动
  onMousewheel(e) {
    e.stopPropagation();
    e.preventDefault();
    const dirs = [];
    if (e.deltaY < 0) dirs.push(CONSTANTS.DIR.UP);
    if (e.deltaY > 0) dirs.push(CONSTANTS.DIR.DOWN);
    if (e.deltaX < 0) dirs.push(CONSTANTS.DIR.LEFT);
    if (e.deltaX > 0) dirs.push(CONSTANTS.DIR.RIGHT);
    let isTouchPad = false;
    const { customCheckIsTouchPad } = this.mindMap.opt;
    if (typeof customCheckIsTouchPad === "function") {
      isTouchPad = customCheckIsTouchPad(e);
    } else {
      isTouchPad = Math.abs(e.deltaY) <= 10;
    }
    this.emit("mousewheel", e, dirs, this, isTouchPad);
  }
  //  鼠标右键菜单事件
  onContextmenu(e) {
    e.preventDefault();
    if (e.ctrlKey) return;
    this.emit("contextmenu", e);
  }
  //  按键松开事件
  onKeyup(e) {
    this.emit("keyup", e);
  }
  // 进入
  onMouseenter(e) {
    this.emit("svg_mouseenter", e);
  }
  // 离开
  onMouseleave(e) {
    this.emit("svg_mouseleave", e);
  }
}
var isMergeableObject = function isMergeableObject2(value) {
  return isNonNullObject(value) && !isSpecial(value);
};
function isNonNullObject(value) {
  return !!value && typeof value === "object";
}
function isSpecial(value) {
  var stringValue = Object.prototype.toString.call(value);
  return stringValue === "[object RegExp]" || stringValue === "[object Date]" || isReactElement(value);
}
var canUseSymbol = typeof Symbol === "function" && Symbol.for;
var REACT_ELEMENT_TYPE = canUseSymbol ? Symbol.for("react.element") : 60103;
function isReactElement(value) {
  return value.$$typeof === REACT_ELEMENT_TYPE;
}
function emptyTarget(val) {
  return Array.isArray(val) ? [] : {};
}
function cloneIfNecessary(value, optionsArgument) {
  var clone2 = optionsArgument && optionsArgument.clone === true;
  return clone2 && isMergeableObject(value) ? deepmerge(emptyTarget(value), value, optionsArgument) : value;
}
function defaultArrayMerge(target, source, optionsArgument) {
  var destination = target.slice();
  source.forEach(function(e, i) {
    if (typeof destination[i] === "undefined") {
      destination[i] = cloneIfNecessary(e, optionsArgument);
    } else if (isMergeableObject(e)) {
      destination[i] = deepmerge(target[i], e, optionsArgument);
    } else if (target.indexOf(e) === -1) {
      destination.push(cloneIfNecessary(e, optionsArgument));
    }
  });
  return destination;
}
function mergeObject(target, source, optionsArgument) {
  var destination = {};
  if (isMergeableObject(target)) {
    Object.keys(target).forEach(function(key) {
      destination[key] = cloneIfNecessary(target[key], optionsArgument);
    });
  }
  Object.keys(source).forEach(function(key) {
    if (!isMergeableObject(source[key]) || !target[key]) {
      destination[key] = cloneIfNecessary(source[key], optionsArgument);
    } else {
      destination[key] = deepmerge(target[key], source[key], optionsArgument);
    }
  });
  return destination;
}
function deepmerge(target, source, optionsArgument) {
  var sourceIsArray = Array.isArray(source);
  var targetIsArray = Array.isArray(target);
  var options = optionsArgument || { arrayMerge: defaultArrayMerge };
  var sourceAndTargetTypesMatch = sourceIsArray === targetIsArray;
  if (!sourceAndTargetTypesMatch) {
    return cloneIfNecessary(source, optionsArgument);
  } else if (sourceIsArray) {
    var arrayMerge = options.arrayMerge || defaultArrayMerge;
    return arrayMerge(target, source, optionsArgument);
  } else {
    return mergeObject(target, source, optionsArgument);
  }
}
deepmerge.all = function deepmergeAll(array2, optionsArgument) {
  if (!Array.isArray(array2) || array2.length < 2) {
    throw new Error("first argument should be an array with at least two elements");
  }
  return array2.reduce(function(prev2, next2) {
    return deepmerge(prev2, next2, optionsArgument);
  });
};
var deepmerge_1 = deepmerge;
let getRandomValues;
const rnds8 = new Uint8Array(16);
function rng() {
  if (!getRandomValues) {
    getRandomValues = typeof crypto !== "undefined" && crypto.getRandomValues && crypto.getRandomValues.bind(crypto);
    if (!getRandomValues) {
      throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
    }
  }
  return getRandomValues(rnds8);
}
const byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]];
}
const randomUUID = typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID.bind(crypto);
const native = {
  randomUUID
};
function v4(options, buf, offset) {
  if (native.randomUUID && true && !options) {
    return native.randomUUID();
  }
  options = options || {};
  const rnds = options.random || (options.rng || rng)();
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  return unsafeStringify(rnds);
}
function MersenneTwister(seed) {
  this.N = 624;
  this.M = 397;
  this.MATRIX_A = 2567483615;
  this.UPPER_MASK = 2147483648;
  this.LOWER_MASK = 2147483647;
  this.mt = new Array(this.N);
  this.mti = this.N + 1;
  this.init_genrand(seed);
}
MersenneTwister.prototype.init_genrand = function(s) {
  this.mt[0] = s >>> 0;
  for (this.mti = 1; this.mti < this.N; this.mti++) {
    s = this.mt[this.mti - 1] ^ this.mt[this.mti - 1] >>> 30;
    this.mt[this.mti] = (((s & 4294901760) >>> 16) * 1812433253 << 16) + (s & 65535) * 1812433253 + this.mti;
    this.mt[this.mti] >>>= 0;
  }
};
MersenneTwister.prototype.genrand_int32 = function() {
  var y2;
  var mag01 = new Array(0, this.MATRIX_A);
  if (this.mti >= this.N) {
    var kk;
    if (this.mti == this.N + 1) this.init_genrand(5489);
    for (kk = 0; kk < this.N - this.M; kk++) {
      y2 = this.mt[kk] & this.UPPER_MASK | this.mt[kk + 1] & this.LOWER_MASK;
      this.mt[kk] = this.mt[kk + this.M] ^ y2 >>> 1 ^ mag01[y2 & 1];
    }
    for (; kk < this.N - 1; kk++) {
      y2 = this.mt[kk] & this.UPPER_MASK | this.mt[kk + 1] & this.LOWER_MASK;
      this.mt[kk] = this.mt[kk + (this.M - this.N)] ^ y2 >>> 1 ^ mag01[y2 & 1];
    }
    y2 = this.mt[this.N - 1] & this.UPPER_MASK | this.mt[0] & this.LOWER_MASK;
    this.mt[this.N - 1] = this.mt[this.M - 1] ^ y2 >>> 1 ^ mag01[y2 & 1];
    this.mti = 0;
  }
  y2 = this.mt[this.mti++];
  y2 ^= y2 >>> 11;
  y2 ^= y2 << 7 & 2636928640;
  y2 ^= y2 << 15 & 4022730752;
  y2 ^= y2 >>> 18;
  return y2 >>> 0;
};
const methods$1 = {};
const names = [];
function registerMethods(name, m) {
  if (Array.isArray(name)) {
    for (const _name of name) {
      registerMethods(_name, m);
    }
    return;
  }
  if (typeof name === "object") {
    for (const _name in name) {
      registerMethods(_name, name[_name]);
    }
    return;
  }
  addMethodNames(Object.getOwnPropertyNames(m));
  methods$1[name] = Object.assign(methods$1[name] || {}, m);
}
function getMethodsFor(name) {
  return methods$1[name] || {};
}
function getMethodNames() {
  return [...new Set(names)];
}
function addMethodNames(_names) {
  names.push(..._names);
}
function map$1(array2, block) {
  let i;
  const il = array2.length;
  const result = [];
  for (i = 0; i < il; i++) {
    result.push(block(array2[i]));
  }
  return result;
}
function filter(array2, block) {
  let i;
  const il = array2.length;
  const result = [];
  for (i = 0; i < il; i++) {
    if (block(array2[i])) {
      result.push(array2[i]);
    }
  }
  return result;
}
function radians(d) {
  return d % 360 * Math.PI / 180;
}
function camelCase(s) {
  return s.toLowerCase().replace(/-(.)/g, function(m, g) {
    return g.toUpperCase();
  });
}
function unCamelCase(s) {
  return s.replace(/([A-Z])/g, function(m, g) {
    return "-" + g.toLowerCase();
  });
}
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function proportionalSize(element, width2, height2, box) {
  if (width2 == null || height2 == null) {
    box = box || element.bbox();
    if (width2 == null) {
      width2 = box.width / box.height * height2;
    } else if (height2 == null) {
      height2 = box.height / box.width * width2;
    }
  }
  return {
    width: width2,
    height: height2
  };
}
function getOrigin(o, element) {
  const origin = o.origin;
  let ox = o.ox != null ? o.ox : o.originX != null ? o.originX : "center";
  let oy = o.oy != null ? o.oy : o.originY != null ? o.originY : "center";
  if (origin != null) {
    [ox, oy] = Array.isArray(origin) ? origin : typeof origin === "object" ? [origin.x, origin.y] : [origin, origin];
  }
  const condX = typeof ox === "string";
  const condY = typeof oy === "string";
  if (condX || condY) {
    const {
      height: height2,
      width: width2,
      x: x2,
      y: y2
    } = element.bbox();
    if (condX) {
      ox = ox.includes("left") ? x2 : ox.includes("right") ? x2 + width2 : x2 + width2 / 2;
    }
    if (condY) {
      oy = oy.includes("top") ? y2 : oy.includes("bottom") ? y2 + height2 : y2 + height2 / 2;
    }
  }
  return [ox, oy];
}
const svg = "http://www.w3.org/2000/svg";
const html = "http://www.w3.org/1999/xhtml";
const xmlns = "http://www.w3.org/2000/xmlns/";
const xlink = "http://www.w3.org/1999/xlink";
const svgjs = "http://svgjs.dev/svgjs";
const globals = {
  window: typeof window === "undefined" ? null : window,
  document: typeof document === "undefined" ? null : document
};
let Base$1 = class Base {
  // constructor (node/*, {extensions = []} */) {
  //   // this.tags = []
  //   //
  //   // for (let extension of extensions) {
  //   //   extension.setup.call(this, node)
  //   //   this.tags.push(extension.name)
  //   // }
  // }
};
const elements = {};
const root = "___SYMBOL___ROOT___";
function create(name, ns = svg) {
  return globals.document.createElementNS(ns, name);
}
function makeInstance(element, isHTML = false) {
  if (element instanceof Base$1) return element;
  if (typeof element === "object") {
    return adopter(element);
  }
  if (element == null) {
    return new elements[root]();
  }
  if (typeof element === "string" && element.charAt(0) !== "<") {
    return adopter(globals.document.querySelector(element));
  }
  const wrapper = isHTML ? globals.document.createElement("div") : create("svg");
  wrapper.innerHTML = element;
  element = adopter(wrapper.firstChild);
  wrapper.removeChild(wrapper.firstChild);
  return element;
}
function nodeOrNew(name, node) {
  return node && node.ownerDocument && node instanceof node.ownerDocument.defaultView.Node ? node : create(name);
}
function adopt(node) {
  if (!node) return null;
  if (node.instance instanceof Base$1) return node.instance;
  if (node.nodeName === "#document-fragment") {
    return new elements.Fragment(node);
  }
  let className = capitalize(node.nodeName || "Dom");
  if (className === "LinearGradient" || className === "RadialGradient") {
    className = "Gradient";
  } else if (!elements[className]) {
    className = "Dom";
  }
  return new elements[className](node);
}
let adopter = adopt;
function register(element, name = element.name, asRoot = false) {
  elements[name] = element;
  if (asRoot) elements[root] = element;
  addMethodNames(Object.getOwnPropertyNames(element.prototype));
  return element;
}
function getClass(name) {
  return elements[name];
}
let did = 1e3;
function eid(name) {
  return "Svgjs" + capitalize(name) + did++;
}
function assignNewId(node) {
  for (let i = node.children.length - 1; i >= 0; i--) {
    assignNewId(node.children[i]);
  }
  if (node.id) {
    node.id = eid(node.nodeName);
    return node;
  }
  return node;
}
function extend(modules, methods2) {
  let key, i;
  modules = Array.isArray(modules) ? modules : [modules];
  for (i = modules.length - 1; i >= 0; i--) {
    for (key in methods2) {
      modules[i].prototype[key] = methods2[key];
    }
  }
}
function wrapWithAttrCheck(fn) {
  return function(...args) {
    const o = args[args.length - 1];
    if (o && o.constructor === Object && !(o instanceof Array)) {
      return fn.apply(this, args.slice(0, -1)).attr(o);
    } else {
      return fn.apply(this, args);
    }
  };
}
function siblings() {
  return this.parent().children();
}
function position() {
  return this.parent().index(this);
}
function next() {
  return this.siblings()[this.position() + 1];
}
function prev() {
  return this.siblings()[this.position() - 1];
}
function forward() {
  const i = this.position();
  const p = this.parent();
  p.add(this.remove(), i + 1);
  return this;
}
function backward() {
  const i = this.position();
  const p = this.parent();
  p.add(this.remove(), i ? i - 1 : 0);
  return this;
}
function front() {
  const p = this.parent();
  p.add(this.remove());
  return this;
}
function back() {
  const p = this.parent();
  p.add(this.remove(), 0);
  return this;
}
function before(element) {
  element = makeInstance(element);
  element.remove();
  const i = this.position();
  this.parent().add(element, i);
  return this;
}
function after(element) {
  element = makeInstance(element);
  element.remove();
  const i = this.position();
  this.parent().add(element, i + 1);
  return this;
}
function insertBefore(element) {
  element = makeInstance(element);
  element.before(this);
  return this;
}
function insertAfter(element) {
  element = makeInstance(element);
  element.after(this);
  return this;
}
registerMethods("Dom", {
  siblings,
  position,
  next,
  prev,
  forward,
  backward,
  front,
  back,
  before,
  after,
  insertBefore,
  insertAfter
});
const numberAndUnit = /^([+-]?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?)([a-z%]*)$/i;
const hex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
const rgb = /rgb\((\d+),(\d+),(\d+)\)/;
const reference = /(#[a-z_][a-z0-9\-_]*)/i;
const transforms = /\)\s*,?\s*/;
const whitespace = /\s/g;
const isHex = /^#[a-f0-9]{3}$|^#[a-f0-9]{6}$/i;
const isRgb = /^rgb\(/;
const isBlank = /^(\s+)?$/;
const isNumber = /^[+-]?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;
const isImage = /\.(jpg|jpeg|png|gif|svg)(\?[^=]+.*)?/i;
const delimiter = /[\s,]+/;
const isPathLetter = /[MLHVCSQTAZ]/i;
function classes() {
  const attr2 = this.attr("class");
  return attr2 == null ? [] : attr2.trim().split(delimiter);
}
function hasClass(name) {
  return this.classes().indexOf(name) !== -1;
}
function addClass(name) {
  if (!this.hasClass(name)) {
    const array2 = this.classes();
    array2.push(name);
    this.attr("class", array2.join(" "));
  }
  return this;
}
function removeClass(name) {
  if (this.hasClass(name)) {
    this.attr("class", this.classes().filter(function(c) {
      return c !== name;
    }).join(" "));
  }
  return this;
}
function toggleClass(name) {
  return this.hasClass(name) ? this.removeClass(name) : this.addClass(name);
}
registerMethods("Dom", {
  classes,
  hasClass,
  addClass,
  removeClass,
  toggleClass
});
function css(style, val) {
  const ret = {};
  if (arguments.length === 0) {
    this.node.style.cssText.split(/\s*;\s*/).filter(function(el) {
      return !!el.length;
    }).forEach(function(el) {
      const t = el.split(/\s*:\s*/);
      ret[t[0]] = t[1];
    });
    return ret;
  }
  if (arguments.length < 2) {
    if (Array.isArray(style)) {
      for (const name of style) {
        const cased = camelCase(name);
        ret[name] = this.node.style[cased];
      }
      return ret;
    }
    if (typeof style === "string") {
      return this.node.style[camelCase(style)];
    }
    if (typeof style === "object") {
      for (const name in style) {
        this.node.style[camelCase(name)] = style[name] == null || isBlank.test(style[name]) ? "" : style[name];
      }
    }
  }
  if (arguments.length === 2) {
    this.node.style[camelCase(style)] = val == null || isBlank.test(val) ? "" : val;
  }
  return this;
}
function show() {
  return this.css("display", "");
}
function hide() {
  return this.css("display", "none");
}
function visible() {
  return this.css("display") !== "none";
}
registerMethods("Dom", {
  css,
  show,
  hide,
  visible
});
function data(a, v, r) {
  if (a == null) {
    return this.data(map$1(filter(this.node.attributes, (el) => el.nodeName.indexOf("data-") === 0), (el) => el.nodeName.slice(5)));
  } else if (a instanceof Array) {
    const data2 = {};
    for (const key of a) {
      data2[key] = this.data(key);
    }
    return data2;
  } else if (typeof a === "object") {
    for (v in a) {
      this.data(v, a[v]);
    }
  } else if (arguments.length < 2) {
    try {
      return JSON.parse(this.attr("data-" + a));
    } catch (e) {
      return this.attr("data-" + a);
    }
  } else {
    this.attr("data-" + a, v === null ? null : r === true || typeof v === "string" || typeof v === "number" ? v : JSON.stringify(v));
  }
  return this;
}
registerMethods("Dom", {
  data
});
function remember(k, v) {
  if (typeof arguments[0] === "object") {
    for (const key in k) {
      this.remember(key, k[key]);
    }
  } else if (arguments.length === 1) {
    return this.memory()[k];
  } else {
    this.memory()[k] = v;
  }
  return this;
}
function forget() {
  if (arguments.length === 0) {
    this._memory = {};
  } else {
    for (let i = arguments.length - 1; i >= 0; i--) {
      delete this.memory()[arguments[i]];
    }
  }
  return this;
}
function memory() {
  return this._memory = this._memory || {};
}
registerMethods("Dom", {
  remember,
  forget,
  memory
});
function sixDigitHex(hex2) {
  return hex2.length === 4 ? ["#", hex2.substring(1, 2), hex2.substring(1, 2), hex2.substring(2, 3), hex2.substring(2, 3), hex2.substring(3, 4), hex2.substring(3, 4)].join("") : hex2;
}
function componentHex(component) {
  const integer = Math.round(component);
  const bounded = Math.max(0, Math.min(255, integer));
  const hex2 = bounded.toString(16);
  return hex2.length === 1 ? "0" + hex2 : hex2;
}
function is(object, space) {
  for (let i = space.length; i--; ) {
    if (object[space[i]] == null) {
      return false;
    }
  }
  return true;
}
function getParameters(a, b) {
  const params = is(a, "rgb") ? {
    _a: a.r,
    _b: a.g,
    _c: a.b,
    _d: 0,
    space: "rgb"
  } : is(a, "xyz") ? {
    _a: a.x,
    _b: a.y,
    _c: a.z,
    _d: 0,
    space: "xyz"
  } : is(a, "hsl") ? {
    _a: a.h,
    _b: a.s,
    _c: a.l,
    _d: 0,
    space: "hsl"
  } : is(a, "lab") ? {
    _a: a.l,
    _b: a.a,
    _c: a.b,
    _d: 0,
    space: "lab"
  } : is(a, "lch") ? {
    _a: a.l,
    _b: a.c,
    _c: a.h,
    _d: 0,
    space: "lch"
  } : is(a, "cmyk") ? {
    _a: a.c,
    _b: a.m,
    _c: a.y,
    _d: a.k,
    space: "cmyk"
  } : {
    _a: 0,
    _b: 0,
    _c: 0,
    space: "rgb"
  };
  params.space = b || params.space;
  return params;
}
function cieSpace(space) {
  if (space === "lab" || space === "xyz" || space === "lch") {
    return true;
  } else {
    return false;
  }
}
function hueToRgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
class Color {
  constructor(...inputs) {
    this.init(...inputs);
  }
  // Test if given value is a color
  static isColor(color) {
    return color && (color instanceof Color || this.isRgb(color) || this.test(color));
  }
  // Test if given value is an rgb object
  static isRgb(color) {
    return color && typeof color.r === "number" && typeof color.g === "number" && typeof color.b === "number";
  }
  /*
  Generating random colors
  */
  static random(mode = "vibrant", t, u) {
    const {
      random,
      round,
      sin,
      PI: pi
    } = Math;
    if (mode === "vibrant") {
      const l = (81 - 57) * random() + 57;
      const c = (83 - 45) * random() + 45;
      const h = 360 * random();
      const color = new Color(l, c, h, "lch");
      return color;
    } else if (mode === "sine") {
      t = t == null ? random() : t;
      const r = round(80 * sin(2 * pi * t / 0.5 + 0.01) + 150);
      const g = round(50 * sin(2 * pi * t / 0.5 + 4.6) + 200);
      const b = round(100 * sin(2 * pi * t / 0.5 + 2.3) + 150);
      const color = new Color(r, g, b);
      return color;
    } else if (mode === "pastel") {
      const l = (94 - 86) * random() + 86;
      const c = (26 - 9) * random() + 9;
      const h = 360 * random();
      const color = new Color(l, c, h, "lch");
      return color;
    } else if (mode === "dark") {
      const l = 10 + 10 * random();
      const c = (125 - 75) * random() + 86;
      const h = 360 * random();
      const color = new Color(l, c, h, "lch");
      return color;
    } else if (mode === "rgb") {
      const r = 255 * random();
      const g = 255 * random();
      const b = 255 * random();
      const color = new Color(r, g, b);
      return color;
    } else if (mode === "lab") {
      const l = 100 * random();
      const a = 256 * random() - 128;
      const b = 256 * random() - 128;
      const color = new Color(l, a, b, "lab");
      return color;
    } else if (mode === "grey") {
      const grey = 255 * random();
      const color = new Color(grey, grey, grey);
      return color;
    } else {
      throw new Error("Unsupported random color mode");
    }
  }
  // Test if given value is a color string
  static test(color) {
    return typeof color === "string" && (isHex.test(color) || isRgb.test(color));
  }
  cmyk() {
    const {
      _a,
      _b,
      _c
    } = this.rgb();
    const [r, g, b] = [_a, _b, _c].map((v) => v / 255);
    const k = Math.min(1 - r, 1 - g, 1 - b);
    if (k === 1) {
      return new Color(0, 0, 0, 1, "cmyk");
    }
    const c = (1 - r - k) / (1 - k);
    const m = (1 - g - k) / (1 - k);
    const y2 = (1 - b - k) / (1 - k);
    const color = new Color(c, m, y2, k, "cmyk");
    return color;
  }
  hsl() {
    const {
      _a,
      _b,
      _c
    } = this.rgb();
    const [r, g, b] = [_a, _b, _c].map((v) => v / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const isGrey = max === min;
    const delta = max - min;
    const s = isGrey ? 0 : l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    const h = isGrey ? 0 : max === r ? ((g - b) / delta + (g < b ? 6 : 0)) / 6 : max === g ? ((b - r) / delta + 2) / 6 : max === b ? ((r - g) / delta + 4) / 6 : 0;
    const color = new Color(360 * h, 100 * s, 100 * l, "hsl");
    return color;
  }
  init(a = 0, b = 0, c = 0, d = 0, space = "rgb") {
    a = !a ? 0 : a;
    if (this.space) {
      for (const component in this.space) {
        delete this[this.space[component]];
      }
    }
    if (typeof a === "number") {
      space = typeof d === "string" ? d : space;
      d = typeof d === "string" ? 0 : d;
      Object.assign(this, {
        _a: a,
        _b: b,
        _c: c,
        _d: d,
        space
      });
    } else if (a instanceof Array) {
      this.space = b || (typeof a[3] === "string" ? a[3] : a[4]) || "rgb";
      Object.assign(this, {
        _a: a[0],
        _b: a[1],
        _c: a[2],
        _d: a[3] || 0
      });
    } else if (a instanceof Object) {
      const values = getParameters(a, b);
      Object.assign(this, values);
    } else if (typeof a === "string") {
      if (isRgb.test(a)) {
        const noWhitespace = a.replace(whitespace, "");
        const [_a2, _b2, _c2] = rgb.exec(noWhitespace).slice(1, 4).map((v) => parseInt(v));
        Object.assign(this, {
          _a: _a2,
          _b: _b2,
          _c: _c2,
          _d: 0,
          space: "rgb"
        });
      } else if (isHex.test(a)) {
        const hexParse = (v) => parseInt(v, 16);
        const [, _a2, _b2, _c2] = hex.exec(sixDigitHex(a)).map(hexParse);
        Object.assign(this, {
          _a: _a2,
          _b: _b2,
          _c: _c2,
          _d: 0,
          space: "rgb"
        });
      } else throw Error("Unsupported string format, can't construct Color");
    }
    const {
      _a,
      _b,
      _c,
      _d
    } = this;
    const components = this.space === "rgb" ? {
      r: _a,
      g: _b,
      b: _c
    } : this.space === "xyz" ? {
      x: _a,
      y: _b,
      z: _c
    } : this.space === "hsl" ? {
      h: _a,
      s: _b,
      l: _c
    } : this.space === "lab" ? {
      l: _a,
      a: _b,
      b: _c
    } : this.space === "lch" ? {
      l: _a,
      c: _b,
      h: _c
    } : this.space === "cmyk" ? {
      c: _a,
      m: _b,
      y: _c,
      k: _d
    } : {};
    Object.assign(this, components);
  }
  lab() {
    const {
      x: x2,
      y: y2,
      z
    } = this.xyz();
    const l = 116 * y2 - 16;
    const a = 500 * (x2 - y2);
    const b = 200 * (y2 - z);
    const color = new Color(l, a, b, "lab");
    return color;
  }
  lch() {
    const {
      l,
      a,
      b
    } = this.lab();
    const c = Math.sqrt(a ** 2 + b ** 2);
    let h = 180 * Math.atan2(b, a) / Math.PI;
    if (h < 0) {
      h *= -1;
      h = 360 - h;
    }
    const color = new Color(l, c, h, "lch");
    return color;
  }
  /*
  Conversion Methods
  */
  rgb() {
    if (this.space === "rgb") {
      return this;
    } else if (cieSpace(this.space)) {
      let {
        x: x2,
        y: y2,
        z
      } = this;
      if (this.space === "lab" || this.space === "lch") {
        let {
          l,
          a,
          b: b2
        } = this;
        if (this.space === "lch") {
          const {
            c,
            h
          } = this;
          const dToR = Math.PI / 180;
          a = c * Math.cos(dToR * h);
          b2 = c * Math.sin(dToR * h);
        }
        const yL = (l + 16) / 116;
        const xL = a / 500 + yL;
        const zL = yL - b2 / 200;
        const ct = 16 / 116;
        const mx = 8856e-6;
        const nm = 7.787;
        x2 = 0.95047 * (xL ** 3 > mx ? xL ** 3 : (xL - ct) / nm);
        y2 = 1 * (yL ** 3 > mx ? yL ** 3 : (yL - ct) / nm);
        z = 1.08883 * (zL ** 3 > mx ? zL ** 3 : (zL - ct) / nm);
      }
      const rU = x2 * 3.2406 + y2 * -1.5372 + z * -0.4986;
      const gU = x2 * -0.9689 + y2 * 1.8758 + z * 0.0415;
      const bU = x2 * 0.0557 + y2 * -0.204 + z * 1.057;
      const pow = Math.pow;
      const bd = 31308e-7;
      const r = rU > bd ? 1.055 * pow(rU, 1 / 2.4) - 0.055 : 12.92 * rU;
      const g = gU > bd ? 1.055 * pow(gU, 1 / 2.4) - 0.055 : 12.92 * gU;
      const b = bU > bd ? 1.055 * pow(bU, 1 / 2.4) - 0.055 : 12.92 * bU;
      const color = new Color(255 * r, 255 * g, 255 * b);
      return color;
    } else if (this.space === "hsl") {
      let {
        h,
        s,
        l
      } = this;
      h /= 360;
      s /= 100;
      l /= 100;
      if (s === 0) {
        l *= 255;
        const color2 = new Color(l, l, l);
        return color2;
      }
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const r = 255 * hueToRgb(p, q, h + 1 / 3);
      const g = 255 * hueToRgb(p, q, h);
      const b = 255 * hueToRgb(p, q, h - 1 / 3);
      const color = new Color(r, g, b);
      return color;
    } else if (this.space === "cmyk") {
      const {
        c,
        m,
        y: y2,
        k
      } = this;
      const r = 255 * (1 - Math.min(1, c * (1 - k) + k));
      const g = 255 * (1 - Math.min(1, m * (1 - k) + k));
      const b = 255 * (1 - Math.min(1, y2 * (1 - k) + k));
      const color = new Color(r, g, b);
      return color;
    } else {
      return this;
    }
  }
  toArray() {
    const {
      _a,
      _b,
      _c,
      _d,
      space
    } = this;
    return [_a, _b, _c, _d, space];
  }
  toHex() {
    const [r, g, b] = this._clamped().map(componentHex);
    return `#${r}${g}${b}`;
  }
  toRgb() {
    const [rV, gV, bV] = this._clamped();
    const string = `rgb(${rV},${gV},${bV})`;
    return string;
  }
  toString() {
    return this.toHex();
  }
  xyz() {
    const {
      _a: r255,
      _b: g255,
      _c: b255
    } = this.rgb();
    const [r, g, b] = [r255, g255, b255].map((v) => v / 255);
    const rL = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    const gL = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    const bL = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
    const xU = (rL * 0.4124 + gL * 0.3576 + bL * 0.1805) / 0.95047;
    const yU = (rL * 0.2126 + gL * 0.7152 + bL * 0.0722) / 1;
    const zU = (rL * 0.0193 + gL * 0.1192 + bL * 0.9505) / 1.08883;
    const x2 = xU > 8856e-6 ? Math.pow(xU, 1 / 3) : 7.787 * xU + 16 / 116;
    const y2 = yU > 8856e-6 ? Math.pow(yU, 1 / 3) : 7.787 * yU + 16 / 116;
    const z = zU > 8856e-6 ? Math.pow(zU, 1 / 3) : 7.787 * zU + 16 / 116;
    const color = new Color(x2, y2, z, "xyz");
    return color;
  }
  /*
  Input and Output methods
  */
  _clamped() {
    const {
      _a,
      _b,
      _c
    } = this.rgb();
    const {
      max,
      min,
      round
    } = Math;
    const format = (v) => max(0, min(round(v), 255));
    return [_a, _b, _c].map(format);
  }
  /*
  Constructing colors
  */
}
class Point {
  // Initialize
  constructor(...args) {
    this.init(...args);
  }
  // Clone point
  clone() {
    return new Point(this);
  }
  init(x2, y2) {
    const base = {
      x: 0,
      y: 0
    };
    const source = Array.isArray(x2) ? {
      x: x2[0],
      y: x2[1]
    } : typeof x2 === "object" ? {
      x: x2.x,
      y: x2.y
    } : {
      x: x2,
      y: y2
    };
    this.x = source.x == null ? base.x : source.x;
    this.y = source.y == null ? base.y : source.y;
    return this;
  }
  toArray() {
    return [this.x, this.y];
  }
  transform(m) {
    return this.clone().transformO(m);
  }
  // Transform point with matrix
  transformO(m) {
    if (!Matrix.isMatrixLike(m)) {
      m = new Matrix(m);
    }
    const {
      x: x2,
      y: y2
    } = this;
    this.x = m.a * x2 + m.c * y2 + m.e;
    this.y = m.b * x2 + m.d * y2 + m.f;
    return this;
  }
}
function point(x2, y2) {
  return new Point(x2, y2).transformO(this.screenCTM().inverseO());
}
function closeEnough(a, b, threshold) {
  return Math.abs(b - a) < 1e-6;
}
class Matrix {
  constructor(...args) {
    this.init(...args);
  }
  static formatTransforms(o) {
    const flipBoth = o.flip === "both" || o.flip === true;
    const flipX = o.flip && (flipBoth || o.flip === "x") ? -1 : 1;
    const flipY = o.flip && (flipBoth || o.flip === "y") ? -1 : 1;
    const skewX = o.skew && o.skew.length ? o.skew[0] : isFinite(o.skew) ? o.skew : isFinite(o.skewX) ? o.skewX : 0;
    const skewY = o.skew && o.skew.length ? o.skew[1] : isFinite(o.skew) ? o.skew : isFinite(o.skewY) ? o.skewY : 0;
    const scaleX = o.scale && o.scale.length ? o.scale[0] * flipX : isFinite(o.scale) ? o.scale * flipX : isFinite(o.scaleX) ? o.scaleX * flipX : flipX;
    const scaleY = o.scale && o.scale.length ? o.scale[1] * flipY : isFinite(o.scale) ? o.scale * flipY : isFinite(o.scaleY) ? o.scaleY * flipY : flipY;
    const shear = o.shear || 0;
    const theta = o.rotate || o.theta || 0;
    const origin = new Point(o.origin || o.around || o.ox || o.originX, o.oy || o.originY);
    const ox = origin.x;
    const oy = origin.y;
    const position2 = new Point(o.position || o.px || o.positionX || NaN, o.py || o.positionY || NaN);
    const px = position2.x;
    const py = position2.y;
    const translate = new Point(o.translate || o.tx || o.translateX, o.ty || o.translateY);
    const tx = translate.x;
    const ty = translate.y;
    const relative = new Point(o.relative || o.rx || o.relativeX, o.ry || o.relativeY);
    const rx2 = relative.x;
    const ry2 = relative.y;
    return {
      scaleX,
      scaleY,
      skewX,
      skewY,
      shear,
      theta,
      rx: rx2,
      ry: ry2,
      tx,
      ty,
      ox,
      oy,
      px,
      py
    };
  }
  static fromArray(a) {
    return {
      a: a[0],
      b: a[1],
      c: a[2],
      d: a[3],
      e: a[4],
      f: a[5]
    };
  }
  static isMatrixLike(o) {
    return o.a != null || o.b != null || o.c != null || o.d != null || o.e != null || o.f != null;
  }
  // left matrix, right matrix, target matrix which is overwritten
  static matrixMultiply(l, r, o) {
    const a = l.a * r.a + l.c * r.b;
    const b = l.b * r.a + l.d * r.b;
    const c = l.a * r.c + l.c * r.d;
    const d = l.b * r.c + l.d * r.d;
    const e = l.e + l.a * r.e + l.c * r.f;
    const f = l.f + l.b * r.e + l.d * r.f;
    o.a = a;
    o.b = b;
    o.c = c;
    o.d = d;
    o.e = e;
    o.f = f;
    return o;
  }
  around(cx2, cy2, matrix) {
    return this.clone().aroundO(cx2, cy2, matrix);
  }
  // Transform around a center point
  aroundO(cx2, cy2, matrix) {
    const dx2 = cx2 || 0;
    const dy2 = cy2 || 0;
    return this.translateO(-dx2, -dy2).lmultiplyO(matrix).translateO(dx2, dy2);
  }
  // Clones this matrix
  clone() {
    return new Matrix(this);
  }
  // Decomposes this matrix into its affine parameters
  decompose(cx2 = 0, cy2 = 0) {
    const a = this.a;
    const b = this.b;
    const c = this.c;
    const d = this.d;
    const e = this.e;
    const f = this.f;
    const determinant = a * d - b * c;
    const ccw = determinant > 0 ? 1 : -1;
    const sx = ccw * Math.sqrt(a * a + b * b);
    const thetaRad = Math.atan2(ccw * b, ccw * a);
    const theta = 180 / Math.PI * thetaRad;
    const ct = Math.cos(thetaRad);
    const st = Math.sin(thetaRad);
    const lam = (a * c + b * d) / determinant;
    const sy = c * sx / (lam * a - b) || d * sx / (lam * b + a);
    const tx = e - cx2 + cx2 * ct * sx + cy2 * (lam * ct * sx - st * sy);
    const ty = f - cy2 + cx2 * st * sx + cy2 * (lam * st * sx + ct * sy);
    return {
      // Return the affine parameters
      scaleX: sx,
      scaleY: sy,
      shear: lam,
      rotate: theta,
      translateX: tx,
      translateY: ty,
      originX: cx2,
      originY: cy2,
      // Return the matrix parameters
      a: this.a,
      b: this.b,
      c: this.c,
      d: this.d,
      e: this.e,
      f: this.f
    };
  }
  // Check if two matrices are equal
  equals(other) {
    if (other === this) return true;
    const comp = new Matrix(other);
    return closeEnough(this.a, comp.a) && closeEnough(this.b, comp.b) && closeEnough(this.c, comp.c) && closeEnough(this.d, comp.d) && closeEnough(this.e, comp.e) && closeEnough(this.f, comp.f);
  }
  // Flip matrix on x or y, at a given offset
  flip(axis, around) {
    return this.clone().flipO(axis, around);
  }
  flipO(axis, around) {
    return axis === "x" ? this.scaleO(-1, 1, around, 0) : axis === "y" ? this.scaleO(1, -1, 0, around) : this.scaleO(-1, -1, axis, around || axis);
  }
  // Initialize
  init(source) {
    const base = Matrix.fromArray([1, 0, 0, 1, 0, 0]);
    source = source instanceof Element ? source.matrixify() : typeof source === "string" ? Matrix.fromArray(source.split(delimiter).map(parseFloat)) : Array.isArray(source) ? Matrix.fromArray(source) : typeof source === "object" && Matrix.isMatrixLike(source) ? source : typeof source === "object" ? new Matrix().transform(source) : arguments.length === 6 ? Matrix.fromArray([].slice.call(arguments)) : base;
    this.a = source.a != null ? source.a : base.a;
    this.b = source.b != null ? source.b : base.b;
    this.c = source.c != null ? source.c : base.c;
    this.d = source.d != null ? source.d : base.d;
    this.e = source.e != null ? source.e : base.e;
    this.f = source.f != null ? source.f : base.f;
    return this;
  }
  inverse() {
    return this.clone().inverseO();
  }
  // Inverses matrix
  inverseO() {
    const a = this.a;
    const b = this.b;
    const c = this.c;
    const d = this.d;
    const e = this.e;
    const f = this.f;
    const det = a * d - b * c;
    if (!det) throw new Error("Cannot invert " + this);
    const na = d / det;
    const nb = -b / det;
    const nc = -c / det;
    const nd = a / det;
    const ne = -(na * e + nc * f);
    const nf = -(nb * e + nd * f);
    this.a = na;
    this.b = nb;
    this.c = nc;
    this.d = nd;
    this.e = ne;
    this.f = nf;
    return this;
  }
  lmultiply(matrix) {
    return this.clone().lmultiplyO(matrix);
  }
  lmultiplyO(matrix) {
    const r = this;
    const l = matrix instanceof Matrix ? matrix : new Matrix(matrix);
    return Matrix.matrixMultiply(l, r, this);
  }
  // Left multiplies by the given matrix
  multiply(matrix) {
    return this.clone().multiplyO(matrix);
  }
  multiplyO(matrix) {
    const l = this;
    const r = matrix instanceof Matrix ? matrix : new Matrix(matrix);
    return Matrix.matrixMultiply(l, r, this);
  }
  // Rotate matrix
  rotate(r, cx2, cy2) {
    return this.clone().rotateO(r, cx2, cy2);
  }
  rotateO(r, cx2 = 0, cy2 = 0) {
    r = radians(r);
    const cos = Math.cos(r);
    const sin = Math.sin(r);
    const {
      a,
      b,
      c,
      d,
      e,
      f
    } = this;
    this.a = a * cos - b * sin;
    this.b = b * cos + a * sin;
    this.c = c * cos - d * sin;
    this.d = d * cos + c * sin;
    this.e = e * cos - f * sin + cy2 * sin - cx2 * cos + cx2;
    this.f = f * cos + e * sin - cx2 * sin - cy2 * cos + cy2;
    return this;
  }
  // Scale matrix
  scale(x2, y2, cx2, cy2) {
    return this.clone().scaleO(...arguments);
  }
  scaleO(x2, y2 = x2, cx2 = 0, cy2 = 0) {
    if (arguments.length === 3) {
      cy2 = cx2;
      cx2 = y2;
      y2 = x2;
    }
    const {
      a,
      b,
      c,
      d,
      e,
      f
    } = this;
    this.a = a * x2;
    this.b = b * y2;
    this.c = c * x2;
    this.d = d * y2;
    this.e = e * x2 - cx2 * x2 + cx2;
    this.f = f * y2 - cy2 * y2 + cy2;
    return this;
  }
  // Shear matrix
  shear(a, cx2, cy2) {
    return this.clone().shearO(a, cx2, cy2);
  }
  shearO(lx, cx2 = 0, cy2 = 0) {
    const {
      a,
      b,
      c,
      d,
      e,
      f
    } = this;
    this.a = a + b * lx;
    this.c = c + d * lx;
    this.e = e + f * lx - cy2 * lx;
    return this;
  }
  // Skew Matrix
  skew(x2, y2, cx2, cy2) {
    return this.clone().skewO(...arguments);
  }
  skewO(x2, y2 = x2, cx2 = 0, cy2 = 0) {
    if (arguments.length === 3) {
      cy2 = cx2;
      cx2 = y2;
      y2 = x2;
    }
    x2 = radians(x2);
    y2 = radians(y2);
    const lx = Math.tan(x2);
    const ly = Math.tan(y2);
    const {
      a,
      b,
      c,
      d,
      e,
      f
    } = this;
    this.a = a + b * lx;
    this.b = b + a * ly;
    this.c = c + d * lx;
    this.d = d + c * ly;
    this.e = e + f * lx - cy2 * lx;
    this.f = f + e * ly - cx2 * ly;
    return this;
  }
  // SkewX
  skewX(x2, cx2, cy2) {
    return this.skew(x2, 0, cx2, cy2);
  }
  // SkewY
  skewY(y2, cx2, cy2) {
    return this.skew(0, y2, cx2, cy2);
  }
  toArray() {
    return [this.a, this.b, this.c, this.d, this.e, this.f];
  }
  // Convert matrix to string
  toString() {
    return "matrix(" + this.a + "," + this.b + "," + this.c + "," + this.d + "," + this.e + "," + this.f + ")";
  }
  // Transform a matrix into another matrix by manipulating the space
  transform(o) {
    if (Matrix.isMatrixLike(o)) {
      const matrix = new Matrix(o);
      return matrix.multiplyO(this);
    }
    const t = Matrix.formatTransforms(o);
    const current = this;
    const {
      x: ox,
      y: oy
    } = new Point(t.ox, t.oy).transform(current);
    const transformer = new Matrix().translateO(t.rx, t.ry).lmultiplyO(current).translateO(-ox, -oy).scaleO(t.scaleX, t.scaleY).skewO(t.skewX, t.skewY).shearO(t.shear).rotateO(t.theta).translateO(ox, oy);
    if (isFinite(t.px) || isFinite(t.py)) {
      const origin = new Point(ox, oy).transform(transformer);
      const dx2 = isFinite(t.px) ? t.px - origin.x : 0;
      const dy2 = isFinite(t.py) ? t.py - origin.y : 0;
      transformer.translateO(dx2, dy2);
    }
    transformer.translateO(t.tx, t.ty);
    return transformer;
  }
  // Translate matrix
  translate(x2, y2) {
    return this.clone().translateO(x2, y2);
  }
  translateO(x2, y2) {
    this.e += x2 || 0;
    this.f += y2 || 0;
    return this;
  }
  valueOf() {
    return {
      a: this.a,
      b: this.b,
      c: this.c,
      d: this.d,
      e: this.e,
      f: this.f
    };
  }
}
function ctm() {
  return new Matrix(this.node.getCTM());
}
function screenCTM() {
  if (typeof this.isRoot === "function" && !this.isRoot()) {
    const rect = this.rect(1, 1);
    const m = rect.node.getScreenCTM();
    rect.remove();
    return new Matrix(m);
  }
  return new Matrix(this.node.getScreenCTM());
}
register(Matrix, "Matrix");
function parser() {
  if (!parser.nodes) {
    const svg2 = makeInstance().size(2, 0);
    svg2.node.style.cssText = ["opacity: 0", "position: absolute", "left: -100%", "top: -100%", "overflow: hidden"].join(";");
    svg2.attr("focusable", "false");
    svg2.attr("aria-hidden", "true");
    const path = svg2.path().node;
    parser.nodes = {
      svg: svg2,
      path
    };
  }
  if (!parser.nodes.svg.node.parentNode) {
    const b = globals.document.body || globals.document.documentElement;
    parser.nodes.svg.addTo(b);
  }
  return parser.nodes;
}
function isNulledBox(box) {
  return !box.width && !box.height && !box.x && !box.y;
}
function domContains(node) {
  return node === globals.document || (globals.document.documentElement.contains || function(node2) {
    while (node2.parentNode) {
      node2 = node2.parentNode;
    }
    return node2 === globals.document;
  }).call(globals.document.documentElement, node);
}
class Box {
  constructor(...args) {
    this.init(...args);
  }
  addOffset() {
    this.x += globals.window.pageXOffset;
    this.y += globals.window.pageYOffset;
    return new Box(this);
  }
  init(source) {
    const base = [0, 0, 0, 0];
    source = typeof source === "string" ? source.split(delimiter).map(parseFloat) : Array.isArray(source) ? source : typeof source === "object" ? [source.left != null ? source.left : source.x, source.top != null ? source.top : source.y, source.width, source.height] : arguments.length === 4 ? [].slice.call(arguments) : base;
    this.x = source[0] || 0;
    this.y = source[1] || 0;
    this.width = this.w = source[2] || 0;
    this.height = this.h = source[3] || 0;
    this.x2 = this.x + this.w;
    this.y2 = this.y + this.h;
    this.cx = this.x + this.w / 2;
    this.cy = this.y + this.h / 2;
    return this;
  }
  isNulled() {
    return isNulledBox(this);
  }
  // Merge rect box with another, return a new instance
  merge(box) {
    const x2 = Math.min(this.x, box.x);
    const y2 = Math.min(this.y, box.y);
    const width2 = Math.max(this.x + this.width, box.x + box.width) - x2;
    const height2 = Math.max(this.y + this.height, box.y + box.height) - y2;
    return new Box(x2, y2, width2, height2);
  }
  toArray() {
    return [this.x, this.y, this.width, this.height];
  }
  toString() {
    return this.x + " " + this.y + " " + this.width + " " + this.height;
  }
  transform(m) {
    if (!(m instanceof Matrix)) {
      m = new Matrix(m);
    }
    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;
    const pts = [new Point(this.x, this.y), new Point(this.x2, this.y), new Point(this.x, this.y2), new Point(this.x2, this.y2)];
    pts.forEach(function(p) {
      p = p.transform(m);
      xMin = Math.min(xMin, p.x);
      xMax = Math.max(xMax, p.x);
      yMin = Math.min(yMin, p.y);
      yMax = Math.max(yMax, p.y);
    });
    return new Box(xMin, yMin, xMax - xMin, yMax - yMin);
  }
}
function getBox(el, getBBoxFn, retry) {
  let box;
  try {
    box = getBBoxFn(el.node);
    if (isNulledBox(box) && !domContains(el.node)) {
      throw new Error("Element not in the dom");
    }
  } catch (e) {
    box = retry(el);
  }
  return box;
}
function bbox() {
  const getBBox = (node) => node.getBBox();
  const retry = (el) => {
    try {
      const clone2 = el.clone().addTo(parser().svg).show();
      const box2 = clone2.node.getBBox();
      clone2.remove();
      return box2;
    } catch (e) {
      throw new Error(`Getting bbox of element "${el.node.nodeName}" is not possible: ${e.toString()}`);
    }
  };
  const box = getBox(this, getBBox, retry);
  const bbox2 = new Box(box);
  return bbox2;
}
function rbox(el) {
  const getRBox = (node) => node.getBoundingClientRect();
  const retry = (el2) => {
    throw new Error(`Getting rbox of element "${el2.node.nodeName}" is not possible`);
  };
  const box = getBox(this, getRBox, retry);
  const rbox2 = new Box(box);
  if (el) {
    return rbox2.transform(el.screenCTM().inverseO());
  }
  return rbox2.addOffset();
}
function inside(x2, y2) {
  const box = this.bbox();
  return x2 > box.x && y2 > box.y && x2 < box.x + box.width && y2 < box.y + box.height;
}
registerMethods({
  viewbox: {
    viewbox(x2, y2, width2, height2) {
      if (x2 == null) return new Box(this.attr("viewBox"));
      return this.attr("viewBox", new Box(x2, y2, width2, height2));
    },
    zoom(level, point2) {
      let {
        width: width2,
        height: height2
      } = this.attr(["width", "height"]);
      if (!width2 && !height2 || typeof width2 === "string" || typeof height2 === "string") {
        width2 = this.node.clientWidth;
        height2 = this.node.clientHeight;
      }
      if (!width2 || !height2) {
        throw new Error("Impossible to get absolute width and height. Please provide an absolute width and height attribute on the zooming element");
      }
      const v = this.viewbox();
      const zoomX = width2 / v.width;
      const zoomY = height2 / v.height;
      const zoom = Math.min(zoomX, zoomY);
      if (level == null) {
        return zoom;
      }
      let zoomAmount = zoom / level;
      if (zoomAmount === Infinity) zoomAmount = Number.MAX_SAFE_INTEGER / 100;
      point2 = point2 || new Point(width2 / 2 / zoomX + v.x, height2 / 2 / zoomY + v.y);
      const box = new Box(v).transform(new Matrix({
        scale: zoomAmount,
        origin: point2
      }));
      return this.viewbox(box);
    }
  }
});
register(Box, "Box");
class List extends Array {
  constructor(arr = [], ...args) {
    super(arr, ...args);
    if (typeof arr === "number") return this;
    this.length = 0;
    this.push(...arr);
  }
}
extend([List], {
  each(fnOrMethodName, ...args) {
    if (typeof fnOrMethodName === "function") {
      return this.map((el, i, arr) => {
        return fnOrMethodName.call(el, el, i, arr);
      });
    } else {
      return this.map((el) => {
        return el[fnOrMethodName](...args);
      });
    }
  },
  toArray() {
    return Array.prototype.concat.apply([], this);
  }
});
const reserved = ["toArray", "constructor", "each"];
List.extend = function(methods2) {
  methods2 = methods2.reduce((obj, name) => {
    if (reserved.includes(name)) return obj;
    if (name[0] === "_") return obj;
    obj[name] = function(...attrs2) {
      return this.each(name, ...attrs2);
    };
    return obj;
  }, {});
  extend([List], methods2);
};
function baseFind(query, parent) {
  return new List(map$1((parent || globals.document).querySelectorAll(query), function(node) {
    return adopt(node);
  }));
}
function find(query) {
  return baseFind(query, this.node);
}
function findOne(query) {
  return adopt(this.node.querySelector(query));
}
let listenerId = 0;
const windowEvents = {};
function getEvents(instance) {
  let n = instance.getEventHolder();
  if (n === globals.window) n = windowEvents;
  if (!n.events) n.events = {};
  return n.events;
}
function getEventTarget(instance) {
  return instance.getEventTarget();
}
function clearEvents(instance) {
  let n = instance.getEventHolder();
  if (n === globals.window) n = windowEvents;
  if (n.events) n.events = {};
}
function on(node, events, listener, binding, options) {
  const l = listener.bind(binding || node);
  const instance = makeInstance(node);
  const bag = getEvents(instance);
  const n = getEventTarget(instance);
  events = Array.isArray(events) ? events : events.split(delimiter);
  if (!listener._svgjsListenerId) {
    listener._svgjsListenerId = ++listenerId;
  }
  events.forEach(function(event) {
    const ev = event.split(".")[0];
    const ns = event.split(".")[1] || "*";
    bag[ev] = bag[ev] || {};
    bag[ev][ns] = bag[ev][ns] || {};
    bag[ev][ns][listener._svgjsListenerId] = l;
    n.addEventListener(ev, l, options || false);
  });
}
function off(node, events, listener, options) {
  const instance = makeInstance(node);
  const bag = getEvents(instance);
  const n = getEventTarget(instance);
  if (typeof listener === "function") {
    listener = listener._svgjsListenerId;
    if (!listener) return;
  }
  events = Array.isArray(events) ? events : (events || "").split(delimiter);
  events.forEach(function(event) {
    const ev = event && event.split(".")[0];
    const ns = event && event.split(".")[1];
    let namespace, l;
    if (listener) {
      if (bag[ev] && bag[ev][ns || "*"]) {
        n.removeEventListener(ev, bag[ev][ns || "*"][listener], options || false);
        delete bag[ev][ns || "*"][listener];
      }
    } else if (ev && ns) {
      if (bag[ev] && bag[ev][ns]) {
        for (l in bag[ev][ns]) {
          off(n, [ev, ns].join("."), l);
        }
        delete bag[ev][ns];
      }
    } else if (ns) {
      for (event in bag) {
        for (namespace in bag[event]) {
          if (ns === namespace) {
            off(n, [event, ns].join("."));
          }
        }
      }
    } else if (ev) {
      if (bag[ev]) {
        for (namespace in bag[ev]) {
          off(n, [ev, namespace].join("."));
        }
        delete bag[ev];
      }
    } else {
      for (event in bag) {
        off(n, event);
      }
      clearEvents(instance);
    }
  });
}
function dispatch(node, event, data2, options) {
  const n = getEventTarget(node);
  if (event instanceof globals.window.Event) {
    n.dispatchEvent(event);
  } else {
    event = new globals.window.CustomEvent(event, {
      detail: data2,
      cancelable: true,
      ...options
    });
    n.dispatchEvent(event);
  }
  return event;
}
class EventTarget extends Base$1 {
  addEventListener() {
  }
  dispatch(event, data2, options) {
    return dispatch(this, event, data2, options);
  }
  dispatchEvent(event) {
    const bag = this.getEventHolder().events;
    if (!bag) return true;
    const events = bag[event.type];
    for (const i in events) {
      for (const j in events[i]) {
        events[i][j](event);
      }
    }
    return !event.defaultPrevented;
  }
  // Fire given event
  fire(event, data2, options) {
    this.dispatch(event, data2, options);
    return this;
  }
  getEventHolder() {
    return this;
  }
  getEventTarget() {
    return this;
  }
  // Unbind event from listener
  off(event, listener, options) {
    off(this, event, listener, options);
    return this;
  }
  // Bind given event to listener
  on(event, listener, binding, options) {
    on(this, event, listener, binding, options);
    return this;
  }
  removeEventListener() {
  }
}
register(EventTarget, "EventTarget");
function noop() {
}
const timeline = {
  duration: 400,
  ease: ">",
  delay: 0
};
const attrs = {
  // fill and stroke
  "fill-opacity": 1,
  "stroke-opacity": 1,
  "stroke-width": 0,
  "stroke-linejoin": "miter",
  "stroke-linecap": "butt",
  fill: "#000000",
  stroke: "#000000",
  opacity: 1,
  // position
  x: 0,
  y: 0,
  cx: 0,
  cy: 0,
  // size
  width: 0,
  height: 0,
  // radius
  r: 0,
  rx: 0,
  ry: 0,
  // gradient
  offset: 0,
  "stop-opacity": 1,
  "stop-color": "#000000",
  // text
  "text-anchor": "start"
};
class SVGArray extends Array {
  constructor(...args) {
    super(...args);
    this.init(...args);
  }
  clone() {
    return new this.constructor(this);
  }
  init(arr) {
    if (typeof arr === "number") return this;
    this.length = 0;
    this.push(...this.parse(arr));
    return this;
  }
  // Parse whitespace separated string
  parse(array2 = []) {
    if (array2 instanceof Array) return array2;
    return array2.trim().split(delimiter).map(parseFloat);
  }
  toArray() {
    return Array.prototype.concat.apply([], this);
  }
  toSet() {
    return new Set(this);
  }
  toString() {
    return this.join(" ");
  }
  // Flattens the array if needed
  valueOf() {
    const ret = [];
    ret.push(...this);
    return ret;
  }
}
class SVGNumber {
  // Initialize
  constructor(...args) {
    this.init(...args);
  }
  convert(unit) {
    return new SVGNumber(this.value, unit);
  }
  // Divide number
  divide(number) {
    number = new SVGNumber(number);
    return new SVGNumber(this / number, this.unit || number.unit);
  }
  init(value, unit) {
    unit = Array.isArray(value) ? value[1] : unit;
    value = Array.isArray(value) ? value[0] : value;
    this.value = 0;
    this.unit = unit || "";
    if (typeof value === "number") {
      this.value = isNaN(value) ? 0 : !isFinite(value) ? value < 0 ? -34e37 : 34e37 : value;
    } else if (typeof value === "string") {
      unit = value.match(numberAndUnit);
      if (unit) {
        this.value = parseFloat(unit[1]);
        if (unit[5] === "%") {
          this.value /= 100;
        } else if (unit[5] === "s") {
          this.value *= 1e3;
        }
        this.unit = unit[5];
      }
    } else {
      if (value instanceof SVGNumber) {
        this.value = value.valueOf();
        this.unit = value.unit;
      }
    }
    return this;
  }
  // Subtract number
  minus(number) {
    number = new SVGNumber(number);
    return new SVGNumber(this - number, this.unit || number.unit);
  }
  // Add number
  plus(number) {
    number = new SVGNumber(number);
    return new SVGNumber(this + number, this.unit || number.unit);
  }
  // Multiply number
  times(number) {
    number = new SVGNumber(number);
    return new SVGNumber(this * number, this.unit || number.unit);
  }
  toArray() {
    return [this.value, this.unit];
  }
  toJSON() {
    return this.toString();
  }
  toString() {
    return (this.unit === "%" ? ~~(this.value * 1e8) / 1e6 : this.unit === "s" ? this.value / 1e3 : this.value) + this.unit;
  }
  valueOf() {
    return this.value;
  }
}
const hooks = [];
function registerAttrHook(fn) {
  hooks.push(fn);
}
function attr(attr2, val, ns) {
  if (attr2 == null) {
    attr2 = {};
    val = this.node.attributes;
    for (const node of val) {
      attr2[node.nodeName] = isNumber.test(node.nodeValue) ? parseFloat(node.nodeValue) : node.nodeValue;
    }
    return attr2;
  } else if (attr2 instanceof Array) {
    return attr2.reduce((last, curr) => {
      last[curr] = this.attr(curr);
      return last;
    }, {});
  } else if (typeof attr2 === "object" && attr2.constructor === Object) {
    for (val in attr2) this.attr(val, attr2[val]);
  } else if (val === null) {
    this.node.removeAttribute(attr2);
  } else if (val == null) {
    val = this.node.getAttribute(attr2);
    return val == null ? attrs[attr2] : isNumber.test(val) ? parseFloat(val) : val;
  } else {
    val = hooks.reduce((_val, hook) => {
      return hook(attr2, _val, this);
    }, val);
    if (typeof val === "number") {
      val = new SVGNumber(val);
    } else if (Color.isColor(val)) {
      val = new Color(val);
    } else if (val.constructor === Array) {
      val = new SVGArray(val);
    }
    if (attr2 === "leading") {
      if (this.leading) {
        this.leading(val);
      }
    } else {
      typeof ns === "string" ? this.node.setAttributeNS(ns, attr2, val.toString()) : this.node.setAttribute(attr2, val.toString());
    }
    if (this.rebuild && (attr2 === "font-size" || attr2 === "x")) {
      this.rebuild();
    }
  }
  return this;
}
class Dom extends EventTarget {
  constructor(node, attrs2) {
    super();
    this.node = node;
    this.type = node.nodeName;
    if (attrs2 && node !== attrs2) {
      this.attr(attrs2);
    }
  }
  // Add given element at a position
  add(element, i) {
    element = makeInstance(element);
    if (element.removeNamespace && this.node instanceof globals.window.SVGElement) {
      element.removeNamespace();
    }
    if (i == null) {
      this.node.appendChild(element.node);
    } else if (element.node !== this.node.childNodes[i]) {
      this.node.insertBefore(element.node, this.node.childNodes[i]);
    }
    return this;
  }
  // Add element to given container and return self
  addTo(parent, i) {
    return makeInstance(parent).put(this, i);
  }
  // Returns all child elements
  children() {
    return new List(map$1(this.node.children, function(node) {
      return adopt(node);
    }));
  }
  // Remove all elements in this container
  clear() {
    while (this.node.hasChildNodes()) {
      this.node.removeChild(this.node.lastChild);
    }
    return this;
  }
  // Clone element
  clone(deep = true, assignNewIds = true) {
    this.writeDataToDom();
    let nodeClone = this.node.cloneNode(deep);
    if (assignNewIds) {
      nodeClone = assignNewId(nodeClone);
    }
    return new this.constructor(nodeClone);
  }
  // Iterates over all children and invokes a given block
  each(block, deep) {
    const children = this.children();
    let i, il;
    for (i = 0, il = children.length; i < il; i++) {
      block.apply(children[i], [i, children]);
      if (deep) {
        children[i].each(block, deep);
      }
    }
    return this;
  }
  element(nodeName, attrs2) {
    return this.put(new Dom(create(nodeName), attrs2));
  }
  // Get first child
  first() {
    return adopt(this.node.firstChild);
  }
  // Get a element at the given index
  get(i) {
    return adopt(this.node.childNodes[i]);
  }
  getEventHolder() {
    return this.node;
  }
  getEventTarget() {
    return this.node;
  }
  // Checks if the given element is a child
  has(element) {
    return this.index(element) >= 0;
  }
  html(htmlOrFn, outerHTML) {
    return this.xml(htmlOrFn, outerHTML, html);
  }
  // Get / set id
  id(id) {
    if (typeof id === "undefined" && !this.node.id) {
      this.node.id = eid(this.type);
    }
    return this.attr("id", id);
  }
  // Gets index of given element
  index(element) {
    return [].slice.call(this.node.childNodes).indexOf(element.node);
  }
  // Get the last child
  last() {
    return adopt(this.node.lastChild);
  }
  // matches the element vs a css selector
  matches(selector) {
    const el = this.node;
    const matcher = el.matches || el.matchesSelector || el.msMatchesSelector || el.mozMatchesSelector || el.webkitMatchesSelector || el.oMatchesSelector || null;
    return matcher && matcher.call(el, selector);
  }
  // Returns the parent element instance
  parent(type) {
    let parent = this;
    if (!parent.node.parentNode) return null;
    parent = adopt(parent.node.parentNode);
    if (!type) return parent;
    do {
      if (typeof type === "string" ? parent.matches(type) : parent instanceof type) return parent;
    } while (parent = adopt(parent.node.parentNode));
    return parent;
  }
  // Basically does the same as `add()` but returns the added element instead
  put(element, i) {
    element = makeInstance(element);
    this.add(element, i);
    return element;
  }
  // Add element to given container and return container
  putIn(parent, i) {
    return makeInstance(parent).add(this, i);
  }
  // Remove element
  remove() {
    if (this.parent()) {
      this.parent().removeElement(this);
    }
    return this;
  }
  // Remove a given child
  removeElement(element) {
    this.node.removeChild(element.node);
    return this;
  }
  // Replace this with element
  replace(element) {
    element = makeInstance(element);
    if (this.node.parentNode) {
      this.node.parentNode.replaceChild(element.node, this.node);
    }
    return element;
  }
  round(precision = 2, map2 = null) {
    const factor = 10 ** precision;
    const attrs2 = this.attr(map2);
    for (const i in attrs2) {
      if (typeof attrs2[i] === "number") {
        attrs2[i] = Math.round(attrs2[i] * factor) / factor;
      }
    }
    this.attr(attrs2);
    return this;
  }
  // Import / Export raw svg
  svg(svgOrFn, outerSVG) {
    return this.xml(svgOrFn, outerSVG, svg);
  }
  // Return id on string conversion
  toString() {
    return this.id();
  }
  words(text) {
    this.node.textContent = text;
    return this;
  }
  wrap(node) {
    const parent = this.parent();
    if (!parent) {
      return this.addTo(node);
    }
    const position2 = parent.index(this);
    return parent.put(node, position2).put(this);
  }
  // write svgjs data to the dom
  writeDataToDom() {
    this.each(function() {
      this.writeDataToDom();
    });
    return this;
  }
  // Import / Export raw svg
  xml(xmlOrFn, outerXML, ns) {
    if (typeof xmlOrFn === "boolean") {
      ns = outerXML;
      outerXML = xmlOrFn;
      xmlOrFn = null;
    }
    if (xmlOrFn == null || typeof xmlOrFn === "function") {
      outerXML = outerXML == null ? true : outerXML;
      this.writeDataToDom();
      let current = this;
      if (xmlOrFn != null) {
        current = adopt(current.node.cloneNode(true));
        if (outerXML) {
          const result = xmlOrFn(current);
          current = result || current;
          if (result === false) return "";
        }
        current.each(function() {
          const result = xmlOrFn(this);
          const _this = result || this;
          if (result === false) {
            this.remove();
          } else if (result && this !== _this) {
            this.replace(_this);
          }
        }, true);
      }
      return outerXML ? current.node.outerHTML : current.node.innerHTML;
    }
    outerXML = outerXML == null ? false : outerXML;
    const well = create("wrapper", ns);
    const fragment = globals.document.createDocumentFragment();
    well.innerHTML = xmlOrFn;
    for (let len = well.children.length; len--; ) {
      fragment.appendChild(well.firstElementChild);
    }
    const parent = this.parent();
    return outerXML ? this.replace(fragment) && parent : this.add(fragment);
  }
}
extend(Dom, {
  attr,
  find,
  findOne
});
register(Dom, "Dom");
class Element extends Dom {
  constructor(node, attrs2) {
    super(node, attrs2);
    this.dom = {};
    this.node.instance = this;
    if (node.hasAttribute("svgjs:data")) {
      this.setData(JSON.parse(node.getAttribute("svgjs:data")) || {});
    }
  }
  // Move element by its center
  center(x2, y2) {
    return this.cx(x2).cy(y2);
  }
  // Move by center over x-axis
  cx(x2) {
    return x2 == null ? this.x() + this.width() / 2 : this.x(x2 - this.width() / 2);
  }
  // Move by center over y-axis
  cy(y2) {
    return y2 == null ? this.y() + this.height() / 2 : this.y(y2 - this.height() / 2);
  }
  // Get defs
  defs() {
    const root2 = this.root();
    return root2 && root2.defs();
  }
  // Relative move over x and y axes
  dmove(x2, y2) {
    return this.dx(x2).dy(y2);
  }
  // Relative move over x axis
  dx(x2 = 0) {
    return this.x(new SVGNumber(x2).plus(this.x()));
  }
  // Relative move over y axis
  dy(y2 = 0) {
    return this.y(new SVGNumber(y2).plus(this.y()));
  }
  getEventHolder() {
    return this;
  }
  // Set height of element
  height(height2) {
    return this.attr("height", height2);
  }
  // Move element to given x and y values
  move(x2, y2) {
    return this.x(x2).y(y2);
  }
  // return array of all ancestors of given type up to the root svg
  parents(until = this.root()) {
    const isSelector = typeof until === "string";
    if (!isSelector) {
      until = makeInstance(until);
    }
    const parents = new List();
    let parent = this;
    while ((parent = parent.parent()) && parent.node !== globals.document && parent.nodeName !== "#document-fragment") {
      parents.push(parent);
      if (!isSelector && parent.node === until.node) {
        break;
      }
      if (isSelector && parent.matches(until)) {
        break;
      }
      if (parent.node === this.root().node) {
        return null;
      }
    }
    return parents;
  }
  // Get referenced element form attribute value
  reference(attr2) {
    attr2 = this.attr(attr2);
    if (!attr2) return null;
    const m = (attr2 + "").match(reference);
    return m ? makeInstance(m[1]) : null;
  }
  // Get parent document
  root() {
    const p = this.parent(getClass(root));
    return p && p.root();
  }
  // set given data to the elements data property
  setData(o) {
    this.dom = o;
    return this;
  }
  // Set element size to given width and height
  size(width2, height2) {
    const p = proportionalSize(this, width2, height2);
    return this.width(new SVGNumber(p.width)).height(new SVGNumber(p.height));
  }
  // Set width of element
  width(width2) {
    return this.attr("width", width2);
  }
  // write svgjs data to the dom
  writeDataToDom() {
    this.node.removeAttribute("svgjs:data");
    if (Object.keys(this.dom).length) {
      this.node.setAttribute("svgjs:data", JSON.stringify(this.dom));
    }
    return super.writeDataToDom();
  }
  // Move over x-axis
  x(x2) {
    return this.attr("x", x2);
  }
  // Move over y-axis
  y(y2) {
    return this.attr("y", y2);
  }
}
extend(Element, {
  bbox,
  rbox,
  inside,
  point,
  ctm,
  screenCTM
});
register(Element, "Element");
const sugar = {
  stroke: ["color", "width", "opacity", "linecap", "linejoin", "miterlimit", "dasharray", "dashoffset"],
  fill: ["color", "opacity", "rule"],
  prefix: function(t, a) {
    return a === "color" ? t : t + "-" + a;
  }
};
["fill", "stroke"].forEach(function(m) {
  const extension = {};
  let i;
  extension[m] = function(o) {
    if (typeof o === "undefined") {
      return this.attr(m);
    }
    if (typeof o === "string" || o instanceof Color || Color.isRgb(o) || o instanceof Element) {
      this.attr(m, o);
    } else {
      for (i = sugar[m].length - 1; i >= 0; i--) {
        if (o[sugar[m][i]] != null) {
          this.attr(sugar.prefix(m, sugar[m][i]), o[sugar[m][i]]);
        }
      }
    }
    return this;
  };
  registerMethods(["Element", "Runner"], extension);
});
registerMethods(["Element", "Runner"], {
  // Let the user set the matrix directly
  matrix: function(mat, b, c, d, e, f) {
    if (mat == null) {
      return new Matrix(this);
    }
    return this.attr("transform", new Matrix(mat, b, c, d, e, f));
  },
  // Map rotation to transform
  rotate: function(angle, cx2, cy2) {
    return this.transform({
      rotate: angle,
      ox: cx2,
      oy: cy2
    }, true);
  },
  // Map skew to transform
  skew: function(x2, y2, cx2, cy2) {
    return arguments.length === 1 || arguments.length === 3 ? this.transform({
      skew: x2,
      ox: y2,
      oy: cx2
    }, true) : this.transform({
      skew: [x2, y2],
      ox: cx2,
      oy: cy2
    }, true);
  },
  shear: function(lam, cx2, cy2) {
    return this.transform({
      shear: lam,
      ox: cx2,
      oy: cy2
    }, true);
  },
  // Map scale to transform
  scale: function(x2, y2, cx2, cy2) {
    return arguments.length === 1 || arguments.length === 3 ? this.transform({
      scale: x2,
      ox: y2,
      oy: cx2
    }, true) : this.transform({
      scale: [x2, y2],
      ox: cx2,
      oy: cy2
    }, true);
  },
  // Map translate to transform
  translate: function(x2, y2) {
    return this.transform({
      translate: [x2, y2]
    }, true);
  },
  // Map relative translations to transform
  relative: function(x2, y2) {
    return this.transform({
      relative: [x2, y2]
    }, true);
  },
  // Map flip to transform
  flip: function(direction = "both", origin = "center") {
    if ("xybothtrue".indexOf(direction) === -1) {
      origin = direction;
      direction = "both";
    }
    return this.transform({
      flip: direction,
      origin
    }, true);
  },
  // Opacity
  opacity: function(value) {
    return this.attr("opacity", value);
  }
});
registerMethods("radius", {
  // Add x and y radius
  radius: function(x2, y2 = x2) {
    const type = (this._element || this).type;
    return type === "radialGradient" ? this.attr("r", new SVGNumber(x2)) : this.rx(x2).ry(y2);
  }
});
registerMethods("Path", {
  // Get path length
  length: function() {
    return this.node.getTotalLength();
  },
  // Get point at length
  pointAt: function(length2) {
    return new Point(this.node.getPointAtLength(length2));
  }
});
registerMethods(["Element", "Runner"], {
  // Set font
  font: function(a, v) {
    if (typeof a === "object") {
      for (v in a) this.font(v, a[v]);
      return this;
    }
    return a === "leading" ? this.leading(v) : a === "anchor" ? this.attr("text-anchor", v) : a === "size" || a === "family" || a === "weight" || a === "stretch" || a === "variant" || a === "style" ? this.attr("font-" + a, v) : this.attr(a, v);
  }
});
const methods = ["click", "dblclick", "mousedown", "mouseup", "mouseover", "mouseout", "mousemove", "mouseenter", "mouseleave", "touchstart", "touchmove", "touchleave", "touchend", "touchcancel"].reduce(function(last, event) {
  const fn = function(f) {
    if (f === null) {
      this.off(event);
    } else {
      this.on(event, f);
    }
    return this;
  };
  last[event] = fn;
  return last;
}, {});
registerMethods("Element", methods);
function untransform() {
  return this.attr("transform", null);
}
function matrixify() {
  const matrix = (this.attr("transform") || "").split(transforms).slice(0, -1).map(function(str) {
    const kv = str.trim().split("(");
    return [kv[0], kv[1].split(delimiter).map(function(str2) {
      return parseFloat(str2);
    })];
  }).reverse().reduce(function(matrix2, transform2) {
    if (transform2[0] === "matrix") {
      return matrix2.lmultiply(Matrix.fromArray(transform2[1]));
    }
    return matrix2[transform2[0]].apply(matrix2, transform2[1]);
  }, new Matrix());
  return matrix;
}
function toParent(parent, i) {
  if (this === parent) return this;
  const ctm2 = this.screenCTM();
  const pCtm = parent.screenCTM().inverse();
  this.addTo(parent, i).untransform().transform(pCtm.multiply(ctm2));
  return this;
}
function toRoot(i) {
  return this.toParent(this.root(), i);
}
function transform(o, relative) {
  if (o == null || typeof o === "string") {
    const decomposed = new Matrix(this).decompose();
    return o == null ? decomposed : decomposed[o];
  }
  if (!Matrix.isMatrixLike(o)) {
    o = {
      ...o,
      origin: getOrigin(o, this)
    };
  }
  const cleanRelative = relative === true ? this : relative || false;
  const result = new Matrix(cleanRelative).transform(o);
  return this.attr("transform", result);
}
registerMethods("Element", {
  untransform,
  matrixify,
  toParent,
  toRoot,
  transform
});
class Container extends Element {
  flatten(parent = this, index) {
    this.each(function() {
      if (this instanceof Container) {
        return this.flatten().ungroup();
      }
    });
    return this;
  }
  ungroup(parent = this.parent(), index = parent.index(this)) {
    index = index === -1 ? parent.children().length : index;
    this.each(function(i, children) {
      return children[children.length - i - 1].toParent(parent, index);
    });
    return this.remove();
  }
}
register(Container, "Container");
class Defs extends Container {
  constructor(node, attrs2 = node) {
    super(nodeOrNew("defs", node), attrs2);
  }
  flatten() {
    return this;
  }
  ungroup() {
    return this;
  }
}
register(Defs, "Defs");
let Shape$1 = class Shape extends Element {
};
register(Shape$1, "Shape");
function rx(rx2) {
  return this.attr("rx", rx2);
}
function ry(ry2) {
  return this.attr("ry", ry2);
}
function x$3(x2) {
  return x2 == null ? this.cx() - this.rx() : this.cx(x2 + this.rx());
}
function y$3(y2) {
  return y2 == null ? this.cy() - this.ry() : this.cy(y2 + this.ry());
}
function cx$1(x2) {
  return this.attr("cx", x2);
}
function cy$1(y2) {
  return this.attr("cy", y2);
}
function width$2(width2) {
  return width2 == null ? this.rx() * 2 : this.rx(new SVGNumber(width2).divide(2));
}
function height$2(height2) {
  return height2 == null ? this.ry() * 2 : this.ry(new SVGNumber(height2).divide(2));
}
var circled = {
  __proto__: null,
  rx,
  ry,
  x: x$3,
  y: y$3,
  cx: cx$1,
  cy: cy$1,
  width: width$2,
  height: height$2
};
class Ellipse extends Shape$1 {
  constructor(node, attrs2 = node) {
    super(nodeOrNew("ellipse", node), attrs2);
  }
  size(width2, height2) {
    const p = proportionalSize(this, width2, height2);
    return this.rx(new SVGNumber(p.width).divide(2)).ry(new SVGNumber(p.height).divide(2));
  }
}
extend(Ellipse, circled);
registerMethods("Container", {
  // Create an ellipse
  ellipse: wrapWithAttrCheck(function(width2 = 0, height2 = width2) {
    return this.put(new Ellipse()).size(width2, height2).move(0, 0);
  })
});
register(Ellipse, "Ellipse");
class Fragment extends Dom {
  constructor(node = globals.document.createDocumentFragment()) {
    super(node);
  }
  // Import / Export raw xml
  xml(xmlOrFn, outerXML, ns) {
    if (typeof xmlOrFn === "boolean") {
      ns = outerXML;
      outerXML = xmlOrFn;
      xmlOrFn = null;
    }
    if (xmlOrFn == null || typeof xmlOrFn === "function") {
      const wrapper = new Dom(create("wrapper", ns));
      wrapper.add(this.node.cloneNode(true));
      return wrapper.xml(false, ns);
    }
    return super.xml(xmlOrFn, false, ns);
  }
}
register(Fragment, "Fragment");
function from(x2, y2) {
  return (this._element || this).type === "radialGradient" ? this.attr({
    fx: new SVGNumber(x2),
    fy: new SVGNumber(y2)
  }) : this.attr({
    x1: new SVGNumber(x2),
    y1: new SVGNumber(y2)
  });
}
function to(x2, y2) {
  return (this._element || this).type === "radialGradient" ? this.attr({
    cx: new SVGNumber(x2),
    cy: new SVGNumber(y2)
  }) : this.attr({
    x2: new SVGNumber(x2),
    y2: new SVGNumber(y2)
  });
}
var gradiented = {
  __proto__: null,
  from,
  to
};
class Gradient extends Container {
  constructor(type, attrs2) {
    super(nodeOrNew(type + "Gradient", typeof type === "string" ? null : type), attrs2);
  }
  // custom attr to handle transform
  attr(a, b, c) {
    if (a === "transform") a = "gradientTransform";
    return super.attr(a, b, c);
  }
  bbox() {
    return new Box();
  }
  targets() {
    return baseFind("svg [fill*=" + this.id() + "]");
  }
  // Alias string conversion to fill
  toString() {
    return this.url();
  }
  // Update gradient
  update(block) {
    this.clear();
    if (typeof block === "function") {
      block.call(this, this);
    }
    return this;
  }
  // Return the fill id
  url() {
    return "url(#" + this.id() + ")";
  }
}
extend(Gradient, gradiented);
registerMethods({
  Container: {
    // Create gradient element in defs
    gradient(...args) {
      return this.defs().gradient(...args);
    }
  },
  // define gradient
  Defs: {
    gradient: wrapWithAttrCheck(function(type, block) {
      return this.put(new Gradient(type)).update(block);
    })
  }
});
register(Gradient, "Gradient");
class Pattern extends Container {
  // Initialize node
  constructor(node, attrs2 = node) {
    super(nodeOrNew("pattern", node), attrs2);
  }
  // custom attr to handle transform
  attr(a, b, c) {
    if (a === "transform") a = "patternTransform";
    return super.attr(a, b, c);
  }
  bbox() {
    return new Box();
  }
  targets() {
    return baseFind("svg [fill*=" + this.id() + "]");
  }
  // Alias string conversion to fill
  toString() {
    return this.url();
  }
  // Update pattern by rebuilding
  update(block) {
    this.clear();
    if (typeof block === "function") {
      block.call(this, this);
    }
    return this;
  }
  // Return the fill id
  url() {
    return "url(#" + this.id() + ")";
  }
}
registerMethods({
  Container: {
    // Create pattern element in defs
    pattern(...args) {
      return this.defs().pattern(...args);
    }
  },
  Defs: {
    pattern: wrapWithAttrCheck(function(width2, height2, block) {
      return this.put(new Pattern()).update(block).attr({
        x: 0,
        y: 0,
        width: width2,
        height: height2,
        patternUnits: "userSpaceOnUse"
      });
    })
  }
});
register(Pattern, "Pattern");
let Image$1 = class Image2 extends Shape$1 {
  constructor(node, attrs2 = node) {
    super(nodeOrNew("image", node), attrs2);
  }
  // (re)load image
  load(url, callback) {
    if (!url) return this;
    const img = new globals.window.Image();
    on(img, "load", function(e) {
      const p = this.parent(Pattern);
      if (this.width() === 0 && this.height() === 0) {
        this.size(img.width, img.height);
      }
      if (p instanceof Pattern) {
        if (p.width() === 0 && p.height() === 0) {
          p.size(this.width(), this.height());
        }
      }
      if (typeof callback === "function") {
        callback.call(this, e);
      }
    }, this);
    on(img, "load error", function() {
      off(img);
    });
    return this.attr("href", img.src = url, xlink);
  }
};
registerAttrHook(function(attr2, val, _this) {
  if (attr2 === "fill" || attr2 === "stroke") {
    if (isImage.test(val)) {
      val = _this.root().defs().image(val);
    }
  }
  if (val instanceof Image$1) {
    val = _this.root().defs().pattern(0, 0, (pattern) => {
      pattern.add(val);
    });
  }
  return val;
});
registerMethods({
  Container: {
    // create image element, load image and set its size
    image: wrapWithAttrCheck(function(source, callback) {
      return this.put(new Image$1()).size(0, 0).load(source, callback);
    })
  }
});
register(Image$1, "Image");
class PointArray extends SVGArray {
  // Get bounding box of points
  bbox() {
    let maxX = -Infinity;
    let maxY = -Infinity;
    let minX = Infinity;
    let minY = Infinity;
    this.forEach(function(el) {
      maxX = Math.max(el[0], maxX);
      maxY = Math.max(el[1], maxY);
      minX = Math.min(el[0], minX);
      minY = Math.min(el[1], minY);
    });
    return new Box(minX, minY, maxX - minX, maxY - minY);
  }
  // Move point string
  move(x2, y2) {
    const box = this.bbox();
    x2 -= box.x;
    y2 -= box.y;
    if (!isNaN(x2) && !isNaN(y2)) {
      for (let i = this.length - 1; i >= 0; i--) {
        this[i] = [this[i][0] + x2, this[i][1] + y2];
      }
    }
    return this;
  }
  // Parse point string and flat array
  parse(array2 = [0, 0]) {
    const points = [];
    if (array2 instanceof Array) {
      array2 = Array.prototype.concat.apply([], array2);
    } else {
      array2 = array2.trim().split(delimiter).map(parseFloat);
    }
    if (array2.length % 2 !== 0) array2.pop();
    for (let i = 0, len = array2.length; i < len; i = i + 2) {
      points.push([array2[i], array2[i + 1]]);
    }
    return points;
  }
  // Resize poly string
  size(width2, height2) {
    let i;
    const box = this.bbox();
    for (i = this.length - 1; i >= 0; i--) {
      if (box.width) this[i][0] = (this[i][0] - box.x) * width2 / box.width + box.x;
      if (box.height) this[i][1] = (this[i][1] - box.y) * height2 / box.height + box.y;
    }
    return this;
  }
  // Convert array to line object
  toLine() {
    return {
      x1: this[0][0],
      y1: this[0][1],
      x2: this[1][0],
      y2: this[1][1]
    };
  }
  // Convert array to string
  toString() {
    const array2 = [];
    for (let i = 0, il = this.length; i < il; i++) {
      array2.push(this[i].join(","));
    }
    return array2.join(" ");
  }
  transform(m) {
    return this.clone().transformO(m);
  }
  // transform points with matrix (similar to Point.transform)
  transformO(m) {
    if (!Matrix.isMatrixLike(m)) {
      m = new Matrix(m);
    }
    for (let i = this.length; i--; ) {
      const [x2, y2] = this[i];
      this[i][0] = m.a * x2 + m.c * y2 + m.e;
      this[i][1] = m.b * x2 + m.d * y2 + m.f;
    }
    return this;
  }
}
const MorphArray = PointArray;
function x$2(x2) {
  return x2 == null ? this.bbox().x : this.move(x2, this.bbox().y);
}
function y$2(y2) {
  return y2 == null ? this.bbox().y : this.move(this.bbox().x, y2);
}
function width$1(width2) {
  const b = this.bbox();
  return width2 == null ? b.width : this.size(width2, b.height);
}
function height$1(height2) {
  const b = this.bbox();
  return height2 == null ? b.height : this.size(b.width, height2);
}
var pointed = {
  __proto__: null,
  MorphArray,
  x: x$2,
  y: y$2,
  width: width$1,
  height: height$1
};
class Line extends Shape$1 {
  // Initialize node
  constructor(node, attrs2 = node) {
    super(nodeOrNew("line", node), attrs2);
  }
  // Get array
  array() {
    return new PointArray([[this.attr("x1"), this.attr("y1")], [this.attr("x2"), this.attr("y2")]]);
  }
  // Move by left top corner
  move(x2, y2) {
    return this.attr(this.array().move(x2, y2).toLine());
  }
  // Overwrite native plot() method
  plot(x1, y1, x2, y2) {
    if (x1 == null) {
      return this.array();
    } else if (typeof y1 !== "undefined") {
      x1 = {
        x1,
        y1,
        x2,
        y2
      };
    } else {
      x1 = new PointArray(x1).toLine();
    }
    return this.attr(x1);
  }
  // Set element size to given width and height
  size(width2, height2) {
    const p = proportionalSize(this, width2, height2);
    return this.attr(this.array().size(p.width, p.height).toLine());
  }
}
extend(Line, pointed);
registerMethods({
  Container: {
    // Create a line element
    line: wrapWithAttrCheck(function(...args) {
      return Line.prototype.plot.apply(this.put(new Line()), args[0] != null ? args : [0, 0, 0, 0]);
    })
  }
});
register(Line, "Line");
class Marker extends Container {
  // Initialize node
  constructor(node, attrs2 = node) {
    super(nodeOrNew("marker", node), attrs2);
  }
  // Set height of element
  height(height2) {
    return this.attr("markerHeight", height2);
  }
  orient(orient) {
    return this.attr("orient", orient);
  }
  // Set marker refX and refY
  ref(x2, y2) {
    return this.attr("refX", x2).attr("refY", y2);
  }
  // Return the fill id
  toString() {
    return "url(#" + this.id() + ")";
  }
  // Update marker
  update(block) {
    this.clear();
    if (typeof block === "function") {
      block.call(this, this);
    }
    return this;
  }
  // Set width of element
  width(width2) {
    return this.attr("markerWidth", width2);
  }
}
registerMethods({
  Container: {
    marker(...args) {
      return this.defs().marker(...args);
    }
  },
  Defs: {
    // Create marker
    marker: wrapWithAttrCheck(function(width2, height2, block) {
      return this.put(new Marker()).size(width2, height2).ref(width2 / 2, height2 / 2).viewbox(0, 0, width2, height2).attr("orient", "auto").update(block);
    })
  },
  marker: {
    // Create and attach markers
    marker(marker, width2, height2, block) {
      let attr2 = ["marker"];
      if (marker !== "all") attr2.push(marker);
      attr2 = attr2.join("-");
      marker = arguments[1] instanceof Marker ? arguments[1] : this.defs().marker(width2, height2, block);
      return this.attr(attr2, marker);
    }
  }
});
register(Marker, "Marker");
function makeSetterGetter(k, f) {
  return function(v) {
    if (v == null) return this[k];
    this[k] = v;
    if (f) f.call(this);
    return this;
  };
}
const easing = {
  "-": function(pos) {
    return pos;
  },
  "<>": function(pos) {
    return -Math.cos(pos * Math.PI) / 2 + 0.5;
  },
  ">": function(pos) {
    return Math.sin(pos * Math.PI / 2);
  },
  "<": function(pos) {
    return -Math.cos(pos * Math.PI / 2) + 1;
  },
  bezier: function(x1, y1, x2, y2) {
    return function(t) {
      if (t < 0) {
        if (x1 > 0) {
          return y1 / x1 * t;
        } else if (x2 > 0) {
          return y2 / x2 * t;
        } else {
          return 0;
        }
      } else if (t > 1) {
        if (x2 < 1) {
          return (1 - y2) / (1 - x2) * t + (y2 - x2) / (1 - x2);
        } else if (x1 < 1) {
          return (1 - y1) / (1 - x1) * t + (y1 - x1) / (1 - x1);
        } else {
          return 1;
        }
      } else {
        return 3 * t * (1 - t) ** 2 * y1 + 3 * t ** 2 * (1 - t) * y2 + t ** 3;
      }
    };
  },
  // see https://www.w3.org/TR/css-easing-1/#step-timing-function-algo
  steps: function(steps, stepPosition = "end") {
    stepPosition = stepPosition.split("-").reverse()[0];
    let jumps = steps;
    if (stepPosition === "none") {
      --jumps;
    } else if (stepPosition === "both") {
      ++jumps;
    }
    return (t, beforeFlag = false) => {
      let step = Math.floor(t * steps);
      const jumping = t * step % 1 === 0;
      if (stepPosition === "start" || stepPosition === "both") {
        ++step;
      }
      if (beforeFlag && jumping) {
        --step;
      }
      if (t >= 0 && step < 0) {
        step = 0;
      }
      if (t <= 1 && step > jumps) {
        step = jumps;
      }
      return step / jumps;
    };
  }
};
class Stepper {
  done() {
    return false;
  }
}
class Ease extends Stepper {
  constructor(fn = timeline.ease) {
    super();
    this.ease = easing[fn] || fn;
  }
  step(from2, to2, pos) {
    if (typeof from2 !== "number") {
      return pos < 1 ? from2 : to2;
    }
    return from2 + (to2 - from2) * this.ease(pos);
  }
}
class Controller extends Stepper {
  constructor(fn) {
    super();
    this.stepper = fn;
  }
  done(c) {
    return c.done;
  }
  step(current, target, dt, c) {
    return this.stepper(current, target, dt, c);
  }
}
function recalculate() {
  const duration = (this._duration || 500) / 1e3;
  const overshoot = this._overshoot || 0;
  const eps = 1e-10;
  const pi = Math.PI;
  const os = Math.log(overshoot / 100 + eps);
  const zeta = -os / Math.sqrt(pi * pi + os * os);
  const wn = 3.9 / (zeta * duration);
  this.d = 2 * zeta * wn;
  this.k = wn * wn;
}
class Spring extends Controller {
  constructor(duration = 500, overshoot = 0) {
    super();
    this.duration(duration).overshoot(overshoot);
  }
  step(current, target, dt, c) {
    if (typeof current === "string") return current;
    c.done = dt === Infinity;
    if (dt === Infinity) return target;
    if (dt === 0) return current;
    if (dt > 100) dt = 16;
    dt /= 1e3;
    const velocity = c.velocity || 0;
    const acceleration = -this.d * velocity - this.k * (current - target);
    const newPosition = current + velocity * dt + acceleration * dt * dt / 2;
    c.velocity = velocity + acceleration * dt;
    c.done = Math.abs(target - newPosition) + Math.abs(velocity) < 2e-3;
    return c.done ? target : newPosition;
  }
}
extend(Spring, {
  duration: makeSetterGetter("_duration", recalculate),
  overshoot: makeSetterGetter("_overshoot", recalculate)
});
class PID extends Controller {
  constructor(p = 0.1, i = 0.01, d = 0, windup = 1e3) {
    super();
    this.p(p).i(i).d(d).windup(windup);
  }
  step(current, target, dt, c) {
    if (typeof current === "string") return current;
    c.done = dt === Infinity;
    if (dt === Infinity) return target;
    if (dt === 0) return current;
    const p = target - current;
    let i = (c.integral || 0) + p * dt;
    const d = (p - (c.error || 0)) / dt;
    const windup = this._windup;
    if (windup !== false) {
      i = Math.max(-windup, Math.min(i, windup));
    }
    c.error = p;
    c.integral = i;
    c.done = Math.abs(p) < 1e-3;
    return c.done ? target : current + (this.P * p + this.I * i + this.D * d);
  }
}
extend(PID, {
  windup: makeSetterGetter("_windup"),
  p: makeSetterGetter("P"),
  i: makeSetterGetter("I"),
  d: makeSetterGetter("D")
});
const segmentParameters = {
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  A: 7,
  Z: 0
};
const pathHandlers = {
  M: function(c, p, p0) {
    p.x = p0.x = c[0];
    p.y = p0.y = c[1];
    return ["M", p.x, p.y];
  },
  L: function(c, p) {
    p.x = c[0];
    p.y = c[1];
    return ["L", c[0], c[1]];
  },
  H: function(c, p) {
    p.x = c[0];
    return ["H", c[0]];
  },
  V: function(c, p) {
    p.y = c[0];
    return ["V", c[0]];
  },
  C: function(c, p) {
    p.x = c[4];
    p.y = c[5];
    return ["C", c[0], c[1], c[2], c[3], c[4], c[5]];
  },
  S: function(c, p) {
    p.x = c[2];
    p.y = c[3];
    return ["S", c[0], c[1], c[2], c[3]];
  },
  Q: function(c, p) {
    p.x = c[2];
    p.y = c[3];
    return ["Q", c[0], c[1], c[2], c[3]];
  },
  T: function(c, p) {
    p.x = c[0];
    p.y = c[1];
    return ["T", c[0], c[1]];
  },
  Z: function(c, p, p0) {
    p.x = p0.x;
    p.y = p0.y;
    return ["Z"];
  },
  A: function(c, p) {
    p.x = c[5];
    p.y = c[6];
    return ["A", c[0], c[1], c[2], c[3], c[4], c[5], c[6]];
  }
};
const mlhvqtcsaz = "mlhvqtcsaz".split("");
for (let i = 0, il = mlhvqtcsaz.length; i < il; ++i) {
  pathHandlers[mlhvqtcsaz[i]] = /* @__PURE__ */ (function(i2) {
    return function(c, p, p0) {
      if (i2 === "H") c[0] = c[0] + p.x;
      else if (i2 === "V") c[0] = c[0] + p.y;
      else if (i2 === "A") {
        c[5] = c[5] + p.x;
        c[6] = c[6] + p.y;
      } else {
        for (let j = 0, jl = c.length; j < jl; ++j) {
          c[j] = c[j] + (j % 2 ? p.y : p.x);
        }
      }
      return pathHandlers[i2](c, p, p0);
    };
  })(mlhvqtcsaz[i].toUpperCase());
}
function makeAbsolut(parser2) {
  const command = parser2.segment[0];
  return pathHandlers[command](parser2.segment.slice(1), parser2.p, parser2.p0);
}
function segmentComplete(parser2) {
  return parser2.segment.length && parser2.segment.length - 1 === segmentParameters[parser2.segment[0].toUpperCase()];
}
function startNewSegment(parser2, token) {
  parser2.inNumber && finalizeNumber(parser2, false);
  const pathLetter = isPathLetter.test(token);
  if (pathLetter) {
    parser2.segment = [token];
  } else {
    const lastCommand = parser2.lastCommand;
    const small = lastCommand.toLowerCase();
    const isSmall = lastCommand === small;
    parser2.segment = [small === "m" ? isSmall ? "l" : "L" : lastCommand];
  }
  parser2.inSegment = true;
  parser2.lastCommand = parser2.segment[0];
  return pathLetter;
}
function finalizeNumber(parser2, inNumber) {
  if (!parser2.inNumber) throw new Error("Parser Error");
  parser2.number && parser2.segment.push(parseFloat(parser2.number));
  parser2.inNumber = inNumber;
  parser2.number = "";
  parser2.pointSeen = false;
  parser2.hasExponent = false;
  if (segmentComplete(parser2)) {
    finalizeSegment(parser2);
  }
}
function finalizeSegment(parser2) {
  parser2.inSegment = false;
  if (parser2.absolute) {
    parser2.segment = makeAbsolut(parser2);
  }
  parser2.segments.push(parser2.segment);
}
function isArcFlag(parser2) {
  if (!parser2.segment.length) return false;
  const isArc = parser2.segment[0].toUpperCase() === "A";
  const length2 = parser2.segment.length;
  return isArc && (length2 === 4 || length2 === 5);
}
function isExponential(parser2) {
  return parser2.lastToken.toUpperCase() === "E";
}
function pathParser(d, toAbsolute = true) {
  let index = 0;
  let token = "";
  const parser2 = {
    segment: [],
    inNumber: false,
    number: "",
    lastToken: "",
    inSegment: false,
    segments: [],
    pointSeen: false,
    hasExponent: false,
    absolute: toAbsolute,
    p0: new Point(),
    p: new Point()
  };
  while (parser2.lastToken = token, token = d.charAt(index++)) {
    if (!parser2.inSegment) {
      if (startNewSegment(parser2, token)) {
        continue;
      }
    }
    if (token === ".") {
      if (parser2.pointSeen || parser2.hasExponent) {
        finalizeNumber(parser2, false);
        --index;
        continue;
      }
      parser2.inNumber = true;
      parser2.pointSeen = true;
      parser2.number += token;
      continue;
    }
    if (!isNaN(parseInt(token))) {
      if (parser2.number === "0" || isArcFlag(parser2)) {
        parser2.inNumber = true;
        parser2.number = token;
        finalizeNumber(parser2, true);
        continue;
      }
      parser2.inNumber = true;
      parser2.number += token;
      continue;
    }
    if (token === " " || token === ",") {
      if (parser2.inNumber) {
        finalizeNumber(parser2, false);
      }
      continue;
    }
    if (token === "-") {
      if (parser2.inNumber && !isExponential(parser2)) {
        finalizeNumber(parser2, false);
        --index;
        continue;
      }
      parser2.number += token;
      parser2.inNumber = true;
      continue;
    }
    if (token.toUpperCase() === "E") {
      parser2.number += token;
      parser2.hasExponent = true;
      continue;
    }
    if (isPathLetter.test(token)) {
      if (parser2.inNumber) {
        finalizeNumber(parser2, false);
      } else if (!segmentComplete(parser2)) {
        throw new Error("parser Error");
      } else {
        finalizeSegment(parser2);
      }
      --index;
    }
  }
  if (parser2.inNumber) {
    finalizeNumber(parser2, false);
  }
  if (parser2.inSegment && segmentComplete(parser2)) {
    finalizeSegment(parser2);
  }
  return parser2.segments;
}
function arrayToString(a) {
  let s = "";
  for (let i = 0, il = a.length; i < il; i++) {
    s += a[i][0];
    if (a[i][1] != null) {
      s += a[i][1];
      if (a[i][2] != null) {
        s += " ";
        s += a[i][2];
        if (a[i][3] != null) {
          s += " ";
          s += a[i][3];
          s += " ";
          s += a[i][4];
          if (a[i][5] != null) {
            s += " ";
            s += a[i][5];
            s += " ";
            s += a[i][6];
            if (a[i][7] != null) {
              s += " ";
              s += a[i][7];
            }
          }
        }
      }
    }
  }
  return s + " ";
}
class PathArray extends SVGArray {
  // Get bounding box of path
  bbox() {
    parser().path.setAttribute("d", this.toString());
    return new Box(parser.nodes.path.getBBox());
  }
  // Move path string
  move(x2, y2) {
    const box = this.bbox();
    x2 -= box.x;
    y2 -= box.y;
    if (!isNaN(x2) && !isNaN(y2)) {
      for (let l, i = this.length - 1; i >= 0; i--) {
        l = this[i][0];
        if (l === "M" || l === "L" || l === "T") {
          this[i][1] += x2;
          this[i][2] += y2;
        } else if (l === "H") {
          this[i][1] += x2;
        } else if (l === "V") {
          this[i][1] += y2;
        } else if (l === "C" || l === "S" || l === "Q") {
          this[i][1] += x2;
          this[i][2] += y2;
          this[i][3] += x2;
          this[i][4] += y2;
          if (l === "C") {
            this[i][5] += x2;
            this[i][6] += y2;
          }
        } else if (l === "A") {
          this[i][6] += x2;
          this[i][7] += y2;
        }
      }
    }
    return this;
  }
  // Absolutize and parse path to array
  parse(d = "M0 0") {
    if (Array.isArray(d)) {
      d = Array.prototype.concat.apply([], d).toString();
    }
    return pathParser(d);
  }
  // Resize path string
  size(width2, height2) {
    const box = this.bbox();
    let i, l;
    box.width = box.width === 0 ? 1 : box.width;
    box.height = box.height === 0 ? 1 : box.height;
    for (i = this.length - 1; i >= 0; i--) {
      l = this[i][0];
      if (l === "M" || l === "L" || l === "T") {
        this[i][1] = (this[i][1] - box.x) * width2 / box.width + box.x;
        this[i][2] = (this[i][2] - box.y) * height2 / box.height + box.y;
      } else if (l === "H") {
        this[i][1] = (this[i][1] - box.x) * width2 / box.width + box.x;
      } else if (l === "V") {
        this[i][1] = (this[i][1] - box.y) * height2 / box.height + box.y;
      } else if (l === "C" || l === "S" || l === "Q") {
        this[i][1] = (this[i][1] - box.x) * width2 / box.width + box.x;
        this[i][2] = (this[i][2] - box.y) * height2 / box.height + box.y;
        this[i][3] = (this[i][3] - box.x) * width2 / box.width + box.x;
        this[i][4] = (this[i][4] - box.y) * height2 / box.height + box.y;
        if (l === "C") {
          this[i][5] = (this[i][5] - box.x) * width2 / box.width + box.x;
          this[i][6] = (this[i][6] - box.y) * height2 / box.height + box.y;
        }
      } else if (l === "A") {
        this[i][1] = this[i][1] * width2 / box.width;
        this[i][2] = this[i][2] * height2 / box.height;
        this[i][6] = (this[i][6] - box.x) * width2 / box.width + box.x;
        this[i][7] = (this[i][7] - box.y) * height2 / box.height + box.y;
      }
    }
    return this;
  }
  // Convert array to string
  toString() {
    return arrayToString(this);
  }
}
const getClassForType = (value) => {
  const type = typeof value;
  if (type === "number") {
    return SVGNumber;
  } else if (type === "string") {
    if (Color.isColor(value)) {
      return Color;
    } else if (delimiter.test(value)) {
      return isPathLetter.test(value) ? PathArray : SVGArray;
    } else if (numberAndUnit.test(value)) {
      return SVGNumber;
    } else {
      return NonMorphable;
    }
  } else if (morphableTypes.indexOf(value.constructor) > -1) {
    return value.constructor;
  } else if (Array.isArray(value)) {
    return SVGArray;
  } else if (type === "object") {
    return ObjectBag;
  } else {
    return NonMorphable;
  }
};
class Morphable {
  constructor(stepper) {
    this._stepper = stepper || new Ease("-");
    this._from = null;
    this._to = null;
    this._type = null;
    this._context = null;
    this._morphObj = null;
  }
  at(pos) {
    return this._morphObj.morph(this._from, this._to, pos, this._stepper, this._context);
  }
  done() {
    const complete = this._context.map(this._stepper.done).reduce(function(last, curr) {
      return last && curr;
    }, true);
    return complete;
  }
  from(val) {
    if (val == null) {
      return this._from;
    }
    this._from = this._set(val);
    return this;
  }
  stepper(stepper) {
    if (stepper == null) return this._stepper;
    this._stepper = stepper;
    return this;
  }
  to(val) {
    if (val == null) {
      return this._to;
    }
    this._to = this._set(val);
    return this;
  }
  type(type) {
    if (type == null) {
      return this._type;
    }
    this._type = type;
    return this;
  }
  _set(value) {
    if (!this._type) {
      this.type(getClassForType(value));
    }
    let result = new this._type(value);
    if (this._type === Color) {
      result = this._to ? result[this._to[4]]() : this._from ? result[this._from[4]]() : result;
    }
    if (this._type === ObjectBag) {
      result = this._to ? result.align(this._to) : this._from ? result.align(this._from) : result;
    }
    result = result.toConsumable();
    this._morphObj = this._morphObj || new this._type();
    this._context = this._context || Array.apply(null, Array(result.length)).map(Object).map(function(o) {
      o.done = true;
      return o;
    });
    return result;
  }
}
class NonMorphable {
  constructor(...args) {
    this.init(...args);
  }
  init(val) {
    val = Array.isArray(val) ? val[0] : val;
    this.value = val;
    return this;
  }
  toArray() {
    return [this.value];
  }
  valueOf() {
    return this.value;
  }
}
class TransformBag {
  constructor(...args) {
    this.init(...args);
  }
  init(obj) {
    if (Array.isArray(obj)) {
      obj = {
        scaleX: obj[0],
        scaleY: obj[1],
        shear: obj[2],
        rotate: obj[3],
        translateX: obj[4],
        translateY: obj[5],
        originX: obj[6],
        originY: obj[7]
      };
    }
    Object.assign(this, TransformBag.defaults, obj);
    return this;
  }
  toArray() {
    const v = this;
    return [v.scaleX, v.scaleY, v.shear, v.rotate, v.translateX, v.translateY, v.originX, v.originY];
  }
}
TransformBag.defaults = {
  scaleX: 1,
  scaleY: 1,
  shear: 0,
  rotate: 0,
  translateX: 0,
  translateY: 0,
  originX: 0,
  originY: 0
};
const sortByKey = (a, b) => {
  return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
};
class ObjectBag {
  constructor(...args) {
    this.init(...args);
  }
  align(other) {
    const values = this.values;
    for (let i = 0, il = values.length; i < il; ++i) {
      if (values[i + 1] === other[i + 1]) {
        if (values[i + 1] === Color && other[i + 7] !== values[i + 7]) {
          const space = other[i + 7];
          const color = new Color(this.values.splice(i + 3, 5))[space]().toArray();
          this.values.splice(i + 3, 0, ...color);
        }
        i += values[i + 2] + 2;
        continue;
      }
      if (!other[i + 1]) {
        return this;
      }
      const defaultObject = new other[i + 1]().toArray();
      const toDelete = values[i + 2] + 3;
      values.splice(i, toDelete, other[i], other[i + 1], other[i + 2], ...defaultObject);
      i += values[i + 2] + 2;
    }
    return this;
  }
  init(objOrArr) {
    this.values = [];
    if (Array.isArray(objOrArr)) {
      this.values = objOrArr.slice();
      return;
    }
    objOrArr = objOrArr || {};
    const entries = [];
    for (const i in objOrArr) {
      const Type = getClassForType(objOrArr[i]);
      const val = new Type(objOrArr[i]).toArray();
      entries.push([i, Type, val.length, ...val]);
    }
    entries.sort(sortByKey);
    this.values = entries.reduce((last, curr) => last.concat(curr), []);
    return this;
  }
  toArray() {
    return this.values;
  }
  valueOf() {
    const obj = {};
    const arr = this.values;
    while (arr.length) {
      const key = arr.shift();
      const Type = arr.shift();
      const num = arr.shift();
      const values = arr.splice(0, num);
      obj[key] = new Type(values);
    }
    return obj;
  }
}
const morphableTypes = [NonMorphable, TransformBag, ObjectBag];
function registerMorphableType(type = []) {
  morphableTypes.push(...[].concat(type));
}
function makeMorphable() {
  extend(morphableTypes, {
    to(val) {
      return new Morphable().type(this.constructor).from(this.toArray()).to(val);
    },
    fromArray(arr) {
      this.init(arr);
      return this;
    },
    toConsumable() {
      return this.toArray();
    },
    morph(from2, to2, pos, stepper, context) {
      const mapper = function(i, index) {
        return stepper.step(i, to2[index], pos, context[index], context);
      };
      return this.fromArray(from2.map(mapper));
    }
  });
}
class Path extends Shape$1 {
  // Initialize node
  constructor(node, attrs2 = node) {
    super(nodeOrNew("path", node), attrs2);
  }
  // Get array
  array() {
    return this._array || (this._array = new PathArray(this.attr("d")));
  }
  // Clear array cache
  clear() {
    delete this._array;
    return this;
  }
  // Set height of element
  height(height2) {
    return height2 == null ? this.bbox().height : this.size(this.bbox().width, height2);
  }
  // Move by left top corner
  move(x2, y2) {
    return this.attr("d", this.array().move(x2, y2));
  }
  // Plot new path
  plot(d) {
    return d == null ? this.array() : this.clear().attr("d", typeof d === "string" ? d : this._array = new PathArray(d));
  }
  // Set element size to given width and height
  size(width2, height2) {
    const p = proportionalSize(this, width2, height2);
    return this.attr("d", this.array().size(p.width, p.height));
  }
  // Set width of element
  width(width2) {
    return width2 == null ? this.bbox().width : this.size(width2, this.bbox().height);
  }
  // Move by left top corner over x-axis
  x(x2) {
    return x2 == null ? this.bbox().x : this.move(x2, this.bbox().y);
  }
  // Move by left top corner over y-axis
  y(y2) {
    return y2 == null ? this.bbox().y : this.move(this.bbox().x, y2);
  }
}
Path.prototype.MorphArray = PathArray;
registerMethods({
  Container: {
    // Create a wrapped path element
    path: wrapWithAttrCheck(function(d) {
      return this.put(new Path()).plot(d || new PathArray());
    })
  }
});
register(Path, "Path");
function array() {
  return this._array || (this._array = new PointArray(this.attr("points")));
}
function clear() {
  delete this._array;
  return this;
}
function move$2(x2, y2) {
  return this.attr("points", this.array().move(x2, y2));
}
function plot(p) {
  return p == null ? this.array() : this.clear().attr("points", typeof p === "string" ? p : this._array = new PointArray(p));
}
function size$1(width2, height2) {
  const p = proportionalSize(this, width2, height2);
  return this.attr("points", this.array().size(p.width, p.height));
}
var poly = {
  __proto__: null,
  array,
  clear,
  move: move$2,
  plot,
  size: size$1
};
class Polygon extends Shape$1 {
  // Initialize node
  constructor(node, attrs2 = node) {
    super(nodeOrNew("polygon", node), attrs2);
  }
}
registerMethods({
  Container: {
    // Create a wrapped polygon element
    polygon: wrapWithAttrCheck(function(p) {
      return this.put(new Polygon()).plot(p || new PointArray());
    })
  }
});
extend(Polygon, pointed);
extend(Polygon, poly);
register(Polygon, "Polygon");
class Polyline extends Shape$1 {
  // Initialize node
  constructor(node, attrs2 = node) {
    super(nodeOrNew("polyline", node), attrs2);
  }
}
registerMethods({
  Container: {
    // Create a wrapped polygon element
    polyline: wrapWithAttrCheck(function(p) {
      return this.put(new Polyline()).plot(p || new PointArray());
    })
  }
});
extend(Polyline, pointed);
extend(Polyline, poly);
register(Polyline, "Polyline");
class Rect extends Shape$1 {
  // Initialize node
  constructor(node, attrs2 = node) {
    super(nodeOrNew("rect", node), attrs2);
  }
}
extend(Rect, {
  rx,
  ry
});
registerMethods({
  Container: {
    // Create a rect element
    rect: wrapWithAttrCheck(function(width2, height2) {
      return this.put(new Rect()).size(width2, height2);
    })
  }
});
register(Rect, "Rect");
class Queue {
  constructor() {
    this._first = null;
    this._last = null;
  }
  // Shows us the first item in the list
  first() {
    return this._first && this._first.value;
  }
  // Shows us the last item in the list
  last() {
    return this._last && this._last.value;
  }
  push(value) {
    const item = typeof value.next !== "undefined" ? value : {
      value,
      next: null,
      prev: null
    };
    if (this._last) {
      item.prev = this._last;
      this._last.next = item;
      this._last = item;
    } else {
      this._last = item;
      this._first = item;
    }
    return item;
  }
  // Removes the item that was returned from the push
  remove(item) {
    if (item.prev) item.prev.next = item.next;
    if (item.next) item.next.prev = item.prev;
    if (item === this._last) this._last = item.prev;
    if (item === this._first) this._first = item.next;
    item.prev = null;
    item.next = null;
  }
  shift() {
    const remove = this._first;
    if (!remove) return null;
    this._first = remove.next;
    if (this._first) this._first.prev = null;
    this._last = this._first ? this._last : null;
    return remove.value;
  }
}
const Animator = {
  nextDraw: null,
  frames: new Queue(),
  timeouts: new Queue(),
  immediates: new Queue(),
  timer: () => globals.window.performance || globals.window.Date,
  transforms: [],
  frame(fn) {
    const node = Animator.frames.push({
      run: fn
    });
    if (Animator.nextDraw === null) {
      Animator.nextDraw = globals.window.requestAnimationFrame(Animator._draw);
    }
    return node;
  },
  timeout(fn, delay) {
    delay = delay || 0;
    const time = Animator.timer().now() + delay;
    const node = Animator.timeouts.push({
      run: fn,
      time
    });
    if (Animator.nextDraw === null) {
      Animator.nextDraw = globals.window.requestAnimationFrame(Animator._draw);
    }
    return node;
  },
  immediate(fn) {
    const node = Animator.immediates.push(fn);
    if (Animator.nextDraw === null) {
      Animator.nextDraw = globals.window.requestAnimationFrame(Animator._draw);
    }
    return node;
  },
  cancelFrame(node) {
    node != null && Animator.frames.remove(node);
  },
  clearTimeout(node) {
    node != null && Animator.timeouts.remove(node);
  },
  cancelImmediate(node) {
    node != null && Animator.immediates.remove(node);
  },
  _draw(now) {
    let nextTimeout = null;
    const lastTimeout = Animator.timeouts.last();
    while (nextTimeout = Animator.timeouts.shift()) {
      if (now >= nextTimeout.time) {
        nextTimeout.run();
      } else {
        Animator.timeouts.push(nextTimeout);
      }
      if (nextTimeout === lastTimeout) break;
    }
    let nextFrame = null;
    const lastFrame = Animator.frames.last();
    while (nextFrame !== lastFrame && (nextFrame = Animator.frames.shift())) {
      nextFrame.run(now);
    }
    let nextImmediate = null;
    while (nextImmediate = Animator.immediates.shift()) {
      nextImmediate();
    }
    Animator.nextDraw = Animator.timeouts.first() || Animator.frames.first() ? globals.window.requestAnimationFrame(Animator._draw) : null;
  }
};
const makeSchedule = function(runnerInfo) {
  const start = runnerInfo.start;
  const duration = runnerInfo.runner.duration();
  const end = start + duration;
  return {
    start,
    duration,
    end,
    runner: runnerInfo.runner
  };
};
const defaultSource = function() {
  const w = globals.window;
  return (w.performance || w.Date).now();
};
let Timeline$1 = class Timeline extends EventTarget {
  // Construct a new timeline on the given element
  constructor(timeSource = defaultSource) {
    super();
    this._timeSource = timeSource;
    this._startTime = 0;
    this._speed = 1;
    this._persist = 0;
    this._nextFrame = null;
    this._paused = true;
    this._runners = [];
    this._runnerIds = [];
    this._lastRunnerId = -1;
    this._time = 0;
    this._lastSourceTime = 0;
    this._lastStepTime = 0;
    this._step = this._stepFn.bind(this, false);
    this._stepImmediate = this._stepFn.bind(this, true);
  }
  active() {
    return !!this._nextFrame;
  }
  finish() {
    this.time(this.getEndTimeOfTimeline() + 1);
    return this.pause();
  }
  // Calculates the end of the timeline
  getEndTime() {
    const lastRunnerInfo = this.getLastRunnerInfo();
    const lastDuration = lastRunnerInfo ? lastRunnerInfo.runner.duration() : 0;
    const lastStartTime = lastRunnerInfo ? lastRunnerInfo.start : this._time;
    return lastStartTime + lastDuration;
  }
  getEndTimeOfTimeline() {
    const endTimes = this._runners.map((i) => i.start + i.runner.duration());
    return Math.max(0, ...endTimes);
  }
  getLastRunnerInfo() {
    return this.getRunnerInfoById(this._lastRunnerId);
  }
  getRunnerInfoById(id) {
    return this._runners[this._runnerIds.indexOf(id)] || null;
  }
  pause() {
    this._paused = true;
    return this._continue();
  }
  persist(dtOrForever) {
    if (dtOrForever == null) return this._persist;
    this._persist = dtOrForever;
    return this;
  }
  play() {
    this._paused = false;
    return this.updateTime()._continue();
  }
  reverse(yes) {
    const currentSpeed = this.speed();
    if (yes == null) return this.speed(-currentSpeed);
    const positive = Math.abs(currentSpeed);
    return this.speed(yes ? -positive : positive);
  }
  // schedules a runner on the timeline
  schedule(runner, delay, when) {
    if (runner == null) {
      return this._runners.map(makeSchedule);
    }
    let absoluteStartTime = 0;
    const endTime = this.getEndTime();
    delay = delay || 0;
    if (when == null || when === "last" || when === "after") {
      absoluteStartTime = endTime;
    } else if (when === "absolute" || when === "start") {
      absoluteStartTime = delay;
      delay = 0;
    } else if (when === "now") {
      absoluteStartTime = this._time;
    } else if (when === "relative") {
      const runnerInfo2 = this.getRunnerInfoById(runner.id);
      if (runnerInfo2) {
        absoluteStartTime = runnerInfo2.start + delay;
        delay = 0;
      }
    } else if (when === "with-last") {
      const lastRunnerInfo = this.getLastRunnerInfo();
      const lastStartTime = lastRunnerInfo ? lastRunnerInfo.start : this._time;
      absoluteStartTime = lastStartTime;
    } else {
      throw new Error('Invalid value for the "when" parameter');
    }
    runner.unschedule();
    runner.timeline(this);
    const persist = runner.persist();
    const runnerInfo = {
      persist: persist === null ? this._persist : persist,
      start: absoluteStartTime + delay,
      runner
    };
    this._lastRunnerId = runner.id;
    this._runners.push(runnerInfo);
    this._runners.sort((a, b) => a.start - b.start);
    this._runnerIds = this._runners.map((info) => info.runner.id);
    this.updateTime()._continue();
    return this;
  }
  seek(dt) {
    return this.time(this._time + dt);
  }
  source(fn) {
    if (fn == null) return this._timeSource;
    this._timeSource = fn;
    return this;
  }
  speed(speed) {
    if (speed == null) return this._speed;
    this._speed = speed;
    return this;
  }
  stop() {
    this.time(0);
    return this.pause();
  }
  time(time) {
    if (time == null) return this._time;
    this._time = time;
    return this._continue(true);
  }
  // Remove the runner from this timeline
  unschedule(runner) {
    const index = this._runnerIds.indexOf(runner.id);
    if (index < 0) return this;
    this._runners.splice(index, 1);
    this._runnerIds.splice(index, 1);
    runner.timeline(null);
    return this;
  }
  // Makes sure, that after pausing the time doesn't jump
  updateTime() {
    if (!this.active()) {
      this._lastSourceTime = this._timeSource();
    }
    return this;
  }
  // Checks if we are running and continues the animation
  _continue(immediateStep = false) {
    Animator.cancelFrame(this._nextFrame);
    this._nextFrame = null;
    if (immediateStep) return this._stepImmediate();
    if (this._paused) return this;
    this._nextFrame = Animator.frame(this._step);
    return this;
  }
  _stepFn(immediateStep = false) {
    const time = this._timeSource();
    let dtSource = time - this._lastSourceTime;
    if (immediateStep) dtSource = 0;
    const dtTime = this._speed * dtSource + (this._time - this._lastStepTime);
    this._lastSourceTime = time;
    if (!immediateStep) {
      this._time += dtTime;
      this._time = this._time < 0 ? 0 : this._time;
    }
    this._lastStepTime = this._time;
    this.fire("time", this._time);
    for (let k = this._runners.length; k--; ) {
      const runnerInfo = this._runners[k];
      const runner = runnerInfo.runner;
      const dtToStart = this._time - runnerInfo.start;
      if (dtToStart <= 0) {
        runner.reset();
      }
    }
    let runnersLeft = false;
    for (let i = 0, len = this._runners.length; i < len; i++) {
      const runnerInfo = this._runners[i];
      const runner = runnerInfo.runner;
      let dt = dtTime;
      const dtToStart = this._time - runnerInfo.start;
      if (dtToStart <= 0) {
        runnersLeft = true;
        continue;
      } else if (dtToStart < dt) {
        dt = dtToStart;
      }
      if (!runner.active()) continue;
      const finished = runner.step(dt).done;
      if (!finished) {
        runnersLeft = true;
      } else if (runnerInfo.persist !== true) {
        const endTime = runner.duration() - runner.time() + this._time;
        if (endTime + runnerInfo.persist < this._time) {
          runner.unschedule();
          --i;
          --len;
        }
      }
    }
    if (runnersLeft && !(this._speed < 0 && this._time === 0) || this._runnerIds.length && this._speed < 0 && this._time > 0) {
      this._continue();
    } else {
      this.pause();
      this.fire("finished");
    }
    return this;
  }
};
registerMethods({
  Element: {
    timeline: function(timeline2) {
      if (timeline2 == null) {
        this._timeline = this._timeline || new Timeline$1();
        return this._timeline;
      } else {
        this._timeline = timeline2;
        return this;
      }
    }
  }
});
class Runner extends EventTarget {
  constructor(options) {
    super();
    this.id = Runner.id++;
    options = options == null ? timeline.duration : options;
    options = typeof options === "function" ? new Controller(options) : options;
    this._element = null;
    this._timeline = null;
    this.done = false;
    this._queue = [];
    this._duration = typeof options === "number" && options;
    this._isDeclarative = options instanceof Controller;
    this._stepper = this._isDeclarative ? options : new Ease();
    this._history = {};
    this.enabled = true;
    this._time = 0;
    this._lastTime = 0;
    this._reseted = true;
    this.transforms = new Matrix();
    this.transformId = 1;
    this._haveReversed = false;
    this._reverse = false;
    this._loopsDone = 0;
    this._swing = false;
    this._wait = 0;
    this._times = 1;
    this._frameId = null;
    this._persist = this._isDeclarative ? true : null;
  }
  static sanitise(duration, delay, when) {
    let times = 1;
    let swing = false;
    let wait = 0;
    duration = duration || timeline.duration;
    delay = delay || timeline.delay;
    when = when || "last";
    if (typeof duration === "object" && !(duration instanceof Stepper)) {
      delay = duration.delay || delay;
      when = duration.when || when;
      swing = duration.swing || swing;
      times = duration.times || times;
      wait = duration.wait || wait;
      duration = duration.duration || timeline.duration;
    }
    return {
      duration,
      delay,
      swing,
      times,
      wait,
      when
    };
  }
  active(enabled) {
    if (enabled == null) return this.enabled;
    this.enabled = enabled;
    return this;
  }
  /*
  Private Methods
  ===============
  Methods that shouldn't be used externally
  */
  addTransform(transform2, index) {
    this.transforms.lmultiplyO(transform2);
    return this;
  }
  after(fn) {
    return this.on("finished", fn);
  }
  animate(duration, delay, when) {
    const o = Runner.sanitise(duration, delay, when);
    const runner = new Runner(o.duration);
    if (this._timeline) runner.timeline(this._timeline);
    if (this._element) runner.element(this._element);
    return runner.loop(o).schedule(o.delay, o.when);
  }
  clearTransform() {
    this.transforms = new Matrix();
    return this;
  }
  // TODO: Keep track of all transformations so that deletion is faster
  clearTransformsFromQueue() {
    if (!this.done || !this._timeline || !this._timeline._runnerIds.includes(this.id)) {
      this._queue = this._queue.filter((item) => {
        return !item.isTransform;
      });
    }
  }
  delay(delay) {
    return this.animate(0, delay);
  }
  duration() {
    return this._times * (this._wait + this._duration) - this._wait;
  }
  during(fn) {
    return this.queue(null, fn);
  }
  ease(fn) {
    this._stepper = new Ease(fn);
    return this;
  }
  /*
  Runner Definitions
  ==================
  These methods help us define the runtime behaviour of the Runner or they
  help us make new runners from the current runner
  */
  element(element) {
    if (element == null) return this._element;
    this._element = element;
    element._prepareRunner();
    return this;
  }
  finish() {
    return this.step(Infinity);
  }
  loop(times, swing, wait) {
    if (typeof times === "object") {
      swing = times.swing;
      wait = times.wait;
      times = times.times;
    }
    this._times = times || Infinity;
    this._swing = swing || false;
    this._wait = wait || 0;
    if (this._times === true) {
      this._times = Infinity;
    }
    return this;
  }
  loops(p) {
    const loopDuration = this._duration + this._wait;
    if (p == null) {
      const loopsDone = Math.floor(this._time / loopDuration);
      const relativeTime = this._time - loopsDone * loopDuration;
      const position2 = relativeTime / this._duration;
      return Math.min(loopsDone + position2, this._times);
    }
    const whole = Math.floor(p);
    const partial = p % 1;
    const time = loopDuration * whole + this._duration * partial;
    return this.time(time);
  }
  persist(dtOrForever) {
    if (dtOrForever == null) return this._persist;
    this._persist = dtOrForever;
    return this;
  }
  position(p) {
    const x2 = this._time;
    const d = this._duration;
    const w = this._wait;
    const t = this._times;
    const s = this._swing;
    const r = this._reverse;
    let position2;
    if (p == null) {
      const f = function(x3) {
        const swinging = s * Math.floor(x3 % (2 * (w + d)) / (w + d));
        const backwards = swinging && !r || !swinging && r;
        const uncliped = Math.pow(-1, backwards) * (x3 % (w + d)) / d + backwards;
        const clipped = Math.max(Math.min(uncliped, 1), 0);
        return clipped;
      };
      const endTime = t * (w + d) - w;
      position2 = x2 <= 0 ? Math.round(f(1e-5)) : x2 < endTime ? f(x2) : Math.round(f(endTime - 1e-5));
      return position2;
    }
    const loopsDone = Math.floor(this.loops());
    const swingForward = s && loopsDone % 2 === 0;
    const forwards = swingForward && !r || r && swingForward;
    position2 = loopsDone + (forwards ? p : 1 - p);
    return this.loops(position2);
  }
  progress(p) {
    if (p == null) {
      return Math.min(1, this._time / this.duration());
    }
    return this.time(p * this.duration());
  }
  /*
  Basic Functionality
  ===================
  These methods allow us to attach basic functions to the runner directly
  */
  queue(initFn, runFn, retargetFn, isTransform) {
    this._queue.push({
      initialiser: initFn || noop,
      runner: runFn || noop,
      retarget: retargetFn,
      isTransform,
      initialised: false,
      finished: false
    });
    const timeline2 = this.timeline();
    timeline2 && this.timeline()._continue();
    return this;
  }
  reset() {
    if (this._reseted) return this;
    this.time(0);
    this._reseted = true;
    return this;
  }
  reverse(reverse) {
    this._reverse = reverse == null ? !this._reverse : reverse;
    return this;
  }
  schedule(timeline2, delay, when) {
    if (!(timeline2 instanceof Timeline$1)) {
      when = delay;
      delay = timeline2;
      timeline2 = this.timeline();
    }
    if (!timeline2) {
      throw Error("Runner cannot be scheduled without timeline");
    }
    timeline2.schedule(this, delay, when);
    return this;
  }
  step(dt) {
    if (!this.enabled) return this;
    dt = dt == null ? 16 : dt;
    this._time += dt;
    const position2 = this.position();
    const running = this._lastPosition !== position2 && this._time >= 0;
    this._lastPosition = position2;
    const duration = this.duration();
    const justStarted = this._lastTime <= 0 && this._time > 0;
    const justFinished = this._lastTime < duration && this._time >= duration;
    this._lastTime = this._time;
    if (justStarted) {
      this.fire("start", this);
    }
    const declarative = this._isDeclarative;
    this.done = !declarative && !justFinished && this._time >= duration;
    this._reseted = false;
    let converged = false;
    if (running || declarative) {
      this._initialise(running);
      this.transforms = new Matrix();
      converged = this._run(declarative ? dt : position2);
      this.fire("step", this);
    }
    this.done = this.done || converged && declarative;
    if (justFinished) {
      this.fire("finished", this);
    }
    return this;
  }
  /*
  Runner animation methods
  ========================
  Control how the animation plays
  */
  time(time) {
    if (time == null) {
      return this._time;
    }
    const dt = time - this._time;
    this.step(dt);
    return this;
  }
  timeline(timeline2) {
    if (typeof timeline2 === "undefined") return this._timeline;
    this._timeline = timeline2;
    return this;
  }
  unschedule() {
    const timeline2 = this.timeline();
    timeline2 && timeline2.unschedule(this);
    return this;
  }
  // Run each initialise function in the runner if required
  _initialise(running) {
    if (!running && !this._isDeclarative) return;
    for (let i = 0, len = this._queue.length; i < len; ++i) {
      const current = this._queue[i];
      const needsIt = this._isDeclarative || !current.initialised && running;
      running = !current.finished;
      if (needsIt && running) {
        current.initialiser.call(this);
        current.initialised = true;
      }
    }
  }
  // Save a morpher to the morpher list so that we can retarget it later
  _rememberMorpher(method, morpher) {
    this._history[method] = {
      morpher,
      caller: this._queue[this._queue.length - 1]
    };
    if (this._isDeclarative) {
      const timeline2 = this.timeline();
      timeline2 && timeline2.play();
    }
  }
  // Try to set the target for a morpher if the morpher exists, otherwise
  // Run each run function for the position or dt given
  _run(positionOrDt) {
    let allfinished = true;
    for (let i = 0, len = this._queue.length; i < len; ++i) {
      const current = this._queue[i];
      const converged = current.runner.call(this, positionOrDt);
      current.finished = current.finished || converged === true;
      allfinished = allfinished && current.finished;
    }
    return allfinished;
  }
  // do nothing and return false
  _tryRetarget(method, target, extra) {
    if (this._history[method]) {
      if (!this._history[method].caller.initialised) {
        const index = this._queue.indexOf(this._history[method].caller);
        this._queue.splice(index, 1);
        return false;
      }
      if (this._history[method].caller.retarget) {
        this._history[method].caller.retarget.call(this, target, extra);
      } else {
        this._history[method].morpher.to(target);
      }
      this._history[method].caller.finished = false;
      const timeline2 = this.timeline();
      timeline2 && timeline2.play();
      return true;
    }
    return false;
  }
}
Runner.id = 0;
class FakeRunner {
  constructor(transforms2 = new Matrix(), id = -1, done = true) {
    this.transforms = transforms2;
    this.id = id;
    this.done = done;
  }
  clearTransformsFromQueue() {
  }
}
extend([Runner, FakeRunner], {
  mergeWith(runner) {
    return new FakeRunner(runner.transforms.lmultiply(this.transforms), runner.id);
  }
});
const lmultiply = (last, curr) => last.lmultiplyO(curr);
const getRunnerTransform = (runner) => runner.transforms;
function mergeTransforms() {
  const runners = this._transformationRunners.runners;
  const netTransform = runners.map(getRunnerTransform).reduce(lmultiply, new Matrix());
  this.transform(netTransform);
  this._transformationRunners.merge();
  if (this._transformationRunners.length() === 1) {
    this._frameId = null;
  }
}
class RunnerArray {
  constructor() {
    this.runners = [];
    this.ids = [];
  }
  add(runner) {
    if (this.runners.includes(runner)) return;
    const id = runner.id + 1;
    this.runners.push(runner);
    this.ids.push(id);
    return this;
  }
  clearBefore(id) {
    const deleteCnt = this.ids.indexOf(id + 1) || 1;
    this.ids.splice(0, deleteCnt, 0);
    this.runners.splice(0, deleteCnt, new FakeRunner()).forEach((r) => r.clearTransformsFromQueue());
    return this;
  }
  edit(id, newRunner) {
    const index = this.ids.indexOf(id + 1);
    this.ids.splice(index, 1, id + 1);
    this.runners.splice(index, 1, newRunner);
    return this;
  }
  getByID(id) {
    return this.runners[this.ids.indexOf(id + 1)];
  }
  length() {
    return this.ids.length;
  }
  merge() {
    let lastRunner = null;
    for (let i = 0; i < this.runners.length; ++i) {
      const runner = this.runners[i];
      const condition = lastRunner && runner.done && lastRunner.done && (!runner._timeline || !runner._timeline._runnerIds.includes(runner.id)) && (!lastRunner._timeline || !lastRunner._timeline._runnerIds.includes(lastRunner.id));
      if (condition) {
        this.remove(runner.id);
        const newRunner = runner.mergeWith(lastRunner);
        this.edit(lastRunner.id, newRunner);
        lastRunner = newRunner;
        --i;
      } else {
        lastRunner = runner;
      }
    }
    return this;
  }
  remove(id) {
    const index = this.ids.indexOf(id + 1);
    this.ids.splice(index, 1);
    this.runners.splice(index, 1);
    return this;
  }
}
registerMethods({
  Element: {
    animate(duration, delay, when) {
      const o = Runner.sanitise(duration, delay, when);
      const timeline2 = this.timeline();
      return new Runner(o.duration).loop(o).element(this).timeline(timeline2.play()).schedule(o.delay, o.when);
    },
    delay(by, when) {
      return this.animate(0, by, when);
    },
    // this function searches for all runners on the element and deletes the ones
    // which run before the current one. This is because absolute transformations
    // overwrite anything anyway so there is no need to waste time computing
    // other runners
    _clearTransformRunnersBefore(currentRunner) {
      this._transformationRunners.clearBefore(currentRunner.id);
    },
    _currentTransform(current) {
      return this._transformationRunners.runners.filter((runner) => runner.id <= current.id).map(getRunnerTransform).reduce(lmultiply, new Matrix());
    },
    _addRunner(runner) {
      this._transformationRunners.add(runner);
      Animator.cancelImmediate(this._frameId);
      this._frameId = Animator.immediate(mergeTransforms.bind(this));
    },
    _prepareRunner() {
      if (this._frameId == null) {
        this._transformationRunners = new RunnerArray().add(new FakeRunner(new Matrix(this)));
      }
    }
  }
});
const difference = (a, b) => a.filter((x2) => !b.includes(x2));
extend(Runner, {
  attr(a, v) {
    return this.styleAttr("attr", a, v);
  },
  // Add animatable styles
  css(s, v) {
    return this.styleAttr("css", s, v);
  },
  styleAttr(type, nameOrAttrs, val) {
    if (typeof nameOrAttrs === "string") {
      return this.styleAttr(type, {
        [nameOrAttrs]: val
      });
    }
    let attrs2 = nameOrAttrs;
    if (this._tryRetarget(type, attrs2)) return this;
    let morpher = new Morphable(this._stepper).to(attrs2);
    let keys = Object.keys(attrs2);
    this.queue(function() {
      morpher = morpher.from(this.element()[type](keys));
    }, function(pos) {
      this.element()[type](morpher.at(pos).valueOf());
      return morpher.done();
    }, function(newToAttrs) {
      const newKeys = Object.keys(newToAttrs);
      const differences = difference(newKeys, keys);
      if (differences.length) {
        const addedFromAttrs = this.element()[type](differences);
        const oldFromAttrs = new ObjectBag(morpher.from()).valueOf();
        Object.assign(oldFromAttrs, addedFromAttrs);
        morpher.from(oldFromAttrs);
      }
      const oldToAttrs = new ObjectBag(morpher.to()).valueOf();
      Object.assign(oldToAttrs, newToAttrs);
      morpher.to(oldToAttrs);
      keys = newKeys;
      attrs2 = newToAttrs;
    });
    this._rememberMorpher(type, morpher);
    return this;
  },
  zoom(level, point2) {
    if (this._tryRetarget("zoom", level, point2)) return this;
    let morpher = new Morphable(this._stepper).to(new SVGNumber(level));
    this.queue(function() {
      morpher = morpher.from(this.element().zoom());
    }, function(pos) {
      this.element().zoom(morpher.at(pos), point2);
      return morpher.done();
    }, function(newLevel, newPoint) {
      point2 = newPoint;
      morpher.to(newLevel);
    });
    this._rememberMorpher("zoom", morpher);
    return this;
  },
  /**
   ** absolute transformations
   **/
  //
  // M v -----|-----(D M v = F v)------|----->  T v
  //
  // 1. define the final state (T) and decompose it (once)
  //    t = [tx, ty, the, lam, sy, sx]
  // 2. on every frame: pull the current state of all previous transforms
  //    (M - m can change)
  //   and then write this as m = [tx0, ty0, the0, lam0, sy0, sx0]
  // 3. Find the interpolated matrix F(pos) = m + pos * (t - m)
  //   - Note F(0) = M
  //   - Note F(1) = T
  // 4. Now you get the delta matrix as a result: D = F * inv(M)
  transform(transforms2, relative, affine) {
    relative = transforms2.relative || relative;
    if (this._isDeclarative && !relative && this._tryRetarget("transform", transforms2)) {
      return this;
    }
    const isMatrix = Matrix.isMatrixLike(transforms2);
    affine = transforms2.affine != null ? transforms2.affine : affine != null ? affine : !isMatrix;
    const morpher = new Morphable(this._stepper).type(affine ? TransformBag : Matrix);
    let origin;
    let element;
    let current;
    let currentAngle;
    let startTransform;
    function setup() {
      element = element || this.element();
      origin = origin || getOrigin(transforms2, element);
      startTransform = new Matrix(relative ? void 0 : element);
      element._addRunner(this);
      if (!relative) {
        element._clearTransformRunnersBefore(this);
      }
    }
    function run(pos) {
      if (!relative) this.clearTransform();
      const {
        x: x2,
        y: y2
      } = new Point(origin).transform(element._currentTransform(this));
      let target = new Matrix({
        ...transforms2,
        origin: [x2, y2]
      });
      let start = this._isDeclarative && current ? current : startTransform;
      if (affine) {
        target = target.decompose(x2, y2);
        start = start.decompose(x2, y2);
        const rTarget = target.rotate;
        const rCurrent = start.rotate;
        const possibilities = [rTarget - 360, rTarget, rTarget + 360];
        const distances = possibilities.map((a) => Math.abs(a - rCurrent));
        const shortest = Math.min(...distances);
        const index = distances.indexOf(shortest);
        target.rotate = possibilities[index];
      }
      if (relative) {
        if (!isMatrix) {
          target.rotate = transforms2.rotate || 0;
        }
        if (this._isDeclarative && currentAngle) {
          start.rotate = currentAngle;
        }
      }
      morpher.from(start);
      morpher.to(target);
      const affineParameters = morpher.at(pos);
      currentAngle = affineParameters.rotate;
      current = new Matrix(affineParameters);
      this.addTransform(current);
      element._addRunner(this);
      return morpher.done();
    }
    function retarget(newTransforms) {
      if ((newTransforms.origin || "center").toString() !== (transforms2.origin || "center").toString()) {
        origin = getOrigin(newTransforms, element);
      }
      transforms2 = {
        ...newTransforms,
        origin
      };
    }
    this.queue(setup, run, retarget, true);
    this._isDeclarative && this._rememberMorpher("transform", morpher);
    return this;
  },
  // Animatable x-axis
  x(x2, relative) {
    return this._queueNumber("x", x2);
  },
  // Animatable y-axis
  y(y2) {
    return this._queueNumber("y", y2);
  },
  dx(x2 = 0) {
    return this._queueNumberDelta("x", x2);
  },
  dy(y2 = 0) {
    return this._queueNumberDelta("y", y2);
  },
  dmove(x2, y2) {
    return this.dx(x2).dy(y2);
  },
  _queueNumberDelta(method, to2) {
    to2 = new SVGNumber(to2);
    if (this._tryRetarget(method, to2)) return this;
    const morpher = new Morphable(this._stepper).to(to2);
    let from2 = null;
    this.queue(function() {
      from2 = this.element()[method]();
      morpher.from(from2);
      morpher.to(from2 + to2);
    }, function(pos) {
      this.element()[method](morpher.at(pos));
      return morpher.done();
    }, function(newTo) {
      morpher.to(from2 + new SVGNumber(newTo));
    });
    this._rememberMorpher(method, morpher);
    return this;
  },
  _queueObject(method, to2) {
    if (this._tryRetarget(method, to2)) return this;
    const morpher = new Morphable(this._stepper).to(to2);
    this.queue(function() {
      morpher.from(this.element()[method]());
    }, function(pos) {
      this.element()[method](morpher.at(pos));
      return morpher.done();
    });
    this._rememberMorpher(method, morpher);
    return this;
  },
  _queueNumber(method, value) {
    return this._queueObject(method, new SVGNumber(value));
  },
  // Animatable center x-axis
  cx(x2) {
    return this._queueNumber("cx", x2);
  },
  // Animatable center y-axis
  cy(y2) {
    return this._queueNumber("cy", y2);
  },
  // Add animatable move
  move(x2, y2) {
    return this.x(x2).y(y2);
  },
  // Add animatable center
  center(x2, y2) {
    return this.cx(x2).cy(y2);
  },
  // Add animatable size
  size(width2, height2) {
    let box;
    if (!width2 || !height2) {
      box = this._element.bbox();
    }
    if (!width2) {
      width2 = box.width / box.height * height2;
    }
    if (!height2) {
      height2 = box.height / box.width * width2;
    }
    return this.width(width2).height(height2);
  },
  // Add animatable width
  width(width2) {
    return this._queueNumber("width", width2);
  },
  // Add animatable height
  height(height2) {
    return this._queueNumber("height", height2);
  },
  // Add animatable plot
  plot(a, b, c, d) {
    if (arguments.length === 4) {
      return this.plot([a, b, c, d]);
    }
    if (this._tryRetarget("plot", a)) return this;
    const morpher = new Morphable(this._stepper).type(this._element.MorphArray).to(a);
    this.queue(function() {
      morpher.from(this._element.array());
    }, function(pos) {
      this._element.plot(morpher.at(pos));
      return morpher.done();
    });
    this._rememberMorpher("plot", morpher);
    return this;
  },
  // Add leading method
  leading(value) {
    return this._queueNumber("leading", value);
  },
  // Add animatable viewbox
  viewbox(x2, y2, width2, height2) {
    return this._queueObject("viewbox", new Box(x2, y2, width2, height2));
  },
  update(o) {
    if (typeof o !== "object") {
      return this.update({
        offset: arguments[0],
        color: arguments[1],
        opacity: arguments[2]
      });
    }
    if (o.opacity != null) this.attr("stop-opacity", o.opacity);
    if (o.color != null) this.attr("stop-color", o.color);
    if (o.offset != null) this.attr("offset", o.offset);
    return this;
  }
});
extend(Runner, {
  rx,
  ry,
  from,
  to
});
register(Runner, "Runner");
class Svg extends Container {
  constructor(node, attrs2 = node) {
    super(nodeOrNew("svg", node), attrs2);
    this.namespace();
  }
  // Creates and returns defs element
  defs() {
    if (!this.isRoot()) return this.root().defs();
    return adopt(this.node.querySelector("defs")) || this.put(new Defs());
  }
  isRoot() {
    return !this.node.parentNode || !(this.node.parentNode instanceof globals.window.SVGElement) && this.node.parentNode.nodeName !== "#document-fragment";
  }
  // Add namespaces
  namespace() {
    if (!this.isRoot()) return this.root().namespace();
    return this.attr({
      xmlns: svg,
      version: "1.1"
    }).attr("xmlns:xlink", xlink, xmlns).attr("xmlns:svgjs", svgjs, xmlns);
  }
  removeNamespace() {
    return this.attr({
      xmlns: null,
      version: null
    }).attr("xmlns:xlink", null, xmlns).attr("xmlns:svgjs", null, xmlns);
  }
  // Check if this is a root svg
  // If not, call root() from this element
  root() {
    if (this.isRoot()) return this;
    return super.root();
  }
}
registerMethods({
  Container: {
    // Create nested svg document
    nested: wrapWithAttrCheck(function() {
      return this.put(new Svg());
    })
  }
});
register(Svg, "Svg", true);
let Symbol$1 = class Symbol2 extends Container {
  // Initialize node
  constructor(node, attrs2 = node) {
    super(nodeOrNew("symbol", node), attrs2);
  }
};
registerMethods({
  Container: {
    symbol: wrapWithAttrCheck(function() {
      return this.put(new Symbol$1());
    })
  }
});
register(Symbol$1, "Symbol");
function plain(text) {
  if (this._build === false) {
    this.clear();
  }
  this.node.appendChild(globals.document.createTextNode(text));
  return this;
}
function length() {
  return this.node.getComputedTextLength();
}
function x$1(x2, box = this.bbox()) {
  if (x2 == null) {
    return box.x;
  }
  return this.attr("x", this.attr("x") + x2 - box.x);
}
function y$1(y2, box = this.bbox()) {
  if (y2 == null) {
    return box.y;
  }
  return this.attr("y", this.attr("y") + y2 - box.y);
}
function move$1(x2, y2, box = this.bbox()) {
  return this.x(x2, box).y(y2, box);
}
function cx(x2, box = this.bbox()) {
  if (x2 == null) {
    return box.cx;
  }
  return this.attr("x", this.attr("x") + x2 - box.cx);
}
function cy(y2, box = this.bbox()) {
  if (y2 == null) {
    return box.cy;
  }
  return this.attr("y", this.attr("y") + y2 - box.cy);
}
function center(x2, y2, box = this.bbox()) {
  return this.cx(x2, box).cy(y2, box);
}
function ax(x2) {
  return this.attr("x", x2);
}
function ay(y2) {
  return this.attr("y", y2);
}
function amove(x2, y2) {
  return this.ax(x2).ay(y2);
}
function build(build2) {
  this._build = !!build2;
  return this;
}
var textable = {
  __proto__: null,
  plain,
  length,
  x: x$1,
  y: y$1,
  move: move$1,
  cx,
  cy,
  center,
  ax,
  ay,
  amove,
  build
};
class Text extends Shape$1 {
  // Initialize node
  constructor(node, attrs2 = node) {
    super(nodeOrNew("text", node), attrs2);
    this.dom.leading = new SVGNumber(1.3);
    this._rebuild = true;
    this._build = false;
  }
  // Set / get leading
  leading(value) {
    if (value == null) {
      return this.dom.leading;
    }
    this.dom.leading = new SVGNumber(value);
    return this.rebuild();
  }
  // Rebuild appearance type
  rebuild(rebuild) {
    if (typeof rebuild === "boolean") {
      this._rebuild = rebuild;
    }
    if (this._rebuild) {
      const self = this;
      let blankLineOffset = 0;
      const leading = this.dom.leading;
      this.each(function(i) {
        const fontSize = globals.window.getComputedStyle(this.node).getPropertyValue("font-size");
        const dy2 = leading * new SVGNumber(fontSize);
        if (this.dom.newLined) {
          this.attr("x", self.attr("x"));
          if (this.text() === "\n") {
            blankLineOffset += dy2;
          } else {
            this.attr("dy", i ? dy2 + blankLineOffset : 0);
            blankLineOffset = 0;
          }
        }
      });
      this.fire("rebuild");
    }
    return this;
  }
  // overwrite method from parent to set data properly
  setData(o) {
    this.dom = o;
    this.dom.leading = new SVGNumber(o.leading || 1.3);
    return this;
  }
  // Set the text content
  text(text) {
    if (text === void 0) {
      const children = this.node.childNodes;
      let firstLine = 0;
      text = "";
      for (let i = 0, len = children.length; i < len; ++i) {
        if (children[i].nodeName === "textPath") {
          if (i === 0) firstLine = 1;
          continue;
        }
        if (i !== firstLine && children[i].nodeType !== 3 && adopt(children[i]).dom.newLined === true) {
          text += "\n";
        }
        text += children[i].textContent;
      }
      return text;
    }
    this.clear().build(true);
    if (typeof text === "function") {
      text.call(this, this);
    } else {
      text = (text + "").split("\n");
      for (let j = 0, jl = text.length; j < jl; j++) {
        this.newLine(text[j]);
      }
    }
    return this.build(false).rebuild();
  }
}
extend(Text, textable);
registerMethods({
  Container: {
    // Create text element
    text: wrapWithAttrCheck(function(text = "") {
      return this.put(new Text()).text(text);
    }),
    // Create plain text element
    plain: wrapWithAttrCheck(function(text = "") {
      return this.put(new Text()).plain(text);
    })
  }
});
register(Text, "Text");
class Tspan extends Shape$1 {
  // Initialize node
  constructor(node, attrs2 = node) {
    super(nodeOrNew("tspan", node), attrs2);
    this._build = false;
  }
  // Shortcut dx
  dx(dx2) {
    return this.attr("dx", dx2);
  }
  // Shortcut dy
  dy(dy2) {
    return this.attr("dy", dy2);
  }
  // Create new line
  newLine() {
    this.dom.newLined = true;
    const text = this.parent();
    if (!(text instanceof Text)) {
      return this;
    }
    const i = text.index(this);
    const fontSize = globals.window.getComputedStyle(this.node).getPropertyValue("font-size");
    const dy2 = text.dom.leading * new SVGNumber(fontSize);
    return this.dy(i ? dy2 : 0).attr("x", text.x());
  }
  // Set text content
  text(text) {
    if (text == null) return this.node.textContent + (this.dom.newLined ? "\n" : "");
    if (typeof text === "function") {
      this.clear().build(true);
      text.call(this, this);
      this.build(false);
    } else {
      this.plain(text);
    }
    return this;
  }
}
extend(Tspan, textable);
registerMethods({
  Tspan: {
    tspan: wrapWithAttrCheck(function(text = "") {
      const tspan = new Tspan();
      if (!this._build) {
        this.clear();
      }
      return this.put(tspan).text(text);
    })
  },
  Text: {
    newLine: function(text = "") {
      return this.tspan(text).newLine();
    }
  }
});
register(Tspan, "Tspan");
class Circle extends Shape$1 {
  constructor(node, attrs2 = node) {
    super(nodeOrNew("circle", node), attrs2);
  }
  radius(r) {
    return this.attr("r", r);
  }
  // Radius x value
  rx(rx2) {
    return this.attr("r", rx2);
  }
  // Alias radius x value
  ry(ry2) {
    return this.rx(ry2);
  }
  size(size2) {
    return this.radius(new SVGNumber(size2).divide(2));
  }
}
extend(Circle, {
  x: x$3,
  y: y$3,
  cx: cx$1,
  cy: cy$1,
  width: width$2,
  height: height$2
});
registerMethods({
  Container: {
    // Create circle element
    circle: wrapWithAttrCheck(function(size2 = 0) {
      return this.put(new Circle()).size(size2).move(0, 0);
    })
  }
});
register(Circle, "Circle");
class ClipPath extends Container {
  constructor(node, attrs2 = node) {
    super(nodeOrNew("clipPath", node), attrs2);
  }
  // Unclip all clipped elements and remove itself
  remove() {
    this.targets().forEach(function(el) {
      el.unclip();
    });
    return super.remove();
  }
  targets() {
    return baseFind("svg [clip-path*=" + this.id() + "]");
  }
}
registerMethods({
  Container: {
    // Create clipping element
    clip: wrapWithAttrCheck(function() {
      return this.defs().put(new ClipPath());
    })
  },
  Element: {
    // Distribute clipPath to svg element
    clipper() {
      return this.reference("clip-path");
    },
    clipWith(element) {
      const clipper = element instanceof ClipPath ? element : this.parent().clip().add(element);
      return this.attr("clip-path", "url(#" + clipper.id() + ")");
    },
    // Unclip element
    unclip() {
      return this.attr("clip-path", null);
    }
  }
});
register(ClipPath, "ClipPath");
class ForeignObject extends Element {
  constructor(node, attrs2 = node) {
    super(nodeOrNew("foreignObject", node), attrs2);
  }
}
registerMethods({
  Container: {
    foreignObject: wrapWithAttrCheck(function(width2, height2) {
      return this.put(new ForeignObject()).size(width2, height2);
    })
  }
});
register(ForeignObject, "ForeignObject");
function dmove(dx2, dy2) {
  this.children().forEach((child, i) => {
    let bbox2;
    try {
      bbox2 = child.bbox();
    } catch (e) {
      return;
    }
    const m = new Matrix(child);
    const matrix = m.translate(dx2, dy2).transform(m.inverse());
    const p = new Point(bbox2.x, bbox2.y).transform(matrix);
    child.move(p.x, p.y);
  });
  return this;
}
function dx(dx2) {
  return this.dmove(dx2, 0);
}
function dy(dy2) {
  return this.dmove(0, dy2);
}
function height(height2, box = this.bbox()) {
  if (height2 == null) return box.height;
  return this.size(box.width, height2, box);
}
function move(x2 = 0, y2 = 0, box = this.bbox()) {
  const dx2 = x2 - box.x;
  const dy2 = y2 - box.y;
  return this.dmove(dx2, dy2);
}
function size(width2, height2, box = this.bbox()) {
  const p = proportionalSize(this, width2, height2, box);
  const scaleX = p.width / box.width;
  const scaleY = p.height / box.height;
  this.children().forEach((child, i) => {
    const o = new Point(box).transform(new Matrix(child).inverse());
    child.scale(scaleX, scaleY, o.x, o.y);
  });
  return this;
}
function width(width2, box = this.bbox()) {
  if (width2 == null) return box.width;
  return this.size(width2, box.height, box);
}
function x(x2, box = this.bbox()) {
  if (x2 == null) return box.x;
  return this.move(x2, box.y, box);
}
function y(y2, box = this.bbox()) {
  if (y2 == null) return box.y;
  return this.move(box.x, y2, box);
}
var containerGeometry = {
  __proto__: null,
  dmove,
  dx,
  dy,
  height,
  move,
  size,
  width,
  x,
  y
};
class G extends Container {
  constructor(node, attrs2 = node) {
    super(nodeOrNew("g", node), attrs2);
  }
}
extend(G, containerGeometry);
registerMethods({
  Container: {
    // Create a group element
    group: wrapWithAttrCheck(function() {
      return this.put(new G());
    })
  }
});
register(G, "G");
class A extends Container {
  constructor(node, attrs2 = node) {
    super(nodeOrNew("a", node), attrs2);
  }
  // Link target attribute
  target(target) {
    return this.attr("target", target);
  }
  // Link url
  to(url) {
    return this.attr("href", url, xlink);
  }
}
extend(A, containerGeometry);
registerMethods({
  Container: {
    // Create a hyperlink element
    link: wrapWithAttrCheck(function(url) {
      return this.put(new A()).to(url);
    })
  },
  Element: {
    unlink() {
      const link = this.linker();
      if (!link) return this;
      const parent = link.parent();
      if (!parent) {
        return this.remove();
      }
      const index = parent.index(link);
      parent.add(this, index);
      link.remove();
      return this;
    },
    linkTo(url) {
      let link = this.linker();
      if (!link) {
        link = new A();
        this.wrap(link);
      }
      if (typeof url === "function") {
        url.call(link, link);
      } else {
        link.to(url);
      }
      return this;
    },
    linker() {
      const link = this.parent();
      if (link && link.node.nodeName.toLowerCase() === "a") {
        return link;
      }
      return null;
    }
  }
});
register(A, "A");
class Mask extends Container {
  // Initialize node
  constructor(node, attrs2 = node) {
    super(nodeOrNew("mask", node), attrs2);
  }
  // Unmask all masked elements and remove itself
  remove() {
    this.targets().forEach(function(el) {
      el.unmask();
    });
    return super.remove();
  }
  targets() {
    return baseFind("svg [mask*=" + this.id() + "]");
  }
}
registerMethods({
  Container: {
    mask: wrapWithAttrCheck(function() {
      return this.defs().put(new Mask());
    })
  },
  Element: {
    // Distribute mask to svg element
    masker() {
      return this.reference("mask");
    },
    maskWith(element) {
      const masker = element instanceof Mask ? element : this.parent().mask().add(element);
      return this.attr("mask", "url(#" + masker.id() + ")");
    },
    // Unmask element
    unmask() {
      return this.attr("mask", null);
    }
  }
});
register(Mask, "Mask");
class Stop extends Element {
  constructor(node, attrs2 = node) {
    super(nodeOrNew("stop", node), attrs2);
  }
  // add color stops
  update(o) {
    if (typeof o === "number" || o instanceof SVGNumber) {
      o = {
        offset: arguments[0],
        color: arguments[1],
        opacity: arguments[2]
      };
    }
    if (o.opacity != null) this.attr("stop-opacity", o.opacity);
    if (o.color != null) this.attr("stop-color", o.color);
    if (o.offset != null) this.attr("offset", new SVGNumber(o.offset));
    return this;
  }
}
registerMethods({
  Gradient: {
    // Add a color stop
    stop: function(offset, color, opacity) {
      return this.put(new Stop()).update(offset, color, opacity);
    }
  }
});
register(Stop, "Stop");
function cssRule(selector, rule) {
  if (!selector) return "";
  if (!rule) return selector;
  let ret = selector + "{";
  for (const i in rule) {
    ret += unCamelCase(i) + ":" + rule[i] + ";";
  }
  ret += "}";
  return ret;
}
let Style$1 = class Style extends Element {
  constructor(node, attrs2 = node) {
    super(nodeOrNew("style", node), attrs2);
  }
  addText(w = "") {
    this.node.textContent += w;
    return this;
  }
  font(name, src, params = {}) {
    return this.rule("@font-face", {
      fontFamily: name,
      src,
      ...params
    });
  }
  rule(selector, obj) {
    return this.addText(cssRule(selector, obj));
  }
};
registerMethods("Dom", {
  style(selector, obj) {
    return this.put(new Style$1()).rule(selector, obj);
  },
  fontface(name, src, params) {
    return this.put(new Style$1()).font(name, src, params);
  }
});
register(Style$1, "Style");
class TextPath extends Text {
  // Initialize node
  constructor(node, attrs2 = node) {
    super(nodeOrNew("textPath", node), attrs2);
  }
  // return the array of the path track element
  array() {
    const track = this.track();
    return track ? track.array() : null;
  }
  // Plot path if any
  plot(d) {
    const track = this.track();
    let pathArray = null;
    if (track) {
      pathArray = track.plot(d);
    }
    return d == null ? pathArray : this;
  }
  // Get the path element
  track() {
    return this.reference("href");
  }
}
registerMethods({
  Container: {
    textPath: wrapWithAttrCheck(function(text, path) {
      if (!(text instanceof Text)) {
        text = this.text(text);
      }
      return text.path(path);
    })
  },
  Text: {
    // Create path for text to run on
    path: wrapWithAttrCheck(function(track, importNodes = true) {
      const textPath = new TextPath();
      if (!(track instanceof Path)) {
        track = this.defs().path(track);
      }
      textPath.attr("href", "#" + track, xlink);
      let node;
      if (importNodes) {
        while (node = this.node.firstChild) {
          textPath.node.appendChild(node);
        }
      }
      return this.put(textPath);
    }),
    // Get the textPath children
    textPath() {
      return this.findOne("textPath");
    }
  },
  Path: {
    // creates a textPath from this path
    text: wrapWithAttrCheck(function(text) {
      if (!(text instanceof Text)) {
        text = new Text().addTo(this.parent()).text(text);
      }
      return text.path(this);
    }),
    targets() {
      return baseFind("svg textPath").filter((node) => {
        return (node.attr("href") || "").includes(this.id());
      });
    }
  }
});
TextPath.prototype.MorphArray = PathArray;
register(TextPath, "TextPath");
class Use extends Shape$1 {
  constructor(node, attrs2 = node) {
    super(nodeOrNew("use", node), attrs2);
  }
  // Use element as a reference
  use(element, file) {
    return this.attr("href", (file || "") + "#" + element, xlink);
  }
}
registerMethods({
  Container: {
    // Create a use element
    use: wrapWithAttrCheck(function(element, file) {
      return this.put(new Use()).use(element, file);
    })
  }
});
register(Use, "Use");
const SVG = makeInstance;
extend([Svg, Symbol$1, Image$1, Pattern, Marker], getMethodsFor("viewbox"));
extend([Line, Polyline, Polygon, Path], getMethodsFor("marker"));
extend(Text, getMethodsFor("Text"));
extend(Path, getMethodsFor("Path"));
extend(Defs, getMethodsFor("Defs"));
extend([Text, Tspan], getMethodsFor("Tspan"));
extend([Rect, Ellipse, Gradient, Runner], getMethodsFor("radius"));
extend(EventTarget, getMethodsFor("EventTarget"));
extend(Dom, getMethodsFor("Dom"));
extend(Element, getMethodsFor("Element"));
extend(Shape$1, getMethodsFor("Shape"));
extend([Container, Fragment], getMethodsFor("Container"));
extend(Gradient, getMethodsFor("Gradient"));
extend(Runner, getMethodsFor("Runner"));
List.extend(getMethodNames());
registerMorphableType([SVGNumber, Color, Box, Matrix, SVGArray, PointArray, PathArray, Point]);
makeMorphable();
const defaultTheme = {
  // 节点内边距
  paddingX: 15,
  paddingY: 5,
  // 图片显示的最大宽度
  imgMaxWidth: 200,
  // 图片显示的最大高度
  imgMaxHeight: 100,
  // icon的大小
  iconSize: 20,
  // 连线的粗细
  lineWidth: 1,
  // 连线的颜色
  lineColor: "#549688",
  // 连线样式
  lineDasharray: "none",
  // 连线是否开启流动效果，仅在虚线时有效（需要注册LineFlow插件）
  lineFlow: false,
  // 流动效果一个周期的时间，单位：s
  lineFlowDuration: 1,
  // 流动方向是否是从父节点到子节点
  lineFlowForward: true,
  // 连线风格
  lineStyle: "straight",
  // 曲线（curve）【仅支持logicalStructure、mindMap、verticalTimeline三种结构】、直线（straight）、直连（direct）【仅支持logicalStructure、mindMap、organizationStructure、verticalTimeline四种结构】
  // 曲线连接时，根节点和其他节点的连接线样式保持统一，默认根节点为 ( 型，其他节点为 { 型，设为true后，都为 { 型。仅支持logicalStructure、mindMap两种结构
  rootLineKeepSameInCurve: true,
  // 曲线连接时，根节点和其他节点的连线起始位置保持统一，默认根节点的连线起始位置在节点中心，其他节点在节点右侧（或左侧），如果该配置设为true，那么根节点的连线起始位置也会在节点右侧（或左侧）
  rootLineStartPositionKeepSameInCurve: false,
  // 直线连接(straight)时，连线的圆角大小，设置为0代表没有圆角，仅支持logicalStructure、mindMap、verticalTimeline三种结构
  lineRadius: 5,
  // 连线是否显示标记，目前只支持箭头
  showLineMarker: false,
  // 概要连线的粗细
  generalizationLineWidth: 1,
  // 概要连线的颜色
  generalizationLineColor: "#549688",
  // 概要曲线距节点的距离
  generalizationLineMargin: 0,
  // 概要节点距节点的距离
  generalizationNodeMargin: 20,
  // 关联线默认状态的粗细
  associativeLineWidth: 2,
  // 关联线默认状态的颜色
  associativeLineColor: "rgb(51, 51, 51)",
  // 关联线激活状态的粗细
  associativeLineActiveWidth: 8,
  // 关联线激活状态的颜色
  associativeLineActiveColor: "rgba(2, 167, 240, 1)",
  // 关联线样式
  associativeLineDasharray: "6,4",
  // 关联线文字颜色
  associativeLineTextColor: "rgb(51, 51, 51)",
  // 关联线文字大小
  associativeLineTextFontSize: 14,
  // 关联线文字行高
  associativeLineTextLineHeight: 1.2,
  // 关联线文字字体
  associativeLineTextFontFamily: "微软雅黑, Microsoft YaHei",
  // 背景颜色
  backgroundColor: "#fafafa",
  // 背景图片
  backgroundImage: "none",
  // 背景重复
  backgroundRepeat: "no-repeat",
  // 设置背景图像的起始位置
  backgroundPosition: "center center",
  // 设置背景图片大小
  backgroundSize: "cover",
  // 节点使用只有底边横线的样式，仅支持logicalStructure、mindMap、catalogOrganization、organizationStructure四种结构
  nodeUseLineStyle: false,
  // 根节点样式
  root: {
    shape: "rectangle",
    fillColor: "#549688",
    fontFamily: "微软雅黑, Microsoft YaHei",
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    fontStyle: "normal",
    borderColor: "transparent",
    borderWidth: 0,
    borderDasharray: "none",
    borderRadius: 5,
    textDecoration: "none",
    gradientStyle: false,
    startColor: "#549688",
    endColor: "#fff",
    startDir: [0, 0],
    endDir: [1, 0],
    // 连线标记的位置，start（头部）、end（尾部），该配置在showLineMarker配置为true时生效
    lineMarkerDir: "end",
    // 节点鼠标hover和激活时显示的矩形边框的颜色，主题里不设置，默认会取hoverRectColor实例化选项的值
    hoverRectColor: "",
    // 点鼠标hover和激活时显示的矩形边框的圆角大小
    hoverRectRadius: 5,
    // 文本对齐
    textAlign: "left",
    // right、center、justify、left
    // 图片放置位置，相对于整个文本内容
    imgPlacement: "top",
    // left、right、bottom、top
    // 标签放置位置
    tagPlacement: "right"
    // right（文字右侧）、bottom（文本内容下方）
    // 下列样式也支持给节点设置，用于覆盖最外层的设置
    // paddingX,
    // paddingY,
    // lineWidth,
    // lineColor,
    // lineDasharray,
    // lineFlow,
    // lineFlowDuration,
    // lineFlowForward
    // 关联线的所有样式
  },
  // 二级节点样式
  second: {
    shape: "rectangle",
    marginX: 100,
    marginY: 40,
    fillColor: "#fff",
    fontFamily: "微软雅黑, Microsoft YaHei",
    color: "#565656",
    fontSize: 16,
    fontWeight: "normal",
    fontStyle: "normal",
    borderColor: "#549688",
    borderWidth: 1,
    borderDasharray: "none",
    borderRadius: 5,
    textDecoration: "none",
    gradientStyle: false,
    startColor: "#549688",
    endColor: "#fff",
    startDir: [0, 0],
    endDir: [1, 0],
    lineMarkerDir: "end",
    hoverRectColor: "",
    hoverRectRadius: 5,
    textAlign: "left",
    imgPlacement: "top",
    tagPlacement: "right"
  },
  // 三级及以下节点样式
  node: {
    shape: "rectangle",
    marginX: 50,
    marginY: 0,
    fillColor: "transparent",
    fontFamily: "微软雅黑, Microsoft YaHei",
    color: "#6a6d6c",
    fontSize: 14,
    fontWeight: "normal",
    fontStyle: "normal",
    borderColor: "transparent",
    borderWidth: 0,
    borderRadius: 5,
    borderDasharray: "none",
    textDecoration: "none",
    gradientStyle: false,
    startColor: "#549688",
    endColor: "#fff",
    startDir: [0, 0],
    endDir: [1, 0],
    lineMarkerDir: "end",
    hoverRectColor: "",
    hoverRectRadius: 5,
    textAlign: "left",
    imgPlacement: "top",
    tagPlacement: "right"
  },
  // 概要节点样式
  generalization: {
    shape: "rectangle",
    marginX: 100,
    marginY: 40,
    fillColor: "#fff",
    fontFamily: "微软雅黑, Microsoft YaHei",
    color: "#565656",
    fontSize: 16,
    fontWeight: "normal",
    fontStyle: "normal",
    borderColor: "#549688",
    borderWidth: 1,
    borderDasharray: "none",
    borderRadius: 5,
    textDecoration: "none",
    gradientStyle: false,
    startColor: "#549688",
    endColor: "#fff",
    startDir: [0, 0],
    endDir: [1, 0],
    hoverRectColor: "",
    hoverRectRadius: 5,
    textAlign: "left",
    imgPlacement: "top",
    tagPlacement: "right"
  }
};
const nodeSizeIndependenceList = [
  "lineWidth",
  "lineColor",
  "lineDasharray",
  "lineStyle",
  "generalizationLineWidth",
  "generalizationLineColor",
  "associativeLineWidth",
  "associativeLineColor",
  "associativeLineActiveWidth",
  "associativeLineActiveColor",
  "associativeLineTextColor",
  "associativeLineTextFontSize",
  "associativeLineTextLineHeight",
  "associativeLineTextFontFamily",
  "backgroundColor",
  "backgroundImage",
  "backgroundRepeat",
  "backgroundPosition",
  "backgroundSize",
  "rootLineKeepSameInCurve",
  "rootLineStartPositionKeepSameInCurve",
  "showLineMarker",
  "lineRadius",
  "hoverRectColor",
  "hoverRectRadius",
  "lineFlow",
  "lineFlowDuration",
  "lineFlowForward",
  "textAlign"
];
const checkIsNodeSizeIndependenceConfig = (config) => {
  let keys = Object.keys(config);
  for (let i = 0; i < keys.length; i++) {
    if (!nodeSizeIndependenceList.find((item) => {
      return item === keys[i];
    })) {
      return false;
    }
  }
  return true;
};
const lineStyleProps = [
  "lineColor",
  "lineDasharray",
  "lineWidth",
  "lineMarkerDir",
  "lineFlow",
  "lineFlowDuration",
  "lineFlowForward"
];
const walk = (root2, parent, beforeCallback, afterCallback, isRoot, layerIndex = 0, index = 0, ancestors = []) => {
  let stop = false;
  if (beforeCallback) {
    stop = beforeCallback(root2, parent, isRoot, layerIndex, index, ancestors);
  }
  if (!stop && root2.children && root2.children.length > 0) {
    let _layerIndex = layerIndex + 1;
    root2.children.forEach((node, nodeIndex) => {
      walk(
        node,
        root2,
        beforeCallback,
        afterCallback,
        false,
        _layerIndex,
        nodeIndex,
        [...ancestors, root2]
      );
    });
  }
  afterCallback && afterCallback(root2, parent, isRoot, layerIndex, index, ancestors);
};
const bfsWalk = (root2, callback) => {
  let stack = [root2];
  let isStop = false;
  if (callback(root2, null) === "stop") {
    isStop = true;
  }
  while (stack.length) {
    if (isStop) {
      break;
    }
    let cur = stack.shift();
    if (cur.children && cur.children.length) {
      cur.children.forEach((item) => {
        if (isStop) return;
        stack.push(item);
        if (callback(item, cur) === "stop") {
          isStop = true;
        }
      });
    }
  }
};
const resizeImgSize = (width2, height2, maxWidth, maxHeight) => {
  let nRatio = width2 / height2;
  let arr = [];
  if (maxWidth && maxHeight) {
    if (width2 <= maxWidth && height2 <= maxHeight) {
      arr = [width2, height2];
    } else {
      let mRatio = maxWidth / maxHeight;
      if (nRatio > mRatio) {
        arr = [maxWidth, maxWidth / nRatio];
      } else {
        arr = [nRatio * maxHeight, maxHeight];
      }
    }
  } else if (maxWidth) {
    if (width2 <= maxWidth) {
      arr = [width2, height2];
    } else {
      arr = [maxWidth, maxWidth / nRatio];
    }
  } else if (maxHeight) {
    if (height2 <= maxHeight) {
      arr = [width2, height2];
    } else {
      arr = [nRatio * maxHeight, maxHeight];
    }
  }
  return arr;
};
const getStrWithBrFromHtml = (str) => {
  str = str.replace(/<br>/gim, "\n");
  let el = document.createElement("div");
  el.innerHTML = str;
  str = el.textContent;
  return str;
};
const simpleDeepClone = (data2) => {
  try {
    return JSON.parse(JSON.stringify(data2));
  } catch (error) {
    return null;
  }
};
const copyRenderTree = (tree, root2, removeActiveState = false) => {
  tree.data = simpleDeepClone(root2.data);
  if (removeActiveState) {
    tree.data.isActive = false;
    const generalizationList = formatGetNodeGeneralization(tree.data);
    generalizationList.forEach((item) => {
      item.isActive = false;
    });
  }
  tree.children = [];
  if (root2.children && root2.children.length > 0) {
    root2.children.forEach((item, index) => {
      tree.children[index] = copyRenderTree({}, item, removeActiveState);
    });
  }
  Object.keys(root2).forEach((key) => {
    if (!["data", "children"].includes(key) && !/^_/.test(key)) {
      tree[key] = root2[key];
    }
  });
  return tree;
};
const copyNodeTree = (tree, root2, removeActiveState = false, removeId = true) => {
  const rootData = root2.nodeData ? root2.nodeData : root2;
  tree.data = simpleDeepClone(rootData.data);
  if (removeId) {
    delete tree.data.uid;
  } else if (!tree.data.uid) {
    tree.data.uid = createUid();
  }
  if (removeActiveState) {
    tree.data.isActive = false;
  }
  tree.children = [];
  if (root2.children && root2.children.length > 0) {
    root2.children.forEach((item, index) => {
      tree.children[index] = copyNodeTree({}, item, removeActiveState, removeId);
    });
  } else if (root2.nodeData && root2.nodeData.children && root2.nodeData.children.length > 0) {
    root2.nodeData.children.forEach((item, index) => {
      tree.children[index] = copyNodeTree({}, item, removeActiveState, removeId);
    });
  }
  Object.keys(rootData).forEach((key) => {
    if (!["data", "children"].includes(key) && !/^_/.test(key)) {
      tree[key] = rootData[key];
    }
  });
  return tree;
};
const imgToDataUrl = (src, returnBlob = false) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute("crossOrigin", "anonymous");
    img.onload = () => {
      try {
        let canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        let ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, img.width, img.height);
        if (returnBlob) {
          canvas.toBlob((blob) => {
            resolve(blob);
          });
        } else {
          resolve(canvas.toDataURL());
        }
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = (e) => {
      reject(e);
    };
    img.src = src;
  });
};
const downloadFile = (file, fileName) => {
  let a = document.createElement("a");
  a.href = file;
  a.download = fileName;
  a.click();
};
const throttle = (fn, time = 300, ctx) => {
  let timer = null;
  return (...args) => {
    if (timer) {
      return;
    }
    timer = setTimeout(() => {
      fn.call(ctx, ...args);
      timer = null;
    }, time);
  };
};
const debounce = (fn, wait = 300, ctx) => {
  let timeout = null;
  return (...args) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = null;
      fn.apply(ctx, args);
    }, wait);
  };
};
const asyncRun = (taskList, callback = () => {
}) => {
  let index = 0;
  let len = taskList.length;
  if (len <= 0) {
    return callback();
  }
  let loop = () => {
    if (index >= len) {
      callback();
      return;
    }
    taskList[index]();
    setTimeout(() => {
      index++;
      loop();
    }, 0);
  };
  loop();
};
const degToRad = (deg) => {
  return deg * (Math.PI / 180);
};
const camelCaseToHyphen = (str) => {
  return str.replace(/([a-z])([A-Z])/g, (...args) => {
    return args[1] + "-" + args[2].toLowerCase();
  });
};
const nextTick = function(fn, ctx) {
  let pending = false;
  let timerFunc = null;
  let handle = () => {
    pending = false;
    ctx ? fn.call(ctx) : fn();
  };
  if (typeof MutationObserver !== "undefined") {
    let counter = 1;
    let observer = new MutationObserver(handle);
    let textNode = document.createTextNode(counter);
    observer.observe(textNode, {
      characterData: true
      // 设为 true 表示监视指定目标节点或子节点树中节点所包含的字符数据的变化
    });
    timerFunc = function() {
      counter = (counter + 1) % 2;
      textNode.data = counter;
    };
  } else {
    timerFunc = setTimeout;
  }
  return function() {
    if (pending) return;
    pending = true;
    timerFunc(handle, 0);
  };
};
const checkNodeOuter = (mindMap, node, offsetX = 0, offsetY = 0) => {
  let elRect = mindMap.elRect;
  let { scaleX, scaleY, translateX, translateY } = mindMap.draw.transform();
  let { left, top, width: width2, height: height2 } = node;
  let right = (left + width2) * scaleX + translateX;
  let bottom = (top + height2) * scaleY + translateY;
  left = left * scaleX + translateX;
  top = top * scaleY + translateY;
  let offsetLeft = 0;
  let offsetTop = 0;
  if (left < 0 + offsetX) {
    offsetLeft = -left + offsetX;
  }
  if (right > elRect.width - offsetX) {
    offsetLeft = -(right - elRect.width) - offsetX;
  }
  if (top < 0 + offsetY) {
    offsetTop = -top + offsetY;
  }
  if (bottom > elRect.height - offsetY) {
    offsetTop = -(bottom - elRect.height) - offsetY;
  }
  return {
    isOuter: offsetLeft !== 0 || offsetTop !== 0,
    offsetLeft,
    offsetTop
  };
};
let getTextFromHtmlEl = null;
const getTextFromHtml = (html2) => {
  if (!getTextFromHtmlEl) {
    getTextFromHtmlEl = document.createElement("div");
  }
  getTextFromHtmlEl.innerHTML = html2;
  return getTextFromHtmlEl.textContent;
};
const readBlob = (blob) => {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = (evt) => {
      resolve(evt.target.result);
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsDataURL(blob);
  });
};
const getImageSize = (src) => {
  return new Promise((resolve) => {
    let img = new Image();
    img.src = src;
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height
      });
    };
    img.onerror = () => {
      resolve({
        width: 0,
        height: 0
      });
    };
  });
};
const createUid = () => {
  return v4();
};
const loadImage = (imgFile) => {
  return new Promise((resolve, reject) => {
    let fr = new FileReader();
    fr.readAsDataURL(imgFile);
    fr.onload = async (e) => {
      let url = e.target.result;
      let size2 = await getImageSize(url);
      resolve({
        url,
        size: size2
      });
    };
    fr.onerror = (error) => {
      reject(error);
    };
  });
};
const removeHTMLEntities = (str) => {
  [["&nbsp;", "&#160;"]].forEach((item) => {
    str = str.replace(new RegExp(item[0], "g"), item[1]);
  });
  return str;
};
const getType = (data2) => {
  return Object.prototype.toString.call(data2).slice(8, -1);
};
const isUndef = (data2) => {
  return data2 === null || data2 === void 0 || data2 === "";
};
let checkIsRichTextEl = null;
const checkIsRichText = (str) => {
  if (!checkIsRichTextEl) {
    checkIsRichTextEl = document.createElement("div");
  }
  checkIsRichTextEl.innerHTML = str;
  for (let c = checkIsRichTextEl.childNodes, i = c.length; i--; ) {
    if (c[i].nodeType == 1) return true;
  }
  return false;
};
let replaceHtmlTextEl = null;
const replaceHtmlText = (html2, searchText, replaceText) => {
  if (!replaceHtmlTextEl) {
    replaceHtmlTextEl = document.createElement("div");
  }
  replaceHtmlTextEl.innerHTML = html2;
  let walk2 = (root2) => {
    let childNodes = root2.childNodes;
    childNodes.forEach((node) => {
      if (node.nodeType === 1) {
        walk2(node);
      } else if (node.nodeType === 3) {
        root2.replaceChild(
          document.createTextNode(
            node.nodeValue.replace(new RegExp(searchText, "g"), replaceText)
          ),
          node
        );
      }
    });
  };
  walk2(replaceHtmlTextEl);
  return replaceHtmlTextEl.innerHTML;
};
const isWhite = (color) => {
  color = String(color).replace(/\s+/g, "");
  return ["#fff", "#ffffff", "#FFF", "#FFFFFF", "rgb(255,255,255)"].includes(
    color
  ) || /rgba\(255,255,255,[^)]+\)/.test(color);
};
const isTransparent = (color) => {
  color = String(color).replace(/\s+/g, "");
  return ["", "transparent"].includes(color) || /rgba\(\d+,\d+,\d+,0\)/.test(color);
};
const getVisibleColorFromTheme = (themeConfig) => {
  let { lineColor, root: root2, second, node } = themeConfig;
  let list = [
    lineColor,
    root2.fillColor,
    root2.color,
    second.fillColor,
    second.color,
    node.fillColor,
    node.color,
    root2.borderColor,
    second.borderColor,
    node.borderColor
  ];
  for (let i = 0; i < list.length; i++) {
    let color = list[i];
    if (!isTransparent(color) && !isWhite(color)) {
      return color;
    }
  }
};
const removeFormulaTags = (node) => {
  const walk2 = (root2) => {
    const childNodes = root2.childNodes;
    childNodes.forEach((node2) => {
      if (node2.nodeType === 1) {
        if (node2.classList.contains("ql-formula")) {
          node2.parentNode.removeChild(node2);
        } else {
          walk2(node2);
        }
      }
    });
  };
  walk2(node);
};
let nodeRichTextToTextWithWrapEl = null;
const nodeRichTextToTextWithWrap = (html2) => {
  if (!nodeRichTextToTextWithWrapEl) {
    nodeRichTextToTextWithWrapEl = document.createElement("div");
  }
  nodeRichTextToTextWithWrapEl.innerHTML = html2;
  const childNodes = nodeRichTextToTextWithWrapEl.childNodes;
  let res = "";
  for (let i = 0; i < childNodes.length; i++) {
    const node = childNodes[i];
    if (node.nodeType === 1) {
      removeFormulaTags(node);
      if (node.tagName.toLowerCase() === "p") {
        res += node.textContent + "\n";
      } else {
        res += node.textContent;
      }
    } else if (node.nodeType === 3) {
      res += node.nodeValue;
    }
  }
  return res.replace(/\n$/, "");
};
let removeRichTextStyesEl = null;
const removeRichTextStyes = (html2) => {
  if (!removeRichTextStyesEl) {
    removeRichTextStyesEl = document.createElement("div");
  }
  removeRichTextStyesEl.innerHTML = html2;
  const formulaList = removeRichTextStyesEl.querySelectorAll(".ql-formula");
  Array.from(formulaList).forEach((el) => {
    const placeholder = document.createTextNode("$smmformula$");
    el.parentNode.replaceChild(placeholder, el);
  });
  const childNodes = removeRichTextStyesEl.childNodes;
  let list = [];
  for (let i = 0; i < childNodes.length; i++) {
    const node = childNodes[i];
    if (node.nodeType === 1) {
      list.push(node.textContent);
    } else if (node.nodeType === 3) {
      list.push(node.nodeValue);
    }
  }
  html2 = list.map((item) => {
    return `<p><span>${htmlEscape(item)}</span></p>`;
  }).join("");
  if (formulaList.length > 0) {
    html2 = html2.replace(/\$smmformula\$/g, '<span class="smmformula"></span>');
    removeRichTextStyesEl.innerHTML = html2;
    const els = removeRichTextStyesEl.querySelectorAll(".smmformula");
    Array.from(els).forEach((el, index) => {
      el.parentNode.replaceChild(formulaList[index], el);
    });
    html2 = removeRichTextStyesEl.innerHTML;
  }
  return html2;
};
const getObjectChangedProps = (oldObject, newObject) => {
  const res = {};
  Object.keys(newObject).forEach((prop) => {
    const oldVal = oldObject[prop];
    const newVal = newObject[prop];
    if (getType(oldVal) !== getType(newVal)) {
      res[prop] = newVal;
      return;
    }
    if (getType(oldVal) === "Object") {
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        res[prop] = newVal;
        return;
      }
    } else {
      if (oldVal !== newVal) {
        res[prop] = newVal;
        return;
      }
    }
  });
  return res;
};
const checkIsNodeStyleDataKey = (key) => {
  if (/^_/.test(key)) return false;
  if (!nodeDataNoStylePropList.includes(key)) {
    return true;
  }
  return false;
};
const isNodeNotNeedRenderData = (config) => {
  const list = [...lineStyleProps];
  const keys = Object.keys(config);
  for (let i = 0; i < keys.length; i++) {
    if (!list.includes(keys[i])) {
      return false;
    }
  }
  return true;
};
const mergerIconList = (list) => {
  return list.reduce((result, item) => {
    const existingItem = result.find((x2) => x2.type === item.type);
    if (existingItem) {
      item.list.forEach((newObj) => {
        const existingObj = existingItem.list.find((x2) => x2.name === newObj.name);
        if (existingObj) {
          existingObj.icon = newObj.icon;
        } else {
          existingItem.list.push(newObj);
        }
      });
    } else {
      result.push({ ...item });
    }
    return result;
  }, []);
};
const getTopAncestorsFomNodeList = (list) => {
  let res = [];
  list.forEach((node) => {
    if (!list.find((item) => {
      return item.uid !== node.uid && item.isAncestor(node);
    })) {
      res.push(node);
    }
  });
  return res;
};
const parseAddGeneralizationNodeList = (list) => {
  const cache = {};
  const uidToParent = {};
  list.forEach((node) => {
    const parent = node.parent;
    if (parent) {
      const pUid = parent.uid;
      uidToParent[pUid] = parent;
      const index = node.getIndexInBrothers();
      const data2 = {
        node,
        index
      };
      if (cache[pUid]) {
        if (!cache[pUid].find((item) => {
          return item.index === data2.index;
        })) {
          cache[pUid].push(data2);
        }
      } else {
        cache[pUid] = [data2];
      }
    }
  });
  const res = [];
  Object.keys(cache).forEach((uid) => {
    if (cache[uid].length > 1) {
      const rangeList = cache[uid].map((item) => {
        return item.index;
      }).sort((a, b) => {
        return a - b;
      });
      res.push({
        node: uidToParent[uid],
        range: [rangeList[0], rangeList[rangeList.length - 1]]
      });
    } else {
      res.push({
        node: cache[uid][0].node
      });
    }
  });
  return res;
};
const checkTwoRectIsOverlap = (minx1, maxx1, miny1, maxy1, minx2, maxx2, miny2, maxy2) => {
  return maxx1 > minx2 && maxx2 > minx1 && maxy1 > miny2 && maxy2 > miny1;
};
const focusInput = (el) => {
  let selection = window.getSelection();
  let range = document.createRange();
  range.selectNodeContents(el);
  range.collapse();
  selection.removeAllRanges();
  selection.addRange(range);
};
const selectAllInput = (el) => {
  let selection = window.getSelection();
  let range = document.createRange();
  range.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(range);
};
const addDataToAppointNodes = (appointNodes, data2 = {}) => {
  data2 = { ...data2 };
  const alreadyIsRichText = data2 && data2.richText;
  if (alreadyIsRichText && data2.resetRichText) {
    delete data2.resetRichText;
  }
  const walk2 = (list) => {
    list.forEach((node) => {
      node.data = {
        ...node.data,
        ...data2
      };
      if (node.children && node.children.length > 0) {
        walk2(node.children);
      }
    });
  };
  walk2(appointNodes);
  return appointNodes;
};
const createUidForAppointNodes = (appointNodes, createNewId = false, handle = null, handleGeneralization = false) => {
  const walk2 = (list) => {
    list.forEach((node) => {
      if (!node.data) {
        node.data = {};
      }
      if (createNewId || isUndef(node.data.uid)) {
        node.data.uid = createUid();
      }
      if (handleGeneralization) {
        const generalizationList = formatGetNodeGeneralization(node.data);
        generalizationList.forEach((gNode) => {
          if (createNewId || isUndef(gNode.uid)) {
            gNode.uid = createUid();
          }
        });
      }
      handle && handle(node);
      if (node.children && node.children.length > 0) {
        walk2(node.children);
      }
    });
  };
  walk2(appointNodes);
  return appointNodes;
};
const formatDataToArray = (data2) => {
  if (!data2) return [];
  return Array.isArray(data2) ? data2 : [data2];
};
const getNodeDataIndex = (node) => {
  return node.parent ? node.parent.nodeData.children.findIndex((item) => {
    return item.data.uid === node.uid;
  }) : 0;
};
const getNodeIndexInNodeList = (node, nodeList) => {
  return nodeList.findIndex((item) => {
    return item.uid === node.uid;
  });
};
const generateColorByContent = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const rng2 = new MersenneTwister(hash);
  const h = rng2.genrand_int32() % 360;
  return "hsla(" + h + ", 50%, 50%, 1)";
};
const htmlEscape = (str) => {
  [
    ["&", "&amp;"],
    ["<", "&lt;"],
    [">", "&gt;"]
  ].forEach((item) => {
    str = str.replace(new RegExp(item[0], "g"), item[1]);
  });
  return str;
};
const isSameObject = (a, b) => {
  const type = getType(a);
  if (type !== getType(b)) return false;
  if (type === "Object") {
    const keysa = Object.keys(a);
    const keysb = Object.keys(b);
    if (keysa.length !== keysb.length) return false;
    for (let i = 0; i < keysa.length; i++) {
      const key = keysa[i];
      if (!keysb.includes(key)) return false;
      const isSame = isSameObject(a[key], b[key]);
      if (!isSame) {
        return false;
      }
    }
    return true;
  } else if (type === "Array") {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const itema = a[i];
      const itemb = b[i];
      const typea = getType(itema);
      const typeb = getType(itemb);
      if (typea !== typeb) return false;
      const isSame = isSameObject(itema, itemb);
      if (!isSame) {
        return false;
      }
    }
    return true;
  } else {
    return a === b;
  }
};
const checkClipboardReadEnable = () => {
  return navigator.clipboard && typeof navigator.clipboard.read === "function";
};
const setDataToClipboard = (data2) => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(JSON.stringify(data2));
  }
};
const getDataFromClipboard = async () => {
  let text = null;
  let img = null;
  if (checkClipboardReadEnable()) {
    const items = await navigator.clipboard.read();
    if (items && items.length > 0) {
      for (const clipboardItem of items) {
        for (const type of clipboardItem.types) {
          if (/^image\//.test(type)) {
            img = await clipboardItem.getType(type);
          } else if (type === "text/plain") {
            const blob = await clipboardItem.getType(type);
            text = await blob.text();
          }
        }
      }
    }
  }
  return {
    text,
    img
  };
};
const removeFromParentNodeData = (node) => {
  if (!node || !node.parent) return;
  const index = getNodeDataIndex(node);
  if (index === -1) return;
  node.parent.nodeData.children.splice(index, 1);
};
const handleSelfCloseTags = (str) => {
  selfCloseTagList.forEach((tagName) => {
    str = str.replace(
      new RegExp(`<${tagName}([^>]*)>`, "g"),
      `<${tagName} $1 />`
    );
  });
  return str;
};
const checkNodeListIsEqual = (list1, list2) => {
  if (list1.length !== list2.length) return false;
  for (let i = 0; i < list1.length; i++) {
    if (!list2.find((item) => {
      return item.uid === list1[i].uid;
    })) {
      return false;
    }
  }
  return true;
};
const createSmmFormatData = (data2) => {
  return {
    simpleMindMap: true,
    data: data2
  };
};
const checkSmmFormatData = (data2) => {
  let smmData = null;
  if (typeof data2 === "string") {
    try {
      const parsedData = JSON.parse(data2);
      if (typeof parsedData === "object" && parsedData.simpleMindMap) {
        smmData = parsedData.data;
      }
    } catch (error) {
    }
  } else if (typeof data2 === "object" && data2.simpleMindMap) {
    smmData = data2.data;
  }
  const isSmm = !!smmData;
  return {
    isSmm,
    data: isSmm ? smmData : String(data2)
  };
};
const handleInputPasteText = (e, text) => {
  e.preventDefault();
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  selection.deleteFromDocument();
  text = text || e.clipboardData.getData("text");
  text = htmlEscape(text);
  text = getTextFromHtml(text);
  const textArr = text.split(/\n/g);
  const fragment = document.createDocumentFragment();
  textArr.forEach((item, index) => {
    const node = document.createTextNode(item);
    fragment.appendChild(node);
    if (index < textArr.length - 1) {
      const br = document.createElement("br");
      fragment.appendChild(br);
    }
  });
  selection.getRangeAt(0).insertNode(fragment);
  selection.collapseToEnd();
};
const transformTreeDataToObject = (data2) => {
  const res = {};
  const walk2 = (root2, parent) => {
    const uid = root2.data.uid;
    if (parent) {
      parent.children.push(uid);
    }
    res[uid] = {
      isRoot: !parent,
      data: {
        ...root2.data
      },
      children: []
    };
    if (root2.children && root2.children.length > 0) {
      root2.children.forEach((item) => {
        walk2(item, res[uid]);
      });
    }
  };
  walk2(data2, null);
  return res;
};
const handleGetSvgDataExtraContent = ({
  addContentToHeader,
  addContentToFooter
}) => {
  const cssTextList = [];
  let header = null;
  let headerHeight = 0;
  let footer = null;
  let footerHeight = 0;
  const handle = (fn, callback) => {
    if (typeof fn === "function") {
      const res = fn();
      if (!res) return;
      const { el, cssText, height: height2 } = res;
      if (el instanceof HTMLElement) {
        addXmlns(el);
        const foreignObject = createForeignObjectNode({ el, height: height2 });
        callback(foreignObject, height2);
      }
      if (cssText) {
        cssTextList.push(cssText);
      }
    }
  };
  handle(addContentToHeader, (foreignObject, height2) => {
    header = foreignObject;
    headerHeight = height2;
  });
  handle(addContentToFooter, (foreignObject, height2) => {
    footer = foreignObject;
    footerHeight = height2;
  });
  return {
    cssTextList,
    header,
    headerHeight,
    footer,
    footerHeight
  };
};
const getNodeTreeBoundingRect = (node, x2 = 0, y2 = 0, paddingX = 0, paddingY = 0, excludeSelf = false, excludeGeneralization = false) => {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const walk2 = (root2, isRoot) => {
    if (!(isRoot && excludeSelf) && root2.group) {
      try {
        const { x: x3, y: y3, width: width2, height: height2 } = root2.group.findOne(".smm-node-shape").rbox();
        if (x3 < minX) {
          minX = x3;
        }
        if (x3 + width2 > maxX) {
          maxX = x3 + width2;
        }
        if (y3 < minY) {
          minY = y3;
        }
        if (y3 + height2 > maxY) {
          maxY = y3 + height2;
        }
      } catch (e) {
      }
    }
    if (!excludeGeneralization && root2._generalizationList.length > 0) {
      root2._generalizationList.forEach((item) => {
        walk2(item.generalizationNode);
      });
    }
    if (root2.children) {
      root2.children.forEach((item) => {
        walk2(item);
      });
    }
  };
  walk2(node, true);
  minX = minX - x2 + paddingX;
  minY = minY - y2 + paddingY;
  maxX = maxX - x2 + paddingX;
  maxY = maxY - y2 + paddingY;
  return {
    left: minX,
    top: minY,
    width: maxX - minX,
    height: maxY - minY
  };
};
const getOnfullscreEnevt = () => {
  if (document.documentElement.requestFullScreen) {
    return "fullscreenchange";
  } else if (document.documentElement.webkitRequestFullScreen) {
    return "webkitfullscreenchange";
  } else if (document.documentElement.mozRequestFullScreen) {
    return "mozfullscreenchange";
  } else if (document.documentElement.msRequestFullscreen) {
    return "msfullscreenchange";
  }
};
getOnfullscreEnevt();
const createForeignObjectNode = ({ el, width: width2, height: height2 }) => {
  const foreignObject = new ForeignObject();
  if (width2 !== void 0) {
    foreignObject.width(width2);
  }
  if (height2 !== void 0) {
    foreignObject.height(height2);
  }
  foreignObject.add(el);
  return foreignObject;
};
const formatGetNodeGeneralization = (data2) => {
  const generalization = data2.generalization;
  if (generalization) {
    return Array.isArray(generalization) ? generalization : [generalization];
  } else {
    return [];
  }
};
const addXmlns = (el) => {
  el.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
};
const sortNodeList = (nodeList) => {
  nodeList = [...nodeList];
  nodeList.sort((a, b) => {
    return a.sortIndex - b.sortIndex;
  });
  return nodeList;
};
const mergeTheme = (dest, source) => {
  return deepmerge_1(dest, source, {
    arrayMerge: (destinationArray, sourceArray) => {
      return sourceArray;
    }
  });
};
const getNodeRichTextStyles = (node) => {
  const res = {};
  richTextSupportStyleList.forEach((prop) => {
    let value = node.style.merge(prop);
    if (prop === "fontSize") {
      value = value + "px";
    }
    res[prop] = value;
  });
  return res;
};
const backgroundStyleProps = [
  "backgroundColor",
  "backgroundImage",
  "backgroundRepeat",
  "backgroundPosition",
  "backgroundSize"
];
const shapeStyleProps = [
  "gradientStyle",
  "startColor",
  "endColor",
  "startDir",
  "endDir",
  "fillColor",
  "borderColor",
  "borderWidth",
  "borderDasharray"
];
class Style2 {
  //   设置背景样式
  static setBackgroundStyle(el, themeConfig) {
    if (!el) return;
    if (!Style2.cacheStyle) {
      Style2.cacheStyle = {};
      let style = window.getComputedStyle(el);
      backgroundStyleProps.forEach((prop) => {
        Style2.cacheStyle[prop] = style[prop];
      });
    }
    let {
      backgroundColor,
      backgroundImage,
      backgroundRepeat,
      backgroundPosition,
      backgroundSize
    } = themeConfig;
    el.style.backgroundColor = backgroundColor;
    if (backgroundImage && backgroundImage !== "none") {
      el.style.backgroundImage = `url(${backgroundImage})`;
      el.style.backgroundRepeat = backgroundRepeat;
      el.style.backgroundPosition = backgroundPosition;
      el.style.backgroundSize = backgroundSize;
    } else {
      el.style.backgroundImage = "none";
    }
  }
  // 移除背景样式
  static removeBackgroundStyle(el) {
    if (!Style2.cacheStyle) return;
    backgroundStyleProps.forEach((prop) => {
      el.style[prop] = Style2.cacheStyle[prop];
    });
    Style2.cacheStyle = null;
  }
  //  构造函数
  constructor(ctx) {
    this.ctx = ctx;
    this._markerPath = null;
    this._marker = null;
    this._gradient = null;
  }
  //  合并样式
  merge(prop, root2) {
    let themeConfig = this.ctx.mindMap.themeConfig;
    let defaultConfig = null;
    let useRoot = false;
    if (root2) {
      useRoot = true;
      defaultConfig = themeConfig;
    } else if (this.ctx.isGeneralization) {
      defaultConfig = themeConfig.generalization;
    } else if (this.ctx.layerIndex === 0) {
      defaultConfig = themeConfig.root;
    } else if (this.ctx.layerIndex === 1) {
      defaultConfig = themeConfig.second;
    } else {
      defaultConfig = themeConfig.node;
    }
    let value = "";
    if (this.getSelfStyle(prop) !== void 0) {
      value = this.getSelfStyle(prop);
    } else if (defaultConfig[prop] !== void 0) {
      value = defaultConfig[prop];
    } else {
      value = themeConfig[prop];
    }
    if (!useRoot) {
      this.addToEffectiveStyles({
        [prop]: value
      });
    }
    return value;
  }
  //  获取某个样式值
  getStyle(prop, root2) {
    return this.merge(prop, root2);
  }
  //  获取自身自定义样式
  getSelfStyle(prop) {
    return this.ctx.getData(prop);
  }
  // 更新当前节点生效的样式数据
  addToEffectiveStyles(styles) {
    if (!this.ctx.mindMap.painter) return;
    this.ctx.effectiveStyles = {
      ...this.ctx.effectiveStyles,
      ...styles
    };
  }
  //  矩形
  rect(node) {
    this.shape(node);
    node.radius(this.merge("borderRadius"));
  }
  // 形状
  shape(node) {
    const styles = {};
    shapeStyleProps.forEach((key) => {
      styles[key] = this.merge(key);
    });
    if (styles.gradientStyle) {
      if (!this._gradient) {
        this._gradient = this.ctx.nodeDraw.gradient("linear");
      }
      this._gradient.update((add) => {
        add.stop(0, styles.startColor);
        add.stop(1, styles.endColor);
      });
      this._gradient.from(...styles.startDir).to(...styles.endDir);
      node.fill(this._gradient);
    } else {
      node.fill({
        color: styles.fillColor
      });
    }
    node.stroke({
      color: styles.borderColor,
      width: styles.borderWidth,
      dasharray: styles.borderDasharray
    });
  }
  //  文字
  text(node) {
    const styles = {
      color: this.merge("color"),
      fontFamily: this.merge("fontFamily"),
      fontSize: this.merge("fontSize"),
      fontWeight: this.merge("fontWeight"),
      fontStyle: this.merge("fontStyle"),
      textDecoration: this.merge("textDecoration")
    };
    node.fill({
      color: styles.color
    }).css({
      "font-family": styles.fontFamily,
      "font-size": styles.fontSize + "px",
      "font-weight": styles.fontWeight,
      "font-style": styles.fontStyle,
      "text-decoration": styles.textDecoration
    });
  }
  //  html文字节点
  domText(node, fontSizeScale = 1) {
    const styles = {
      color: this.merge("color"),
      fontFamily: this.merge("fontFamily"),
      fontSize: this.merge("fontSize"),
      fontWeight: this.merge("fontWeight"),
      fontStyle: this.merge("fontStyle"),
      textDecoration: this.merge("textDecoration"),
      textAlign: this.merge("textAlign")
    };
    node.style.color = styles.color;
    node.style.textDecoration = styles.textDecoration;
    node.style.fontFamily = styles.fontFamily;
    node.style.fontSize = styles.fontSize * fontSizeScale + "px";
    node.style.fontWeight = styles.fontWeight || "normal";
    node.style.fontStyle = styles.fontStyle;
    node.style.textAlign = styles.textAlign;
  }
  //  标签文字
  tagText(node, style) {
    node.fill({
      color: "#fff"
    }).css({
      "font-size": style.fontSize + "px"
    });
  }
  //  标签矩形
  tagRect(node, style) {
    node.fill({
      color: style.fill
    });
    if (style.radius) {
      node.radius(style.radius);
    }
  }
  //  内置图标
  iconNode(node, color) {
    node.attr({
      fill: color || this.merge("color")
    });
  }
  //  连线
  line(line, { width: width2, color, dasharray } = {}, enableMarker, childNode) {
    const { customHandleLine } = this.ctx.mindMap.opt;
    if (typeof customHandleLine === "function") {
      customHandleLine(this.ctx, line, { width: width2, color, dasharray });
    }
    line.stroke({ color, dasharray, width: width2 }).fill({ color: "none" });
    if (enableMarker) {
      const showMarker = this.merge("showLineMarker", true);
      const childNodeStyle = childNode.style;
      if (showMarker) {
        childNodeStyle._marker = childNodeStyle._marker || childNodeStyle.createMarker();
        childNodeStyle._markerPath.stroke({ color }).fill({ color });
        line.attr("marker-start", "");
        line.attr("marker-end", "");
        const dir = childNodeStyle.merge("lineMarkerDir");
        line.marker(dir, childNodeStyle._marker);
      } else if (childNodeStyle._marker) {
        line.attr("marker-start", "");
        line.attr("marker-end", "");
        childNodeStyle._marker.remove();
        childNodeStyle._marker = null;
      }
    }
  }
  // 创建箭头
  createMarker() {
    return this.ctx.lineDraw.marker(20, 20, (add) => {
      add.ref(8, 5);
      add.size(20, 20);
      add.attr("markerUnits", "userSpaceOnUse");
      add.attr("orient", "auto-start-reverse");
      this._markerPath = add.path("M0,0 L2,5 L0,10 L10,5 Z");
    });
  }
  //  概要连线
  generalizationLine(node) {
    node.stroke({
      width: this.merge("generalizationLineWidth", true),
      color: this.merge("generalizationLineColor", true)
    }).fill({ color: "none" });
  }
  //  展开收起按钮
  iconBtn(node, node2, fillNode) {
    let { color, fill, fontSize, fontColor } = this.ctx.mindMap.opt.expandBtnStyle || {
      color: "#808080",
      fill: "#fff",
      fontSize: 12,
      fontColor: "#333333"
    };
    node.fill({ color });
    node2.fill({ color });
    fillNode.fill({ color: fill });
    if (this.ctx.mindMap.opt.isShowExpandNum) {
      node.attr({ "font-size": fontSize + "px", "font-color": fontColor });
    }
  }
  // 是否设置了自定义的样式
  hasCustomStyle() {
    let res = false;
    Object.keys(this.ctx.getData()).forEach((item) => {
      if (checkIsNodeStyleDataKey(item)) {
        res = true;
      }
    });
    return res;
  }
  // 获取自定义的样式
  getCustomStyle() {
    const customStyle = {};
    Object.keys(this.ctx.getData()).forEach((item) => {
      if (checkIsNodeStyleDataKey(item)) {
        customStyle[item] = this.ctx.getData(item);
      }
    });
    return customStyle;
  }
  // hover和激活节点
  hoverNode(node) {
    const hoverRectColor = this.merge("hoverRectColor") || this.ctx.mindMap.opt.hoverRectColor;
    const hoverRectRadius = this.merge("hoverRectRadius");
    node.radius(hoverRectRadius).fill("none").stroke({
      color: hoverRectColor
    });
  }
  // 所属节点被删除时的操作
  onRemove() {
    if (this._marker) {
      this._marker.remove();
      this._marker = null;
    }
    if (this._markerPath) {
      this._markerPath.remove();
      this._markerPath = null;
    }
    if (this._gradient) {
      this._gradient.remove();
      this._gradient = null;
    }
  }
}
Style2.cacheStyle = null;
class Shape2 {
  constructor(node) {
    this.node = node;
    this.mindMap = node.mindMap;
  }
  //  形状需要的padding
  getShapePadding(width2, height2, paddingX, paddingY) {
    const shape = this.node.getShape();
    const defaultPaddingX = 15;
    const defaultPaddingY = 5;
    const actWidth = width2 + paddingX * 2;
    const actHeight = height2 + paddingY * 2;
    const actOffset = Math.abs(actWidth - actHeight);
    switch (shape) {
      case CONSTANTS.SHAPE.ROUNDED_RECTANGLE:
        return {
          paddingX: height2 > width2 ? (height2 - width2) / 2 : 0,
          paddingY: 0
        };
      case CONSTANTS.SHAPE.DIAMOND:
        return {
          paddingX: width2 / 2,
          paddingY: height2 / 2
        };
      case CONSTANTS.SHAPE.PARALLELOGRAM:
        return {
          paddingX: paddingX <= 0 ? defaultPaddingX : 0,
          paddingY: 0
        };
      case CONSTANTS.SHAPE.OUTER_TRIANGULAR_RECTANGLE:
        return {
          paddingX: paddingX <= 0 ? defaultPaddingX : 0,
          paddingY: 0
        };
      case CONSTANTS.SHAPE.INNER_TRIANGULAR_RECTANGLE:
        return {
          paddingX: paddingX <= 0 ? defaultPaddingX : 0,
          paddingY: 0
        };
      case CONSTANTS.SHAPE.ELLIPSE:
        return {
          paddingX: paddingX <= 0 ? defaultPaddingX : 0,
          paddingY: paddingY <= 0 ? defaultPaddingY : 0
        };
      case CONSTANTS.SHAPE.CIRCLE:
        return {
          paddingX: actHeight > actWidth ? actOffset / 2 : 0,
          paddingY: actHeight < actWidth ? actOffset / 2 : 0
        };
    }
    const extendShape = this.getShapeFromExtendList(shape);
    if (extendShape) {
      return extendShape.getPadding({
        node: this.node,
        width: width2,
        height: height2,
        paddingX,
        paddingY
      }) || {
        paddingX: 0,
        paddingY: 0
      };
    } else {
      return {
        paddingX: 0,
        paddingY: 0
      };
    }
  }
  // 从形状扩展列表里获取指定名称的形状
  getShapeFromExtendList(shape) {
    return this.mindMap.extendShapeList.find((item) => {
      return item.name === shape;
    });
  }
  //  创建形状节点
  createShape() {
    const shape = this.node.getShape();
    let node = null;
    if (shape === CONSTANTS.SHAPE.RECTANGLE) {
      node = this.createRect();
    } else if (shape === CONSTANTS.SHAPE.DIAMOND) {
      node = this.createDiamond();
    } else if (shape === CONSTANTS.SHAPE.PARALLELOGRAM) {
      node = this.createParallelogram();
    } else if (shape === CONSTANTS.SHAPE.ROUNDED_RECTANGLE) {
      node = this.createRoundedRectangle();
    } else if (shape === CONSTANTS.SHAPE.OCTAGONAL_RECTANGLE) {
      node = this.createOctagonalRectangle();
    } else if (shape === CONSTANTS.SHAPE.OUTER_TRIANGULAR_RECTANGLE) {
      node = this.createOuterTriangularRectangle();
    } else if (shape === CONSTANTS.SHAPE.INNER_TRIANGULAR_RECTANGLE) {
      node = this.createInnerTriangularRectangle();
    } else if (shape === CONSTANTS.SHAPE.ELLIPSE) {
      node = this.createEllipse();
    } else if (shape === CONSTANTS.SHAPE.CIRCLE) {
      node = this.createCircle();
    }
    if (!node) {
      const extendShape = this.getShapeFromExtendList(shape);
      if (extendShape) {
        node = extendShape.createShape(this.node);
      }
    }
    return node || this.createRect();
  }
  // 获取节点减去节点边框宽度、hover节点边框宽度后的尺寸
  getNodeSize() {
    const borderWidth = this.node.getBorderWidth();
    let { width: width2, height: height2 } = this.node;
    width2 -= borderWidth;
    height2 -= borderWidth;
    return {
      width: width2,
      height: height2
    };
  }
  // 创建路径节点
  createPath(pathStr) {
    const { customCreateNodePath } = this.mindMap.opt;
    if (customCreateNodePath) {
      return SVG(customCreateNodePath(pathStr));
    }
    return new Path().plot(pathStr);
  }
  // 创建多边形节点
  createPolygon(points) {
    const { customCreateNodePolygon } = this.mindMap.opt;
    if (customCreateNodePolygon) {
      return SVG(customCreateNodePolygon(points));
    }
    return new Polygon().plot(points);
  }
  // 创建矩形
  createRect() {
    let { width: width2, height: height2 } = this.getNodeSize();
    let borderRadius = this.node.style.merge("borderRadius");
    const pathStr = `
      M${borderRadius},0
      L${width2 - borderRadius},0
      C${width2 - borderRadius},0 ${width2},${0} ${width2},${borderRadius}
      L${width2},${height2 - borderRadius}
      C${width2},${height2 - borderRadius} ${width2},${height2} ${width2 - borderRadius},${height2}
      L${borderRadius},${height2}
      C${borderRadius},${height2} ${0},${height2} ${0},${height2 - borderRadius}
      L${0},${borderRadius}
      C${0},${borderRadius} ${0},${0} ${borderRadius},${0}
      Z
    `;
    return this.createPath(pathStr);
  }
  //  创建菱形
  createDiamond() {
    let { width: width2, height: height2 } = this.getNodeSize();
    let halfWidth = width2 / 2;
    let halfHeight = height2 / 2;
    let topX = halfWidth;
    let topY = 0;
    let rightX = width2;
    let rightY = halfHeight;
    let bottomX = halfWidth;
    let bottomY = height2;
    let leftX = 0;
    let leftY = halfHeight;
    const points = [
      [topX, topY],
      [rightX, rightY],
      [bottomX, bottomY],
      [leftX, leftY]
    ];
    return this.createPolygon(points);
  }
  //  创建平行四边形
  createParallelogram() {
    let { paddingX } = this.node.getPaddingVale();
    paddingX = paddingX || this.node.shapePadding.paddingX;
    let { width: width2, height: height2 } = this.getNodeSize();
    const points = [
      [paddingX, 0],
      [width2, 0],
      [width2 - paddingX, height2],
      [0, height2]
    ];
    return this.createPolygon(points);
  }
  //  创建圆角矩形
  createRoundedRectangle() {
    let { width: width2, height: height2 } = this.getNodeSize();
    let halfHeight = height2 / 2;
    const pathStr = `
      M${halfHeight},0
      L${width2 - halfHeight},0
      A${height2 / 2},${height2 / 2} 0 0,1 ${width2 - halfHeight},${height2} 
      L${halfHeight},${height2}
      A${height2 / 2},${height2 / 2} 0 0,1 ${halfHeight},${0}
    `;
    return this.createPath(pathStr);
  }
  //  创建八角矩形
  createOctagonalRectangle() {
    let w = 5;
    let { width: width2, height: height2 } = this.getNodeSize();
    const points = [
      [0, w],
      [w, 0],
      [width2 - w, 0],
      [width2, w],
      [width2, height2 - w],
      [width2 - w, height2],
      [w, height2],
      [0, height2 - w]
    ];
    return this.createPolygon(points);
  }
  //  创建外三角矩形
  createOuterTriangularRectangle() {
    let { paddingX } = this.node.getPaddingVale();
    paddingX = paddingX || this.node.shapePadding.paddingX;
    let { width: width2, height: height2 } = this.getNodeSize();
    const points = [
      [paddingX, 0],
      [width2 - paddingX, 0],
      [width2, height2 / 2],
      [width2 - paddingX, height2],
      [paddingX, height2],
      [0, height2 / 2]
    ];
    return this.createPolygon(points);
  }
  //  创建内三角矩形
  createInnerTriangularRectangle() {
    let { paddingX } = this.node.getPaddingVale();
    paddingX = paddingX || this.node.shapePadding.paddingX;
    let { width: width2, height: height2 } = this.getNodeSize();
    const points = [
      [0, 0],
      [width2, 0],
      [width2 - paddingX / 2, height2 / 2],
      [width2, height2],
      [0, height2],
      [paddingX / 2, height2 / 2]
    ];
    return this.createPolygon(points);
  }
  //  创建椭圆
  createEllipse() {
    let { width: width2, height: height2 } = this.getNodeSize();
    let halfWidth = width2 / 2;
    let halfHeight = height2 / 2;
    const pathStr = `
      M${halfWidth},0
      A${halfWidth},${halfHeight} 0 0,1 ${halfWidth},${height2} 
      M${halfWidth},${height2} 
      A${halfWidth},${halfHeight} 0 0,1 ${halfWidth},${0} 
    `;
    return this.createPath(pathStr);
  }
  //  创建圆
  createCircle() {
    let { width: width2, height: height2 } = this.getNodeSize();
    let halfWidth = width2 / 2;
    let halfHeight = height2 / 2;
    const pathStr = `
      M${halfWidth},0
      A${halfWidth},${halfHeight} 0 0,1 ${halfWidth},${height2} 
      M${halfWidth},${height2} 
      A${halfWidth},${halfHeight} 0 0,1 ${halfWidth},${0} 
    `;
    return this.createPath(pathStr);
  }
}
const shapeList = [
  CONSTANTS.SHAPE.RECTANGLE,
  CONSTANTS.SHAPE.DIAMOND,
  CONSTANTS.SHAPE.PARALLELOGRAM,
  CONSTANTS.SHAPE.ROUNDED_RECTANGLE,
  CONSTANTS.SHAPE.OCTAGONAL_RECTANGLE,
  CONSTANTS.SHAPE.OUTER_TRIANGULAR_RECTANGLE,
  CONSTANTS.SHAPE.INNER_TRIANGULAR_RECTANGLE,
  CONSTANTS.SHAPE.ELLIPSE,
  CONSTANTS.SHAPE.CIRCLE
];
function formatGetGeneralization() {
  const data2 = this.getData("generalization");
  return Array.isArray(data2) ? data2 : data2 ? [data2] : [];
}
function checkHasGeneralization() {
  return this.formatGetGeneralization().length > 0;
}
function checkHasSelfGeneralization() {
  const list = this.formatGetGeneralization();
  return !!list.find((item) => {
    return !item.range || item.range.length <= 0;
  });
}
function getGeneralizationNodeIndex(node) {
  return this._generalizationList.findIndex((item) => {
    return item.generalizationNode.uid === node.uid;
  });
}
function createGeneralizationNode() {
  if (this.isGeneralization || !this.checkHasGeneralization()) {
    return;
  }
  let maxWidth = 0;
  let maxHeight = 0;
  const list = this.formatGetGeneralization();
  list.forEach((item, index) => {
    let cur = this._generalizationList[index];
    if (!cur) {
      cur = this._generalizationList[index] = {};
    }
    cur.node = this;
    cur.range = item.range;
    if (!cur.generalizationLine) {
      cur.generalizationLine = this.lineDraw.path();
    }
    if (!cur.generalizationNode) {
      cur.generalizationNode = new MindMapNode({
        data: {
          inserting: item.inserting,
          data: item
        },
        uid: createUid(),
        renderer: this.renderer,
        mindMap: this.mindMap,
        isGeneralization: true
      });
    }
    delete item.inserting;
    cur.generalizationNode.generalizationBelongNode = this;
    if (cur.generalizationNode.width > maxWidth)
      maxWidth = cur.generalizationNode.width;
    if (cur.generalizationNode.height > maxHeight)
      maxHeight = cur.generalizationNode.height;
    if (item.isActive) {
      this.renderer.addNodeToActiveList(cur.generalizationNode);
    }
  });
  this._generalizationNodeWidth = maxWidth;
  this._generalizationNodeHeight = maxHeight;
}
function updateGeneralization() {
  if (this.isGeneralization) return;
  this.removeGeneralization();
  this.createGeneralizationNode();
}
function renderGeneralization(forceRender) {
  if (this.isGeneralization) return;
  this.updateGeneralizationData();
  const list = this.formatGetGeneralization();
  if (list.length <= 0 || this.getData("expand") === false) {
    this.removeGeneralization();
    return;
  }
  if (list.length !== this._generalizationList.length) {
    this.removeGeneralization();
  }
  this.createGeneralizationNode();
  this.renderer.layout.renderGeneralization(this._generalizationList);
  this._generalizationList.forEach((item) => {
    this.style.generalizationLine(item.generalizationLine);
    item.generalizationNode.render(() => {
    }, forceRender);
  });
}
function updateGeneralizationData() {
  const childrenLength = this.getChildrenLength();
  const list = this.formatGetGeneralization();
  const newList = [];
  list.forEach((item) => {
    if (!item.range) {
      newList.push(item);
      return;
    }
    if (item.range.length > 0 && item.range[0] <= childrenLength - 1 && item.range[1] <= childrenLength - 1) {
      newList.push(item);
    }
  });
  if (newList.length !== list.length) {
    this.setData({
      generalization: newList
    });
  }
}
function removeGeneralization() {
  if (this.isGeneralization) return;
  this._generalizationList.forEach((item) => {
    item.generalizationNode.style.onRemove();
    if (item.generalizationLine) {
      item.generalizationLine.remove();
      item.generalizationLine = null;
    }
    if (item.generalizationNode) {
      this.renderer.removeNodeFromActiveList(item.generalizationNode);
      item.generalizationNode.remove();
      item.generalizationNode = null;
    }
  });
  this._generalizationList = [];
  if (this.generalizationBelongNode) {
    this.nodeDraw.find(".generalization_" + this.generalizationBelongNode.uid).remove();
  }
}
function hideGeneralization() {
  if (this.isGeneralization) return;
  this._generalizationList.forEach((item) => {
    if (item.generalizationLine) item.generalizationLine.hide();
    if (item.generalizationNode) item.generalizationNode.hide();
  });
}
function showGeneralization() {
  if (this.isGeneralization) return;
  this._generalizationList.forEach((item) => {
    if (item.generalizationLine) item.generalizationLine.show();
    if (item.generalizationNode) item.generalizationNode.show();
  });
}
function setGeneralizationOpacity(val) {
  this._generalizationList.forEach((item) => {
    item.generalizationLine.opacity(val);
    item.generalizationNode.group.opacity(val);
  });
}
function handleGeneralizationMouseenter() {
  const belongNode = this.generalizationBelongNode;
  const list = belongNode.formatGetGeneralization();
  const index = belongNode.getGeneralizationNodeIndex(this);
  const generalizationData = list[index];
  const hoverRectColor = this.getStyle("hoverRectColor");
  const color = hoverRectColor || this.mindMap.opt.hoverRectColor;
  const style = color ? {
    stroke: color
  } : null;
  if (Array.isArray(generalizationData.range) && generalizationData.range.length > 0) {
    this.mindMap.renderer.highlightNode(
      belongNode,
      generalizationData.range,
      style
    );
  } else {
    this.mindMap.renderer.highlightNode(belongNode, null, style);
  }
}
function handleGeneralizationMouseleave() {
  this.mindMap.renderer.closeHighlightNode();
}
const nodeGeneralizationMethods = {
  formatGetGeneralization,
  checkHasGeneralization,
  checkHasSelfGeneralization,
  getGeneralizationNodeIndex,
  createGeneralizationNode,
  updateGeneralization,
  updateGeneralizationData,
  renderGeneralization,
  removeGeneralization,
  hideGeneralization,
  showGeneralization,
  setGeneralizationOpacity,
  handleGeneralizationMouseenter,
  handleGeneralizationMouseleave
};
const open = `<svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="200" height="200"><path d="M475.136 327.168v147.968h-147.968v74.24h147.968v147.968h74.24v-147.968h147.968v-74.24h-147.968v-147.968h-74.24z m36.864-222.208c225.28 0 407.04 181.76 407.04 407.04s-181.76 407.04-407.04 407.04-407.04-181.76-407.04-407.04 181.76-407.04 407.04-407.04z m0-74.24c-265.216 0-480.768 215.552-480.768 480.768s215.552 480.768 480.768 480.768 480.768-215.552 480.768-480.768-215.552-480.768-480.768-480.768z"></path></svg>`;
const close = `<svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="200" height="200"><path d="M512 105.472c225.28 0 407.04 181.76 407.04 407.04s-181.76 407.04-407.04 407.04-407.04-181.76-407.04-407.04 181.76-407.04 407.04-407.04z m0-74.24c-265.216 0-480.768 215.552-480.768 480.768s215.552 480.768 480.768 480.768 480.768-215.552 480.768-480.768-215.552-480.768-480.768-480.768z"></path><path d="M252.928 474.624h518.144v74.24h-518.144z"></path></svg>`;
const quickCreateChild = `<svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="48" height="48"><path d="M514.048 62.464q93.184 0 175.616 35.328t143.872 96.768 96.768 143.872 35.328 175.616q0 94.208-35.328 176.128t-96.768 143.36-143.872 96.768-175.616 35.328q-94.208 0-176.64-35.328t-143.872-96.768-96.768-143.36-35.328-176.128q0-93.184 35.328-175.616t96.768-143.872 143.872-96.768 176.64-35.328zM772.096 576.512q26.624 0 45.056-18.944t18.432-45.568-18.432-45.056-45.056-18.432l-192.512 0 0-192.512q0-26.624-18.944-45.568t-45.568-18.944-45.056 18.944-18.432 45.568l0 192.512-192.512 0q-26.624 0-45.056 18.432t-18.432 45.056 18.432 45.568 45.056 18.944l192.512 0 0 191.488q0 26.624 18.432 45.568t45.056 18.944 45.568-18.944 18.944-45.568l0-191.488 192.512 0z"></path></svg>`;
const btnsSvg = {
  open,
  close,
  quickCreateChild
};
function createExpandNodeContent() {
  if (this._openExpandNode) {
    return;
  }
  const { expandBtnSize, expandBtnIcon, isShowExpandNum } = this.mindMap.opt;
  let { close: close2, open: open2 } = expandBtnIcon || {};
  if (isShowExpandNum) {
    this._openExpandNode = new Text();
    this._openExpandNode.addClass("smm-expand-btn-text");
    this._openExpandNode.attr({
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      x: expandBtnSize / 2,
      y: 2
    });
  } else {
    this._openExpandNode = SVG(open2 || btnsSvg.open).size(
      expandBtnSize,
      expandBtnSize
    );
    this._openExpandNode.x(0).y(-expandBtnSize / 2);
  }
  this._closeExpandNode = SVG(close2 || btnsSvg.close).size(
    expandBtnSize,
    expandBtnSize
  );
  this._closeExpandNode.x(0).y(-expandBtnSize / 2);
  this._fillExpandNode = new Circle().size(expandBtnSize);
  this._fillExpandNode.x(0).y(-expandBtnSize / 2);
  this.style.iconBtn(
    this._openExpandNode,
    this._closeExpandNode,
    this._fillExpandNode
  );
}
function sumNode(data2 = []) {
  return data2.reduce(
    (total, cur) => total + this.sumNode(cur.children || []),
    data2.length
  );
}
function updateExpandBtnNode() {
  let { expand } = this.getData();
  if (expand === this._lastExpandBtnType) return;
  if (this._expandBtn) {
    this._expandBtn.clear();
  }
  this.createExpandNodeContent();
  let node;
  if (expand === false) {
    node = this._openExpandNode;
    this._lastExpandBtnType = false;
  } else {
    node = this._closeExpandNode;
    this._lastExpandBtnType = true;
  }
  if (this._expandBtn) {
    let { isShowExpandNum, expandBtnStyle, expandBtnNumHandler } = this.mindMap.opt;
    if (isShowExpandNum) {
      if (!expand) {
        this._fillExpandNode.stroke({
          color: expandBtnStyle.strokeColor
        });
        let count = this.sumNode(this.nodeData.children || []);
        if (typeof expandBtnNumHandler === "function") {
          const res = expandBtnNumHandler(count, this);
          if (!isUndef(res)) {
            count = res;
          }
        }
        node.text(String(count));
      } else {
        this._fillExpandNode.stroke("none");
      }
    }
    this._expandBtn.add(this._fillExpandNode).add(node);
  }
}
function updateExpandBtnPos() {
  if (!this._expandBtn) {
    return;
  }
  this.renderer.layout.renderExpandBtn(this, this._expandBtn);
}
function renderExpandBtn() {
  if (this.getChildrenLength() <= 0 || this.isRoot) {
    return;
  }
  if (this._expandBtn) {
    this.group.add(this._expandBtn);
  } else {
    this._expandBtn = new G();
    this._expandBtn.on("mouseover", (e) => {
      e.stopPropagation();
      this._expandBtn.css({
        cursor: "pointer"
      });
    });
    this._expandBtn.on("mouseout", (e) => {
      e.stopPropagation();
      this._expandBtn.css({
        cursor: "auto"
      });
    });
    this._expandBtn.on("click", (e) => {
      e.stopPropagation();
      this.mindMap.execCommand("SET_NODE_EXPAND", this, !this.getData("expand"));
      this.mindMap.emit("expand_btn_click", this);
    });
    this._expandBtn.on("dblclick", (e) => {
      e.stopPropagation();
    });
    this._expandBtn.addClass("smm-expand-btn");
    this.group.add(this._expandBtn);
  }
  this._showExpandBtn = true;
  this.updateExpandBtnNode();
  this.updateExpandBtnPos();
}
function removeExpandBtn() {
  if (this._expandBtn && this._showExpandBtn) {
    this._expandBtn.remove();
    this._showExpandBtn = false;
  }
}
function showExpandBtn() {
  const { alwaysShowExpandBtn, notShowExpandBtn } = this.mindMap.opt;
  if (alwaysShowExpandBtn || notShowExpandBtn) return;
  setTimeout(() => {
    this.renderExpandBtn();
  }, 0);
}
function hideExpandBtn() {
  const { alwaysShowExpandBtn, notShowExpandBtn } = this.mindMap.opt;
  if (alwaysShowExpandBtn || this._isMouseenter || notShowExpandBtn) return;
  let { isActive, expand } = this.getData();
  if (!isActive && expand) {
    setTimeout(() => {
      this.removeExpandBtn();
    }, 0);
  }
}
const nodeExpandBtnMethods = {
  createExpandNodeContent,
  updateExpandBtnNode,
  updateExpandBtnPos,
  renderExpandBtn,
  removeExpandBtn,
  showExpandBtn,
  hideExpandBtn,
  sumNode
};
function setData(data2 = {}) {
  this.mindMap.execCommand("SET_NODE_DATA", this, data2);
}
function setText(text, richText, resetRichText) {
  this.mindMap.execCommand("SET_NODE_TEXT", this, text, richText, resetRichText);
}
function setImage(imgData) {
  this.mindMap.execCommand("SET_NODE_IMAGE", this, imgData);
}
function setIcon(icons) {
  this.mindMap.execCommand("SET_NODE_ICON", this, icons);
}
function setHyperlink(link, title) {
  this.mindMap.execCommand("SET_NODE_HYPERLINK", this, link, title);
}
function setNote(note2) {
  this.mindMap.execCommand("SET_NODE_NOTE", this, note2);
}
function setAttachment(url, name) {
  this.mindMap.execCommand("SET_NODE_ATTACHMENT", this, url, name);
}
function setTag(tag) {
  this.mindMap.execCommand("SET_NODE_TAG", this, tag);
}
function setShape(shape) {
  this.mindMap.execCommand("SET_NODE_SHAPE", this, shape);
}
function setStyle(prop, value) {
  this.mindMap.execCommand("SET_NODE_STYLE", this, prop, value);
}
function setStyles(style) {
  this.mindMap.execCommand("SET_NODE_STYLES", this, style);
}
const nodeCommandWrapsMethods = {
  setData,
  setText,
  setImage,
  setIcon,
  setHyperlink,
  setNote,
  setAttachment,
  setTag,
  setShape,
  setStyle,
  setStyles
};
const hyperlink = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024" ><path d="M435.484444 251.733333v68.892445L295.822222 320.682667a168.504889 168.504889 0 0 0-2.844444 336.952889h142.506666v68.892444H295.822222a237.397333 237.397333 0 0 1 0-474.794667h139.662222z m248.945778 0a237.397333 237.397333 0 0 1 0 474.851556H544.654222v-69.006222l139.776 0.056889a168.504889 168.504889 0 0 0 2.844445-336.952889H544.597333V251.676444h139.776z m-25.827555 203.946667a34.474667 34.474667 0 0 1 0 68.892444H321.649778a34.474667 34.474667 0 0 1 0-68.892444h336.952889z" ></path></svg>';
const note = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024" ><path d="M152.768 985.984 152.768 49.856l434.56 0 66.816 0 234.048 267.392 0 66.816 0 601.92L152.768 985.984 152.768 985.984zM654.144 193.088l0 124.16 108.736 0L654.144 193.088 654.144 193.088zM821.312 384.064l-167.168 0L587.328 384.064 587.328 317.312 587.328 116.736 219.584 116.736 219.584 919.04l601.728 0L821.312 384.064 821.312 384.064zM386.688 517.888 319.808 517.888 319.808 450.944l66.816 0L386.624 517.888 386.688 517.888zM386.688 651.584 319.808 651.584 319.808 584.704l66.816 0L386.624 651.584 386.688 651.584zM386.688 785.344 319.808 785.344l0-66.88 66.816 0L386.624 785.344 386.688 785.344zM721.024 517.888 453.632 517.888 453.632 450.944l267.392 0L721.024 517.888 721.024 517.888zM654.144 651.584 453.632 651.584 453.632 584.704l200.512 0L654.144 651.584 654.144 651.584zM620.672 785.344l-167.04 0 0-66.88 167.04 0L620.672 785.344 620.672 785.344z" ></path></svg>';
const attachment = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024" width="128" height="128"><path d="M516.373333 375.978667l136.576-136.576a147.797333 147.797333 0 0 1 208.853334-0.021334 147.690667 147.690667 0 0 1-0.042667 208.832l-204.8 204.778667v0.021333l-153.621333 153.6c-85.973333 85.973333-225.28 85.973333-311.253334 0.021334-85.994667-85.973333-85.973333-225.216 0.149334-311.36L431.146667 256.362667a21.333333 21.333333 0 0 0-30.165334-30.165334L162.069333 465.066667c-102.805333 102.826667-102.826667 269.056-0.149333 371.733333 102.613333 102.613333 268.970667 102.613333 371.584 0l153.6-153.642667h0.021333l0.021334-0.021333 204.778666-204.778667c74.325333-74.325333 74.346667-194.858667 0.021334-269.184-74.24-74.24-194.88-74.24-269.162667 0.042667l-136.576 136.554667-187.626667 187.626666a117.845333 117.845333 0 0 0-0.106666 166.826667 118.037333 118.037333 0 0 0 166.826666-0.106667l255.850667-255.829333a21.333333 21.333333 0 0 0-30.165333-30.165333L435.136 669.973333a75.370667 75.370667 0 0 1-106.496 0.106667 75.178667 75.178667 0 0 1 0.128-106.496l187.605333-187.605333z" ></path></svg>';
const nodeIconList = [
  {
    name: "优先级图标",
    type: "priority",
    list: [
      {
        name: "1",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512.042667 1024C229.248 1024 0 794.794667 0 511.957333 0 229.205333 229.248 0 512.042667 0 794.752 0 1024 229.205333 1024 511.957333 1024 794.794667 794.752 1024 512.042667 1024z" fill="#E93B30"></path><path d="M580.309333 256h-75.52c-10.666667 29.824-30.165333 55.765333-58.709333 78.165333-28.416 22.314667-54.869333 37.418667-79.146667 45.397334v84.608a320 320 0 0 0 120.234667-70.698667v352.085333H580.266667V256z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "2",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M511.957333 1024C229.248 1024 0 794.752 0 512S229.248 0 511.957333 0C794.752 0 1024 229.248 1024 512s-229.248 512-512.042667 512z" fill="#FA8D2E"></path><path d="M667.946667 658.602667h-185.301334c4.864-8.533333 11.178667-17.066667 19.072-25.984 7.808-8.874667 26.453333-26.837333 55.936-53.888 29.525333-27.008 49.877333-47.786667 61.226667-62.165334 16.981333-21.717333 29.44-42.453333 37.290667-62.293333 7.808-19.84 11.776-40.746667 11.776-62.677333 0-38.570667-13.738667-70.741333-41.088-96.725334C599.466667 268.928 561.706667 256 513.834667 256c-43.690667 0-80.128 11.136-109.354667 33.578667-29.098667 22.4-46.506667 59.306667-52.010667 110.805333l93.184 9.301333c1.792-27.349333 8.405333-46.890667 19.754667-58.624 11.434667-11.776 26.837333-17.664 46.165333-17.664 19.541333 0 34.858667 5.589333 45.909334 16.768 11.136 11.264 16.682667 27.221333 16.682666 48.042667 0 18.858667-6.4 37.930667-19.242666 57.258667-9.472 14.037333-35.157333 40.533333-77.098667 79.872-52.096 48.554667-87.04 87.509333-104.704 116.821333A226.688 226.688 0 0 0 341.333333 745.429333h326.613334v-86.826666z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "3",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 0C229.248 0 0 229.248 0 512s229.248 512 512 512 512-229.248 512-512S794.752 0 512 0z" fill="#2E66FA"></path><path d="M627.754667 731.733333c-29.354667 25.088-66.901333 37.632-112.725334 37.632-44.928 0-81.792-11.52-110.592-34.773333-33.066667-26.538667-49.877333-64.469333-50.304-114.133333h92.16c0.426667 21.76 7.552 38.314667 21.333334 49.664 12.288 10.88 28.117333 16.341333 47.402666 16.341333 20.309333 0 36.778667-6.101333 49.322667-18.432 12.544-12.330667 18.773333-29.568 18.773333-51.797333 0-21.290667-6.229333-38.186667-18.773333-50.773334-12.544-12.501333-29.866667-18.773333-52.138667-18.773333h-13.525333v-80.042667H512c42.112 0 63.274667-21.034667 63.274667-63.146666 0-20.309333-5.888-36.096-17.706667-47.445334a60.757333 60.757333 0 0 0-43.818667-17.066666c-17.493333 0-32 5.504-43.434666 16.298666-11.562667 10.88-17.792 25.728-18.773334 44.714667H359.68c0.981333-43.946667 16.042667-78.976 45.397333-104.96 29.354667-25.941333 65.706667-39.04 109.226667-39.04 44.928 0 81.792 13.525333 110.592 40.490667 28.8 26.922667 43.306667 61.610667 43.306667 104.149333 0 48.213333-19.413333 82.688-58.154667 103.552 43.52 23.125333 65.28 61.44 65.28 114.858667 0 48.128-15.957333 85.76-47.573333 112.682666z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "4",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512.042667 1024C229.248 1024 0 794.794667 0 512.042667 0 229.205333 229.248 0 512.042667 0 794.752 0 1024 229.205333 1024 512.042667 1024 794.794667 794.752 1024 512.042667 1024z" fill="#6D768D"></path><path d="M600.96 256v309.802667h60.117333v81.536h-60.16v98.218666h-90.154666v-98.218666H311.466667v-81.237334L522.666667 256h78.293333zM510.72 399.104l-112.042667 166.698667h112.042667V399.104z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "5",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512.042667 1024C229.248 1024 0 794.794667 0 512.042667 0 229.205333 229.248 0 512.042667 0 794.752 0 1024 229.205333 1024 512.042667 1024 794.794667 794.752 1024 512.042667 1024z" fill="#6D768D"></path><path d="M470.912 343.552h175.786667V256H400.256l-47.786667 253.952 75.434667 10.837333c21.205333-23.552 45.269333-35.413333 72.021333-35.413333 21.546667 0 38.997333 7.509333 52.437334 22.4 13.312 15.018667 20.053333 37.418667 20.053333 67.328 0 31.872-6.741333 55.765333-20.181333 71.552-13.397333 15.872-29.866667 23.765333-49.237334 23.765333-17.066667 0-32.085333-6.186667-45.013333-18.432-13.013333-12.373333-20.821333-29.013333-23.466667-50.133333L341.333333 611.498667c5.546667 40.874667 22.485333 73.429333 50.730667 97.621333 28.330667 24.32 64.938667 36.437333 109.866667 36.437333 56.149333 0 100.053333-21.546667 131.754666-64.554666a176.64 176.64 0 0 0 34.816-107.52c0-48.042667-14.378667-87.210667-43.221333-117.333334-28.8-30.208-63.957333-45.312-105.514667-45.312-21.674667 0-42.922667 5.248-63.829333 15.616l14.976-82.901333z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "6",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 1024C229.248 1024 0 794.794667 0 512.042667 0 229.205333 229.248 0 512 0c282.88 0 512 229.205333 512 512.042667C1024 794.794667 794.88 1024 512 1024z" fill="#6D768D"></path><path d="M519.210667 256c36.992 0 67.626667 10.368 91.776 31.189333 24.192 20.821333 39.68 51.029333 46.293333 90.709334l-90.197333 9.984c-2.176-18.56-7.978667-32.298667-17.28-41.173334-9.258667-8.874667-21.418667-13.226667-36.224-13.226666-19.754667 0-36.437333 8.789333-50.048 26.453333-13.696 17.664-22.314667 54.613333-25.856 110.549333 23.296-27.52 52.138667-41.258667 86.656-41.258666 38.997333 0 72.362667 14.805333 100.181333 44.544 27.733333 29.696 41.685333 68.010667 41.685333 114.858666 0 49.877333-14.634667 89.856-43.818666 119.936-29.226667 30.208-66.730667 45.226667-112.554667 45.226667-49.066667 0-89.429333-19.072-121.130667-57.344C357.12 658.218667 341.333333 595.541333 341.333333 508.416c0-89.344 16.469333-153.813333 49.493334-193.194667C423.722667 275.754667 466.56 256 519.168 256z m-9.472 241.834667c-17.962667 0-33.066667 6.997333-45.525334 21.12-12.330667 14.037333-18.56 34.858667-18.56 62.293333 0 30.421333 6.912 53.76 20.906667 70.4 13.952 16.469333 29.866667 24.746667 47.786667 24.746667 17.28 0 31.701333-6.826667 43.178666-20.309334 11.52-13.525333 17.237333-35.669333 17.237334-66.56 0-31.658667-6.186667-54.869333-18.517334-69.546666a58.197333 58.197333 0 0 0-46.506666-22.144z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "7",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512.042667 1024C229.248 1024 0 794.752 0 512S229.248 0 512.042667 0C794.752 0 1024 229.248 1024 512s-229.248 512-511.957333 512z" fill="#6D768D"></path><path d="M673.024 273.066667H354.133333v86.869333h212.224a691.2 691.2 0 0 0-104.746666 187.989333c-26.026667 70.101333-39.978667 138.88-41.429334 206.293334h89.6c-0.298667-42.922667 6.698667-91.776 21.034667-146.474667a654.72 654.72 0 0 1 62.08-154.965333c27.136-48.554667 53.888-85.76 80.128-111.701334V273.066667z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "8",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 1024C229.248 1024 0 794.752 0 512S229.248 0 512 0s512 229.248 512 512-229.248 512-512 512z" fill="#6D768D"></path><path d="M512.426667 256c46.208 0 82.048 11.861333 107.605333 35.541333 25.6 23.68 38.314667 53.674667 38.314667 89.898667 0 22.613333-5.802667 42.666667-17.578667 60.330667a111.445333 111.445333 0 0 1-49.450667 40.277333c26.965333 10.837333 47.36 26.752 61.312 47.658667 13.994667 20.906667 21.034667 45.013333 21.034667 72.362666 0 45.098667-14.336 81.834667-42.965333 109.952-28.586667 28.245333-66.602667 42.368-114.090667 42.368-44.245333 0-81.066667-11.648-110.464-34.986666-34.645333-27.52-52.010667-65.28-52.010667-113.365334 0-26.368 6.528-50.645333 19.626667-72.746666 13.056-22.144 33.578667-39.210667 61.696-51.242667-24.064-10.154667-41.557333-24.192-52.48-41.941333a109.824 109.824 0 0 1-16.512-58.666667c0-36.224 12.757333-66.218667 37.973333-89.898667 25.386667-23.68 61.354667-35.541333 108.032-35.541333z m1.28 265.429333c-22.784 0-39.722667 7.978667-50.901334 23.893334-11.136 15.786667-16.64 33.066667-16.64 51.498666 0 25.984 6.485333 46.208 19.712 60.714667 13.098667 14.506667 29.525333 21.802667 49.152 21.802667 19.242667 0 35.157333-6.997333 47.786667-20.992 12.629333-13.909333 18.858667-34.048 18.858667-60.416 0-23.082667-6.314667-41.557333-19.2-55.466667a63.274667 63.274667 0 0 0-48.725334-21.034667z m-0.341334-191.488c-17.792 0-32 5.333333-42.581333 16-10.538667 10.666667-15.872 24.746667-15.872 42.325334 0 18.645333 5.248 33.152 15.701333 43.648 10.453333 10.453333 24.362667 15.658667 41.770667 15.658666 17.664 0 31.658667-5.290667 42.24-15.872 10.538667-10.581333 15.872-25.173333 15.872-43.818666 0-17.493333-5.248-31.573333-15.701333-42.154667s-24.277333-15.786667-41.429334-15.786667z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "9",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 1024C229.248 1024 0 794.794667 0 512.042667 0 229.333333 229.248 0 512 0c282.88 0 512 229.333333 512 512.042667C1024 794.794667 794.88 1024 512 1024z" fill="#6D768D"></path><path d="M497.28 256c49.365333 0 89.856 19.157333 121.429333 57.429333 31.701333 38.229333 47.488 101.205333 47.488 188.842667 0 89.173333-16.384 153.386667-49.365333 192.853333-32.853333 39.594667-75.605333 59.264-128.426667 59.264-37.888 0-68.608-10.154667-91.989333-30.506666s-38.4-50.816-45.013333-91.306667l90.112-9.984c2.261333 18.474667 8.021333 32.085333 17.28 41.088 9.173333 8.874667 21.418667 13.312 36.608 13.312 19.2 0 35.541333-8.874667 48.981333-26.752 13.44-17.749333 22.016-54.613333 25.770667-110.549333-23.466667 27.264-52.821333 40.874667-88.064 40.874666-38.314667 0-71.253333-14.72-99.114667-44.330666C355.242667 506.709333 341.333333 468.224 341.333333 420.864c0-49.493333 14.592-89.258667 43.946667-119.466667C414.549333 271.104 451.925333 256 497.237333 256z m-4.352 77.482667c-17.237333 0-31.658667 6.826667-43.008 20.437333-11.477333 13.653333-17.194667 35.84-17.194667 66.816 0 31.402667 6.229333 54.485333 18.645334 69.205333 12.458667 14.72 27.946667 22.101333 46.592 22.101334 18.005333 0 33.066667-7.082667 45.44-21.205334 12.330667-14.208 18.432-35.029333 18.432-62.506666 0-29.994667-6.912-53.376-20.821334-69.973334-13.824-16.597333-29.866667-24.874667-48.085333-24.874666z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "10",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512.042667 1024C229.248 1024 0 794.794667 0 511.957333 0 229.205333 229.248 0 512.042667 0 794.752 0 1024 229.205333 1024 511.957333 1024 794.794667 794.752 1024 512.042667 1024z" fill="#6D768D"></path><path d="M619.946667 273.066667c46.976 0 83.754667 16.042667 110.250666 48.042666 31.573333 37.973333 47.36 100.864 47.36 188.672 0 87.722667-15.829333 150.698667-47.658666 189.056-26.325333 31.616-62.976 47.36-109.952 47.36-47.274667 0-85.418667-17.237333-114.346667-51.968-28.885333-34.602667-43.392-96.426667-43.392-185.386666 0-87.168 15.872-150.016 47.701333-188.416 26.282667-31.488 62.933333-47.36 110.037334-47.36z m-207.488 12.8v452.266666H325.504V411.690667A299.904 299.904 0 0 1 213.333333 476.373333V398.933333c22.656-7.296 47.36-21.12 73.856-41.514666 26.624-20.522667 44.842667-44.288 54.784-71.552h70.485334z m207.488 60.842666c-11.306667 0-21.461333 3.413333-30.336 10.24-8.874667 6.826667-15.786667 19.157333-20.693334 36.864-6.4 22.997333-9.642667 61.653333-9.642666 115.968 0 54.442667 2.944 91.733333 8.661333 112.128 5.802667 20.352 13.098667 33.877333 21.845333 40.618667 8.789333 6.741333 18.858667 10.154667 30.165334 10.154667 11.349333 0 21.376-3.498667 30.250666-10.325334 8.874667-6.826667 15.786667-19.157333 20.693334-36.778666 6.4-22.826667 9.642667-61.354667 9.642666-115.797334 0-54.314667-2.858667-91.648-8.661333-112.042666-5.802667-20.352-13.013333-33.962667-21.76-40.789334a47.616 47.616 0 0 0-30.165333-10.24z" fill="#FFFFFF"></path></svg>`
      }
    ]
  },
  {
    name: "进度图标",
    type: "progress",
    list: [
      {
        name: "1",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 0C229.248 0 0 229.248 0 512s229.248 512 512 512 512-229.248 512-512S794.752 0 512 0z" fill="#12BB37"></path><path d="M512 928c-229.76 0-416-186.24-416-416S282.24 96 512 96V512l294.144-294.144A414.72 414.72 0 0 1 928 512c0 229.76-186.24 416-416 416z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "2",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 0C229.248 0 0 229.248 0 512s229.248 512 512 512 512-229.248 512-512S794.752 0 512 0z" fill="#12BB37"></path><path d="M512 928c-229.76 0-416-186.24-416-416S282.24 96 512 96V512h416c0 229.76-186.24 416-416 416z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "3",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 0C229.248 0 0 229.248 0 512s229.248 512 512 512 512-229.248 512-512S794.752 0 512 0z" fill="#12BB37"></path><path d="M512 928c-229.76 0-416-186.24-416-416S282.24 96 512 96V512l294.144 294.144A414.72 414.72 0 0 1 512 928z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "4",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 0C229.248 0 0 229.248 0 512s229.248 512 512 512 512-229.248 512-512S794.752 0 512 0z" fill="#12BB37"></path><path d="M512 928c-229.76 0-416-186.24-416-416S282.24 96 512 96v832z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "5",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 0C229.248 0 0 229.248 0 512s229.248 512 512 512 512-229.248 512-512S794.752 0 512 0z" fill="#12BB37"></path><path d="M512 512l-294.144 294.144A414.72 414.72 0 0 1 96 512c0-229.76 186.24-416 416-416V512z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "6",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 0C229.248 0 0 229.248 0 512s229.248 512 512 512 512-229.248 512-512S794.752 0 512 0z" fill="#12BB37"></path><path d="M512 512H96c0-229.76 186.24-416 416-416V512z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "7",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 0C229.248 0 0 229.248 0 512s229.248 512 512 512 512-229.248 512-512S794.752 0 512 0z" fill="#12BB37"></path><path d="M512 512L217.856 217.856A414.72 414.72 0 0 1 512 96V512z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "8",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M0 512c0 282.752 229.248 512 512 512s512-229.248 512-512S794.752 0 512 0 0 229.248 0 512z" fill="#12BB37"></path><path d="M716.629333 341.333333h-51.328a35.072 35.072 0 0 0-28.330666 14.293334l-171.989334 233.984-77.909333-106.026667a35.2 35.2 0 0 0-28.330667-14.293333H307.413333c-7.082667 0-11.264 7.936-7.082666 13.653333l136.32 185.472a35.2 35.2 0 0 0 56.533333 0l230.4-313.429333a8.533333 8.533333 0 0 0-6.954667-13.653334z" fill="#FFFFFF"></path></svg>`
      }
    ]
  },
  {
    name: "表情图标",
    type: "expression",
    list: [
      {
        name: "1",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1026 1024"><path d="M1.097856 1.097642h1021.804717v1021.804716H1.097856z" fill="#F09495" ></path><path d="M1024.000214 1024H0.000214V0h1024v1024z m-1021.804716-2.195284h1019.609433V2.195284H2.195498v1019.609432z" fill="#FFFFFF" ></path><path d="M234.695985 335.179887m-27.341259 0a27.341259 27.341259 0 1 0 54.682518 0 27.341259 27.341259 0 1 0-54.682518 0Z" fill="#040000" ></path><path d="M234.695985 363.519002c-15.666342 0-28.339115-12.772559-28.339115-28.339115 0-15.666342 12.772559-28.339115 28.339115-28.339115s28.339115 12.772559 28.339115 28.339115c0.099786 15.666342-12.672773 28.339115-28.339115 28.339115z m0-54.582732c-14.468914 0-26.243617 11.774703-26.243617 26.243617s11.774703 26.243617 26.243617 26.243617 26.243617-11.774703 26.243617-26.243617-11.774703-26.243617-26.243617-26.243617z" fill="#FFFFFF" ></path><path d="M776.232528 335.179887m-27.341259 0a27.341259 27.341259 0 1 0 54.682518 0 27.341259 27.341259 0 1 0-54.682518 0Z" fill="#040000" ></path><path d="M776.232528 363.519002c-15.666342 0-28.339115-12.772559-28.339115-28.339115 0-15.666342 12.772559-28.339115 28.339115-28.339115 15.666342 0 28.339115 12.772559 28.339115 28.339115 0 15.666342-12.772559 28.339115-28.339115 28.339115z m0-54.582732c-14.468914 0-26.243617 11.774703-26.243617 26.243617s11.774703 26.243617 26.243617 26.243617 26.243617-11.774703 26.243617-26.243617c-0.099786-14.468914-11.874488-26.243617-26.243617-26.243617z" fill="#FFFFFF" ></path><path d="M512.000214 671.656987c-52.58702 0-105.872539-17.961411-105.872539-52.387449S459.413194 566.882089 512.000214 566.882089s105.872539 17.961411 105.87254 52.387449S564.587234 671.656987 512.000214 671.656987z m0-74.240499c-21.952836 0-43.207172 3.592282-58.2748 9.77899-13.870201 5.68778-17.06334 11.275775-17.06334 12.07406s3.19314 6.386279 17.06334 12.07406c15.067628 6.186708 36.321965 9.77899 58.2748 9.77899s43.207172-3.592282 58.274801-9.77899c13.870201-5.68778 17.06334-11.275775 17.06334-12.07406s-3.19314-6.386279-17.06334-12.07406c-15.067628-6.286494-36.321965-9.77899-58.274801-9.77899z" fill="#040000" ></path></svg>`
      },
      {
        name: "2",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M0 0h1024v1024H0z" fill="#E6A6C9" ></path><path d="M315.1 368.1c-23.9 0-43.3-19.4-43.3-43.3s19.4-43.3 43.3-43.3 43.3 19.4 43.3 43.3-19.4 43.3-43.3 43.3z m0-74.7c-17.3 0-31.3 14.1-31.3 31.3 0 17.3 14.1 31.3 31.3 31.3 17.3 0 31.3-14.1 31.3-31.3 0-17.2-14-31.3-31.3-31.3zM738.7 368.1c-23.9 0-43.3-19.4-43.3-43.3s19.4-43.3 43.3-43.3 43.3 19.4 43.3 43.3-19.4 43.3-43.3 43.3z m0-74.7c-17.3 0-31.3 14.1-31.3 31.3 0 17.3 14.1 31.3 31.3 31.3 17.3 0 31.3-14.1 31.3-31.3 0-17.2-14-31.3-31.3-31.3zM293.5 698.8l-14.5-1.3c0.1-0.6 1.5-14.6 15.1-27.9 17.2-16.7 45-24.8 82.7-24 4.9-0.1 10.9-10.5 16.1-19.6 8.4-14.7 19-33.1 37.9-34.3 19.4-1.2 42.2 16.4 71.5 55.4 9.9 5.2 16.5 11.2 21.8 16.1 8.4 7.7 13.1 11.9 25.1 10.8 14.9-1.4 38.9-11.1 77.5-31.4 26.8-28.4 56.4-41.4 83.5-36.6 27.9 4.9 50.6 27.6 67.5 67.5l-13.4 5.7c-14.7-34.5-34.3-54.9-56.7-58.8-22.3-3.9-47.6 7.8-71.2 33.1l-0.8 0.9-1.1 0.6c-85.6 45.1-99.4 38-120.2 19.1-5.5-5-11.2-10.2-20.1-14.7l-1.5-0.8-1-1.4c-32.2-43.2-50.4-51.6-60-51-11.1 0.7-18.8 14-26.2 27-7.6 13.2-15.4 26.9-28.8 26.9h-0.2c-78.4-1.6-83 38.3-83 38.7z" fill="#040000" ></path></svg>`
      },
      {
        name: "3",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1026 1024" ><path d="M1.1 1.097642h1021.804716v1021.804716H1.1z" fill="#F7E983" ></path><path d="M1024.002358 1024H0.002358V0h1024v1024z m-1021.804716-2.195284h1019.609433V2.195284H2.197642v1019.609432z" fill="#FFFFFF" ></path><path d="M329.174412 344.491728a38.118106 10.277919 57.6 1 0 17.355867-11.014369 38.118106 10.277919 57.6 1 0-17.355867 11.014369Z" fill="#040000" ></path><path d="M644.769475 355.956059a11.175989 36.321965 30 1 0 36.321965-62.911488 11.175989 36.321965 30 1 0-36.321965 62.911488Z" fill="#040000" ></path><path d="M569.678445 671.158059c-26.343403 0-51.190021-5.288638-70.049503-14.967843-20.755408-10.577275-32.230754-25.445332-32.230755-41.710388 0-16.265056 11.475346-31.133112 32.230755-41.710387 18.859482-9.579419 43.805886-14.967843 70.049503-14.967843s51.190021 5.288638 70.049503 14.967843c20.755408 10.577275 32.230754 25.445332 32.230754 41.710387 0 16.265056-11.475346 31.133112-32.230754 41.710388-18.859482 9.679205-43.805886 14.967843-70.049503 14.967843z m0-95.095693c-49.693237 0-84.318846 20.356266-84.318846 38.517248s34.625609 38.517248 84.318846 38.517248 84.318846-20.356266 84.318846-38.517248-34.725395-38.517248-84.318846-38.517248z" fill="#040000" ></path></svg>`
      },
      {
        name: "4",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1026 1024" ><path d="M1.1 1.097642h1021.804716v1021.804716H1.1z" fill="#A6D9E2" ></path><path d="M1024.002358 1024H0.002358V0h1024v1024z m-1021.804716-2.195284h1019.609433V2.195284H2.197642v1019.609432z" fill="#FFFFFF" ></path><path d="M376.194134 348.950302m-23.44962 0a23.44962 23.44962 0 1 0 46.89924 0 23.44962 23.44962 0 1 0-46.89924 0Z" fill="#040000" ></path><path d="M629.150672 348.950302m-24.647047 0a24.647047 24.647047 0 1 0 49.294095 0 24.647047 24.647047 0 1 0-49.294095 0Z" fill="#040000" ></path><path d="M397.847613 603.503411c13.471058 8.282206 28.738258 14.468914 43.7061 19.458195 29.835899 9.978562 62.266225 14.169558 93.299551 7.483921 21.054765-4.490353 40.213604-14.369129 56.778016-28.039758 6.785422-5.587995-2.893783-15.167414-9.579419-9.579419-46.999026 38.916391-112.258819 31.033327-163.847983 6.086922-4.590138-2.195284-9.080491-4.490353-13.371272-7.184564-7.583707-4.590138-14.468914 7.184564-6.984993 11.774703z" fill="#040000" ></path><path d="M627.753674 534.052621c-31.033327 24.048334-58.474371 68.253362-37.419607 106.970182 10.577275 19.35841 29.835899 32.629897 48.795167 42.708244 7.982849 4.190996 15.067628-7.883064 7.084779-12.07406-25.245761-13.271487-53.485091-35.324108-49.094524-66.557006 2.793997-20.156695 15.766127-37.319821 29.736114-51.190022 3.392711-3.392711 6.984993-6.785422 10.776847-9.77899 2.993569-2.295069 2.394855-7.483921 0-9.878776-2.893783-3.19314-6.885208-2.49464-9.878776-0.199572z" fill="#040000" ></path></svg>`
      },
      {
        name: "5",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1026 1024" ><path d="M1.1 1.097642h1021.804716v1021.804716H1.1z" fill="#AD6F59" ></path><path d="M1024.002358 1024H0.002358V0h1024v1024z m-1021.804716-2.195284h1019.609433V2.195284H2.197642v1019.609432z" fill="#FFFFFF" ></path><path d="M411.829832 330.730879a38.118106 10.277919 57.6 1 0 17.355867-11.014368 38.118106 10.277919 57.6 1 0-17.355867 11.014368Z" fill="#040000" ></path><path d="M480.669675 609.989476c11.774703-25.844475 27.740401-51.788735 44.60417-73.342429 13.770415-17.462483 29.237186-33.92711 47.897096-44.803742 17.262912-10.078347 35.324108-13.67063 54.283376-6.58585 11.974274 4.390567 23.948548 14.468914 33.128825 24.547261 14.369129 15.865913 25.145975 34.625609 34.725394 53.684662 4.290782 8.581563 17.262912 0.997856 12.972131-7.583707-15.167414-30.334828-35.224323-63.763009-66.157864-80.327421-21.054765-11.37556-44.504385-11.475346-66.157864-1.895927-21.054765 9.280062-38.617034 25.644904-53.485091 42.907815-14.468914 16.863769-27.041902 35.324108-38.217891 54.582733-5.887351 10.178133-11.674917 20.555837-16.464627 31.232898-1.696355 3.692068-0.997856 7.982849 2.694212 10.277918 3.19314 1.895927 8.581563 0.898071 10.178133-2.694211z" fill="#040000" ></path><path d="M663.863649 338.091735a14.468914 33.727538 30 1 0 33.727538-58.417811 14.468914 33.727538 30 1 0-33.727538 58.417811Z" fill="#040000" ></path></svg>`
      },
      {
        name: "6",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024" ><path d="M762.9 77.4H261.1L10.2 512l250.9 434.6h501.8L1013.8 512z" fill="#83CEE3" ></path><path d="M369 375.8m-34.6 0a34.6 34.6 0 1 0 69.2 0 34.6 34.6 0 1 0-69.2 0Z" fill="#040000" ></path><path d="M369 411.7c-19.8 0-36-16.1-36-36s16.1-36 36-36 36 16.1 36 36-16.1 36-36 36z m0-69.1c-18.3 0-33.2 14.9-33.2 33.2S350.7 409 369 409s33.2-14.9 33.2-33.2-14.9-33.2-33.2-33.2z" fill="#FFFFFF" ></path><path d="M672.2 333.6c-15.1 7.6-30.2 15.6-44.3 25-5.9 3.9-17 10.4-14.6 19.1 1.8 6.5 12 11.2 17.3 14.3 15.7 9.3 32.1 17.6 48.3 25.9 8.6 4.4 16.2-8.5 7.6-13-14.1-7.3-28.3-14.5-42.1-22.3-3.9-2.2-7.9-4.5-11.7-6.9-1.2-0.8-2.4-1.5-3.5-2.4-0.6-0.4-1.1-0.8-1.6-1.2 2.2 1.7-0.3-0.3-0.3-0.3-0.9 0.1-1.5-3.2-0.2 0.5 0.9 2.4 1.1 3.8 0.3 5.8 0.6-1.5-0.9 0.8-0.1 0 0.5-0.5 1-1.1 1.6-1.6 0.5-0.5 1-0.9 1.6-1.3 0.6-0.5 0 0 1.2-0.9 1.7-1.3 3.5-2.5 5.3-3.6 8.4-5.5 17.2-10.4 26-15.2 5.6-3 11.2-6 16.8-8.9 8.6-4.4 1-17.3-7.6-13zM578.2 720.9c-12.5-96.7-33.3-154.7-55.6-155.6-8.8 3.9-22.3 17.5-37.7 60.1-10.8 29.8-18.4 62.2-23 81.6-1.2 5.1-2.1 9.1-2.9 11.8l-9.3-2.4c0.7-2.6 1.6-6.6 2.8-11.6 14.9-63 36-136.8 67.5-148.8l0.8-0.3h0.8c18.2-0.4 33.2 19.5 45.8 60.8 10.2 33.3 16.7 74.6 20.5 103.3l-9.7 1.1z" fill="#040000" ></path></svg>`
      },
      {
        name: "7",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024" ><path d="M762.9 77.4H261.1L10.2 512l250.9 434.6h501.8L1013.8 512z" fill="#8CC66D" ></path><path d="M375.778679 404.47473a14.5 33.8 30 1 0 33.8-58.543317 14.5 33.8 30 1 0-33.8 58.543317Z" fill="#040000" ></path><path d="M627.220263 374.211388a43.1 11.6 57.6 1 0 19.588408-12.431182 43.1 11.6 57.6 1 0-19.588408 12.431182Z" fill="#040000" ></path><path d="M451.1 548.5c17.6-9.3 63.9-30 105.3-16.2 17 20.3 32.7 98.8 28.8 138.1-27.5 10.2-82.5 10.2-106.1 5.8-8.3-10.5-32.7-81.8-35.3-114.6-0.4-5.5 2.5-10.6 7.3-13.1z" fill="#040000" ></path></svg>`
      },
      {
        name: "8",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024" ><path d="M762.9 77.4H261.1L10.2 512l250.9 434.6h501.8L1013.8 512z" fill="#5A74B8" ></path><path d="M357.7 400m-34.6 0a34.6 34.6 0 1 0 69.2 0 34.6 34.6 0 1 0-69.2 0Z" fill="#040000" ></path><path d="M357.7 436c-19.8 0-36-16.1-36-36s16.1-36 36-36 36 16.1 36 36-16.2 36-36 36z m0-69.2c-18.3 0-33.2 14.9-33.2 33.2s14.9 33.2 33.2 33.2 33.2-14.9 33.2-33.2-14.9-33.2-33.2-33.2z" fill="#FFFFFF" ></path><path d="M676 400m-34.6 0a34.6 34.6 0 1 0 69.2 0 34.6 34.6 0 1 0-69.2 0Z" fill="#040000" ></path><path d="M676 436c-19.8 0-36-16.1-36-36s16.1-36 36-36 36 16.1 36 36-16.2 36-36 36z m0-69.2c-18.3 0-33.2 14.9-33.2 33.2s14.9 33.2 33.2 33.2c18.3 0 33.2-14.9 33.2-33.2s-14.9-33.2-33.2-33.2z" fill="#FFFFFF" ></path><path d="M347.6 684.1c0.3-0.9 0.6-1.7 0.9-2.6 0.2-0.5 1.4-3.2 0.3-0.8 0.6-1.4 1.3-2.9 2-4.3 3.2-6.3 6-10.7 10.9-15.3 4.3-4 10.8-7.5 17.1-6.1 3.9 0.9 7.9 4.9 11.1 7.2 3.1 2.2 6.3 4.5 9.7 6.2 7.5 3.8 15.3 4.4 23.4 1.9 4.7-1.5 9.2-3.6 13.6-5.9 5-2.6 10.7-5 14.2-9.5 4.5-5.7 6.1-8.5 11.4-14.1 1-1 2-2 3.1-3 0.2-0.2 2.2-1.7 0.6-0.5 0.6-0.4 1.2-0.9 1.8-1.3 1-0.6 2.1-1.3 3.2-1.7-2 0.8 0.2 0 0.6-0.1 2.3-0.7-0.3-0.2 1.2-0.3 2.8-0.1 3.6 0 5.5 1 3.8 1.9 6.6 4.7 9.5 7.8 4.5 5 7.5 11.1 11.7 16.2 1.8 2.2 3.7 4.3 5.4 6.5 8.1 10.3 17.7 22.2 32.2 22 8.8-0.1 16.6-5.2 22.6-11.2 4.2-4.1 7.7-8.9 11-13.7 2.9-4.2 4.6-9.9 6.2-13.5 3.2-7.1 7.2-13.1 13-18.1 4.8-4.2 11.1-6.5 16.7-5.3 10.5 2.4 17.2 12.1 23.1 20.2 4.7 6.5 9.8 13 16 18.2 7.8 6.4 17.1 11.4 27.5 11.1 14.1-0.4 25.5-9.5 34.2-19.9 3-3.6 3.6-8.8 0-12.4-3.1-3.1-9.4-3.7-12.4 0-6.3 7.6-14.7 15.9-24.9 14.7-2.2-0.3-5.3-1.5-7.9-3.1-3.5-2.1-6.1-4.4-9.1-7.5-4.9-5.1-6.8-8.1-10.9-13.8-7.3-10.1-16.1-19.6-28.2-23.7-18.5-6.3-35.7 5.6-46 20.1-2.4 3.3-4.4 6.9-6.1 10.6-1.8 3.9-2.7 8.5-5.2 11.9-3.1 4.4-6.2 8.8-10.2 12.5-3 2.8-5.7 4.4-8.6 5.1-0.4 0.1-1.7 0.1 0.1 0h-2.2c2.1 0.1 0 0-0.5-0.1-0.7-0.2-1.4-0.4-2-0.6 1.8 0.7-1.8-1.1-2.4-1.5l-1.2-0.9c1.5 1.2-0.9-0.9-1.2-1.1-4.7-4.3-8.4-9.5-12.3-14.4-10.9-13.6-20.9-34-41-34.9-14.2-0.6-24.5 10.6-32.4 20.8-1.2 1.6-2.5 3.2-3.7 4.8-1.5 1.9 1.1-1.4-0.4 0.5-0.4 0.5-0.8 1.2-1.3 1.6-1.7 1.4-4.6 2.6-6.6 3.6-2.9 1.6-5.9 3.2-9 4.5-1.6 0.7-3.4 1.2-5.1 1.7-2.2 0.6-0.7 0.5-2.8 0.4-2.8 0-3.9-0.4-6.6-1.9-3.9-2.2-7.5-4.9-11.1-7.5-5.6-4-10-6.9-17-7.5-10.5-0.9-20.3 3.2-28.2 9.9-9.4 8.1-16.4 20.2-20.1 32-3.6 11.2 13.3 15.8 16.8 5.1z" fill="#040000" ></path></svg>`
      },
      {
        name: "9",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024" ><path d="M762.9 77.4H261.1L10.2 512l250.9 434.6h501.8L1013.8 512z" fill="#F0884F" ></path><path d="M287.2 382c6.4 2.3 11.6-3.7 15.4-7.9 5.1-5.5 10.2-11 16-15.9 0.8-0.7 1.7-1.4 2.5-2.1 1.2-0.9-1.7 1.3 0.2-0.2l1.2-0.9c2.1-1.5 4.3-2.9 6.5-4.3 2-1.2 4-2.2 6.1-3.2 0.6-0.3 1.2-0.6 1.9-0.9-0.3 0.2-1.5 0.6 0.2-0.1 1.3-0.5 2.6-1 4-1.5 11.2-3.7 21.8-4 33.4-1.1 19.5 4.9 36.4 17 51.2 30.2 8.6 7.7 21.4-5 12.7-12.7-25.2-22.6-57.1-42.1-92.2-36.2-20.4 3.4-37.7 16.1-51.6 30.9-2.3 2.4-4.5 5-6.8 7.4-0.7 0.7-1.9 1.5-2.4 2.4-0.5 0.8 2.3-1.5 0.8-0.7 1.3-0.7 3.9-1.4 5.8-0.7-11.1-3.7-15.8 13.7-4.9 17.5zM598 382c6.4 2.3 11.6-3.7 15.4-7.9 5.1-5.5 10.2-11 16-15.9 0.8-0.7 1.7-1.4 2.5-2.1 1.2-0.9-1.7 1.3 0.2-0.2l1.2-0.9c2.1-1.5 4.3-2.9 6.5-4.3 2-1.2 4-2.2 6.1-3.2 0.6-0.3 1.2-0.6 1.9-0.9-0.3 0.2-1.5 0.6 0.2-0.1 1.3-0.5 2.6-1 4-1.5 11.2-3.7 21.8-4 33.4-1.1 19.5 4.9 36.4 17 51.2 30.2 8.6 7.7 21.4-5 12.7-12.7-25.2-22.6-57.1-42.1-92.2-36.2-20.4 3.4-37.7 16.1-51.6 30.9-2.3 2.4-4.5 5-6.8 7.4-0.7 0.7-1.9 1.5-2.4 2.4-0.5 0.8 2.3-1.5 0.8-0.7 1.3-0.7 3.9-1.4 5.8-0.7-11.1-3.7-15.8 13.7-4.9 17.5zM505.9 527.1c3.4 0.7 6.8 1.7 10.2 2.8 6.7 2.2 10.4 3.5 16.6 7.7 1.6 1.1-0.5-0.5 0.6 0.5 0.6 0.5 1.1 1.1 1.7 1.6 1.5 1.4-0.1-0.4 0.5 0.6 0.4 0.6 0.7 1.2 1 1.8-1-2 0.1 0 0 0.5 0.1-2-0.1 0-0.1 0-0.1 0.8 0 0.7 0.1-0.5-0.1 0.4-0.1 0.7-0.3 1.1-0.6 1 0.7-0.9-0.4 1-1.6 2.5-4.6 5.4-8.1 7.8-6.8 4.6-14.4 8.2-22 11.4-7 3-7.4 11.9 0 14.8 7.4 2.8 15 5.3 22.4 8.1 3.1 1.1 4.2 1.5 6.9 2.9 1.1 0.6 2.1 1.2 3.2 1.8 1.2 0.8-0.7-0.5 0.1 0 0.4 0.3 0.8 0.7 1.1 1.1 0.6 0.8-1.1-1.2-0.2-0.2 0.8 0.9-0.3-1.4-0.1-0.2 0.1 0.9 0.2-1.9 0-0.9-0.1 0.5-0.8 1.8 0 0.2-0.2 0.5-0.5 1-0.8 1.4-0.3 0.3-0.9 1.3-0.3 0.5-0.5 0.7-1.1 1.3-1.7 1.9-6.9 7.3-15.9 12.8-24.4 18.1-8.3 5.3-0.6 18.5 7.7 13.2 9.9-6.3 20.9-12.8 28.6-21.8 4.8-5.5 8.1-12.9 4.2-19.9-3.4-6-10.5-8.9-16.6-11.4-8.6-3.5-17.5-6.2-26.2-9.5v14.8c14.4-6.1 47.2-18.8 41.2-40.3-3.5-12.9-19.4-18.9-30.8-22.6-3.4-1.1-6.9-2.1-10.5-2.9-9.1-2.2-13.3 12.5-3.6 14.6z" fill="#040000" ></path></svg>`
      },
      {
        name: "10",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024" ><path d="M762.9 77.4H261.1L10.2 512l250.9 434.6h501.8L1013.8 512z" fill="#F6F180" ></path><path d="M342.9 400.6m-29.5 0a29.5 29.5 0 1 0 59 0 29.5 29.5 0 1 0-59 0Z" fill="#040000" ></path><path d="M342.9 431.3c-16.9 0-30.7-13.8-30.7-30.7s13.8-30.7 30.7-30.7 30.7 13.8 30.7 30.7-13.7 30.7-30.7 30.7z m0-59c-15.6 0-28.3 12.7-28.3 28.3s12.7 28.3 28.3 28.3 28.3-12.7 28.3-28.3-12.6-28.3-28.3-28.3z" fill="#FFFFFF" ></path><path d="M702 400.6m-29.5 0a29.5 29.5 0 1 0 59 0 29.5 29.5 0 1 0-59 0Z" fill="#040000" ></path><path d="M702 431.3c-16.9 0-30.7-13.8-30.7-30.7s13.8-30.7 30.7-30.7 30.7 13.8 30.7 30.7-13.8 30.7-30.7 30.7z m0-59c-15.6 0-28.3 12.7-28.3 28.3s12.7 28.3 28.3 28.3 28.3-12.7 28.3-28.3-12.7-28.3-28.3-28.3z" fill="#FFFFFF" ></path><path d="M358.7 519.9c20 22 45.5 40.4 71.3 54.8 51.2 28.5 111.7 39.9 168 19.5 44.3-16.1 80.7-47.8 110.2-83.9 3-3.7 3.6-8.9 0-12.5-3.1-3.1-9.5-3.7-12.5 0-25.5 31.4-56.2 59.7-93.7 76-27.1 11.7-56.6 15.7-85.8 12.2-24.7-2.9-49.5-11.8-71.5-23.4-18.7-9.8-36.6-22.2-51.1-34.3-7.8-6.5-15.5-13.3-22.4-20.9-7.7-8.5-20.1 4.1-12.5 12.5z" ></path></svg>`
      },
      {
        name: "11",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024" ><path d="M48.2 844.9c-68.5-210.6 186-782.1 409.1-795.4 6.3-0.4 12.5 0.2 18.6 1.6C665.1 94.6 985.4 515 987.1 821.3c0.1 20-12.9 37.9-22.4 43.1-162.7 89.8-605.8 179.7-884.4 30.9-15-7.9-24.2-26.1-32.1-50.4z" fill="#F0884F" ></path><path d="M401 352.1m-52.4 0a52.4 52.4 0 1 0 104.8 0 52.4 52.4 0 1 0-104.8 0Z" fill="#FFFFFF" ></path><path d="M408.7 329m-29.3 0a29.3 29.3 0 1 0 58.6 0 29.3 29.3 0 1 0-58.6 0Z" fill="#040000" ></path><path d="M527.5 352.1m-52.4 0a52.4 52.4 0 1 0 104.8 0 52.4 52.4 0 1 0-104.8 0Z" fill="#FFFFFF" ></path><path d="M527.5 329m-29.3 0a29.3 29.3 0 1 0 58.6 0 29.3 29.3 0 1 0-58.6 0Z" fill="#040000" ></path><path d="M450.7 517c1.1-8.2 3.2-16.4 6.1-24.1 0.1-0.3 1-2.5 0.5-1.4s0.3-0.7 0.5-1c0.7-1.4 1.4-2.8 2.2-4.1 0.4-0.8 2.8-3.9 1.3-2.1 0.8-1 1.7-1.9 2.6-2.8 1-1-1.5 1 0.1 0 0.5-0.3 1-0.6 1.5-0.8-1.3 0.7-1.2 0.3 0 0.1 1.9-0.3-1.8 0.3 0.1 0 1.2-0.2 1.5 0.3 0-0.1 0.6 0.2 1.3 0.3 1.9 0.5 0.3 0.1-1.3-0.7 0.2 0.1 0.8 0.5 1.6 0.9 2.4 1.4 1.4 1 0-0.1 1.4 1.1 0.9 0.8 1.8 1.7 2.6 2.6 1.8 1.9 3.5 3.9 5 6.1 5.1 7.1 9.3 14.8 13.2 22.6 3.5 6.9 13.7 4.7 15.8-2.1 2.6-8.7 4.8-17.4 7.4-26.1 0.9-3.2 1.9-6.4 3.2-9.4-0.7 1.6 0.8-1.6 1.2-2.2l0.9-1.5c0.7-1.2-1.4 0.7 0.1-0.1 1.7-0.9-1.2 0.3-0.3 0.1 0.8-0.2 1-1.2 0.3-0.3-0.6 0.8 0.6 0-0.5 0.2-2 0.3 2.4 0.5-1.1 0 0.5 0.1 1.2 0.2 1.6 0.4-1.1-0.8-0.8-0.4 0.2 0.2 0.7 0.4 3.4 2.3 2.7 1.8 8.9 7.1 15.9 16.9 22.5 26 2.8 3.8 7.5 5.6 11.8 3.1 3.7-2.2 5.9-8 3.1-11.8-8.2-11.1-16.6-23-27.7-31.4-6.3-4.7-14.5-7.6-21.7-3-6.7 4.2-9.6 12.5-11.9 19.6-3.2 9.9-5.5 20-8.6 29.9 5.3-0.7 10.5-1.4 15.8-2.1-7.8-15.5-24.8-50.1-48-41.7-14.1 5.1-19.7 23-22.9 36.2-0.9 3.8-1.8 7.7-2.3 11.6-0.6 4.6 1.1 9.3 6 10.6 4.2 1 10.2-1.5 10.8-6.1z" fill="#040000" ></path></svg>`
      },
      {
        name: "12",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024" ><path d="M485.538528 993.072489a362.00362 481.804818 3.149 1 0 52.933731-962.15464 362.00362 481.804818 3.149 1 0-52.933731 962.15464Z" fill="#AADCF0" ></path><path d="M688.2 334.1c-15.1 7.6-30.2 15.6-44.3 25-5.9 3.9-17 10.4-14.6 19.1 1.8 6.5 12 11.2 17.3 14.3 15.7 9.3 32.1 17.6 48.3 25.9 8.6 4.4 16.2-8.5 7.6-13-14.1-7.3-28.3-14.5-42.1-22.3-3.9-2.2-7.9-4.5-11.7-6.9-1.2-0.8-2.4-1.5-3.5-2.4-0.6-0.4-1.1-0.8-1.6-1.2 2.2 1.7-0.3-0.3-0.3-0.3-0.9 0.1-1.5-3.2-0.2 0.5 0.9 2.4 1.1 3.8 0.3 5.8 0.6-1.5-0.9 0.8-0.1 0 0.5-0.5 1-1.1 1.6-1.6 0.5-0.5 1-0.9 1.6-1.3 0.6-0.5 0 0 1.2-0.9 1.7-1.3 3.5-2.5 5.3-3.6 8.4-5.5 17.2-10.4 26-15.2 5.6-3 11.2-6 16.8-8.9 8.6-4.4 1-17.4-7.6-13zM375.8 347c13.4 6.8 26.7 14 39.5 21.9 1.8 1.2 3.7 2.3 5.5 3.5 0.9 0.6 1.7 1.2 2.6 1.8 0.9 0.6 1.9 1.4 1.6 1.1 1.1 0.9 2.1 1.9 3.1 2.8 1.2 1 0-0.3 0.1 0 0-0.2-0.8-2.4-0.3-4.1 1.5-5.5 2.3-2.7 0.8-2-0.4 0.2-0.9 0.8-1.3 1.1 1.7-1.4-1.6 1.1-2.3 1.6-3.4 2.3-6.9 4.4-10.4 6.4-14.9 8.6-30.3 16.4-45.6 24.3-8.6 4.4-1 17.4 7.6 13 15-7.7 30.1-15.4 44.8-23.8 6.2-3.6 13.8-7.3 18.7-12.7 7.6-8.3-3.8-16.6-9.9-20.9-8.7-6.1-18-11.3-27.3-16.4-6.5-3.6-13-7.1-19.6-10.4-8.6-4.5-16.3 8.5-7.6 12.8zM412.8 570.9c13.5 7.7 28.5 13.3 43.3 17.9 29.8 9.2 61.7 13.1 92.6 7.3 20.6-3.9 40-12.5 56.6-25.2 2.8-2.2 4.3-5.6 2.3-9-1.6-2.8-6.2-4.5-9-2.3-48.3 36.9-113.3 30-165.6 6.7-4.6-2.1-9.2-4.2-13.7-6.7-7.3-4.2-13.9 7.2-6.5 11.3z" fill="#040000" ></path><path d="M644.6 505.2c-30.1 21.5-60.6 62.5-39.1 99.8 10.7 18.6 30.3 30.9 49.1 40.1 7.8 3.8 14.6-7.9 6.8-11.7-23.6-11.5-53.7-31.4-49.4-60.9 2.8-18.9 15.8-34.6 29.5-47.2 2.5-2.3 5.1-4.6 7.8-6.7 0.5-0.4 0.9-0.7 1.4-1.1-0.4 0.3-1.2 0.9-0.1 0.1l0.9-0.6c6.9-5.1 0.2-16.8-6.9-11.8z" fill="#040000" ></path></svg>`
      },
      {
        name: "13",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024" ><path d="M235.1 76.9c75.6-26.5 297.3-90.1 514.2-16.6 16.3 5.5 29.8 17.4 37.1 33 57.5 122.4 127.1 602.1 62.1 785.6a62.58 62.58 0 0 1-32.5 35.8c-109.5 51.8-428.1 136.7-609.3 37.2-14.4-7.9-25-21.3-29.7-37.1-41.9-140.6-37-627.7 19.1-798 6.1-18.7 20.5-33.4 39-39.9z" fill="#F9DABD" ></path><path d="M392.2 360.2m-35.2 0a35.2 35.2 0 1 0 70.4 0 35.2 35.2 0 1 0-70.4 0Z" fill="#040000" ></path><path d="M618.6 360.2m-35.2 0a35.2 35.2 0 1 0 70.4 0 35.2 35.2 0 1 0-70.4 0Z" fill="#040000" ></path><path d="M512 562.6c-36 0-65.3-29.3-65.3-65.3S476 432 512 432s65.3 29.3 65.3 65.3-29.3 65.3-65.3 65.3z m0-122.9c-31.7 0-57.6 25.8-57.6 57.6s25.8 57.6 57.6 57.6c31.7 0 57.6-25.8 57.6-57.6s-25.9-57.6-57.6-57.6z" fill="#040000" ></path></svg>`
      },
      {
        name: "14",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024" ><path d="M178.1 971.5c38.1 15.9 98.7 26.6 171.3-12.3 3.7-2 8.4-1.6 11.6 1.1 43.3 35.9 123.3 80.8 236 10.9 3.8-2.4 8.7-2.4 12.6-0.2 41.8 23.9 191.6 58.2 246.6 14.2 4.4-3.5 9.1-6.6 14.5-8.5C1065 909.5 678.2-652 194.3 351c-37.5 77.8-38.4 94.1-71.9 211.3-27.6 96.3-29.1 231.3 1.4 348.1 7.2 27.3 27.3 49.9 54.3 61.1z" fill="#ABAAAA" ></path><path d="M468.9 349H418c-6.1 0-11.1-5-11.1-11.1V336c0-6.1 5-11.1 11.1-11.1h50.9c6.1 0 11.1 5 11.1 11.1v1.9c0 6.1-5 11.1-11.1 11.1zM643 471.9H390c-6.6 0-12-5.4-12-12s5.4-12 12-12h253c6.6 0 12 5.4 12 12s-5.4 12-12 12zM609 349h-61.2c-6 0-11-4.9-11-11v-2.1c0-6 4.9-11 11-11H609c6 0 11 4.9 11 11v2.1c0 6.1-4.9 11-11 11z" fill="#040000" ></path></svg>`
      },
      {
        name: "15",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024" ><path d="M673.1 318.7c3.7-17.5 5.6-35.7 5.6-54.4 0-137.9-105.5-249.7-235.6-249.7S207.4 126.4 207.4 264.3c0 55.4 17.1 106.7 45.9 148.1-55.2 63.3-88.6 145.9-88.6 236.3 0 199.2 162.1 360.6 362.1 360.6 200 0 362.1-161.5 362.1-360.6 0.1-147.3-88.7-274-215.8-330z" fill="#4F8A54" ></path><path d="M392 246.2m-47.1 0a47.1 47.1 0 1 0 94.2 0 47.1 47.1 0 1 0-94.2 0Z" fill="#FFFFFF" ></path><path d="M386 252.8m-26.4 0a26.4 26.4 0 1 0 52.8 0 26.4 26.4 0 1 0-52.8 0Z" fill="#040000" ></path><path d="M505.6 246.2m-47.1 0a47.1 47.1 0 1 0 94.2 0 47.1 47.1 0 1 0-94.2 0Z" fill="#FFFFFF" ></path><path d="M501.4 252.8m-26.4 0a26.4 26.4 0 1 0 52.8 0 26.4 26.4 0 1 0-52.8 0Z" fill="#040000" ></path><path d="M474.3 364.8h-50.9c-6.1 0-11.1-5-11.1-11.1v-1.9c0-6.1 5-11.1 11.1-11.1h50.9c6.1 0 11.1 5 11.1 11.1v1.9c0 6.2-5 11.1-11.1 11.1z" fill="#040000" ></path></svg>`
      },
      {
        name: "16",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024" ><path d="M246.4 227.6c-166.9 101.1-461.9 344 87 564.1 1.5 0.6 2.9 1.1 4.4 1.6 80.7 27.7 392.8 165.4 641-198.1 40-58.6 38.5-136.2-3.7-193.3C892 289.5 727 201.1 429.1 182.7c-64.1-4-127.8 11.6-182.7 44.9z" fill="#CF92BE" ></path><path d="M617.1 393.4c-17.4 8.8-34.9 18.1-51.2 28.9-6.9 4.6-20.3 12.3-17.4 22.6 1.2 4.3 5.6 7 9 9.5 3.7 2.7 7.6 5 11.5 7.3 18.2 10.8 37.1 20.3 55.9 30 10 5.1 18.9-10 8.8-15.1-16.4-8.4-32.9-16.9-49-26-4.5-2.6-9.1-5.2-13.5-8l-4.5-3c-0.7-0.5-1.3-1-2-1.5 1.6 1.2 0.7 0.4-0.2-0.2-1.3-0.9-0.3-0.9-0.5-0.3 0.2 0.2 0.4 0.5 0.6 0.7 1 1.9 1.3 3.7 0.8 5.7 0.1-0.6 0.7-1.4-0.6 1.3 0.7-1.5-0.1 0-0.2 0.1 0.6-0.6 1.2-1.3 1.9-1.9l1.8-1.5c1.8-1.6-0.6 0.3 1.2-0.9 2-1.5 4.1-2.9 6.2-4.3 10-6.5 20.4-12.4 30.9-18 6.5-3.5 13.1-7 19.7-10.4 9.6-5 0.8-20.1-9.2-15zM323.1 408.5c15.9 8.1 31.7 16.5 46.8 26 2.2 1.4 4.3 2.8 6.5 4.2 1 0.7 1.9 1.3 2.8 2 0.5 0.3 1 0.7 1.4 1.1-1.1-0.9-0.3-0.3 0.3 0.3 1.1 1 2.2 2.2 3.3 3.1 1.4 1.1-1-1.7-0.1-0.1-0.6-1.1-0.9-4.1 0.3-6.7 2.2-4.8 0.7 0.1 0-0.5 0 0-1.1 0.9-1.3 1 2.3-1.9 0 0-0.5 0.4-0.8 0.5-1.5 1.1-2.3 1.6-4 2.7-8.1 5.1-12.3 7.5-17.3 10-35.1 19.1-52.8 28.2-10 5.1-1.2 20.2 8.8 15.1 17.5-9 35-17.9 52-27.7 7.3-4.2 15.9-8.6 21.8-14.7 9.3-9.7-4.3-19.7-11.5-24.7-10.1-7.1-20.9-13.1-31.7-19-7.6-4.2-15.2-8.2-22.9-12.1-9.7-5.2-18.6 9.9-8.6 15zM513 592.1c-12.2 0-24.6-1.4-36.3-4.3-8-2-13.9-8.2-15.4-16.2s1.7-15.8 8.4-20.5c23.2-16.3 60.5-31.9 106.2-13 6.4 2.6 11 8.3 12.3 15.1 1.3 6.7-0.8 13.6-5.7 18.3-13.5 13.1-40.9 20.6-69.5 20.6z m-37.4-32.5c-3.4 2.4-4.9 6.2-4.2 10.2 0.8 4.1 3.6 7.1 7.7 8.1 39.1 9.7 81.2 0.7 96.1-13.7 2.4-2.3 3.4-5.6 2.7-8.9-0.7-3.4-2.9-6.2-6.1-7.5-41.2-17.2-75.1-3.1-96.2 11.8z" fill="#040000" ></path></svg>`
      },
      {
        name: "17",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024" ><path d="M1008.6 465.7c0-124.9-95.5-226.2-213.4-226.2-12 0-23.8 1.1-35.2 3.1v-3.1c0-124.9-95.5-226.2-213.4-226.2S333.4 114.6 333.4 239.5c0 2.4 0 4.8 0.1 7.2-17.1-4.7-35-7.2-53.4-7.2-117.8 0-213.4 101.3-213.4 226.2 0 92.1 51.9 171.3 126.3 206.6-13.7 29.9-21.4 63.4-21.4 98.8 0 124.9 95.5 226.2 213.4 226.2 68.8 0 130-34.5 169-88.1 39 53.6 100.2 88.1 169 88.1 117.8 0 213.4-101.3 213.4-226.2 0-41.2-10.4-79.9-28.6-113.1 60.5-39.9 100.8-111.1 100.8-192.3z" fill="#8CC66D" ></path><path d="M437.8 400.7m-24.7 0a24.7 24.7 0 1 0 49.4 0 24.7 24.7 0 1 0-49.4 0Z" fill="#040000" ></path><path d="M649.7 400.7m-24.7 0a24.7 24.7 0 1 0 49.4 0 24.7 24.7 0 1 0-49.4 0Z" fill="#040000" ></path><path d="M527.3 625.9c6.3-14.2 13.1-28.3 17.9-43 6.2-19 8.3-38.6 10.5-58.3l2.1-19.2c0.7-6.2-9-6.1-9.7 0-1.7 16.3-2.8 32.8-5.7 48.9-4.2 23.7-13.8 45-23.5 66.7-2.5 5.6 5.9 10.5 8.4 4.9z" fill="#252525" ></path><path d="M447.7 522.3c20.3-0.1 40.6-0.2 61-0.4l96.6-0.6c7.5 0 14.9-0.1 22.4-0.1 16.6-0.1 16.7-25.9 0-25.8-20.3 0.1-40.6 0.2-61 0.4l-96.6 0.6c-7.5 0-14.9 0.1-22.4 0.1-16.6 0.1-16.7 25.9 0 25.8z" fill="#040000" ></path><path d="M495.4 508.2c-10.3 3.8-9.2 20.9-9.2 29.5 0.1 16 2.1 32.3 6.1 47.8 3.5 13.7 8.7 29.9 20.6 38.7 12.9 9.5 27.6 2.1 37.6-7.9 10.2-10.3 17.8-23 24.7-35.6 11.6-21.3 20.9-43.8 29.7-66.4 3-7.8-9.5-11.1-12.5-3.4-7.4 19.1-15.3 38.1-24.7 56.4-5.9 11.5-12.2 23-20.3 33.1-2.8 3.5-5.8 6.9-9.2 9.8-1.9 1.7-1.4 1.3-3.3 2.5-1.3 0.8-2.6 1.6-3.9 2.2-0.7 0.3 1-0.2-0.8 0.3-0.6 0.2-1.2 0.3-1.8 0.5-1.1 0.3-1.2 0.2-0.5 0.1-0.6 0-1.3 0-1.9 0.1-2.2 0.1 0.6 0.5-1.8-0.2l-1.8-0.6c1.5 0.5 0.2 0.1-0.5-0.3-0.8-0.5-2.9-2.1-1.7-1.1-1-0.9-2-1.7-2.8-2.7-0.4-0.5-0.9-1-1.3-1.5 0.4 0.5 0.1 0.2-0.5-0.7-0.8-1.3-1.7-2.5-2.4-3.9-0.7-1.3-1.4-2.5-2-3.8-0.4-0.8-0.8-1.6-1.1-2.4-0.1-0.2-0.5-1.1 0 0l-0.6-1.5a86.8 86.8 0 0 1-3.3-9.8c-4.4-14.9-6.2-27.9-6.8-42.8-0.3-6.6-0.3-13.1 0.4-19.7 0.2-1.5-0.3 1.5 0.1-0.5l0.3-1.8c0.2-0.9 0.5-1.8 0.7-2.8 0.4-1.9-0.7 1.1 0.3-0.7 0.5-1-1.3 1.2-0.3 0.5-0.3 0.3-1.1 0.8-2 1.1 7.7-2.9 4.3-15.4-3.5-12.5z" fill="#040000" ></path></svg>`
      },
      {
        name: "18",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024" ><path d="M75.4 739.8c-78.7-134.4-194-455.7 401.4-579.6 9.8-2 19.2-6.2 29.2-7.5C656.8 133 947.3 205 1000.1 578.4c42.6 223.8 29.7 392.1-822 233.6-43.1-8-80.6-34.4-102.7-72.2z" fill="#F09495" ></path><path d="M704.6 875.4c-129 0-301.8-20.5-526.6-62.3-43.5-8.1-81.2-34.6-103.5-72.7-19.3-32.9-44.8-84.3-57.1-142.5-13.9-65.1-8.8-125.3 15.1-179.2 54.3-122.3 203.7-209.6 444-259.6 4.1-0.9 8.3-2.1 12.3-3.4 5.5-1.7 11.1-3.4 16.9-4.2 29-3.8 75.7-5.9 133.8 5.7 54.5 10.9 105.3 31 150.8 59.9C843.7 251 888.2 296 922.7 351c39.7 63.1 66.1 139.6 78.5 227.3 8.1 42.4 15.2 87.3 12.5 127.9-2.8 42.6-16.4 75.5-41.5 100.7-42.5 42.7-120.3 65-237.8 68.1-9.6 0.2-19.6 0.4-29.8 0.4zM76.3 739.3c22 37.6 59.2 63.7 102.1 71.7 242.5 45.1 424.4 65.3 556.1 61.9 116.9-3.1 194.1-25.2 236.3-67.5 55.4-55.6 44.4-142.5 28.3-226.7C976 415.8 903.4 291.5 789.2 219c-124-78.7-248.1-69.9-283.2-65.3-5.6 0.7-11.2 2.4-16.6 4.1-4.1 1.2-8.3 2.5-12.5 3.4C237.3 211.1 88.5 298 34.5 419.6c-54.6 122.8 2.8 253 41.8 319.7z" fill="#FFFFFF" ></path><path d="M424.1 442.5m-24.7 0a24.7 24.7 0 1 0 49.4 0 24.7 24.7 0 1 0-49.4 0Z" fill="#040000" ></path><path d="M635.9 442.5m-24.7 0a24.7 24.7 0 1 0 49.4 0 24.7 24.7 0 1 0-49.4 0Z" fill="#040000" ></path><path d="M426.2 543.3c17.1 7.9 36.6 26 25.5 46.1-6.9 12.5-19.8 21.2-31.7 28.4-4.5 2.7-0.4 9.8 4.1 7.1 17.4-10.5 41.6-27.6 39-51.1-1.6-14-12.4-24.8-23.5-32.3-3-2-6.1-3.9-9.3-5.4-4.8-2.1-8.9 5-4.1 7.2zM629.5 535.4c-21.8 11.7-40.6 37-25.7 61.3 8.2 13.4 22.2 22.7 35.7 30.3 4.7 2.7 8.9-4.6 4.2-7.2-15.5-8.7-39.9-23.9-36.9-45.2 1.6-11.4 10.7-20.7 19.6-27.2 2.4-1.7 4.8-3.4 7.4-4.8 4.7-2.5 0.4-9.8-4.3-7.2z" fill="#040000" ></path><path d="M457.2 584.6c25.6 25.6 66.7 41 101.8 28.3 18.2-6.6 33.2-19.1 45.5-33.8 4.2-5.1-3-12.4-7.3-7.3-18.5 22-43.3 38.1-73 35-18.6-1.9-36.2-10.8-50.9-22-2.9-2.2-6.1-4.8-8.8-7.5-4.7-4.7-12 2.6-7.3 7.3z" fill="#040000" ></path></svg>`
      },
      {
        name: "19",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024" ><path d="M915.9 510.5c8.4-19 13.1-39.8 13.1-61.7 0-90-78.9-162.9-176.2-162.9-3.2 0-6.3 0.1-9.5 0.2v-0.2c0-94.8-116.2-171.6-259.6-171.6S224 191.2 224 286v2c-96.2 0-174.1 72-174.1 160.9 0 38 14.3 73 38.2 100.5-41.8 29.4-68.8 75.9-68.8 128.2 0 88.9 78 160.9 174.1 160.9 17.1 0 33.6-2.3 49.3-6.5 28.9 46.1 88.7 77.7 157.6 77.7 49.4 0 94-16.2 126-42.3 32 26.1 76.6 42.3 126 42.3 77.3 0 143-39.7 166.7-95 3.1 0.2 6.3 0.2 9.5 0.2 97.3 0 176.2-72.9 176.2-162.9 0-60.6-35.7-113.4-88.8-141.5z" fill="#5A74B8" ></path><path d="M357.6 449.5a46.6 73.2 0 1 0 93.2 0 46.6 73.2 0 1 0-93.2 0Z" fill="#FEFEFD" ></path><path d="M357.5 449.5a25.1 39.4 0 1 0 50.2 0 25.1 39.4 0 1 0-50.2 0Z" fill="#040000" ></path><path d="M531.3 449.5a46.6 73.2 0 1 0 93.2 0 46.6 73.2 0 1 0-93.2 0Z" fill="#FEFEFD" ></path><path d="M531.2 449.5a25.1 39.4 0 1 0 50.2 0 25.1 39.4 0 1 0-50.2 0Z" fill="#040000" ></path><path d="M426.7 574.6c20.9 29.9 59.7 52.2 96.2 38.6 19.2-7.2 34.7-21.2 47.6-36.9 2.8-3.5 3.4-8.3 0-11.7-2.9-2.9-8.9-3.5-11.7 0-16.5 20.2-40.9 40.9-68.1 35.5-17.3-3.4-31-13.2-42.9-25.9-2-2.2-3.9-4.4-5.8-6.7-1.6-1.9 1.1 1.5-0.4-0.6-0.2-0.2-0.3-0.5-0.5-0.7-6.2-8.7-20.6-0.4-14.4 8.4z" fill="#040000" ></path></svg>`
      },
      {
        name: "20",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024" ><path d="M792.8 301.4c-8.2 0-16.2 0.4-24.2 1.3-12.3-81.8-129.2-145.9-271.8-145.9-137.1 0-250.5 59.3-269.9 136.6C105.3 295.5 7.4 391.2 7.4 508.9c0 119.1 100.2 215.6 223.7 215.6 5.3 0 10.6-0.2 15.8-0.5 14.4 80.5 130.4 143.2 271.3 143.2 135.9 0 248.6-58.3 269.4-134.6 1.7 0 3.4 0.1 5.1 0.1 123.6 0 223.7-96.5 223.7-215.6s-100-215.7-223.6-215.7z" fill="#F6CD50" ></path><path d="M435.9 431.5m-52.2 0a52.2 52.2 0 1 0 104.4 0 52.2 52.2 0 1 0-104.4 0Z" fill="#FAFAFA" ></path><path d="M588.1 431.5m-52.2 0a52.2 52.2 0 1 0 104.4 0 52.2 52.2 0 1 0-104.4 0Z" fill="#FAFAFA" ></path><path d="M435.9 431.5m-27.8 0a27.8 27.8 0 1 0 55.6 0 27.8 27.8 0 1 0-55.6 0Z" fill="#040000" ></path><path d="M601.9 407.4c-5.7 2.9-11.3 5.9-16.9 9-6.8 3.8-15.3 7.8-20.5 13.8-5.6 6.5 1.6 11.1 6.7 14.4 11.2 7.1 23.3 13 35.1 19 5.7 2.9 10.8-5.7 5.1-8.6-10.9-5.6-21.9-11.1-32.4-17.4-2.4-1.4-4.6-3.1-7-4.6 1 0.6-0.4-0.4-0.4-0.4-1.9-0.3-0.5 4.2 0.5 4.1-0.1 0-0.6 0.3 0.3-0.3 0.5-0.3 1-0.9 1.5-1.3 9.7-7.9 21.9-13.5 33.1-19.2 5.7-2.7 0.6-11.4-5.1-8.5zM406.6 547.6c11.5 14.4 27 26.7 42.7 36.3 32.2 19.8 71.2 27.2 107.6 15.4 29.5-9.6 54.6-29.1 75.5-51.6 10.8-11.6-6.6-29.1-17.5-17.5-9.4 10.1-19.5 19.7-30.8 27.7-4.6 3.2-9.3 6.2-14.2 8.9-5 2.8-9.9 5.1-14.1 6.7-4.6 1.7-9.3 3.2-14.1 4.4-2.2 0.5-4.4 1-6.6 1.4-1 0.2-2 0.3-2.9 0.5 2.6-0.4-2.1 0.2-2.5 0.3-4.1 0.4-8.3 0.5-12.5 0.4-2.2-0.1-4.4-0.2-6.6-0.4-1.1-0.1-2.2-0.2-3.2-0.3-1.5-0.2-1.4-0.2 0.1 0l-2.1-0.3c-7.8-1.3-15.4-3.4-22.8-6.2-0.9-0.4-1.8-0.7-2.8-1.1-3.1-1.2 2.3 1.1-0.7-0.3-1.5-0.7-2.9-1.3-4.4-2-3.7-1.8-7.2-3.7-10.8-5.8-5.7-3.4-11.1-7.1-16.4-11.1 3 2.3-1.1-0.9-1.8-1.5-1.1-0.9-2.1-1.7-3.1-2.6-2.1-1.8-4.2-3.7-6.3-5.6-4.4-4.1-8.7-8.4-12.4-13.1-4.2-5.2-13.1-4.3-17.5 0-5 5.1-4 12.2 0.2 17.4z" fill="#040000" ></path></svg>`
      }
    ]
  },
  {
    name: "标记图标",
    type: "sign",
    list: [
      {
        name: "1",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 512m-512 0a512 512 0 1 0 1024 0 512 512 0 1 0-1024 0Z" fill="#6D768D"></path><path d="M809.728 429.696a18.901333 18.901333 0 0 0-15.274667-12.885333l-183.466666-26.624-81.92-166.272a18.901333 18.901333 0 0 0-34.005334 0l-81.92 166.272-183.594666 26.624a19.029333 19.029333 0 0 0-10.496 32.298666l132.693333 129.536-31.274667 182.741334a18.816 18.816 0 0 0 27.477334 19.84l164.138666-86.186667 164.096 86.058667a18.773333 18.773333 0 1 0 27.434667-19.84l-31.36-182.741334 132.693333-129.408a18.901333 18.901333 0 0 0 4.778667-19.413333z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "2",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 512m-512 0a512 512 0 1 0 1024 0 512 512 0 1 0-1024 0Z" fill="#6D768D"></path><path d="M644.565333 306.901333c32.128 0 65.834667-5.76 101.077334-17.237333a17.066667 17.066667 0 0 1 22.357333 16.213333v328.32c-1.109333 0.768 10.325333 27.093333-99.370667 19.84-109.653333-7.210667-181.76-45.098667-246.869333-45.098666-65.152 0-49.322667 2.688-74.154667 8.405333v168.064a24.746667 24.746667 0 0 1-24.490666 25.258667 22.528 22.528 0 0 1-17.28-7.253334 24.149333 24.149333 0 0 1-7.168-18.005333V281.258667C299.776 280.490667 328.106667 256 421.76 256s164.437333 50.901333 222.805333 50.901333z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "3",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 512m-512 0a512 512 0 1 0 1024 0 512 512 0 1 0-1024 0Z" fill="#6D768D"></path><path d="M524.074667 225.408l274.517333 274.517333a17.066667 17.066667 0 0 1 0 24.149334l-274.517333 274.517333a17.066667 17.066667 0 0 1-24.149334 0l-274.517333-274.517333a17.066667 17.066667 0 0 1 0-24.149334l274.517333-274.517333a17.066667 17.066667 0 0 1 24.149334 0z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "4",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 512m-512 0a512 512 0 1 0 1024 0 512 512 0 1 0-1024 0Z" fill="#6D768D"></path><path d="M317.866667 300.8h388.266666c9.386667 0 17.066667 7.68 17.066667 17.066667v388.266666a17.066667 17.066667 0 0 1-17.066667 17.066667h-388.266666a17.066667 17.066667 0 0 1-17.066667-17.066667v-388.266666c0-9.386667 7.68-17.066667 17.066667-17.066667z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "5",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 512m-512 0a512 512 0 1 0 1024 0 512 512 0 1 0-1024 0Z" fill="#6D768D"></path><path d="M498.346667 279.082667L248.789333 701.44a15.829333 15.829333 0 0 0 13.653334 23.893333h499.114666a15.829333 15.829333 0 0 0 13.653334-23.893333l-249.6-422.357333a15.829333 15.829333 0 0 0-27.264 0z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "6",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 512m-512 0a512 512 0 1 0 1024 0 512 512 0 1 0-1024 0Z" fill="#6D768D"></path><path d="M497.749333 798.549333l-31.445333-28.501333C313.941333 631.722667 213.333333 540.501333 213.333333 428.8a160.981333 160.981333 0 0 1 162.730667-162.730667c51.498667 0 100.906667 23.978667 133.12 61.696a177.536 177.536 0 0 1 133.162667-61.696 160.981333 160.981333 0 0 1 162.730666 162.730667c0 111.701333-100.608 202.965333-252.970666 341.333333l-31.445334 28.458667a17.066667 17.066667 0 0 1-22.912 0z" fill="#FFFFFF"></path><path d="M634.538667 487.808L555.050667 426.24 507.306667 256a201.002667 201.002667 0 0 0-23.594667 20.394667l-0.256-0.256L525.653333 426.666667l-133.290666 59.946666a14.08 14.08 0 0 0-8.021334 15.957334l28.757334 126.378666a14.208 14.208 0 0 0 27.733333-6.229333l-26.24-115.114667 126.037333-56.704 76.416 59.136a14.250667 14.250667 0 0 0 19.968-2.474666 14.08 14.08 0 0 0-2.474666-19.797334z" fill="#6D768D"></path></svg>`
      },
      {
        name: "7",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 512m-512 0a512 512 0 1 0 1024 0 512 512 0 1 0-1024 0Z" fill="#6D768D"></path><path d="M497.749333 798.549333l-31.445333-28.501333C313.941333 631.722667 213.333333 540.501333 213.333333 428.8a160.981333 160.981333 0 0 1 162.730667-162.730667c51.498667 0 100.906667 23.978667 133.12 61.696a177.536 177.536 0 0 1 133.162667-61.696 160.981333 160.981333 0 0 1 162.730666 162.730667c0 111.701333-100.608 202.965333-252.970666 341.333333l-31.445334 28.458667a17.066667 17.066667 0 0 1-22.912 0z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "8",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 512m-512 0a512 512 0 1 0 1024 0 512 512 0 1 0-1024 0Z" fill="#6D768D"></path><path d="M374.656 273.194667c5.973333 4.48 12.117333 9.6 18.346667 15.36 6.272 5.717333 11.904 12.373333 16.896 19.84 2.517333 4.010667 5.504 8.490667 9.002666 13.482666a529.493333 529.493333 0 0 1 20.266667 32.213334h155.221333a169.813333 169.813333 0 0 0 9.770667-15.744c2.474667-4.48 5.248-8.96 8.234667-13.482667a460.842667 460.842667 0 0 1 23.253333-31.829333c4.992-6.229333 12.245333-12.373333 21.76-18.346667a34.261333 34.261333 0 0 0 10.112-9.728 31.274667 31.274667 0 0 0 5.248-11.989333 18.56 18.56 0 0 0-1.536-11.605334 17.664 17.664 0 0 0-10.112-8.618666c-4.48-1.493333-8.362667-2.005333-11.605333-1.493334a46.933333 46.933333 0 0 0-9.770667 2.602667c-3.242667 1.28-6.613333 2.645333-10.112 4.138667a32.426667 32.426667 0 0 1-12.757333 2.261333 26.026667 26.026667 0 0 1-12.373334-2.645333 45.653333 45.653333 0 0 1-8.96-6.357334l-8.661333-7.850666a30.336 30.336 0 0 0-11.989333-6.4c-9.984-3.968-18.005333-4.693333-24.021334-2.218667-5.973333 2.474667-11.946667 6.485333-17.962666 11.946667a88.618667 88.618667 0 0 1-11.989334 10.496 7.338667 7.338667 0 0 1-3.754666 1.493333 46.165333 46.165333 0 0 1-8.277334-5.205333 71.808 71.808 0 0 1-7.125333-4.906667 37.973333 37.973333 0 0 1-6.4-6.357333c-3.968-3.968-9.941333-6.613333-17.92-7.850667a31.061333 31.061333 0 0 0-21.76 4.138667c-8.533333 5.461333-14.506667 10.069333-18.048 13.824a29.354667 29.354667 0 0 1-15.744 7.893333 23.978667 23.978667 0 0 1-13.098667-0.768 987.733333 987.733333 0 0 0-14.634666-4.48 80.725333 80.725333 0 0 0-14.250667-2.986667 16.768 16.768 0 0 0-11.989333 2.986667c-6.997333 5.461333-9.258667 12.074667-6.741334 19.84a34.56 34.56 0 0 0 13.482667 18.346667z" fill="#FFFFFF"></path><path d="M780.757333 545.152a219.306667 219.306667 0 0 0-19.882666-65.536 224.981333 224.981333 0 0 0-33.365334-49.792 430.336 430.336 0 0 0-37.12-37.12c-14.506667-11.946667-27.264-23.296-38.272-34.048a544.512 544.512 0 0 1-27.733333-28.842667 305.28 305.28 0 0 1-22.485333-26.197333h-168.746667c-6.485333 8.490667-13.994667 17.493333-22.485333 26.965333a360.96 360.96 0 0 1-26.24 28.074667c-10.538667 10.24-22.272 21.12-35.285334 32.597333a305.493333 305.493333 0 0 0-41.6 44.16 250.026667 250.026667 0 0 0-49.493333 117.589334 216.106667 216.106667 0 0 0 1.877333 70.4 220.586667 220.586667 0 0 0 75.349334 126.549333c21.248 18.005333 47.146667 32.597333 77.653333 43.818667 30.464 11.264 65.493333 16.853333 104.96 16.853333 38.528 0 72.874667-4.864 103.125333-14.592a265.045333 265.045333 0 0 0 78.378667-39.338667c21.973333-16.469333 39.594667-35.797333 52.864-58.026666 13.226667-22.186667 22.101333-45.824 26.624-70.784 4.992-30.421333 5.632-58.026667 1.877333-82.773334z" fill="#FFFFFF"></path><path d="M593.322667 647.509333a20.48 20.48 0 0 1-11.861334 3.2h-50.133333v14.165334c0 4.266667-1.792 8.362667-5.376 12.373333a15.914667 15.914667 0 0 1-13.952 5.333333 24.917333 24.917333 0 0 1-14.336-3.882666c-3.84-2.602667-5.973333-7.210667-6.4-13.824v-14.165334h-48.725333a17.792 17.792 0 0 1-11.818667-3.882666 10.24 10.24 0 0 1-3.968-9.6c0-4.266667 1.578667-7.68 4.693333-10.24a16.768 16.768 0 0 1 11.093334-3.925334h48.682666v-24.789333h-48.682666a15.573333 15.573333 0 0 1-11.52-4.266667 13.525333 13.525333 0 0 1-4.266667-9.941333 15.36 15.36 0 0 1 4.693333-10.624 14.72 14.72 0 0 1 11.093334-4.949333h48.682666l0.725334-14.890667a1053.568 1053.568 0 0 1-40.832-42.538667l-10.752-9.898666a41.216 41.216 0 0 1-6.442667-11.690667c-1.92-4.992-0.938667-10.069333 2.858667-15.274667a13.653333 13.653333 0 0 1 15.786666-3.84c6.186667 2.090667 11.221333 4.821333 15.018667 8.106667 1.92 2.389333 5.248 5.888 10.026667 10.666667l15.061333 14.848 19.328 19.157333 22.186667-20.565333a987.605333 987.605333 0 0 1 29.397333-25.514667 21.162667 21.162667 0 0 1 14.293333-5.674667c5.290667 0 9.557333 2.133333 12.928 6.4 6.186667 7.082667 3.84 15.36-7.168 24.789334a179.072 179.072 0 0 0-12.885333 12.373333c-5.76 5.973333-11.52 11.733333-17.194667 17.408-6.698667 7.082667-14.08 14.378667-22.186666 21.973333v13.44h46.506666c6.698667 0 11.605333 1.536 14.72 4.608a14.165333 14.165333 0 0 1 4.650667 10.282667c0 4.266667-1.450667 7.936-4.309333 11.008-2.858667 3.029333-7.637333 4.352-14.336 3.84l-46.506667 0.768-0.768 24.064h45.866667c13.354667 0 20.053333 4.992 20.053333 14.933333 0.469333 4.693333-0.853333 8.106667-3.925333 10.24z" fill="#6D768D"></path></svg>`
      },
      {
        name: "9",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 512m-512 0a512 512 0 1 0 1024 0 512 512 0 1 0-1024 0Z" fill="#6D768D"></path><path d="M512 213.333333l234.666667 341.333334h-128v213.333333h-213.333334v-213.333333h-128L512 213.333333z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "10",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 512m-512 0a512 512 0 1 0 1024 0 512 512 0 1 0-1024 0Z" fill="#6D768D"></path><path d="M533.333333 810.666667L298.666667 469.333333h128V256h213.333333v213.333333h128l-234.666667 341.333334z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "11",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 512m-512 0a512 512 0 1 0 1024 0 512 512 0 1 0-1024 0Z" fill="#6D768D"></path><path d="M213.333333 533.333333L554.666667 298.666667v128h213.333333v213.333333h-213.333333v128l-341.333334-234.666667z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "12",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 512m-512 0a512 512 0 1 0 1024 0 512 512 0 1 0-1024 0Z" fill="#6D768D"></path><path d="M810.666667 533.333333L469.333333 768v-128H256v-213.333333h213.333333V298.666667l341.333334 234.666666z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "13",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M0 512c0 282.752 229.248 512 512 512s512-229.248 512-512S794.752 0 512 0 0 229.248 0 512z" fill="#6D768D"></path><path d="M571.349333 508.586667l162.389334-162.346667a44.330667 44.330667 0 1 0-62.72-62.72l-162.389334 162.389333-162.517333-162.389333a44.330667 44.330667 0 1 0-62.72 62.72l162.389333 162.389333-162.389333 162.474667a44.330667 44.330667 0 1 0 62.72 62.72l162.389333-162.346667 162.389334 162.389334a44.330667 44.330667 0 1 0 62.72-62.72l-162.261334-162.56z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "14",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 0C233.386667 0 0 225.877333 0 512s225.877333 512 512 512 512-225.877333 512-512S790.613333 0 512 0z" fill="#6D768D"></path><path d="M726.144 311.210667l-277.333333 305.066666-124.8-124.8c-13.866667-13.866667-41.6-13.866667-55.466667 0-13.866667 13.866667-13.866667 41.6 0 55.466667l159.445333 152.533333c13.866667 13.866667 41.6 13.866667 55.466667 0l305.066667-332.8c13.866667-13.866667 13.866667-41.6 0-55.466666-20.778667-13.866667-48.512-13.866667-62.378667 0z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "15",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 512m-512 0a512 512 0 1 0 1024 0 512 512 0 1 0-1024 0Z" fill="#6D768D"></path><path d="M541.952 755.626667a40.618667 40.618667 0 0 1-29.824 12.373333 41.344 41.344 0 0 1-30.122667-12.373333 40.106667 40.106667 0 0 1-12.672-30.122667c0-11.605333 4.096-21.845333 12.672-30.122667a40.405333 40.405333 0 0 1 30.122667-12.714666c11.605333 0 21.546667 4.138667 29.824 12.714666a40.32 40.32 0 0 1 12.714667 30.122667c0 11.861333-4.096 21.76-12.714667 30.122667zM450.986667 241.28A77.866667 77.866667 0 0 1 512.256 213.333333c24.874667 0 45.354667 8.917333 61.354667 27.946667 15.488 18.432 23.722667 41.685333 23.722666 69.674667 0 23.765333-33.152 200.533333-44.672 329.045333h-80.128C463.146667 511.402667 426.666667 334.677333 426.666667 310.954667c0-27.392 8.277333-50.645333 24.32-69.674667z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "16",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 0C229.248 0 0 229.248 0 512s229.248 512 512 512 512-229.248 512-512S794.794667 0 512 0z" fill="#6D768D"></path><path d="M490.666667 682.666667a64 64 0 1 1 0 128 64 64 0 0 1 0-128z m13.994666-490.752c61.397333 0 112.341333 14.634667 153.002667 43.946666 40.533333 29.269333 60.885333 72.618667 60.885333 130.133334 0 35.242667-12.373333 64.938667-29.952 89.045333-10.282667 14.677333-33.664 33.408-62.890666 56.192l-32.426667 22.357333c-15.701333 12.202667-29.696 26.453333-34.858667 42.666667-1.706667 5.546667-3.072 14.677333-3.968 24.533333-0.426667 4.949333-4.864 15.018667-15.232 15.018667h-83.328c-13.568 0-15.957333-10.581333-15.744-15.786667 1.493333-34.005333 4.608-64.213333 18.474667-80.469333 28.074667-32.896 91.904-73.813333 91.904-73.813333a104.106667 104.106667 0 0 0 23.552-24.021334c10.837333-14.933333 19.797333-31.317333 19.797333-49.237333 0-20.565333-6.016-39.338667-18.090666-56.32-12.032-16.938667-34.090667-25.386667-66.005334-25.386667-31.445333 0-53.76 10.410667-66.901333 31.274667-9.685333 15.445333-15.786667 29.610667-18.346667 45.013333-0.853333 5.461333-4.394667 16.981333-16.042666 16.981334H327.210667c-17.322667 0-21.12-11.221333-20.650667-16.64 6.272-68.138667 32.896-114.688 80-144.597334 32-20.565333 71.381333-30.890667 118.101333-30.890666z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "17",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 512m-512 0a512 512 0 1 0 1024 0 512 512 0 1 0-1024 0Z" fill="#6D768D"></path><path d="M336.256 410.026667H253.312a40.021333 40.021333 0 0 0-39.850667 43.264l23.296 278.101333c1.706667 20.693333 19.072 36.608 39.850667 36.608h59.648c11.050667 0 20.010667-8.96 20.010667-19.968v-318.037333a19.968 19.968 0 0 0-20.010667-19.968z m434.432 0h-178.944C653.312 182.314667 548.949333 170.666667 548.949333 170.666667c-44.288 0-35.114667 34.986667-38.442666 40.832 0 84.48-68.010667 155.093333-101.034667 184.362666a39.552 39.552 0 0 0-13.226667 29.653334v322.56c0 11.008 8.96 19.925333 20.010667 19.925333h233.728c30.378667 0 58.154667-17.152 71.68-44.373333 18.176-36.736 40.448-90.112 54.656-133.973334 13.781333-42.410667 26.24-94.976 33.578667-131.968a39.850667 39.850667 0 0 0-39.253334-47.658666z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "18",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 512m-512 0a512 512 0 1 0 1024 0 512 512 0 1 0-1024 0Z" fill="#6D768D"></path><path d="M796.16 413.909333c-31.146667-0.298667-115.626667-0.085333-146.858667-0.085333h-158.464c8.533333-7.68 15.914667-14.506667 23.594667-20.906667 29.781333-24.874667 25.813333-71.082667-14.208-88.874666-22.954667-10.24-44.970667-5.632-64 11.52-34.944 31.274667-69.632 62.677333-104.277333 93.994666a15.488 15.488 0 0 1-11.178667 4.437334c-11.221333-0.085333-26.88-0.128-46.933333-0.170667a17.066667 17.066667 0 0 0-17.109334 17.066667L256 719.701333a17.066667 17.066667 0 0 0 17.066667 17.152l49.578666-0.085333c3.968 0 7.466667 0.768 10.88 2.602667 15.829333 8.832 31.701333 17.493333 47.616 26.24a18.133333 18.133333 0 0 0 9.301334 2.346666h168.405333c6.186667 0 11.946667-0.981333 17.834667-2.56 29.44-7.253333 40.021333-30.293333 38.528-52.565333-0.768-9.728-4.266667-18.346667-9.984-26.24 19.626667-5.76 35.114667-16.213333 42.112-36.096 7.125333-20.394667 1.621333-38.4-12.672-53.333333 28.16-19.754667 34.858667-44.672 18.645333-75.648h140.458667c6.570667 0 13.013333-0.597333 19.370666-2.645334 31.957333-9.813333 48.810667-42.88 35.626667-71.552-10.154667-22.186667-28.629333-33.152-52.608-33.450666z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "19",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 512m-512 0a512 512 0 1 0 1024 0 512 512 0 1 0-1024 0Z" fill="#6D768D"></path><path d="M270.506667 413.909333c31.146667-0.298667 115.626667-0.085333 146.858666-0.085333h158.464c-8.533333-7.68-15.914667-14.506667-23.594666-20.906667-29.781333-24.874667-25.813333-71.082667 14.208-88.874666 22.954667-10.24 44.970667-5.632 64 11.52 34.944 31.274667 69.632 62.677333 104.277333 93.994666 3.413333 2.986667 6.528 4.437333 11.178667 4.437334 11.221333-0.085333 26.88-0.128 46.933333-0.170667a17.066667 17.066667 0 0 1 17.109333 17.066667l0.682667 288.853333a17.066667 17.066667 0 0 1-17.066667 17.152l-49.578666-0.085333a22.101333 22.101333 0 0 0-10.88 2.602666c-15.829333 8.832-31.701333 17.493333-47.616 26.24a18.133333 18.133333 0 0 1-9.301334 2.346667h-168.405333a68.693333 68.693333 0 0 1-17.834667-2.56c-29.44-7.253333-40.021333-30.293333-38.528-52.565333 0.768-9.728 4.266667-18.346667 9.984-26.24-19.626667-5.76-35.114667-16.213333-42.112-36.096-7.125333-20.394667-1.621333-38.4 12.672-53.333334-28.16-19.754667-34.858667-44.672-18.645333-75.648H272.853333c-6.570667 0-13.013333-0.597333-19.370666-2.645333-31.957333-9.813333-48.810667-42.88-35.626667-71.552 10.154667-22.186667 28.629333-33.152 52.608-33.450667z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "20",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 512m-512 0a512 512 0 1 0 1024 0 512 512 0 1 0-1024 0Z" fill="#6D768D"></path><path d="M667.733333 480.128H400v-111.36a97.706667 97.706667 0 0 1 97.621333-97.621333 97.706667 97.706667 0 0 1 97.578667 97.621333 28.885333 28.885333 0 0 0 57.813333 0A155.605333 155.605333 0 0 0 497.621333 213.333333a155.605333 155.605333 0 0 0-155.392 155.434667v111.36h-14.677333A28.885333 28.885333 0 0 0 298.666667 509.013333v292.010667a28.885333 28.885333 0 0 0 28.885333 28.885333h340.138667a28.885333 28.885333 0 0 0 28.928-28.885333V509.013333a28.885333 28.885333 0 0 0-28.928-28.885333z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "21",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 512m-512 0a512 512 0 1 0 1024 0 512 512 0 1 0-1024 0Z" fill="#6D768D"></path><path d="M400.042667 437.461333v-111.36a97.706667 97.706667 0 0 1 97.621333-97.621333 97.706667 97.706667 0 0 1 97.578667 97.621333 28.885333 28.885333 0 0 0 57.813333 0A155.605333 155.605333 0 0 0 497.621333 170.666667a155.605333 155.605333 0 0 0-155.392 155.434666v111.36h-14.677333A28.885333 28.885333 0 0 0 298.666667 466.346667v292.010666a28.885333 28.885333 0 0 0 28.885333 28.885334h340.138667a28.885333 28.885333 0 0 0 28.928-28.885334V466.346667a28.885333 28.885333 0 0 0-28.928-28.885334H400.042667z" fill="#FFFFFF"></path><path d="M595.242667 437.461333v-111.36a97.706667 97.706667 0 0 0-97.621334-97.621333 97.706667 97.706667 0 0 0-97.578666 97.621333 28.885333 28.885333 0 0 1-57.813334 0A155.605333 155.605333 0 0 1 497.621333 170.666667a155.605333 155.605333 0 0 1 155.434667 155.434666v111.36h14.634667c16 0 28.928 12.928 28.928 28.885334v292.010666a28.885333 28.885333 0 0 1-28.928 28.885334H327.552A28.885333 28.885333 0 0 1 298.666667 758.357333V466.346667c0-15.957333 12.928-28.885333 28.885333-28.885334h267.690667z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "22",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M511.999787 512.000213m-511.999787 0a511.999787 511.999787 0 1 0 1023.999573 0 511.999787 511.999787 0 1 0-1023.999573 0Z" fill="#6D768D"></path><path d="M381.354508 364.586941c0 54.015977 29.013321 103.935957 75.946635 130.986613a152.53327 152.53327 0 0 0 151.935936 0 151.12527 151.12527 0 0 0 75.946636-130.986613A151.594604 151.594604 0 0 0 533.333111 213.333671a151.594604 151.594604 0 0 0-151.89327 151.25327zM660.479725 498.901552a185.258589 185.258589 0 0 1-127.146614 50.346646c-49.066646 0-93.866628-19.199992-127.06128-50.346646C317.141201 544.853533 255.999893 637.440161 255.999893 744.106783c0 13.183995 10.709329 23.850657 23.978657 23.850657h506.709122a23.893323 23.893323 0 0 0 23.978657-23.893323c0-106.538622-61.098641-199.25325-150.186604-245.205232z" fill="#FFFFFF"></path></svg>`
      },
      {
        name: "23",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M512 512m-512 0a512 512 0 1 0 1024 0 512 512 0 1 0-1024 0Z" fill="#6D768D"></path><path d="M445.610667 401.578667a129.322667 129.322667 0 1 0 258.645333 0 129.322667 129.322667 0 0 0-258.645333 0z m237.568 114.901333a157.354667 157.354667 0 0 1-216.362667 0 236.373333 236.373333 0 0 0-127.957333 209.706667c0 11.264 9.130667 20.394667 20.394666 20.394666h431.402667a20.394667 20.394667 0 0 0 20.394667-20.394666 236.373333 236.373333 0 0 0-127.872-209.706667zM409.813333 401.578667c0-40.362667 14.592-77.397333 38.698667-106.112a112.725333 112.725333 0 0 0-29.013333-3.925334 112.64 112.64 0 0 0-112.426667 112.469334 112.64 112.64 0 0 0 144.853333 107.648 164.693333 164.693333 0 0 1-42.112-110.08z m-18.602666 136.704a136.533333 136.533333 0 0 1-65.706667-34.474667 205.44 205.44 0 0 0-111.232 182.4c0 9.813333 7.936 17.706667 17.706667 17.706667H303.36a273.621333 273.621333 0 0 1 87.893333-165.632z" fill="#FFFFFF"></path></svg>`
      }
    ]
  }
];
const getNodeIconListIcon = (name, extendIconList = []) => {
  let arr = name.split("_");
  const iconList = mergerIconList([...nodeIconList, ...extendIconList]);
  let typeData = iconList.find((item) => {
    return item.type === arr[0];
  });
  if (typeData) {
    let typeName = typeData.list.find((item) => {
      return item.name === arr[1];
    });
    if (typeName) {
      return typeName.icon;
    }
    return "";
  } else {
    return "";
  }
};
const iconsSvg = {
  hyperlink,
  note,
  attachment,
  nodeIconList,
  getNodeIconListIcon
};
const measureText = (text, style) => {
  const g = new G();
  const node = new Text().text(text);
  style.text(node);
  g.add(node);
  return g.bbox();
};
const defaultTagStyle = {
  radius: 3,
  // 标签矩形的圆角大小
  fontSize: 12,
  // 字号，建议文字高度不要大于height
  fill: "",
  // 标签矩形的背景颜色
  height: 20,
  // 标签矩形的高度
  paddingX: 8
  // 水平内边距，如果设置了width，将忽略该配置
  //width: 30 // 标签矩形的宽度，如果不设置，默认以文字的宽度+paddingX*2为宽度
};
function getImageUrl() {
  const img = this.getData("image");
  return (this.mindMap.renderer.renderTree.data.imgMap || {})[img] || img;
}
function createImgNode() {
  let img = this.getImageUrl();
  if (!img) {
    return;
  }
  img = (this.mindMap.renderer.renderTree.data.imgMap || {})[img] || img;
  const imgSize = this.getImgShowSize();
  const node = new Image$1().load(img).size(...imgSize);
  const { defaultNodeImage } = this.mindMap.opt;
  if (defaultNodeImage) {
    const imgEl = new Image();
    imgEl.onerror = () => {
      node.load(defaultNodeImage);
    };
    imgEl.src = img;
  }
  if (this.getData("imageTitle")) {
    node.attr("title", this.getData("imageTitle"));
  }
  node.on("click", (e) => {
    this.mindMap.emit("node_img_click", this, node, e);
  });
  node.on("dblclick", (e) => {
    this.mindMap.emit("node_img_dblclick", this, e, node);
  });
  node.on("mouseenter", (e) => {
    this.mindMap.emit("node_img_mouseenter", this, node, e);
  });
  node.on("mouseleave", (e) => {
    this.mindMap.emit("node_img_mouseleave", this, node, e);
  });
  node.on("mousemove", (e) => {
    this.mindMap.emit("node_img_mousemove", this, node, e);
  });
  return {
    node,
    width: imgSize[0],
    height: imgSize[1]
  };
}
function getImgShowSize() {
  const { custom, width: width2, height: height2 } = this.getData("imageSize");
  if (custom) return [width2, height2];
  return resizeImgSize(
    width2,
    height2,
    this.mindMap.themeConfig.imgMaxWidth,
    this.mindMap.themeConfig.imgMaxHeight
  );
}
function createIconNode() {
  let _data = this.getData();
  if (!_data.icon || _data.icon.length <= 0) {
    return [];
  }
  let iconSize = this.mindMap.themeConfig.iconSize;
  return _data.icon.map((item) => {
    let src = iconsSvg.getNodeIconListIcon(
      item,
      this.mindMap.opt.iconList || []
    );
    let node = null;
    if (/^<svg/.test(src)) {
      node = SVG(src);
    } else {
      node = new Image$1().load(src);
    }
    node.size(iconSize, iconSize);
    node.on("click", (e) => {
      this.mindMap.emit("node_icon_click", this, item, e, node);
    });
    node.on("mouseenter", (e) => {
      this.mindMap.emit("node_icon_mouseenter", this, item, e, node);
    });
    node.on("mouseleave", (e) => {
      this.mindMap.emit("node_icon_mouseleave", this, item, e, node);
    });
    return {
      node,
      width: iconSize,
      height: iconSize
    };
  });
}
function createRichTextNode(specifyText) {
  const hasCustomWidth = this.hasCustomWidth();
  let text = typeof specifyText === "string" ? specifyText : this.getData("text");
  let { textAutoWrapWidth, emptyTextMeasureHeightText } = this.mindMap.opt;
  textAutoWrapWidth = hasCustomWidth ? this.customTextWidth : textAutoWrapWidth;
  const g = new G();
  let recoverText = false;
  if (this.getData("resetRichText")) {
    delete this.nodeData.data.resetRichText;
    recoverText = true;
  }
  if (recoverText && !isUndef(text)) {
    if (checkIsRichText(text)) {
      text = removeRichTextStyes(text);
    } else {
      text = `<p>${text}</p>`;
    }
    this.setData({
      text
    });
  }
  const nodeTextStyleList = [];
  const nodeRichTextStyles = getNodeRichTextStyles(this);
  Object.keys(nodeRichTextStyles).forEach((prop) => {
    nodeTextStyleList.push([prop, nodeRichTextStyles[prop]]);
  });
  if (!this.mindMap.commonCaches.measureRichtextNodeTextSizeEl) {
    this.mindMap.commonCaches.measureRichtextNodeTextSizeEl = document.createElement("div");
    this.mindMap.commonCaches.measureRichtextNodeTextSizeEl.style.position = "fixed";
    this.mindMap.commonCaches.measureRichtextNodeTextSizeEl.style.left = "-999999px";
    this.mindMap.el.appendChild(
      this.mindMap.commonCaches.measureRichtextNodeTextSizeEl
    );
  }
  const div = this.mindMap.commonCaches.measureRichtextNodeTextSizeEl;
  nodeTextStyleList.forEach(([prop, value]) => {
    div.style[prop] = value;
  });
  div.style.lineHeight = 1.2;
  const html2 = `<div>${text}</div>`;
  div.innerHTML = html2;
  const el = div.children[0];
  el.classList.add("smm-richtext-node-wrap");
  addXmlns(el);
  el.style.maxWidth = textAutoWrapWidth + "px";
  if (hasCustomWidth) {
    el.style.width = this.customTextWidth + "px";
  } else {
    el.style.width = "";
  }
  let { width: width2, height: height2 } = el.getBoundingClientRect();
  if (height2 <= 0) {
    div.innerHTML = `<p>${emptyTextMeasureHeightText}</p>`;
    let elTmp = div.children[0];
    elTmp.classList.add("smm-richtext-node-wrap");
    height2 = elTmp.getBoundingClientRect().height;
    div.innerHTML = html2;
  }
  width2 = Math.min(Math.ceil(width2) + 1, textAutoWrapWidth);
  height2 = Math.ceil(height2);
  g.attr("data-width", width2);
  g.attr("data-height", height2);
  const foreignObject = createForeignObjectNode({
    el: div.children[0],
    width: width2,
    height: height2
  });
  const foreignObjectStyle = {
    "line-height": 1.2
  };
  nodeTextStyleList.forEach(([prop, value]) => {
    foreignObjectStyle[camelCaseToHyphen(prop)] = value;
  });
  foreignObject.css(foreignObjectStyle);
  g.add(foreignObject);
  return {
    node: g,
    nodeContent: foreignObject,
    width: width2,
    height: height2
  };
}
function createTextNode(specifyText) {
  if (this.getData("needUpdate")) {
    delete this.nodeData.data.needUpdate;
  }
  if (this.getData("richText")) {
    return this.createRichTextNode(specifyText);
  }
  const text = typeof specifyText === "string" ? specifyText : this.getData("text");
  if (this.getData("resetRichText")) {
    delete this.nodeData.data.resetRichText;
  }
  const g = new G();
  const fontSize = this.getStyle("fontSize", false);
  const textAlign = this.getStyle("textAlign", false);
  let textArr = [];
  if (!isUndef(text)) {
    textArr = String(text).split(/\n/gim);
  }
  const { textAutoWrapWidth: maxWidth, emptyTextMeasureHeightText } = this.mindMap.opt;
  let isMultiLine = textArr.length > 1;
  textArr.forEach((item, index) => {
    let arr = item.split("");
    let lines = [];
    let line = [];
    while (arr.length) {
      let str = arr.shift();
      let text2 = [...line, str].join("");
      if (measureText(text2, this.style).width <= maxWidth) {
        line.push(str);
      } else {
        lines.push(line.join(""));
        line = [str];
      }
    }
    if (line.length > 0) {
      lines.push(line.join(""));
    }
    if (lines.length > 1) {
      isMultiLine = true;
    }
    textArr[index] = lines.join("\n");
  });
  textArr = textArr.join("\n").replace(/\n$/g, "").split(/\n/gim);
  textArr.forEach((item, index) => {
    if (item === "") {
      item = "\uFEFF";
    }
    const node = new Text().text(item);
    node.addClass("smm-text-node-wrap");
    node.attr(
      "text-anchor",
      {
        left: "start",
        center: "middle",
        right: "end"
      }[textAlign] || "start"
    );
    this.style.text(node);
    node.y(
      fontSize * noneRichTextNodeLineHeight * index + (noneRichTextNodeLineHeight - 1) * fontSize / 2
    );
    g.add(node);
  });
  let { width: width2, height: height2 } = g.bbox();
  if (height2 <= 0) {
    const tmpNode = new Text().text(emptyTextMeasureHeightText);
    this.style.text(tmpNode);
    const tmpBbox = tmpNode.bbox();
    height2 = tmpBbox.height;
  }
  width2 = Math.min(Math.ceil(width2), maxWidth);
  height2 = Math.ceil(height2);
  g.attr("data-width", width2);
  g.attr("data-height", height2);
  g.attr("data-ismultiLine", isMultiLine || textArr.length > 1);
  return {
    node: g,
    width: width2,
    height: height2
  };
}
function createHyperlinkNode() {
  const { hyperlink: hyperlink2, hyperlinkTitle } = this.getData();
  if (!hyperlink2) {
    return;
  }
  const { customHyperlinkJump, hyperlinkIcon } = this.mindMap.opt;
  const { icon, style } = hyperlinkIcon;
  const iconSize = this.getNodeIconSize("hyperlinkIcon");
  const node = new SVG().size(iconSize, iconSize);
  const a = new A().to(hyperlink2).target("_blank");
  a.node.addEventListener("click", (e) => {
    if (typeof customHyperlinkJump === "function") {
      e.preventDefault();
      customHyperlinkJump(hyperlink2, this);
    }
  });
  if (hyperlinkTitle) {
    node.add(SVG(`<title>${hyperlinkTitle}</title>`));
  }
  a.rect(iconSize, iconSize).fill({ color: "transparent" });
  const iconNode = SVG(icon || iconsSvg.hyperlink).size(iconSize, iconSize);
  this.style.iconNode(iconNode, style.color);
  a.add(iconNode);
  node.add(a);
  return {
    node,
    width: iconSize,
    height: iconSize
  };
}
function createTagNode() {
  const tagData = this.getData("tag");
  if (!tagData || tagData.length <= 0) {
    return [];
  }
  let { maxTag, tagsColorMap } = this.mindMap.opt;
  tagsColorMap = tagsColorMap || {};
  const nodes = [];
  tagData.slice(0, maxTag).forEach((item, index) => {
    let str = "";
    let style = {
      ...defaultTagStyle
    };
    if (typeof item === "string") {
      str = item;
    } else {
      str = item.text;
      style = { ...defaultTagStyle, ...item.style };
    }
    const hasCustomWidth = typeof style.width !== "undefined";
    const tag = new G();
    tag.on("click", () => {
      this.mindMap.emit("node_tag_click", this, item, index, tag);
    });
    const text = new Text().text(str);
    this.style.tagText(text, style);
    const { width: textWidth, height: textHeight } = text.bbox();
    const rectWidth = hasCustomWidth ? style.width : textWidth + style.paddingX * 2;
    const maxWidth = hasCustomWidth ? Math.max(rectWidth, textWidth) : rectWidth;
    const maxHeight = Math.max(style.height, textHeight);
    if (hasCustomWidth) {
      text.x((maxWidth - textWidth) / 2);
    } else {
      text.x(hasCustomWidth ? 0 : style.paddingX);
    }
    text.cy(-maxHeight / 2);
    const rect = new Rect().size(rectWidth, style.height).cy(-maxHeight / 2);
    if (hasCustomWidth) {
      rect.x((maxWidth - rectWidth) / 2);
    }
    this.style.tagRect(rect, {
      ...style,
      fill: style.fill || // 优先节点自身配置
      tagsColorMap[text.node.textContent] || // 否则尝试从实例化选项tagsColorMap映射中获取颜色
      generateColorByContent(text.node.textContent)
      // 否则按照标签内容生成
    });
    tag.add(rect).add(text);
    nodes.push({
      node: tag,
      width: maxWidth,
      height: maxHeight
    });
  });
  return nodes;
}
function createNoteNode() {
  if (!this.getData("note")) {
    return null;
  }
  const { icon, style } = this.mindMap.opt.noteIcon;
  const iconSize = this.getNodeIconSize("noteIcon");
  const node = new SVG().attr("cursor", "pointer").addClass("smm-node-note").size(iconSize, iconSize);
  node.add(new Rect().size(iconSize, iconSize).fill({ color: "transparent" }));
  const iconNode = SVG(icon || iconsSvg.note).size(iconSize, iconSize);
  this.style.iconNode(iconNode, style.color);
  node.add(iconNode);
  if (!this.mindMap.opt.customNoteContentShow) {
    if (!this.noteEl) {
      this.noteEl = document.createElement("div");
      this.noteEl.style.cssText = `
          position: fixed;
          padding: 10px;
          border-radius: 5px;
          box-shadow: 0 2px 5px rgb(0 0 0 / 10%);
          display: none;
          background-color: #fff;
          z-index: ${this.mindMap.opt.nodeNoteTooltipZIndex}
      `;
      const targetNode = this.mindMap.opt.customInnerElsAppendTo || document.body;
      targetNode.appendChild(this.noteEl);
    }
    this.noteEl.innerText = this.getData("note");
  }
  node.on("mouseover", () => {
    const { left, top } = this.getNoteContentPosition();
    if (!this.mindMap.opt.customNoteContentShow) {
      this.noteEl.style.left = left + "px";
      this.noteEl.style.top = top + "px";
      this.noteEl.style.display = "block";
    } else {
      this.mindMap.opt.customNoteContentShow.show(
        this.getData("note"),
        left,
        top,
        this
      );
    }
  });
  node.on("mouseout", () => {
    if (!this.mindMap.opt.customNoteContentShow) {
      this.noteEl.style.display = "none";
    } else {
      this.mindMap.opt.customNoteContentShow.hide();
    }
  });
  node.on("click", (e) => {
    this.mindMap.emit("node_note_click", this, e, node);
  });
  node.on("dblclick", (e) => {
    this.mindMap.emit("node_note_dblclick", this, e, node);
  });
  return {
    node,
    width: iconSize,
    height: iconSize
  };
}
function createAttachmentNode() {
  const { attachmentUrl, attachmentName } = this.getData();
  if (!attachmentUrl) {
    return;
  }
  const iconSize = this.getNodeIconSize("attachmentIcon");
  const { icon, style } = this.mindMap.opt.attachmentIcon;
  const node = new SVG().attr("cursor", "pointer").size(iconSize, iconSize);
  if (attachmentName) {
    node.add(SVG(`<title>${attachmentName}</title>`));
  }
  node.add(new Rect().size(iconSize, iconSize).fill({ color: "transparent" }));
  const iconNode = SVG(icon || iconsSvg.attachment).size(iconSize, iconSize);
  this.style.iconNode(iconNode, style.color);
  node.add(iconNode);
  node.on("click", (e) => {
    this.mindMap.emit("node_attachmentClick", this, e, node);
  });
  node.on("contextmenu", (e) => {
    this.mindMap.emit("node_attachmentContextmenu", this, e, node);
  });
  return {
    node,
    width: iconSize,
    height: iconSize
  };
}
function getNodeIconSize(prop) {
  const { style } = this.mindMap.opt[prop];
  return isUndef(style.size) ? this.mindMap.themeConfig.iconSize : style.size;
}
function getNoteContentPosition() {
  const iconSize = this.getNodeIconSize("noteIcon");
  const { scaleY } = this.mindMap.view.getTransformData().transform;
  const iconSizeAddScale = iconSize * scaleY;
  let { left, top } = this._noteData.node.node.getBoundingClientRect();
  top += iconSizeAddScale;
  return {
    left,
    top
  };
}
function measureCustomNodeContentSize(content) {
  if (!this.mindMap.commonCaches.measureCustomNodeContentSizeEl) {
    this.mindMap.commonCaches.measureCustomNodeContentSizeEl = document.createElement("div");
    this.mindMap.commonCaches.measureCustomNodeContentSizeEl.style.cssText = `
      position: fixed;
      left: -99999px;
      top: -99999px;
    `;
    this.mindMap.el.appendChild(
      this.mindMap.commonCaches.measureCustomNodeContentSizeEl
    );
  }
  this.mindMap.commonCaches.measureCustomNodeContentSizeEl.innerHTML = "";
  this.mindMap.commonCaches.measureCustomNodeContentSizeEl.appendChild(content);
  let rect = this.mindMap.commonCaches.measureCustomNodeContentSizeEl.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height
  };
}
function isUseCustomNodeContent() {
  return !!this._customNodeContent;
}
const nodeCreateContentsMethods = {
  getImageUrl,
  createImgNode,
  getImgShowSize,
  createIconNode,
  createRichTextNode,
  createTextNode,
  createHyperlinkNode,
  createTagNode,
  createNoteNode,
  createAttachmentNode,
  getNoteContentPosition,
  getNodeIconSize,
  measureCustomNodeContentSize,
  isUseCustomNodeContent
};
function renderExpandBtnPlaceholderRect() {
  if (this.getChildrenLength() <= 0 || this.isRoot) {
    return;
  }
  const { alwaysShowExpandBtn, notShowExpandBtn, expandBtnSize } = this.mindMap.opt;
  if (!alwaysShowExpandBtn && !notShowExpandBtn) {
    let { width: width2, height: height2 } = this;
    if (!this._unVisibleRectRegionNode) {
      this._unVisibleRectRegionNode = new Rect();
      this._unVisibleRectRegionNode.fill({
        color: "transparent"
      });
    }
    this.group.add(this._unVisibleRectRegionNode);
    this.renderer.layout.renderExpandBtnRect(
      this._unVisibleRectRegionNode,
      expandBtnSize,
      width2,
      height2,
      this
    );
  }
}
function clearExpandBtnPlaceholderRect() {
  if (!this._unVisibleRectRegionNode) {
    return;
  }
  this._unVisibleRectRegionNode.remove();
  this._unVisibleRectRegionNode = null;
}
function updateExpandBtnPlaceholderRect() {
  if (this.needRerenderExpandBtnPlaceholderRect) {
    this.needRerenderExpandBtnPlaceholderRect = false;
    this.renderExpandBtnPlaceholderRect();
  }
  if (this.getChildrenLength() > 0) {
    if (!this._unVisibleRectRegionNode) {
      this.renderExpandBtnPlaceholderRect();
    }
  } else {
    if (this._unVisibleRectRegionNode) {
      this.clearExpandBtnPlaceholderRect();
    }
  }
}
const nodeExpandBtnPlaceholderRectMethods = {
  renderExpandBtnPlaceholderRect,
  clearExpandBtnPlaceholderRect,
  updateExpandBtnPlaceholderRect
};
function initDragHandle() {
  if (!this.checkEnableDragModifyNodeWidth()) {
    return;
  }
  this._dragHandleNodes = null;
  this.dragHandleWidth = 4;
  this.dragHandleMousedownX = 0;
  this.isDragHandleMousedown = false;
  this.dragHandleIndex = 0;
  this.dragHandleMousedownCustomTextWidth = 0;
  this.dragHandleMousedownBodyCursor = "";
  this.dragHandleMousedownLeft = 0;
  this.onDragMousemoveHandle = this.onDragMousemoveHandle.bind(this);
  window.addEventListener("mousemove", this.onDragMousemoveHandle);
  this.onDragMouseupHandle = this.onDragMouseupHandle.bind(this);
  window.addEventListener("mouseup", this.onDragMouseupHandle);
  this.mindMap.on("node_mouseup", this.onDragMouseupHandle);
}
function onDragMousemoveHandle(e) {
  if (!this.isDragHandleMousedown) return;
  e.stopPropagation();
  e.preventDefault();
  let {
    minNodeTextModifyWidth,
    maxNodeTextModifyWidth,
    isUseCustomNodeContent: isUseCustomNodeContent2,
    customCreateNodeContent
  } = this.mindMap.opt;
  const useCustomContent = isUseCustomNodeContent2 && customCreateNodeContent && this._customNodeContent;
  document.body.style.cursor = "ew-resize";
  this.group.css({
    cursor: "ew-resize"
  });
  const { scaleX } = this.mindMap.draw.transform();
  const ox = e.clientX - this.dragHandleMousedownX;
  let newWidth = this.dragHandleMousedownCustomTextWidth + (this.dragHandleIndex === 0 ? -ox : ox) / scaleX;
  newWidth = Math.max(newWidth, minNodeTextModifyWidth);
  if (maxNodeTextModifyWidth !== -1) {
    newWidth = Math.min(newWidth, maxNodeTextModifyWidth);
  }
  if (!useCustomContent && this.getData("image")) {
    const imgSize = this.getImgShowSize();
    if (this._rectInfo.textContentWidth - this.customTextWidth + newWidth <= imgSize[0]) {
      newWidth = imgSize[0] + this.customTextWidth - this._rectInfo.textContentWidth;
    }
  }
  this.customTextWidth = newWidth;
  if (this.dragHandleIndex === 0) {
    this.left = this.dragHandleMousedownLeft + ox / scaleX;
  }
  this.reRender(useCustomContent ? [] : ["text"], {
    ignoreUpdateCustomTextWidth: true
  });
}
function onDragMouseupHandle() {
  if (!this.isDragHandleMousedown) return;
  document.body.style.cursor = this.dragHandleMousedownBodyCursor;
  this.group.css({
    cursor: "default"
  });
  this.isDragHandleMousedown = false;
  this.dragHandleMousedownX = 0;
  this.dragHandleIndex = 0;
  this.dragHandleMousedownCustomTextWidth = 0;
  this.setData({
    customTextWidth: this.customTextWidth
  });
  this.mindMap.render();
  this.mindMap.emit("dragModifyNodeWidthEnd", this);
}
function createDragHandleNode() {
  const list = [new Rect(), new Rect()];
  list.forEach((node, index) => {
    node.size(this.dragHandleWidth, this.height).fill({
      color: "transparent"
    }).css({
      cursor: "ew-resize"
    });
    node.on("mousedown", (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.dragHandleMousedownX = e.clientX;
      this.dragHandleIndex = index;
      this.dragHandleMousedownCustomTextWidth = this.customTextWidth === void 0 ? this._textData ? this._textData.width : this.width : this.customTextWidth;
      this.dragHandleMousedownBodyCursor = document.body.style.cursor;
      this.dragHandleMousedownLeft = this.left;
      this.isDragHandleMousedown = true;
    });
  });
  return list;
}
function updateDragHandle() {
  if (!this.checkEnableDragModifyNodeWidth()) return;
  if (!this._dragHandleNodes) {
    this._dragHandleNodes = this.createDragHandleNode();
  }
  if (this.getData("isActive")) {
    this._dragHandleNodes.forEach((node) => {
      node.height(this.height);
      this.group.add(node);
    });
    this._dragHandleNodes[1].x(this.width - this.dragHandleWidth);
  } else {
    this._dragHandleNodes.forEach((node) => {
      node.remove();
    });
  }
}
const nodeModifyWidthMethods = {
  initDragHandle,
  onDragMousemoveHandle,
  onDragMouseupHandle,
  createDragHandleNode,
  updateDragHandle
};
function createUserListNode() {
  if (!this.mindMap.cooperate) return;
  this._userListGroup = new G();
  this.group.add(this._userListGroup);
}
function createTextAvatar(item) {
  const { avatarSize, fontSize } = this.mindMap.opt.cooperateStyle;
  const g = new G();
  const str = item.isMore ? item.name : String(item.name)[0];
  const circle = new Circle().size(avatarSize, avatarSize);
  circle.fill({
    color: item.color || generateColorByContent(str)
  });
  const text = new Text().text(str).fill({
    color: "#fff"
  }).css({
    "font-size": fontSize + "px"
  }).dx(-fontSize / 2).dy((avatarSize - fontSize) / 2);
  g.add(circle).add(text);
  return g;
}
function createImageAvatar(item) {
  const { avatarSize } = this.mindMap.opt.cooperateStyle;
  return new Image$1().load(item.avatar).size(avatarSize, avatarSize);
}
function updateUserListNode() {
  if (!this._userListGroup) return;
  const { avatarSize } = this.mindMap.opt.cooperateStyle;
  this._userListGroup.clear();
  const length2 = this.userList.length;
  const maxShowCount = Math.floor(this.width / avatarSize);
  const list = [];
  if (length2 > maxShowCount) {
    list.push(...this.userList.slice(0, maxShowCount - 1), {
      isMore: true,
      name: "+" + (length2 - maxShowCount + 1)
    });
  } else {
    list.push(...this.userList);
  }
  list.forEach((item, index) => {
    let node = null;
    if (item.avatar) {
      node = this.createImageAvatar(item);
    } else {
      node = this.createTextAvatar(item);
    }
    node.on("click", (e) => {
      this.mindMap.emit("node_cooperate_avatar_click", item, this, node, e);
    });
    node.on("mouseenter", (e) => {
      this.mindMap.emit("node_cooperate_avatar_mouseenter", item, this, node, e);
    });
    node.on("mouseleave", (e) => {
      this.mindMap.emit("node_cooperate_avatar_mouseleave", item, this, node, e);
    });
    node.x(index * avatarSize).cy(-avatarSize / 2);
    this._userListGroup.add(node);
  });
}
function addUser(userInfo) {
  if (this.userList.find((item) => {
    return item.id == userInfo.id;
  }))
    return;
  this.userList.push(userInfo);
  this.updateUserListNode();
}
function removeUser(userInfo) {
  const index = this.userList.findIndex((item) => {
    return item.id == userInfo.id;
  });
  if (index === -1) return;
  this.userList.splice(index, 1);
  this.updateUserListNode();
}
function emptyUser() {
  this.userList = [];
  this.updateUserListNode();
}
const nodeCooperateMethods = {
  createUserListNode,
  updateUserListNode,
  createTextAvatar,
  createImageAvatar,
  addUser,
  removeUser,
  emptyUser
};
function initQuickCreateChildBtn() {
  if (this.isGeneralization) return;
  this._quickCreateChildBtn = null;
  this._showQuickCreateChildBtn = false;
}
function showQuickCreateChildBtn() {
  if (this.isGeneralization || this.getChildrenLength() > 0) return;
  if (this._quickCreateChildBtn) {
    this.group.add(this._quickCreateChildBtn);
  } else {
    const { quickCreateChildBtnIcon, expandBtnStyle, expandBtnSize } = this.mindMap.opt;
    const { icon, style } = quickCreateChildBtnIcon;
    let { color, fill } = expandBtnStyle || {
      color: "#808080",
      fill: "#fff"
    };
    color = style.color || color;
    const iconNode = SVG(icon || btnsSvg.quickCreateChild).size(
      expandBtnSize,
      expandBtnSize
    );
    iconNode.css({
      cursor: "pointer"
    });
    iconNode.x(0).y(-expandBtnSize / 2);
    this.style.iconNode(iconNode, color);
    const fillNode = new Circle().size(expandBtnSize);
    fillNode.x(0).y(-expandBtnSize / 2);
    fillNode.fill({ color: fill }).css({
      cursor: "pointer"
    });
    this._quickCreateChildBtn = new G();
    this._quickCreateChildBtn.add(fillNode).add(iconNode);
    this._quickCreateChildBtn.on("click", (e) => {
      e.stopPropagation();
      this.mindMap.emit("quick_create_btn_click", this);
      const { customQuickCreateChildBtnClick } = this.mindMap.opt;
      if (typeof customQuickCreateChildBtnClick === "function") {
        customQuickCreateChildBtnClick(this);
        return;
      }
      this.mindMap.execCommand("INSERT_CHILD_NODE", true, [this]);
    });
    this._quickCreateChildBtn.on("dblclick", (e) => {
      e.stopPropagation();
    });
    this._quickCreateChildBtn.addClass("smm-quick-create-child-btn");
    this.group.add(this._quickCreateChildBtn);
  }
  this._showQuickCreateChildBtn = true;
  this.renderer.layout.renderExpandBtn(this, this._quickCreateChildBtn);
}
function removeQuickCreateChildBtn() {
  if (this.isGeneralization) return;
  if (this._quickCreateChildBtn && this._showQuickCreateChildBtn) {
    this._quickCreateChildBtn.remove();
    this._showQuickCreateChildBtn = false;
  }
}
function hideQuickCreateChildBtn() {
  if (this.isGeneralization) return;
  const { isActive } = this.getData();
  if (!isActive) {
    this.removeQuickCreateChildBtn();
  }
}
const quickCreateChildBtnMethods = {
  initQuickCreateChildBtn,
  showQuickCreateChildBtn,
  removeQuickCreateChildBtn,
  hideQuickCreateChildBtn
};
function getImgTextMarin(dir, imgWidth, textWidth, imgHeight, textHeight) {
  const { imgTextMargin } = this.mindMap.opt;
  if (dir === "v") {
    return imgHeight > 0 && textHeight > 0 ? imgTextMargin : 0;
  } else {
    return imgWidth > 0 && textWidth > 0 ? imgTextMargin : 0;
  }
}
function getTagContentSize(space) {
  let maxTagHeight = 0;
  let width2 = this._tagData.reduce((sum, cur) => {
    maxTagHeight = Math.max(maxTagHeight, cur.height);
    return sum += cur.width;
  }, 0);
  width2 += (this._tagData.length - 1) * space;
  return {
    width: width2,
    height: maxTagHeight
  };
}
function getNodeRect() {
  if (this.isUseCustomNodeContent()) {
    const rect = this.measureCustomNodeContentSize(
      this._customNodeContent.cloneNode(true)
    );
    return {
      width: this.hasCustomWidth() ? this.customTextWidth : rect.width,
      height: rect.height
    };
  }
  const { TAG_PLACEMENT, IMG_PLACEMENT } = CONSTANTS;
  const { textContentMargin } = this.mindMap.opt;
  const tagPlacement = this.getStyle("tagPlacement") || TAG_PLACEMENT.RIGHT;
  const tagIsBottom = tagPlacement === TAG_PLACEMENT.BOTTOM;
  const imgPlacement = this.getStyle("imgPlacement") || IMG_PLACEMENT.TOP;
  let imgContentWidth = 0;
  let imgContentHeight = 0;
  let textContentWidth = 0;
  let textContentHeight = 0;
  let tagContentWidth = 0;
  let tagContentHeight = 0;
  let spaceCount = 0;
  if (this._imgData) {
    imgContentWidth = this._imgData.width;
    imgContentHeight = this._imgData.height;
  }
  this.mindMap.nodeInnerPrefixList.forEach((item) => {
    const itemData = this[`_${item.name}Data`];
    if (itemData) {
      textContentWidth += itemData.width;
      textContentHeight = Math.max(textContentHeight, itemData.height);
      spaceCount++;
    }
  });
  if (this._prefixData) {
    textContentWidth += this._prefixData.width;
    textContentHeight = Math.max(textContentHeight, this._prefixData.height);
    spaceCount++;
  }
  if (this._iconData.length > 0) {
    textContentWidth += this._iconData.reduce((sum, cur) => {
      textContentHeight = Math.max(textContentHeight, cur.height);
      return sum += cur.width;
    }, 0) + (this._iconData.length - 1) * textContentMargin;
    spaceCount++;
  }
  if (this._textData) {
    textContentWidth += this._textData.width;
    textContentHeight = Math.max(textContentHeight, this._textData.height);
    spaceCount++;
  }
  if (this._hyperlinkData) {
    textContentWidth += this._hyperlinkData.width;
    textContentHeight = Math.max(textContentHeight, this._hyperlinkData.height);
    spaceCount++;
  }
  if (this._tagData.length > 0) {
    const { width: totalTagWidth, height: maxTagHeight } = this.getTagContentSize(textContentMargin);
    if (tagIsBottom) {
      tagContentWidth = totalTagWidth;
      tagContentHeight = maxTagHeight;
    } else {
      textContentWidth += totalTagWidth;
      textContentHeight = Math.max(textContentHeight, maxTagHeight);
      spaceCount++;
    }
  }
  if (this._noteData) {
    textContentWidth += this._noteData.width;
    textContentHeight = Math.max(textContentHeight, this._noteData.height);
    spaceCount++;
  }
  if (this._attachmentData) {
    textContentWidth += this._attachmentData.width;
    textContentHeight = Math.max(textContentHeight, this._attachmentData.height);
    spaceCount++;
  }
  if (this._postfixData) {
    textContentWidth += this._postfixData.width;
    textContentHeight = Math.max(textContentHeight, this._postfixData.height);
    spaceCount++;
  }
  this.mindMap.nodeInnerPostfixList.forEach((item) => {
    const itemData = this[`_${item.name}Data`];
    if (itemData) {
      textContentWidth += itemData.width;
      textContentHeight = Math.max(textContentHeight, itemData.height);
      spaceCount++;
    }
  });
  textContentWidth += (spaceCount - 1) * textContentMargin;
  if (tagIsBottom && textContentWidth > 0 && tagContentHeight > 0) {
    this._rectInfo.textContentWidthWithoutTag = textContentWidth;
    textContentWidth = Math.max(textContentWidth, tagContentWidth);
    textContentHeight = textContentHeight + textContentMargin + tagContentHeight;
  }
  this._rectInfo.textContentWidth = textContentWidth;
  this._rectInfo.textContentHeight = textContentHeight;
  let _width = 0;
  let _height = 0;
  if ([IMG_PLACEMENT.TOP, IMG_PLACEMENT.BOTTOM].includes(imgPlacement)) {
    _width = Math.max(imgContentWidth, textContentWidth);
    _height = imgContentHeight + textContentHeight + this.getImgTextMarin("v", 0, 0, imgContentHeight, textContentHeight);
  } else {
    _width = imgContentWidth + textContentWidth + this.getImgTextMarin("h", imgContentWidth, textContentWidth);
    _height = Math.max(imgContentHeight, textContentHeight);
  }
  const { paddingX, paddingY } = this.getPaddingVale();
  const { paddingX: shapePaddingX, paddingY: shapePaddingY } = this.shapeInstance.getShapePadding(_width, _height, paddingX, paddingY);
  this.shapePadding.paddingX = shapePaddingX;
  this.shapePadding.paddingY = shapePaddingY;
  const borderWidth = this.getBorderWidth();
  return {
    width: _width + paddingX * 2 + shapePaddingX * 2 + borderWidth,
    height: _height + paddingY * 2 + shapePaddingY * 2 + borderWidth
  };
}
function addHoverNode(width2, height2) {
  const { hoverRectPadding } = this.mindMap.opt;
  this.hoverNode = new Rect().size(width2 + hoverRectPadding * 2, height2 + hoverRectPadding * 2).x(-hoverRectPadding).y(-hoverRectPadding);
  this.hoverNode.addClass("smm-hover-node");
  this.style.hoverNode(this.hoverNode, width2, height2);
  this.group.add(this.hoverNode);
}
function customNodeContentRealtimeLayout() {
  if (!this.group) return;
  if (!this.isUseCustomNodeContent()) return;
  if (this.shapeNode) this.shapeNode.remove();
  if (this._unVisibleRectRegionNode) this._unVisibleRectRegionNode.remove();
  if (this.hoverNode) this.hoverNode.remove();
  const { width: width2, height: height2 } = this;
  const halfBorderWidth = this.getBorderWidth() / 2;
  this.shapeNode = this.shapeInstance.createShape();
  this.shapeNode.addClass("smm-node-shape");
  this.shapeNode.translate(halfBorderWidth, halfBorderWidth);
  this.style.shape(this.shapeNode);
  this.group.add(this.shapeNode);
  this.renderExpandBtnPlaceholderRect();
  if (this.isGeneralization && this.generalizationBelongNode) {
    this.group.addClass("generalization_" + this.generalizationBelongNode.uid);
  }
  this.addHoverNode(width2, height2);
  this.shapeNode.back();
  this.group.findOne("foreignObject").size(width2, height2);
}
function layout() {
  if (!this.group) return;
  this.group.clear();
  const {
    openRealtimeRenderOnNodeTextEdit,
    textContentMargin,
    addCustomContentToNode
  } = this.mindMap.opt;
  const { width: width2, height: height2 } = this;
  let { paddingX, paddingY } = this.getPaddingVale();
  const halfBorderWidth = this.getBorderWidth() / 2;
  paddingX += this.shapePadding.paddingX + halfBorderWidth;
  paddingY += this.shapePadding.paddingY + halfBorderWidth;
  this.shapeNode = this.shapeInstance.createShape();
  this.shapeNode.addClass("smm-node-shape");
  this.shapeNode.translate(halfBorderWidth, halfBorderWidth);
  this.style.shape(this.shapeNode);
  this.group.add(this.shapeNode);
  this.renderExpandBtnPlaceholderRect();
  if (this.createUserListNode) this.createUserListNode();
  if (this.isGeneralization && this.generalizationBelongNode) {
    this.group.addClass("generalization_" + this.generalizationBelongNode.uid);
  }
  if (this.isUseCustomNodeContent()) {
    const foreignObject = createForeignObjectNode({
      el: this._customNodeContent,
      width: width2,
      height: height2
    });
    this.group.add(foreignObject);
    this.addHoverNode(width2, height2);
    return;
  }
  const { IMG_PLACEMENT, TAG_PLACEMENT } = CONSTANTS;
  const imgPlacement = this.getStyle("imgPlacement") || IMG_PLACEMENT.TOP;
  const tagPlacement = this.getStyle("tagPlacement") || TAG_PLACEMENT.RIGHT;
  const tagIsBottom = tagPlacement === TAG_PLACEMENT.BOTTOM;
  let { textContentWidth, textContentHeight, textContentWidthWithoutTag } = this._rectInfo;
  const textContentHeightWithTag = textContentHeight;
  let totalTagWidth = 0;
  let maxTagHeight = 0;
  const hasTagContent = this._tagData && this._tagData.length > 0;
  if (hasTagContent) {
    const res = this.getTagContentSize(textContentMargin);
    totalTagWidth = res.width;
    maxTagHeight = res.height;
    if (tagIsBottom) {
      textContentHeight -= maxTagHeight + textContentMargin;
    }
  }
  let imgWidth = 0;
  let imgHeight = 0;
  if (this._imgData) {
    imgWidth = this._imgData.width;
    imgHeight = this._imgData.height;
    this.group.add(this._imgData.node);
    switch (imgPlacement) {
      case IMG_PLACEMENT.TOP:
        this._imgData.node.cx(width2 / 2).y(paddingY);
        break;
      case IMG_PLACEMENT.BOTTOM:
        this._imgData.node.cx(width2 / 2).y(height2 - paddingY - imgHeight);
        break;
      case IMG_PLACEMENT.LEFT:
        this._imgData.node.x(paddingX).cy(height2 / 2);
        break;
      case IMG_PLACEMENT.RIGHT:
        this._imgData.node.x(width2 - paddingX - imgWidth).cy(height2 / 2);
        break;
    }
  }
  let textContentNested = new G();
  let textContentOffsetX = 0;
  if (hasTagContent && tagIsBottom) {
    textContentOffsetX = textContentWidthWithoutTag < textContentWidth ? (textContentWidth - textContentWidthWithoutTag) / 2 : 0;
  }
  this.mindMap.nodeInnerPrefixList.forEach((item) => {
    const itemData = this[`_${item.name}Data`];
    if (itemData) {
      itemData.node.x(textContentOffsetX).y((textContentHeight - itemData.height) / 2);
      textContentNested.add(itemData.node);
      textContentOffsetX += itemData.width + textContentMargin;
    }
  });
  if (this._prefixData) {
    const foreignObject = createForeignObjectNode({
      el: this._prefixData.el,
      width: this._prefixData.width,
      height: this._prefixData.height
    });
    foreignObject.x(textContentOffsetX).y((textContentHeight - this._prefixData.height) / 2);
    textContentNested.add(foreignObject);
    textContentOffsetX += this._prefixData.width + textContentMargin;
  }
  let iconNested = new G();
  if (this._iconData && this._iconData.length > 0) {
    let iconLeft = 0;
    this._iconData.forEach((item) => {
      item.node.x(textContentOffsetX + iconLeft).y((textContentHeight - item.height) / 2);
      iconNested.add(item.node);
      iconLeft += item.width + textContentMargin;
    });
    textContentNested.add(iconNested);
    textContentOffsetX += iconLeft;
  }
  if (this._textData) {
    const oldX = this._textData.node.attr("data-offsetx") || 0;
    this._textData.node.attr("data-offsetx", textContentOffsetX);
    (this._textData.nodeContent || this._textData.node).x(-oldX).x(textContentOffsetX).y((textContentHeight - this._textData.height) / 2);
    if (openRealtimeRenderOnNodeTextEdit) {
      this._textData.node.opacity(
        this.mindMap.renderer.textEdit.getCurrentEditNode() === this ? 0 : 1
      );
    }
    textContentNested.add(this._textData.node);
    textContentOffsetX += this._textData.width + textContentMargin;
  }
  if (this._hyperlinkData) {
    this._hyperlinkData.node.x(textContentOffsetX).y((textContentHeight - this._hyperlinkData.height) / 2);
    textContentNested.add(this._hyperlinkData.node);
    textContentOffsetX += this._hyperlinkData.width + textContentMargin;
  }
  let tagNested = new G();
  if (hasTagContent) {
    if (tagIsBottom) {
      let tagLeft = 0;
      this._tagData.forEach((item) => {
        item.node.x(tagLeft).y((maxTagHeight - item.height) / 2);
        tagNested.add(item.node);
        tagLeft += item.width + textContentMargin;
      });
      tagNested.x((textContentWidth - totalTagWidth) / 2).y(textContentHeightWithTag - maxTagHeight);
      textContentNested.add(tagNested);
    } else {
      let tagLeft = 0;
      this._tagData.forEach((item) => {
        item.node.x(textContentOffsetX + tagLeft).y((textContentHeight - item.height) / 2);
        tagNested.add(item.node);
        tagLeft += item.width + textContentMargin;
      });
      textContentNested.add(tagNested);
      textContentOffsetX += tagLeft;
    }
  }
  if (this._noteData) {
    this._noteData.node.x(textContentOffsetX).y((textContentHeight - this._noteData.height) / 2);
    textContentNested.add(this._noteData.node);
    textContentOffsetX += this._noteData.width + textContentMargin;
  }
  if (this._attachmentData) {
    this._attachmentData.node.x(textContentOffsetX).y((textContentHeight - this._attachmentData.height) / 2);
    textContentNested.add(this._attachmentData.node);
    textContentOffsetX += this._attachmentData.width + textContentMargin;
  }
  if (this._postfixData) {
    const foreignObject = createForeignObjectNode({
      el: this._postfixData.el,
      width: this._postfixData.width,
      height: this._postfixData.height
    });
    foreignObject.x(textContentOffsetX).y((textContentHeight - this._postfixData.height) / 2);
    textContentNested.add(foreignObject);
    textContentOffsetX += this._postfixData.width + textContentMargin;
  }
  this.mindMap.nodeInnerPostfixList.forEach((item) => {
    const itemData = this[`_${item.name}Data`];
    if (itemData) {
      itemData.node.x(textContentOffsetX).y((textContentHeight - itemData.height) / 2);
      textContentNested.add(itemData.node);
      textContentOffsetX += itemData.width + textContentMargin;
    }
  });
  this.group.add(textContentNested);
  const { width: bboxWidth, height: bboxHeight } = textContentNested.bbox();
  let translateX = 0;
  let translateY = 0;
  switch (imgPlacement) {
    case IMG_PLACEMENT.TOP:
      translateX = width2 / 2 - bboxWidth / 2;
      translateY = paddingY + // 内边距
      imgHeight + // 图片高度
      this.getImgTextMarin("v", 0, 0, imgHeight, textContentHeightWithTag);
      break;
    case IMG_PLACEMENT.BOTTOM:
      translateX = width2 / 2 - bboxWidth / 2;
      translateY = paddingY;
      break;
    case IMG_PLACEMENT.LEFT:
      translateX = imgWidth + paddingX + this.getImgTextMarin("h", imgWidth, textContentWidth);
      translateY = height2 / 2 - bboxHeight / 2;
      break;
    case IMG_PLACEMENT.RIGHT:
      translateX = paddingX;
      translateY = height2 / 2 - bboxHeight / 2;
      break;
  }
  textContentNested.translate(translateX, translateY);
  this.addHoverNode(width2, height2);
  if (this._customContentAddToNodeAdd && this._customContentAddToNodeAdd.el) {
    const foreignObject = createForeignObjectNode(
      this._customContentAddToNodeAdd
    );
    this.group.add(foreignObject);
    if (addCustomContentToNode && typeof addCustomContentToNode.handle === "function") {
      addCustomContentToNode.handle({
        content: this._customContentAddToNodeAdd,
        element: foreignObject,
        node: this
      });
    }
  }
  this.mindMap.emit("node_layout_end", this);
}
const nodeLayoutMethods = {
  getImgTextMarin,
  getTagContentSize,
  getNodeRect,
  addHoverNode,
  layout,
  customNodeContentRealtimeLayout
};
class MindMapNode {
  //  构造函数
  constructor(opt = {}) {
    this.opt = opt;
    this.nodeData = this.handleData(opt.data || {});
    this.nodeDataSnapshot = "";
    this.uid = opt.uid;
    this.mindMap = opt.mindMap;
    this.renderer = opt.renderer;
    this.draw = this.mindMap.draw;
    this.nodeDraw = this.mindMap.nodeDraw;
    this.lineDraw = this.mindMap.lineDraw;
    this.style = new Style2(this);
    this.effectiveStyles = {};
    this.shapeInstance = new Shape2(this);
    this.shapePadding = {
      paddingX: 0,
      paddingY: 0
    };
    this.isRoot = opt.isRoot === void 0 ? false : opt.isRoot;
    this.isGeneralization = opt.isGeneralization === void 0 ? false : opt.isGeneralization;
    this.generalizationBelongNode = null;
    this.layerIndex = opt.layerIndex === void 0 ? 0 : opt.layerIndex;
    this.width = opt.width || 0;
    this.height = opt.height || 0;
    this.customTextWidth = opt.data.data.customTextWidth || void 0;
    this._left = opt.left || 0;
    this._top = opt.top || 0;
    this.customLeft = opt.data.data.customLeft || void 0;
    this.customTop = opt.data.data.customTop || void 0;
    this.isDrag = false;
    this.parent = opt.parent || null;
    this.children = opt.children || [];
    this.userList = [];
    this.group = null;
    this.shapeNode = null;
    this.hoverNode = null;
    this._customNodeContent = null;
    this._imgData = null;
    this._iconData = null;
    this._textData = null;
    this._hyperlinkData = null;
    this._tagData = null;
    this._noteData = null;
    this.noteEl = null;
    this.noteContentIsShow = false;
    this._attachmentData = null;
    this._prefixData = null;
    this._postfixData = null;
    this._expandBtn = null;
    this._lastExpandBtnType = null;
    this._showExpandBtn = false;
    this._openExpandNode = null;
    this._closeExpandNode = null;
    this._fillExpandNode = null;
    this._userListGroup = null;
    this._lines = [];
    this._generalizationList = [];
    this._unVisibleRectRegionNode = null;
    this._isMouseenter = false;
    this._customContentAddToNodeAdd = null;
    this._rectInfo = {
      textContentWidth: 0,
      textContentHeight: 0,
      textContentWidthWithoutTag: 0
    };
    this._generalizationNodeWidth = 0;
    this._generalizationNodeHeight = 0;
    this.expandBtnSize = this.mindMap.opt.expandBtnSize;
    this.isMultipleChoice = false;
    this.needLayout = false;
    this.isHide = false;
    const proto = Object.getPrototypeOf(this);
    if (!proto.bindEvent) {
      Object.keys(nodeLayoutMethods).forEach((item) => {
        proto[item] = nodeLayoutMethods[item];
      });
      Object.keys(nodeGeneralizationMethods).forEach((item) => {
        proto[item] = nodeGeneralizationMethods[item];
      });
      Object.keys(nodeExpandBtnMethods).forEach((item) => {
        proto[item] = nodeExpandBtnMethods[item];
      });
      Object.keys(nodeExpandBtnPlaceholderRectMethods).forEach((item) => {
        proto[item] = nodeExpandBtnPlaceholderRectMethods[item];
      });
      Object.keys(nodeCommandWrapsMethods).forEach((item) => {
        proto[item] = nodeCommandWrapsMethods[item];
      });
      Object.keys(nodeCreateContentsMethods).forEach((item) => {
        proto[item] = nodeCreateContentsMethods[item];
      });
      if (this.mindMap.cooperate) {
        Object.keys(nodeCooperateMethods).forEach((item) => {
          proto[item] = nodeCooperateMethods[item];
        });
      }
      Object.keys(nodeModifyWidthMethods).forEach((item) => {
        proto[item] = nodeModifyWidthMethods[item];
      });
      if (this.mindMap.opt.isShowCreateChildBtnIcon) {
        Object.keys(quickCreateChildBtnMethods).forEach((item) => {
          proto[item] = quickCreateChildBtnMethods[item];
        });
        this.initQuickCreateChildBtn();
      }
      proto.bindEvent = true;
    }
    this.getSize();
    this.updateGeneralization();
    this.initDragHandle();
  }
  // 支持自定义位置
  get left() {
    return this.customLeft || this._left;
  }
  set left(val) {
    this._left = val;
  }
  get top() {
    return this.customTop || this._top;
  }
  set top(val) {
    this._top = val;
  }
  //  复位部分布局时会重新设置的数据
  reset() {
    this.children = [];
    this.parent = null;
    this.isRoot = false;
    this.layerIndex = 0;
    this.left = 0;
    this.top = 0;
  }
  // 节点被删除时需要复位的数据
  resetWhenDelete() {
    this._isMouseenter = false;
  }
  //  处理数据
  handleData(data2) {
    data2.data.expand = data2.data.expand === false ? false : true;
    data2.data.isActive = data2.data.isActive === true ? true : false;
    data2.children = data2.children || [];
    return data2;
  }
  //  创建节点的各个内容对象数据
  // recreateTypes：[] custom、image、icon、text、hyperlink、tag、note、attachment、numbers、prefix、postfix、checkbox
  createNodeData(recreateTypes) {
    const {
      isUseCustomNodeContent: isUseCustomNodeContent2,
      customCreateNodeContent,
      createNodePrefixContent,
      createNodePostfixContent,
      addCustomContentToNode
    } = this.mindMap.opt;
    const typeList = [
      "custom",
      "image",
      "icon",
      "text",
      "hyperlink",
      "tag",
      "note",
      "attachment",
      "prefix",
      "postfix",
      ...this.mindMap.nodeInnerPrefixList.map((item) => {
        return item.name;
      }),
      ...this.mindMap.nodeInnerPostfixList.map((item) => {
        return item.name;
      })
    ];
    const createTypes = {};
    if (Array.isArray(recreateTypes)) {
      typeList.forEach((item) => {
        if (recreateTypes.includes(item)) {
          createTypes[item] = true;
        }
      });
    } else {
      typeList.forEach((item) => {
        createTypes[item] = true;
      });
    }
    if (isUseCustomNodeContent2 && customCreateNodeContent && createTypes.custom) {
      this._customNodeContent = customCreateNodeContent(this);
    }
    if (this._customNodeContent) {
      addXmlns(this._customNodeContent);
      return;
    }
    if (createTypes.image) this._imgData = this.createImgNode();
    if (createTypes.icon) this._iconData = this.createIconNode();
    if (createTypes.text) this._textData = this.createTextNode();
    if (createTypes.hyperlink) this._hyperlinkData = this.createHyperlinkNode();
    if (createTypes.tag) this._tagData = this.createTagNode();
    if (createTypes.note) this._noteData = this.createNoteNode();
    if (createTypes.attachment)
      this._attachmentData = this.createAttachmentNode();
    this.mindMap.nodeInnerPrefixList.forEach((item) => {
      if (createTypes[item.name]) {
        this[`_${item.name}Data`] = item.createContent(this);
      }
    });
    if (createTypes.prefix) {
      this._prefixData = createNodePrefixContent ? createNodePrefixContent(this) : null;
      if (this._prefixData && this._prefixData.el) {
        addXmlns(this._prefixData.el);
      }
    }
    if (createTypes.postfix) {
      this._postfixData = createNodePostfixContent ? createNodePostfixContent(this) : null;
      if (this._postfixData && this._postfixData.el) {
        addXmlns(this._postfixData.el);
      }
    }
    this.mindMap.nodeInnerPostfixList.forEach((item) => {
      if (createTypes[item.name]) {
        this[`_${item.name}Data`] = item.createContent(this);
      }
    });
    if (addCustomContentToNode && typeof addCustomContentToNode.create === "function") {
      this._customContentAddToNodeAdd = addCustomContentToNode.create(this);
      if (this._customContentAddToNodeAdd && this._customContentAddToNodeAdd.el) {
        addXmlns(this._customContentAddToNodeAdd.el);
      }
    }
  }
  //  计算节点的宽高
  getSize(recreateTypes, opt = {}) {
    const ignoreUpdateCustomTextWidth = opt.ignoreUpdateCustomTextWidth || false;
    if (!ignoreUpdateCustomTextWidth) {
      this.customTextWidth = this.getData("customTextWidth") || void 0;
    }
    this.customLeft = this.getData("customLeft") || void 0;
    this.customTop = this.getData("customTop") || void 0;
    this.createNodeData(recreateTypes);
    const { width: width2, height: height2 } = this.getNodeRect();
    const changed = this.width !== width2 || this.height !== height2;
    this.width = width2;
    this.height = height2;
    return changed;
  }
  // 给节点绑定事件
  bindGroupEvent() {
    this.group.on("click", (e) => {
      this.mindMap.emit("node_click", this, e);
      if (this.isMultipleChoice) {
        e.stopPropagation();
        this.isMultipleChoice = false;
        return;
      }
      if (this.mindMap.opt.onlyOneEnableActiveNodeOnCooperate && this.userList.length > 0) {
        return;
      }
      this.active(e);
    });
    this.group.on("mousedown", (e) => {
      const {
        readonly,
        enableCtrlKeyNodeSelection,
        useLeftKeySelectionRightKeyDrag,
        mousedownEventPreventDefault
      } = this.mindMap.opt;
      if (mousedownEventPreventDefault) {
        e.preventDefault();
      }
      if (!readonly) {
        if (this.isRoot) {
          if (e.which === 3 && !useLeftKeySelectionRightKeyDrag) {
            e.stopPropagation();
          }
        } else {
          if (e.which !== 2) {
            e.stopPropagation();
          }
        }
      }
      if (!readonly && (e.ctrlKey || e.metaKey) && enableCtrlKeyNodeSelection) {
        this.isMultipleChoice = true;
        const isActive = this.getData("isActive");
        if (!isActive)
          this.mindMap.emit(
            "before_node_active",
            this,
            this.renderer.activeNodeList
          );
        this.mindMap.renderer[isActive ? "removeNodeFromActiveList" : "addNodeToActiveList"](this, true);
        this.renderer.emitNodeActiveEvent(isActive ? null : this);
      }
      this.mindMap.emit("node_mousedown", this, e);
    });
    this.group.on("mouseup", (e) => {
      if (!this.isRoot && e.which !== 2 && !this.mindMap.opt.readonly) {
        e.stopPropagation();
      }
      this.mindMap.emit("node_mouseup", this, e);
    });
    this.group.on("mouseenter", (e) => {
      if (this.isDrag) return;
      this._isMouseenter = true;
      this.showExpandBtn();
      if (this.isGeneralization) {
        this.handleGeneralizationMouseenter();
      }
      this.mindMap.emit("node_mouseenter", this, e);
    });
    this.group.on("mouseleave", (e) => {
      if (!this._isMouseenter) return;
      this._isMouseenter = false;
      this.hideExpandBtn();
      if (this.isGeneralization) {
        this.handleGeneralizationMouseleave();
      }
      this.mindMap.emit("node_mouseleave", this, e);
    });
    this.group.on("dblclick", (e) => {
      const { readonly, onlyOneEnableActiveNodeOnCooperate } = this.mindMap.opt;
      if (readonly || e.ctrlKey || e.metaKey) {
        return;
      }
      e.stopPropagation();
      if (onlyOneEnableActiveNodeOnCooperate && this.userList.length > 0) {
        return;
      }
      this.mindMap.emit("node_dblclick", this, e);
    });
    this.group.on("contextmenu", (e) => {
      const { readonly, useLeftKeySelectionRightKeyDrag } = this.mindMap.opt;
      if (readonly || e.ctrlKey) {
        return;
      }
      e.stopPropagation();
      e.preventDefault();
      if (this.mindMap.select && !useLeftKeySelectionRightKeyDrag && this.mindMap.select.hasSelectRange()) {
        return;
      }
      if (!(this.getData("isActive") && this.renderer.activeNodeList.length === 1)) {
        this.renderer.clearActiveNodeList();
        this.active(e);
      }
      this.mindMap.emit("node_contextmenu", e, this);
    });
  }
  //  激活节点
  active(e) {
    if (this.mindMap.opt.readonly) {
      return;
    }
    e && e.stopPropagation();
    if (this.getData("isActive")) {
      return;
    }
    this.mindMap.emit("before_node_active", this, this.renderer.activeNodeList);
    this.renderer.clearActiveNodeList();
    this.renderer.addNodeToActiveList(this, true);
    this.renderer.emitNodeActiveEvent(this);
  }
  // 取消激活该节点
  deactivate() {
    this.mindMap.renderer.removeNodeFromActiveList(this);
    this.mindMap.renderer.emitNodeActiveEvent();
  }
  //  更新节点
  update(forceRender) {
    if (!this.group) {
      return;
    }
    this.updateNodeActiveClass();
    const {
      alwaysShowExpandBtn,
      notShowExpandBtn,
      isShowCreateChildBtnIcon,
      readonly
    } = this.mindMap.opt;
    const childrenLength = this.getChildrenLength();
    if (!notShowExpandBtn) {
      if (alwaysShowExpandBtn) {
        if (this._expandBtn && childrenLength <= 0) {
          this.removeExpandBtn();
        } else {
          this.renderExpandBtn();
        }
      } else {
        const { isActive, expand } = this.getData();
        if (childrenLength <= 0) {
          this.removeExpandBtn();
        } else if (expand && !isActive && !this._isMouseenter) {
          this.hideExpandBtn();
        } else {
          this.showExpandBtn();
        }
      }
    }
    if (isShowCreateChildBtnIcon) {
      if (childrenLength > 0) {
        this.removeQuickCreateChildBtn();
      } else {
        const { isActive } = this.getData();
        if (isActive) {
          this.showQuickCreateChildBtn();
        } else {
          this.hideQuickCreateChildBtn();
        }
      }
    }
    this.updateDragHandle();
    this.renderGeneralization(forceRender);
    if (this.updateUserListNode) this.updateUserListNode();
    const t = this.group.transform();
    this.nodeDataSnapshot = readonly ? "" : JSON.stringify(this.getData());
    if (this.left !== t.translateX || this.top !== t.translateY) {
      this.group.translate(this.left - t.translateX, this.top - t.translateY);
    }
  }
  // 获取节点相当于画布的位置
  getNodePosInClient(_left, _top) {
    const drawTransform = this.mindMap.draw.transform();
    const { scaleX, scaleY, translateX, translateY } = drawTransform;
    const left = _left * scaleX + translateX;
    const top = _top * scaleY + translateY;
    return {
      left,
      top
    };
  }
  // 判断节点是否可见
  checkIsInClient(padding = 0) {
    const { left: nx, top: ny } = this.getNodePosInClient(this.left, this.top);
    return nx + this.width > 0 - padding && ny + this.height > 0 - padding && nx < this.mindMap.width + padding && ny < this.mindMap.height + padding;
  }
  // 重新渲染节点，即重新创建节点内容、计算节点大小、计算节点内容布局、更新展开收起按钮，概要及位置
  reRender(recreateTypes, opt) {
    const sizeChange = this.getSize(recreateTypes, opt);
    this.layout();
    this.update();
    return sizeChange;
  }
  // 更新节点激活状态
  updateNodeActiveClass() {
    if (!this.group) return;
    const isActive = this.getData("isActive");
    this.group[isActive ? "addClass" : "removeClass"]("active");
  }
  // 根据是否激活更新节点
  updateNodeByActive(active) {
    if (this.group) {
      const { isShowCreateChildBtnIcon } = this.mindMap.opt;
      if (active) {
        this.showExpandBtn();
        if (isShowCreateChildBtnIcon) {
          this.showQuickCreateChildBtn();
        }
      } else {
        this.hideExpandBtn();
        if (isShowCreateChildBtnIcon) {
          this.hideQuickCreateChildBtn();
        }
      }
      this.updateNodeActiveClass();
      this.updateDragHandle();
    }
  }
  // 递归渲染
  // forceRender：强制渲染，无论是否处于画布可视区域
  // async：异步渲染
  render(callback = () => {
  }, forceRender = false, async = false) {
    this.renderLine();
    const { openPerformance, performanceConfig } = this.mindMap.opt;
    if (forceRender || !openPerformance || this.checkIsInClient(performanceConfig.padding) || this.isRoot) {
      if (!this.group) {
        this.group = new G();
        this.group.addClass("smm-node");
        this.group.css({
          cursor: "default"
        });
        this.bindGroupEvent();
        this.nodeDraw.add(this.group);
        this.layout();
        this.update(forceRender);
      } else {
        if (!this.nodeDraw.has(this.group)) {
          this.nodeDraw.add(this.group);
        }
        if (this.needLayout) {
          this.needLayout = false;
          this.layout();
        }
        this.updateExpandBtnPlaceholderRect();
        this.update(forceRender);
      }
    } else if (openPerformance && performanceConfig.removeNodeWhenOutCanvas) {
      this.removeSelf();
    }
    if (this.children && this.children.length && this.getData("expand") !== false) {
      let index = 0;
      this.children.forEach((item) => {
        const renderChild = () => {
          item.render(
            () => {
              index++;
              if (index >= this.children.length) {
                callback();
              }
            },
            forceRender,
            async
          );
        };
        if (async) {
          setTimeout(renderChild, 0);
        } else {
          renderChild();
        }
      });
    } else {
      callback();
    }
    if (this.nodeData.inserting) {
      delete this.nodeData.inserting;
      this.active();
      this.mindMap.emit("node_dblclick", this, null, true);
    }
  }
  // 删除自身，只是从画布删除，节点容器还在，后续还可以重新插回画布
  removeSelf() {
    if (!this.group) return;
    this.group.remove();
    this.removeGeneralization();
  }
  //  递归删除，只是从画布删除，节点容器还在，后续还可以重新插回画布
  remove() {
    if (!this.group) return;
    this.group.remove();
    this.removeGeneralization();
    this.removeLine();
    if (this.children && this.children.length) {
      this.children.forEach((item) => {
        item.remove();
      });
    }
  }
  // 销毁节点，不但会从画布删除，而且原节点直接置空，后续无法再插回画布
  destroy() {
    this.removeLine();
    if (this.parent) {
      this.parent.removeLine();
    }
    if (!this.group) return;
    if (this.emptyUser) {
      this.emptyUser();
    }
    this.resetWhenDelete();
    this.group.remove();
    this.removeGeneralization();
    this.group = null;
    this.style.onRemove();
  }
  //  隐藏节点
  hide() {
    if (this.group) this.group.hide();
    this.hideGeneralization();
    if (this.parent) {
      const index = this.parent.children.indexOf(this);
      this.parent._lines[index] && this.parent._lines[index].hide();
      this._lines.forEach((item) => {
        item.hide();
      });
    }
    if (this.children && this.children.length) {
      this.children.forEach((item) => {
        item.hide();
      });
    }
  }
  //  显示节点
  show() {
    if (!this.group) {
      return;
    }
    this.group.show();
    this.showGeneralization();
    if (this.parent) {
      const index = this.parent.children.indexOf(this);
      this.parent._lines[index] && this.parent._lines[index].show();
      this._lines.forEach((item) => {
        item.show();
      });
    }
    if (this.children && this.children.length) {
      this.children.forEach((item) => {
        item.show();
      });
    }
  }
  // 设置节点透明度
  // 包括连接线和下级节点
  setOpacity(val) {
    if (this.group) this.group.opacity(val);
    this._lines.forEach((line) => {
      line.opacity(val);
    });
    this.children.forEach((item) => {
      item.setOpacity(val);
    });
    this.setGeneralizationOpacity(val);
  }
  // 隐藏子节点
  hideChildren() {
    this._lines.forEach((item) => {
      item.hide();
    });
    if (this.children && this.children.length) {
      this.children.forEach((item) => {
        item.hide();
      });
    }
  }
  // 显示子节点
  showChildren() {
    this._lines.forEach((item) => {
      item.show();
    });
    if (this.children && this.children.length) {
      this.children.forEach((item) => {
        item.show();
      });
    }
  }
  // 被拖拽中
  startDrag() {
    this.isDrag = true;
    if (this.group) this.group.addClass("smm-node-dragging");
  }
  // 拖拽结束
  endDrag() {
    this.isDrag = false;
    if (this.group) this.group.removeClass("smm-node-dragging");
  }
  //  连线
  renderLine(deep = false) {
    if (this.getData("expand") === false) {
      return;
    }
    let childrenLen = this.getChildrenLength();
    if (this.mindMap.renderer.layout.nodeIsRemoveAllLines) {
      if (this.mindMap.renderer.layout.nodeIsRemoveAllLines(this)) {
        childrenLen = 0;
      }
    }
    if (childrenLen > this._lines.length) {
      new Array(childrenLen - this._lines.length).fill(0).forEach(() => {
        this._lines.push(this.lineDraw.path());
      });
    } else if (childrenLen < this._lines.length) {
      this._lines.slice(childrenLen).forEach((line) => {
        line.remove();
      });
      this._lines = this._lines.slice(0, childrenLen);
    }
    this.renderer.layout.renderLine(
      this,
      this._lines,
      (...args) => {
        this.styleLine(...args);
      },
      this.style.getStyle("lineStyle", true)
    );
    if (deep && this.children && this.children.length > 0) {
      this.children.forEach((item) => {
        item.renderLine(deep);
      });
    }
  }
  //  获取节点形状
  getShape() {
    return this.mindMap.themeConfig.nodeUseLineStyle ? CONSTANTS.SHAPE.RECTANGLE : this.style.getStyle("shape", false, false);
  }
  //  检查节点是否存在自定义数据
  hasCustomPosition() {
    return this.customLeft !== void 0 && this.customTop !== void 0;
  }
  //  检查节点是否存在自定义位置的祖先节点，包含自身
  ancestorHasCustomPosition() {
    let node = this;
    while (node) {
      if (node.hasCustomPosition()) {
        return true;
      }
      node = node.parent;
    }
    return false;
  }
  //  检查是否存在有概要的祖先节点
  ancestorHasGeneralization() {
    let node = this.parent;
    while (node) {
      if (node.checkHasGeneralization()) {
        return true;
      }
      node = node.parent;
    }
    return false;
  }
  //  添加子节点
  addChildren(node) {
    this.children.push(node);
  }
  //  设置连线样式
  styleLine(line, childNode, enableMarker) {
    const { enableInheritAncestorLineStyle } = this.mindMap.opt;
    const getName = enableInheritAncestorLineStyle ? "getSelfInhertStyle" : "getSelfStyle";
    const width2 = childNode[getName]("lineWidth") || childNode.getStyle("lineWidth", true);
    const color = childNode[getName]("lineColor") || this.getRainbowLineColor(childNode) || childNode.getStyle("lineColor", true);
    const dasharray = childNode[getName]("lineDasharray") || childNode.getStyle("lineDasharray", true);
    this.style.line(
      line,
      {
        width: width2,
        color,
        dasharray
      },
      enableMarker,
      childNode
    );
  }
  // 获取彩虹线条颜色
  getRainbowLineColor(node) {
    return this.mindMap.rainbowLines ? this.mindMap.rainbowLines.getNodeColor(node) : "";
  }
  //  移除连线
  removeLine() {
    this._lines.forEach((line) => {
      line.remove();
    });
    this._lines = [];
  }
  //  检测当前节点是否是某个节点的祖先节点
  isAncestor(node) {
    if (this.uid === node.uid) {
      return false;
    }
    let parent = node.parent;
    while (parent) {
      if (this.uid === parent.uid) {
        return true;
      }
      parent = parent.parent;
    }
    return false;
  }
  // 检查当前节点是否是某个节点的父节点
  isParent(node) {
    if (this.uid === node.uid) {
      return false;
    }
    const parent = node.parent;
    if (parent && this.uid === parent.uid) {
      return true;
    }
    return false;
  }
  //  检测当前节点是否是某个节点的兄弟节点
  isBrother(node) {
    if (!this.parent || this.uid === node.uid) {
      return false;
    }
    return this.parent.children.find((item) => {
      return item.uid === node.uid;
    });
  }
  // 获取该节点在兄弟节点列表中的索引
  getIndexInBrothers() {
    return this.parent && this.parent.children ? this.parent.children.findIndex((item) => {
      return item.uid === this.uid;
    }) : -1;
  }
  //  获取padding值
  getPaddingVale() {
    return {
      paddingX: this.getStyle("paddingX"),
      paddingY: this.getStyle("paddingY")
    };
  }
  //  获取某个样式
  getStyle(prop, root2) {
    const v = this.style.merge(prop, root2);
    return v === void 0 ? "" : v;
  }
  //  获取自定义样式
  getSelfStyle(prop) {
    return this.style.getSelfStyle(prop);
  }
  //   获取最近一个存在自身自定义样式的祖先节点的自定义样式
  getParentSelfStyle(prop) {
    if (this.parent) {
      return this.parent.getSelfStyle(prop) || this.parent.getParentSelfStyle(prop);
    }
    return null;
  }
  //  获取自身可继承的自定义样式
  getSelfInhertStyle(prop) {
    return this.getSelfStyle(prop) || // 自身
    this.getParentSelfStyle(prop);
  }
  // 获取节点非节点状态的边框大小
  getBorderWidth() {
    return this.style.merge("borderWidth", false) || 0;
  }
  //  获取数据
  getData(key) {
    return key ? this.nodeData.data[key] : this.nodeData.data;
  }
  // 获取该节点的纯数据，即不包含对节点实例的引用
  getPureData(removeActiveState = true, removeId = false) {
    return copyNodeTree({}, this, removeActiveState, removeId);
  }
  // 获取祖先节点列表
  getAncestorNodes() {
    const list = [];
    let parent = this.parent;
    while (parent) {
      list.unshift(parent);
      parent = parent.parent;
    }
    return list;
  }
  // 是否存在自定义样式
  hasCustomStyle() {
    return this.style.hasCustomStyle();
  }
  // 获取节点的尺寸和位置信息，宽高是应用了缩放效果后的实际宽高，位置是相对于浏览器窗口左上角的位置
  getRect() {
    return this.group ? this.group.rbox() : null;
  }
  // 获取节点的尺寸和位置信息，宽高是应用了缩放效果后的实际宽高，位置信息相对于画布
  getRectInSvg() {
    const { scaleX, scaleY, translateX, translateY } = this.mindMap.draw.transform();
    let { left, top, width: width2, height: height2 } = this;
    const right = (left + width2) * scaleX + translateX;
    const bottom = (top + height2) * scaleY + translateY;
    left = left * scaleX + translateX;
    top = top * scaleY + translateY;
    return {
      left,
      right,
      top,
      bottom,
      width: width2 * scaleX,
      height: height2 * scaleY
    };
  }
  // 高亮节点
  highlight() {
    if (this.group) this.group.addClass("smm-node-highlight");
  }
  // 取消高亮节点
  closeHighlight() {
    if (this.group) this.group.removeClass("smm-node-highlight");
  }
  // 伪克隆节点
  // 克隆出的节点并不能真正当做一个节点使用
  fakeClone() {
    const newNode = new MindMapNode({
      ...this.opt,
      uid: createUid()
    });
    Object.keys(this).forEach((item) => {
      newNode[item] = this[item];
    });
    return newNode;
  }
  // 创建SVG文本节点
  createSvgTextNode(text = "") {
    return new Text().text(text);
  }
  // 获取SVG.js库的一些对象
  getSvgObjects() {
    return {
      SVG,
      G,
      Rect
    };
  }
  // 检查是否支持拖拽调整宽度
  // 1.富文本模式
  // 2.自定义节点内容
  checkEnableDragModifyNodeWidth() {
    const {
      enableDragModifyNodeWidth,
      isUseCustomNodeContent: isUseCustomNodeContent2,
      customCreateNodeContent
    } = this.mindMap.opt;
    return enableDragModifyNodeWidth && (this.mindMap.richText || isUseCustomNodeContent2 && customCreateNodeContent);
  }
  // 是否存在自定义宽度
  hasCustomWidth() {
    return this.checkEnableDragModifyNodeWidth() && this.customTextWidth !== void 0;
  }
  // 获取子节点的数量
  getChildrenLength() {
    return this.nodeData.children ? this.nodeData.children.length : 0;
  }
}
class Lru {
  constructor(max) {
    this.max = max || 1e3;
    this.size = 0;
    this.pool = /* @__PURE__ */ new Map();
  }
  add(key, value) {
    const isExist = this.has(key);
    if (!isExist && this.size >= this.max) {
      return false;
    }
    this.delete(key);
    this.pool.set(key, value);
    this.size++;
    return true;
  }
  delete(key) {
    if (this.pool.has(key)) {
      this.pool.delete(key);
      this.size--;
    }
  }
  has(key) {
    return this.pool.has(key);
  }
  get(key) {
    if (this.pool.has(key)) {
      return this.pool.get(key);
    }
  }
  clear() {
    this.size = 0;
    this.pool = /* @__PURE__ */ new Map();
  }
}
class Base2 {
  //  构造函数
  constructor(renderer) {
    this.renderer = renderer;
    this.mindMap = renderer.mindMap;
    this.draw = this.mindMap.draw;
    this.lineDraw = this.mindMap.lineDraw;
    this.root = null;
    this.lru = new Lru(this.mindMap.opt.maxNodeCacheCount);
    this.rootNodeCenterOffset = null;
  }
  //  计算节点位置
  doLayout() {
    throw new Error("【computed】方法为必要方法，需要子类进行重写！");
  }
  //  连线
  renderLine() {
    throw new Error("【renderLine】方法为必要方法，需要子类进行重写！");
  }
  //  定位展开收缩按钮
  renderExpandBtn() {
    throw new Error("【renderExpandBtn】方法为必要方法，需要子类进行重写！");
  }
  //  概要节点
  renderGeneralization() {
  }
  // 通过uid缓存节点
  cacheNode(uid, node) {
    this.renderer.nodeCache[uid] = node;
    this.lru.add(uid, node);
  }
  // 检查当前来源是否需要重新计算节点大小
  checkIsNeedResizeSources() {
    return this.renderer.checkHasRenderSource(CONSTANTS.CHANGE_THEME);
  }
  // 层级类型改变
  checkIsLayerTypeChange(oldIndex, newIndex) {
    if (oldIndex >= 2 && newIndex >= 2) return false;
    if (oldIndex >= 2 && newIndex < 2) return true;
    if (oldIndex < 2 && newIndex >= 2) return true;
  }
  // 检查是否是结构布局改变重新渲染展开收起按钮占位元素
  checkIsLayoutChangeRerenderExpandBtnPlaceholderRect(node) {
    if (this.renderer.checkHasRenderSource(CONSTANTS.CHANGE_LAYOUT)) {
      node.needRerenderExpandBtnPlaceholderRect = true;
    }
  }
  // 节点节点数据是否发生了改变
  checkIsNodeDataChange(lastData, curData) {
    if (lastData) {
      lastData = typeof lastData === "string" ? JSON.parse(lastData) : lastData;
      lastData.isActive = curData.isActive;
      lastData.expand = curData.expand;
      lastData = JSON.stringify(lastData);
    } else {
      return false;
    }
    return lastData !== JSON.stringify(curData);
  }
  // 检查库前置或后置内容是否改变了
  checkNodeFixChange(newNode, nodeInnerPrefixData, nodeInnerPostfixData) {
    let isNodeInnerPrefixChange = false;
    this.mindMap.nodeInnerPrefixList.forEach((item) => {
      if (item.updateNodeData) {
        const isChange = item.updateNodeData(newNode, nodeInnerPrefixData);
        if (isChange) {
          isNodeInnerPrefixChange = isChange;
        }
      }
    });
    let isNodeInnerPostfixChange = false;
    this.mindMap.nodeInnerPostfixList.forEach((item) => {
      if (item.updateNodeData) {
        const isChange = item.updateNodeData(newNode, nodeInnerPostfixData);
        if (isChange) {
          isNodeInnerPostfixChange = isChange;
        }
      }
    });
    return isNodeInnerPrefixChange || isNodeInnerPostfixChange;
  }
  //  创建节点实例
  createNode(data2, parent, isRoot, layerIndex, index, ancestors) {
    const nodeInnerPrefixData = {};
    this.mindMap.nodeInnerPrefixList.forEach((item) => {
      if (item.createNodeData) {
        const [key, value] = item.createNodeData({
          data: data2,
          parent,
          ancestors,
          layerIndex,
          index
        });
        nodeInnerPrefixData[key] = value;
      }
    });
    const nodeInnerPostfixData = {};
    this.mindMap.nodeInnerPostfixList.forEach((item) => {
      if (item.createNodeData) {
        const [key, value] = item.createNodeData({
          data: data2,
          parent,
          ancestors,
          layerIndex,
          index
        });
        nodeInnerPostfixData[key] = value;
      }
    });
    const uid = data2.data.uid;
    let newNode = null;
    if (data2 && data2._node && !this.renderer.reRender) {
      newNode = data2._node;
      const isLayerTypeChange = this.checkIsLayerTypeChange(
        newNode.layerIndex,
        layerIndex
      );
      newNode.reset();
      newNode.layerIndex = layerIndex;
      if (isRoot) {
        newNode.isRoot = true;
      } else {
        newNode.parent = parent._node;
      }
      this.cacheNode(data2._node.uid, newNode);
      this.checkIsLayoutChangeRerenderExpandBtnPlaceholderRect(newNode);
      const isNodeInnerFixChange = this.checkNodeFixChange(
        newNode,
        nodeInnerPrefixData,
        nodeInnerPostfixData
      );
      const isResizeSource = this.checkIsNeedResizeSources();
      const isNodeDataChange = this.checkIsNodeDataChange(
        data2._node.nodeDataSnapshot,
        data2.data
      );
      if (isResizeSource || isNodeDataChange || isLayerTypeChange || newNode.getData("resetRichText") && // 自定义节点内容可以直接忽略resetRichText
      !newNode.isUseCustomNodeContent() || newNode.getData("needUpdate") || isNodeInnerFixChange) {
        newNode.getSize();
        newNode.needLayout = true;
      }
      this.checkGetGeneralizationChange(newNode, isResizeSource);
    } else if ((this.lru.has(uid) || this.renderer.lastNodeCache[uid]) && !this.renderer.reRender) {
      newNode = this.lru.get(uid) || this.renderer.lastNodeCache[uid];
      const lastData = JSON.stringify(newNode.getData());
      const isLayerTypeChange = this.checkIsLayerTypeChange(
        newNode.layerIndex,
        layerIndex
      );
      newNode.reset();
      newNode.nodeData = newNode.handleData(data2 || {});
      newNode.layerIndex = layerIndex;
      if (isRoot) {
        newNode.isRoot = true;
      } else {
        newNode.parent = parent._node;
      }
      this.cacheNode(uid, newNode);
      this.checkIsLayoutChangeRerenderExpandBtnPlaceholderRect(newNode);
      data2._node = newNode;
      const isResizeSource = this.checkIsNeedResizeSources();
      const isNodeDataChange = this.checkIsNodeDataChange(lastData, data2.data);
      const isNodeInnerFixChange = this.checkNodeFixChange(
        newNode,
        nodeInnerPrefixData,
        nodeInnerPostfixData
      );
      if (isResizeSource || isNodeDataChange || isLayerTypeChange || newNode.getData("resetRichText") && !newNode.isUseCustomNodeContent() || newNode.getData("needUpdate") || isNodeInnerFixChange) {
        newNode.getSize();
        newNode.needLayout = true;
      }
      this.checkGetGeneralizationChange(newNode, isResizeSource);
    } else {
      const newUid = uid || createUid();
      newNode = new MindMapNode({
        data: data2,
        uid: newUid,
        renderer: this.renderer,
        mindMap: this.mindMap,
        draw: this.draw,
        layerIndex,
        isRoot,
        parent: !isRoot ? parent._node : null,
        ...nodeInnerPrefixData
      });
      data2.data.uid = newUid;
      this.cacheNode(newUid, newNode);
      data2._node = newNode;
    }
    if (data2.data.isActive) {
      this.renderer.addNodeToActiveList(newNode);
    }
    if (this.mindMap.renderer.findActiveNodeIndex(newNode) !== -1) {
      newNode.setData({
        isActive: true
      });
    }
    if (isRoot) {
      this.root = newNode;
    } else {
      parent._node.addChildren(newNode);
    }
    return newNode;
  }
  // 检查概要节点是否需要更新
  checkGetGeneralizationChange(node, isResizeSource) {
    const generalizationList = node.getData("generalization");
    if (generalizationList && node._generalizationList && node._generalizationList.length > 0) {
      node._generalizationList.forEach((item, index) => {
        const gNode = item.generalizationNode;
        const oldData = gNode.getData();
        const newData = generalizationList[index];
        if (isResizeSource || newData && JSON.stringify(oldData) !== JSON.stringify(newData)) {
          if (newData) {
            gNode.nodeData.data = newData;
          }
          gNode.getSize();
          gNode.needLayout = true;
        }
      });
    }
  }
  // 格式化节点位置
  formatPosition(value, size2, nodeSize) {
    if (typeof value === "number") {
      return value;
    } else if (initRootNodePositionMap[value] !== void 0) {
      return size2 * initRootNodePositionMap[value];
    } else if (/^\d\d*%$/.test(value)) {
      return Number.parseFloat(value) / 100 * size2;
    } else {
      return (size2 - nodeSize) / 2;
    }
  }
  // 规范initRootNodePosition配置
  formatInitRootNodePosition(pos) {
    const { CENTER } = CONSTANTS.INIT_ROOT_NODE_POSITION;
    if (!pos || !Array.isArray(pos) || pos.length < 2) {
      pos = [CENTER, CENTER];
    }
    return pos;
  }
  //  定位节点到画布中间
  setNodeCenter(node, position2) {
    let { initRootNodePosition } = this.mindMap.opt;
    initRootNodePosition = this.formatInitRootNodePosition(
      position2 || initRootNodePosition
    );
    node.left = this.formatPosition(
      initRootNodePosition[0],
      this.mindMap.width,
      node.width
    );
    node.top = this.formatPosition(
      initRootNodePosition[1],
      this.mindMap.height,
      node.height
    );
  }
  // 当initRootNodePosition配置不为默认的['center','center']时，计算当前配置和默认配置情况下，根节点位置的差值
  getRootCenterOffset(width2, height2) {
    if (this.rootNodeCenterOffset) return this.rootNodeCenterOffset;
    let { initRootNodePosition } = this.mindMap.opt;
    const { CENTER } = CONSTANTS.INIT_ROOT_NODE_POSITION;
    initRootNodePosition = this.formatInitRootNodePosition(initRootNodePosition);
    if (initRootNodePosition[0] === CENTER && initRootNodePosition[1] === CENTER) {
      this.rootNodeCenterOffset = {
        x: 0,
        y: 0
      };
    } else {
      const tmpNode = {
        width: width2,
        height: height2
      };
      const tmpNode2 = {
        width: width2,
        height: height2
      };
      this.setNodeCenter(tmpNode, [CENTER, CENTER]);
      this.setNodeCenter(tmpNode2);
      this.rootNodeCenterOffset = {
        x: tmpNode2.left - tmpNode.left,
        y: tmpNode2.top - tmpNode.top
      };
    }
    return this.rootNodeCenterOffset;
  }
  //  更新子节点属性
  updateChildren(children, prop, offset) {
    children.forEach((item) => {
      item[prop] += offset;
      if (item.children && item.children.length && !item.hasCustomPosition()) {
        this.updateChildren(item.children, prop, offset);
      }
    });
  }
  //  更新子节点多个属性
  updateChildrenPro(children, props) {
    children.forEach((item) => {
      Object.keys(props).forEach((prop) => {
        item[prop] += props[prop];
      });
      if (item.children && item.children.length && !item.hasCustomPosition()) {
        this.updateChildrenPro(item.children, props);
      }
    });
  }
  //  递归计算节点的宽度
  getNodeAreaWidth(node, withGeneralization = false) {
    let widthArr = [];
    let totalGeneralizationNodeWidth = 0;
    let loop = (node2, width2) => {
      if (withGeneralization && node2.checkHasGeneralization()) {
        totalGeneralizationNodeWidth += node2._generalizationNodeWidth;
      }
      if (node2.children.length) {
        width2 += node2.width / 2;
        node2.children.forEach((item) => {
          loop(item, width2);
        });
      } else {
        width2 += node2.width;
        widthArr.push(width2);
      }
    };
    loop(node, 0);
    return Math.max(...widthArr) + totalGeneralizationNodeWidth;
  }
  //  二次贝塞尔曲线
  quadraticCurvePath(x1, y1, x2, y2, v = false) {
    let cx2, cy2;
    if (v) {
      cx2 = x1 + (x2 - x1) * 0.8;
      cy2 = y1 + (y2 - y1) * 0.2;
    } else {
      cx2 = x1 + (x2 - x1) * 0.2;
      cy2 = y1 + (y2 - y1) * 0.8;
    }
    return `M ${x1},${y1} Q ${cx2},${cy2} ${x2},${y2}`;
  }
  //  三次贝塞尔曲线
  cubicBezierPath(x1, y1, x2, y2, v = false) {
    let cx1, cy1, cx2, cy2;
    if (v) {
      cx1 = x1;
      cy1 = y1 + (y2 - y1) / 2;
      cx2 = x2;
      cy2 = cy1;
    } else {
      cx1 = x1 + (x2 - x1) / 2;
      cy1 = y1;
      cx2 = cx1;
      cy2 = y2;
    }
    return `M ${x1},${y1} C ${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`;
  }
  // 根据a,b两个点的位置，计算去除圆角大小后的新的b点
  computeNewPoint(a, b, radius = 0) {
    if (a[0] === b[0]) {
      if (b[1] > a[1]) {
        return [b[0], b[1] - radius];
      } else {
        return [b[0], b[1] + radius];
      }
    } else if (a[1] === b[1]) {
      if (b[0] > a[0]) {
        return [b[0] - radius, b[1]];
      } else {
        return [b[0] + radius, b[1]];
      }
    }
  }
  // 创建一段折线路径
  // 最后一个拐角支持圆角
  createFoldLine(list) {
    const { lineRadius } = this.mindMap.themeConfig;
    const len = list.length;
    let path = "";
    let radiusPath = "";
    if (len >= 3 && lineRadius > 0) {
      const start = list[len - 3];
      const center2 = list[len - 2];
      const end = list[len - 1];
      const isOneLine = start[0].toFixed(0) === center2[0].toFixed(0) && center2[0].toFixed(0) === end[0].toFixed(0) || start[1].toFixed(0) === center2[1].toFixed(0) && center2[1].toFixed(0) === end[1].toFixed(0);
      if (!isOneLine) {
        const cStart = this.computeNewPoint(start, center2, lineRadius);
        const cEnd = this.computeNewPoint(end, center2, lineRadius);
        radiusPath = `Q ${center2[0]},${center2[1]} ${cEnd[0]},${cEnd[1]}`;
        list.splice(len - 2, 1, cStart, radiusPath);
      }
    }
    list.forEach((item, index) => {
      if (typeof item === "string") {
        path += item;
      } else {
        const [x2, y2] = item;
        if (index === 0) {
          path += `M ${x2},${y2}`;
        } else {
          path += `L ${x2},${y2}`;
        }
      }
    });
    return path;
  }
  //   获取节点的marginX
  getMarginX(layerIndex) {
    const { themeConfig, opt } = this.mindMap;
    const { second, node } = themeConfig;
    const hoverRectPadding = opt.hoverRectPadding * 2;
    return layerIndex === 1 ? second.marginX + hoverRectPadding : node.marginX + hoverRectPadding;
  }
  //  获取节点的marginY
  getMarginY(layerIndex) {
    const { themeConfig, opt } = this.mindMap;
    const { second, node } = themeConfig;
    const hoverRectPadding = opt.hoverRectPadding * 2;
    return layerIndex === 1 ? second.marginY + hoverRectPadding : node.marginY + hoverRectPadding;
  }
  //  获取节点包括概要在内的宽度
  getNodeWidthWithGeneralization(node) {
    return Math.max(
      node.width,
      node.checkHasGeneralization() ? node._generalizationNodeWidth : 0
    );
  }
  //  获取节点包括概要在内的高度
  getNodeHeightWithGeneralization(node) {
    return Math.max(
      node.height,
      node.checkHasGeneralization() ? node._generalizationNodeHeight : 0
    );
  }
  //  获取节点的边界值
  /**
   * dir：生长方向，h（水平）、v（垂直）
   * isLeft：是否向左生长
   */
  getNodeBoundaries(node, dir) {
    let { generalizationLineMargin, generalizationNodeMargin } = this.mindMap.themeConfig;
    let walk2 = (root2) => {
      let _left = Infinity;
      let _right = -Infinity;
      let _top = Infinity;
      let _bottom = -Infinity;
      if (root2.children && root2.children.length > 0) {
        root2.children.forEach((child) => {
          let { left: left2, right: right2, top: top2, bottom: bottom2 } = walk2(child);
          let generalizationWidth = child.checkHasGeneralization() && child.getData("expand") ? child._generalizationNodeWidth + generalizationNodeMargin : 0;
          let generalizationHeight = child.checkHasGeneralization() && child.getData("expand") ? child._generalizationNodeHeight + generalizationNodeMargin : 0;
          if (left2 - (dir === "h" ? generalizationWidth : 0) < _left) {
            _left = left2 - (dir === "h" ? generalizationWidth : 0);
          }
          if (right2 + (dir === "h" ? generalizationWidth : 0) > _right) {
            _right = right2 + (dir === "h" ? generalizationWidth : 0);
          }
          if (top2 < _top) {
            _top = top2;
          }
          if (bottom2 + (dir === "v" ? generalizationHeight : 0) > _bottom) {
            _bottom = bottom2 + (dir === "v" ? generalizationHeight : 0);
          }
        });
      }
      let cur = {
        left: root2.left,
        right: root2.left + root2.width,
        top: root2.top,
        bottom: root2.top + root2.height
      };
      return {
        left: cur.left < _left ? cur.left : _left,
        right: cur.right > _right ? cur.right : _right,
        top: cur.top < _top ? cur.top : _top,
        bottom: cur.bottom > _bottom ? cur.bottom : _bottom
      };
    };
    let { left, right, top, bottom } = walk2(node);
    return {
      left,
      right,
      top,
      bottom,
      generalizationLineMargin,
      generalizationNodeMargin
    };
  }
  // 获取指定索引区间的子节点的边界范围
  getChildrenBoundaries(node, dir, startIndex = 0, endIndex) {
    let { generalizationLineMargin, generalizationNodeMargin } = this.mindMap.themeConfig;
    const children = node.children.slice(startIndex, endIndex + 1);
    let left = Infinity;
    let right = -Infinity;
    let top = Infinity;
    let bottom = -Infinity;
    children.forEach((item) => {
      const cur = this.getNodeBoundaries(item, dir);
      left = cur.left < left ? cur.left : left;
      right = cur.right > right ? cur.right : right;
      top = cur.top < top ? cur.top : top;
      bottom = cur.bottom > bottom ? cur.bottom : bottom;
    });
    return {
      left,
      right,
      top,
      bottom,
      generalizationLineMargin,
      generalizationNodeMargin
    };
  }
  // 获取节点概要的渲染边界
  getNodeGeneralizationRenderBoundaries(item, dir) {
    let res = null;
    if (item.range) {
      res = this.getChildrenBoundaries(
        item.node,
        dir,
        item.range[0],
        item.range[1]
      );
    } else {
      res = this.getNodeBoundaries(item.node, dir);
    }
    return res;
  }
  // 获取节点实际存在几个子节点
  getNodeActChildrenLength(node) {
    return node.nodeData.children && node.nodeData.children.length;
  }
  // 设置连线样式
  setLineStyle(style, line, path, childNode) {
    line.plot(this.transformPath(path));
    style && style(line, childNode, true);
  }
  // 转换路径，可以转换成特殊风格的线条样式
  transformPath(path) {
    const { customTransformNodeLinePath } = this.mindMap.opt;
    if (customTransformNodeLinePath) {
      return customTransformNodeLinePath(path);
    } else {
      return path;
    }
  }
}
class LogicalStructure extends Base2 {
  //  构造函数
  constructor(opt = {}, layout2) {
    super(opt);
    this.isUseLeft = layout2 === CONSTANTS.LAYOUT.LOGICAL_STRUCTURE_LEFT;
  }
  //  布局
  doLayout(callback) {
    let task = [
      () => {
        this.computedBaseValue();
      },
      () => {
        this.computedTopValue();
      },
      () => {
        this.adjustTopValue();
      },
      () => {
        callback(this.root);
      }
    ];
    asyncRun(task);
  }
  //  遍历数据计算节点的left、width、height
  computedBaseValue() {
    let sortIndex = 0;
    walk(
      this.renderer.renderTree,
      null,
      (cur, parent, isRoot, layerIndex, index, ancestors) => {
        let newNode = this.createNode(cur, parent, isRoot, layerIndex, index, ancestors);
        newNode.sortIndex = sortIndex;
        sortIndex++;
        if (isRoot) {
          this.setNodeCenter(newNode);
        } else {
          if (this.isUseLeft) {
            newNode.left = parent._node.left - newNode.width - this.getMarginX(layerIndex);
          } else {
            newNode.left = parent._node.left + parent._node.width + this.getMarginX(layerIndex);
          }
        }
        if (!cur.data.expand) {
          return true;
        }
      },
      (cur, parent, isRoot, layerIndex) => {
        let len = cur.data.expand === false ? 0 : cur._node.children.length;
        cur._node.childrenAreaHeight = len ? cur._node.children.reduce((h, item) => {
          return h + item.height;
        }, 0) + (len + 1) * this.getMarginY(layerIndex + 1) : 0;
        let generalizationNodeHeight = cur._node.checkHasGeneralization() ? cur._node._generalizationNodeHeight + this.getMarginY(layerIndex + 1) : 0;
        cur._node.childrenAreaHeight2 = Math.max(
          cur._node.childrenAreaHeight,
          generalizationNodeHeight
        );
      },
      true,
      0
    );
  }
  //  遍历节点树计算节点的top
  computedTopValue() {
    walk(
      this.root,
      null,
      (node, parent, isRoot, layerIndex) => {
        if (node.getData("expand") && node.children && node.children.length) {
          let marginY = this.getMarginY(layerIndex + 1);
          let top = node.top + node.height / 2 - node.childrenAreaHeight / 2;
          let totalTop = top + marginY;
          node.children.forEach((cur) => {
            cur.top = totalTop;
            totalTop += cur.height + marginY;
          });
        }
      },
      null,
      true
    );
  }
  //  调整节点top
  adjustTopValue() {
    walk(
      this.root,
      null,
      (node, parent, isRoot, layerIndex) => {
        if (!node.getData("expand")) {
          return;
        }
        let difference2 = node.childrenAreaHeight2 - this.getMarginY(layerIndex + 1) * 2 - node.height;
        if (difference2 > 0) {
          this.updateBrothers(node, difference2 / 2);
        }
      },
      null,
      true
    );
  }
  //  更新兄弟节点的top
  updateBrothers(node, addHeight) {
    if (node.parent) {
      let childrenList = node.parent.children;
      let index = getNodeIndexInNodeList(node, childrenList);
      childrenList.forEach((item, _index) => {
        if (item.uid === node.uid || item.hasCustomPosition()) {
          return;
        }
        let _offset = 0;
        if (_index < index) {
          _offset = -addHeight;
        } else if (_index > index) {
          _offset = addHeight;
        }
        item.top += _offset;
        if (item.children && item.children.length) {
          this.updateChildren(item.children, "top", _offset);
        }
      });
      this.updateBrothers(node.parent, addHeight);
    }
  }
  //  绘制连线，连接该节点到其子节点
  renderLine(node, lines, style, lineStyle) {
    if (lineStyle === "curve") {
      this.renderLineCurve(node, lines, style);
    } else if (lineStyle === "direct") {
      this.renderLineDirect(node, lines, style);
    } else {
      this.renderLineStraight(node, lines, style);
    }
  }
  //  直线风格连线
  renderLineStraight(node, lines, style) {
    if (node.children.length <= 0) {
      return [];
    }
    let { left, top, width: width2, height: height2, expandBtnSize } = node;
    const { alwaysShowExpandBtn, notShowExpandBtn } = this.mindMap.opt;
    if (!alwaysShowExpandBtn || notShowExpandBtn) {
      expandBtnSize = 0;
    }
    let marginX = this.getMarginX(node.layerIndex + 1);
    let s1 = (marginX - expandBtnSize) * 0.6;
    if (this.isUseLeft) {
      s1 *= -1;
    }
    let nodeUseLineStyle = this.mindMap.themeConfig.nodeUseLineStyle;
    node.children.forEach((item, index) => {
      let x1;
      if (this.isUseLeft) {
        x1 = node.layerIndex === 0 ? left : left - expandBtnSize;
      } else {
        x1 = node.layerIndex === 0 ? left + width2 : left + width2 + expandBtnSize;
      }
      let y1 = top + height2 / 2;
      let x2 = this.isUseLeft ? item.left + item.width : item.left;
      let y2 = item.top + item.height / 2;
      let nodeUseLineStyleOffset = nodeUseLineStyle ? item.width * (this.isUseLeft ? -1 : 1) : 0;
      y1 = nodeUseLineStyle && !node.isRoot ? y1 + height2 / 2 : y1;
      y2 = nodeUseLineStyle ? y2 + item.height / 2 : y2;
      let path = this.createFoldLine([
        [x1, y1],
        [x1 + s1, y1],
        [x1 + s1, y2],
        [x2 + nodeUseLineStyleOffset, y2]
      ]);
      this.setLineStyle(style, lines[index], path, item);
    });
  }
  //  直连风格
  renderLineDirect(node, lines, style) {
    if (node.children.length <= 0) {
      return [];
    }
    let { left, top, width: width2, height: height2, expandBtnSize } = node;
    const { alwaysShowExpandBtn, notShowExpandBtn } = this.mindMap.opt;
    if (!alwaysShowExpandBtn || notShowExpandBtn) {
      expandBtnSize = 0;
    }
    const { nodeUseLineStyle } = this.mindMap.themeConfig;
    node.children.forEach((item, index) => {
      if (node.layerIndex === 0) {
        expandBtnSize = 0;
      }
      let x1 = this.isUseLeft ? left - expandBtnSize : left + width2 + expandBtnSize;
      let y1 = top + height2 / 2;
      let x2 = this.isUseLeft ? item.left + item.width : item.left;
      let y2 = item.top + item.height / 2;
      y1 = nodeUseLineStyle && !node.isRoot ? y1 + height2 / 2 : y1;
      y2 = nodeUseLineStyle ? y2 + item.height / 2 : y2;
      let nodeUseLineStylePath = nodeUseLineStyle ? ` L ${this.isUseLeft ? item.left : item.left + item.width},${y2}` : "";
      let path = `M ${x1},${y1} L ${x2},${y2}` + nodeUseLineStylePath;
      this.setLineStyle(style, lines[index], path, item);
    });
  }
  //  曲线风格连线
  renderLineCurve(node, lines, style) {
    if (node.children.length <= 0) {
      return [];
    }
    let { left, top, width: width2, height: height2, expandBtnSize } = node;
    const { alwaysShowExpandBtn, notShowExpandBtn } = this.mindMap.opt;
    if (!alwaysShowExpandBtn || notShowExpandBtn) {
      expandBtnSize = 0;
    }
    const {
      nodeUseLineStyle,
      rootLineStartPositionKeepSameInCurve,
      rootLineKeepSameInCurve
    } = this.mindMap.themeConfig;
    node.children.forEach((item, index) => {
      if (node.layerIndex === 0) {
        expandBtnSize = 0;
      }
      let x1;
      if (this.isUseLeft) {
        x1 = node.layerIndex === 0 && !rootLineStartPositionKeepSameInCurve ? left + width2 / 2 : left - expandBtnSize;
      } else {
        x1 = node.layerIndex === 0 && !rootLineStartPositionKeepSameInCurve ? left + width2 / 2 : left + width2 + expandBtnSize;
      }
      let y1 = top + height2 / 2;
      let x2 = this.isUseLeft ? item.left + item.width : item.left;
      let y2 = item.top + item.height / 2;
      let path = "";
      y1 = nodeUseLineStyle && !node.isRoot ? y1 + height2 / 2 : y1;
      y2 = nodeUseLineStyle ? y2 + item.height / 2 : y2;
      let nodeUseLineStylePath;
      if (this.isUseLeft) {
        nodeUseLineStylePath = nodeUseLineStyle ? ` L ${item.left},${y2}` : "";
      } else {
        nodeUseLineStylePath = nodeUseLineStyle ? ` L ${item.left + item.width},${y2}` : "";
      }
      if (node.isRoot && !rootLineKeepSameInCurve) {
        path = this.quadraticCurvePath(x1, y1, x2, y2) + nodeUseLineStylePath;
      } else {
        path = this.cubicBezierPath(x1, y1, x2, y2) + nodeUseLineStylePath;
      }
      this.setLineStyle(style, lines[index], path, item);
    });
  }
  //  渲染按钮
  renderExpandBtn(node, btn) {
    let { width: width2, height: height2, expandBtnSize, layerIndex } = node;
    if (layerIndex === 0) {
      expandBtnSize = 0;
    }
    let { translateX, translateY } = btn.transform();
    let nodeUseLineStyleOffset = this.mindMap.themeConfig.nodeUseLineStyle ? height2 / 2 : 0;
    let _x = this.isUseLeft ? 0 - expandBtnSize : width2;
    let _y = height2 / 2 + nodeUseLineStyleOffset;
    if (_x === translateX && _y === translateY) {
      return;
    }
    btn.translate(_x - translateX, _y - translateY);
  }
  //  创建概要节点
  renderGeneralization(list) {
    list.forEach((item) => {
      let {
        left,
        top,
        bottom,
        right,
        generalizationLineMargin,
        generalizationNodeMargin
      } = this.getNodeGeneralizationRenderBoundaries(item, "h");
      let x2 = this.isUseLeft ? left - generalizationLineMargin : right + generalizationLineMargin;
      let x1 = x2;
      let y1 = top;
      let x22 = x2;
      let y2 = bottom;
      let cx2 = x1 + (this.isUseLeft ? -20 : 20);
      let cy2 = y1 + (y2 - y1) / 2;
      let path = `M ${x1},${y1} Q ${cx2},${cy2} ${x22},${y2}`;
      item.generalizationLine.plot(path);
      item.generalizationNode.left = x2 + (this.isUseLeft ? -generalizationNodeMargin : generalizationNodeMargin) - (this.isUseLeft ? item.generalizationNode.width : 0);
      item.generalizationNode.top = top + (bottom - top - item.generalizationNode.height) / 2;
    });
  }
  // 渲染展开收起按钮的隐藏占位元素
  renderExpandBtnRect(rect, expandBtnSize, width2, height2) {
    if (this.isUseLeft) {
      rect.size(expandBtnSize, height2).x(-expandBtnSize).y(0);
    } else {
      rect.size(expandBtnSize, height2).x(width2).y(0);
    }
  }
}
let MindMap$1 = class MindMap extends Base2 {
  //  构造函数
  // 在逻辑结构图的基础上增加一个变量来记录生长方向，向左还是向右，同时在计算left的时候根据方向来计算、调整top时只考虑同方向的节点即可
  constructor(opt = {}) {
    super(opt);
  }
  //  布局
  doLayout(callback) {
    let task = [
      () => {
        this.computedBaseValue();
      },
      () => {
        this.computedTopValue();
      },
      () => {
        this.adjustTopValue();
      },
      () => {
        callback(this.root);
      }
    ];
    asyncRun(task);
  }
  //  遍历数据计算节点的left、width、height
  computedBaseValue() {
    walk(
      this.renderer.renderTree,
      null,
      (cur, parent, isRoot, layerIndex, index, ancestors) => {
        let newNode = this.createNode(
          cur,
          parent,
          isRoot,
          layerIndex,
          index,
          ancestors
        );
        if (isRoot) {
          this.setNodeCenter(newNode);
        } else {
          if (parent._node.dir) {
            newNode.dir = parent._node.dir;
          } else {
            newNode.dir = newNode.getData("dir") || (index % 2 === 0 ? CONSTANTS.LAYOUT_GROW_DIR.RIGHT : CONSTANTS.LAYOUT_GROW_DIR.LEFT);
          }
          newNode.left = newNode.dir === CONSTANTS.LAYOUT_GROW_DIR.RIGHT ? parent._node.left + parent._node.width + this.getMarginX(layerIndex) : parent._node.left - this.getMarginX(layerIndex) - newNode.width;
        }
        if (!cur.data.expand) {
          return true;
        }
      },
      (cur, parent, isRoot, layerIndex) => {
        if (!cur.data.expand) {
          cur._node.leftChildrenAreaHeight = 0;
          cur._node.rightChildrenAreaHeight = 0;
          return;
        }
        let leftLen = 0;
        let rightLen = 0;
        let leftChildrenAreaHeight = 0;
        let rightChildrenAreaHeight = 0;
        cur._node.children.forEach((item) => {
          if (item.dir === CONSTANTS.LAYOUT_GROW_DIR.LEFT) {
            leftLen++;
            leftChildrenAreaHeight += item.height;
          } else {
            rightLen++;
            rightChildrenAreaHeight += item.height;
          }
        });
        cur._node.leftChildrenAreaHeight = leftChildrenAreaHeight + (leftLen + 1) * this.getMarginY(layerIndex + 1);
        cur._node.rightChildrenAreaHeight = rightChildrenAreaHeight + (rightLen + 1) * this.getMarginY(layerIndex + 1);
        let generalizationNodeHeight = cur._node.checkHasGeneralization() ? cur._node._generalizationNodeHeight + this.getMarginY(layerIndex + 1) : 0;
        cur._node.leftChildrenAreaHeight2 = Math.max(
          cur._node.leftChildrenAreaHeight,
          generalizationNodeHeight
        );
        cur._node.rightChildrenAreaHeight2 = Math.max(
          cur._node.rightChildrenAreaHeight,
          generalizationNodeHeight
        );
      },
      true,
      0
    );
  }
  //  遍历节点树计算节点的top
  computedTopValue() {
    walk(
      this.root,
      null,
      (node, parent, isRoot, layerIndex) => {
        if (node.getData("expand") && node.children && node.children.length) {
          let marginY = this.getMarginY(layerIndex + 1);
          let baseTop = node.top + node.height / 2 + marginY;
          let leftTotalTop = baseTop - node.leftChildrenAreaHeight / 2;
          let rightTotalTop = baseTop - node.rightChildrenAreaHeight / 2;
          node.children.forEach((cur) => {
            if (cur.dir === CONSTANTS.LAYOUT_GROW_DIR.LEFT) {
              cur.top = leftTotalTop;
              leftTotalTop += cur.height + marginY;
            } else {
              cur.top = rightTotalTop;
              rightTotalTop += cur.height + marginY;
            }
          });
        }
      },
      null,
      true
    );
  }
  //  调整节点top
  adjustTopValue() {
    walk(
      this.root,
      null,
      (node, parent, isRoot, layerIndex) => {
        if (!node.getData("expand")) {
          return;
        }
        let base = this.getMarginY(layerIndex + 1) * 2 + node.height;
        let leftDifference = node.leftChildrenAreaHeight2 - base;
        let rightDifference = node.rightChildrenAreaHeight2 - base;
        if (leftDifference > 0 || rightDifference > 0) {
          this.updateBrothers(node, leftDifference / 2, rightDifference / 2);
        }
      },
      null,
      true
    );
  }
  //  更新兄弟节点的top
  updateBrothers(node, leftAddHeight, rightAddHeight) {
    if (node.parent) {
      let childrenList = node.parent.children.filter((item) => {
        return item.dir === node.dir;
      });
      let index = getNodeIndexInNodeList(node, childrenList);
      childrenList.forEach((item, _index) => {
        if (item.hasCustomPosition()) {
          return;
        }
        let _offset = 0;
        let addHeight = item.dir === CONSTANTS.LAYOUT_GROW_DIR.LEFT ? leftAddHeight : rightAddHeight;
        if (_index < index) {
          _offset = -addHeight;
        } else if (_index > index) {
          _offset = addHeight;
        }
        item.top += _offset;
        if (item.children && item.children.length) {
          this.updateChildren(item.children, "top", _offset);
        }
      });
      this.updateBrothers(node.parent, leftAddHeight, rightAddHeight);
    }
  }
  //  绘制连线，连接该节点到其子节点
  renderLine(node, lines, style, lineStyle) {
    if (lineStyle === "curve") {
      this.renderLineCurve(node, lines, style);
    } else if (lineStyle === "direct") {
      this.renderLineDirect(node, lines, style);
    } else {
      this.renderLineStraight(node, lines, style);
    }
  }
  //  直线风格连线
  renderLineStraight(node, lines, style) {
    if (node.children.length <= 0) {
      return [];
    }
    let { left, top, width: width2, height: height2, expandBtnSize } = node;
    const { alwaysShowExpandBtn, notShowExpandBtn } = this.mindMap.opt;
    if (!alwaysShowExpandBtn || notShowExpandBtn) {
      expandBtnSize = 0;
    }
    let marginX = this.getMarginX(node.layerIndex + 1);
    let s1 = (marginX - expandBtnSize) * 0.6;
    let nodeUseLineStyle = this.mindMap.themeConfig.nodeUseLineStyle;
    node.children.forEach((item, index) => {
      let x1 = 0;
      let _s = 0;
      let nodeUseLineStyleOffset = nodeUseLineStyle ? item.width : 0;
      if (item.dir === CONSTANTS.LAYOUT_GROW_DIR.LEFT) {
        _s = -s1;
        x1 = node.layerIndex === 0 ? left : left - expandBtnSize;
        nodeUseLineStyleOffset = -nodeUseLineStyleOffset;
      } else {
        _s = s1;
        x1 = node.layerIndex === 0 ? left + width2 : left + width2 + expandBtnSize;
      }
      let y1 = top + height2 / 2;
      let x2 = item.dir === CONSTANTS.LAYOUT_GROW_DIR.LEFT ? item.left + item.width : item.left;
      let y2 = item.top + item.height / 2;
      y1 = nodeUseLineStyle && !node.isRoot ? y1 + height2 / 2 : y1;
      y2 = nodeUseLineStyle ? y2 + item.height / 2 : y2;
      let path = this.createFoldLine([
        [x1, y1],
        [x1 + _s, y1],
        [x1 + _s, y2],
        [x2 + nodeUseLineStyleOffset, y2]
      ]);
      this.setLineStyle(style, lines[index], path, item);
    });
  }
  //  直连风格
  renderLineDirect(node, lines, style) {
    if (node.children.length <= 0) {
      return [];
    }
    let { left, top, width: width2, height: height2, expandBtnSize } = node;
    const { alwaysShowExpandBtn, notShowExpandBtn } = this.mindMap.opt;
    if (!alwaysShowExpandBtn || notShowExpandBtn) {
      expandBtnSize = 0;
    }
    const { nodeUseLineStyle } = this.mindMap.themeConfig;
    node.children.forEach((item, index) => {
      if (node.layerIndex === 0) {
        expandBtnSize = 0;
      }
      let x1 = item.dir === CONSTANTS.LAYOUT_GROW_DIR.LEFT ? left - expandBtnSize : left + width2 + expandBtnSize;
      let y1 = top + height2 / 2;
      let x2 = item.dir === CONSTANTS.LAYOUT_GROW_DIR.LEFT ? item.left + item.width : item.left;
      let y2 = item.top + item.height / 2;
      y1 = nodeUseLineStyle && !node.isRoot ? y1 + height2 / 2 : y1;
      y2 = nodeUseLineStyle ? y2 + item.height / 2 : y2;
      let nodeUseLineStylePath = "";
      if (nodeUseLineStyle) {
        if (item.dir === CONSTANTS.LAYOUT_GROW_DIR.LEFT) {
          nodeUseLineStylePath = ` L ${item.left},${y2}`;
        } else {
          nodeUseLineStylePath = ` L ${item.left + item.width},${y2}`;
        }
      }
      let path = `M ${x1},${y1} L ${x2},${y2}` + nodeUseLineStylePath;
      this.setLineStyle(style, lines[index], path, item);
    });
  }
  //  曲线风格连线
  renderLineCurve(node, lines, style) {
    if (node.children.length <= 0) {
      return [];
    }
    let { left, top, width: width2, height: height2, expandBtnSize } = node;
    const { alwaysShowExpandBtn, notShowExpandBtn } = this.mindMap.opt;
    if (!alwaysShowExpandBtn || notShowExpandBtn) {
      expandBtnSize = 0;
    }
    const {
      nodeUseLineStyle,
      rootLineKeepSameInCurve,
      rootLineStartPositionKeepSameInCurve
    } = this.mindMap.themeConfig;
    node.children.forEach((item, index) => {
      if (node.layerIndex === 0) {
        expandBtnSize = 0;
      }
      let x1 = node.layerIndex === 0 && !rootLineStartPositionKeepSameInCurve ? left + width2 / 2 : item.dir === CONSTANTS.LAYOUT_GROW_DIR.LEFT ? left - expandBtnSize : left + width2 + expandBtnSize;
      let y1 = top + height2 / 2;
      let x2 = item.dir === CONSTANTS.LAYOUT_GROW_DIR.LEFT ? item.left + item.width : item.left;
      let y2 = item.top + item.height / 2;
      let path = "";
      y1 = nodeUseLineStyle && !node.isRoot ? y1 + height2 / 2 : y1;
      y2 = nodeUseLineStyle ? y2 + item.height / 2 : y2;
      let nodeUseLineStylePath = "";
      if (nodeUseLineStyle) {
        if (item.dir === CONSTANTS.LAYOUT_GROW_DIR.LEFT) {
          nodeUseLineStylePath = ` L ${item.left},${y2}`;
        } else {
          nodeUseLineStylePath = ` L ${item.left + item.width},${y2}`;
        }
      }
      if (node.isRoot && !rootLineKeepSameInCurve) {
        path = this.quadraticCurvePath(x1, y1, x2, y2) + nodeUseLineStylePath;
      } else {
        path = this.cubicBezierPath(x1, y1, x2, y2) + nodeUseLineStylePath;
      }
      this.setLineStyle(style, lines[index], path, item);
    });
  }
  //  渲染按钮
  renderExpandBtn(node, btn) {
    let { width: width2, height: height2, expandBtnSize } = node;
    let { translateX, translateY } = btn.transform();
    let nodeUseLineStyleOffset = this.mindMap.themeConfig.nodeUseLineStyle ? height2 / 2 : 0;
    let _x = node.dir === CONSTANTS.LAYOUT_GROW_DIR.LEFT ? 0 - expandBtnSize : width2;
    let _y = height2 / 2 + nodeUseLineStyleOffset;
    if (_x === translateX && _y === translateY) {
      return;
    }
    let x2 = _x - translateX;
    let y2 = _y - translateY;
    btn.translate(x2, y2);
  }
  //  创建概要节点
  renderGeneralization(list) {
    list.forEach((item) => {
      let isLeft = item.node.dir === CONSTANTS.LAYOUT_GROW_DIR.LEFT;
      let {
        top,
        bottom,
        left,
        right,
        generalizationLineMargin,
        generalizationNodeMargin
      } = this.getNodeGeneralizationRenderBoundaries(item, "h");
      let x2 = isLeft ? left - generalizationLineMargin : right + generalizationLineMargin;
      let x1 = x2;
      let y1 = top;
      let x22 = x2;
      let y2 = bottom;
      let cx2 = x1 + (isLeft ? -20 : 20);
      let cy2 = y1 + (y2 - y1) / 2;
      let path = `M ${x1},${y1} Q ${cx2},${cy2} ${x22},${y2}`;
      item.generalizationLine.plot(path);
      item.generalizationNode.left = x2 + (isLeft ? -generalizationNodeMargin : generalizationNodeMargin) - (isLeft ? item.generalizationNode.width : 0);
      item.generalizationNode.top = top + (bottom - top - item.generalizationNode.height) / 2;
    });
  }
  // 渲染展开收起按钮的隐藏占位元素
  renderExpandBtnRect(rect, expandBtnSize, width2, height2, node) {
    if (node.dir === CONSTANTS.LAYOUT_GROW_DIR.LEFT) {
      rect.size(expandBtnSize, height2).x(-expandBtnSize).y(0);
    } else {
      rect.size(expandBtnSize, height2).x(width2).y(0);
    }
  }
};
class CatalogOrganization extends Base2 {
  //  构造函数
  constructor(opt = {}) {
    super(opt);
  }
  //  布局
  doLayout(callback) {
    let task = [
      () => {
        this.computedBaseValue();
      },
      () => {
        this.computedLeftTopValue();
      },
      () => {
        this.adjustLeftTopValue();
      },
      () => {
        callback(this.root);
      }
    ];
    asyncRun(task);
  }
  //  遍历数据计算节点的left、width、height
  computedBaseValue() {
    walk(
      this.renderer.renderTree,
      null,
      (cur, parent, isRoot, layerIndex, index, ancestors) => {
        let newNode = this.createNode(cur, parent, isRoot, layerIndex, index, ancestors);
        if (isRoot) {
          this.setNodeCenter(newNode);
        } else {
          if (parent._node.isRoot) {
            newNode.top = parent._node.top + parent._node.height + this.getMarginX(layerIndex);
          }
        }
        if (!cur.data.expand) {
          return true;
        }
      },
      (cur, parent, isRoot, layerIndex) => {
        if (isRoot) {
          let len = cur.data.expand === false ? 0 : cur._node.children.length;
          cur._node.childrenAreaWidth = len ? cur._node.children.reduce((h, item) => {
            return h + item.width;
          }, 0) + (len + 1) * this.getMarginX(layerIndex + 1) : 0;
        }
      },
      true,
      0
    );
  }
  //  遍历节点树计算节点的left、top
  computedLeftTopValue() {
    walk(
      this.root,
      null,
      (node, parent, isRoot, layerIndex) => {
        if (node.getData("expand") && node.children && node.children.length) {
          let marginX = this.getMarginX(layerIndex + 1);
          let marginY = this.getMarginY(layerIndex + 1);
          if (isRoot) {
            let left = node.left + node.width / 2 - node.childrenAreaWidth / 2;
            let totalLeft = left + marginX;
            node.children.forEach((cur) => {
              cur.left = totalLeft;
              totalLeft += cur.width + marginX;
            });
          } else {
            let totalTop = node.top + this.getNodeHeightWithGeneralization(node) + marginY + (this.getNodeActChildrenLength(node) > 0 ? node.expandBtnSize : 0);
            node.children.forEach((cur) => {
              cur.left = node.left + node.width * 0.5;
              cur.top = totalTop;
              totalTop += this.getNodeHeightWithGeneralization(cur) + marginY + (this.getNodeActChildrenLength(cur) > 0 ? cur.expandBtnSize : 0);
            });
          }
        }
      },
      null,
      true
    );
  }
  //  调整节点left、top
  adjustLeftTopValue() {
    walk(
      this.root,
      null,
      (node, parent, isRoot, layerIndex) => {
        if (!node.getData("expand")) {
          return;
        }
        if (parent && parent.isRoot) {
          let areaWidth = this.getNodeAreaWidth(node, true);
          let difference2 = areaWidth - node.width;
          if (difference2 > 0) {
            this.updateBrothersLeft(node, difference2);
          }
        }
        let len = node.children.length;
        if (parent && !parent.isRoot && len > 0) {
          let marginY = this.getMarginY(layerIndex + 1);
          let totalHeight = node.children.reduce((h, item) => {
            return h + this.getNodeHeightWithGeneralization(item) + (this.getNodeActChildrenLength(item) > 0 ? item.expandBtnSize : 0);
          }, 0) + len * marginY;
          this.updateBrothersTop(node, totalHeight);
        }
      },
      (node, parent, isRoot) => {
        if (isRoot) {
          let { right, left } = this.getNodeBoundaries(node, "h");
          let childrenWidth = right - left;
          let offset = node.left - left - (childrenWidth - node.width) / 2;
          this.updateChildren(node.children, "left", offset);
        }
      },
      true
    );
  }
  //  调整兄弟节点的left
  updateBrothersLeft(node, addWidth) {
    if (node.parent) {
      let childrenList = node.parent.children;
      let index = getNodeIndexInNodeList(node, childrenList);
      childrenList.forEach((item, _index) => {
        if (item.hasCustomPosition() || _index <= index) {
          return;
        }
        item.left += addWidth;
        if (item.children && item.children.length) {
          this.updateChildren(item.children, "left", addWidth);
        }
      });
      this.updateBrothersLeft(node.parent, addWidth);
    }
  }
  //  调整兄弟节点的top
  updateBrothersTop(node, addHeight) {
    if (node.parent && !node.parent.isRoot) {
      let childrenList = node.parent.children;
      let index = getNodeIndexInNodeList(node, childrenList);
      childrenList.forEach((item, _index) => {
        if (item.hasCustomPosition()) {
          return;
        }
        let _offset = 0;
        if (_index > index) {
          _offset = addHeight;
        }
        item.top += _offset;
        if (item.children && item.children.length) {
          this.updateChildren(item.children, "top", _offset);
        }
      });
      this.updateBrothersTop(node.parent, addHeight);
    }
  }
  //  绘制连线，连接该节点到其子节点
  renderLine(node, lines, style) {
    if (node.children.length <= 0) {
      return [];
    }
    let { left, top, width: width2, height: height2, expandBtnSize } = node;
    const { alwaysShowExpandBtn, notShowExpandBtn } = this.mindMap.opt;
    if (!alwaysShowExpandBtn || notShowExpandBtn) {
      expandBtnSize = 0;
    }
    let len = node.children.length;
    let marginX = this.getMarginX(node.layerIndex + 1);
    if (node.isRoot) {
      let x1 = left + width2 / 2;
      let y1 = top + height2;
      let s1 = marginX * 0.7;
      let minx = Infinity;
      let maxx = -Infinity;
      node.children.forEach((item, index) => {
        let x2 = item.left + item.width / 2;
        let y2 = item.top;
        if (x2 < minx) {
          minx = x2;
        }
        if (x2 > maxx) {
          maxx = x2;
        }
        let nodeUseLineStylePath = this.mindMap.themeConfig.nodeUseLineStyle ? ` L ${item.left},${y2} L ${item.left + item.width},${y2}` : "";
        let path = `M ${x2},${y1 + s1} L ${x2},${y1 + s1 > y2 ? y2 + item.height : y2}` + nodeUseLineStylePath;
        this.setLineStyle(style, lines[index], path, item);
      });
      minx = Math.min(minx, x1);
      maxx = Math.max(maxx, x1);
      let line1 = this.lineDraw.path();
      node.style.line(line1);
      line1.plot(this.transformPath(`M ${x1},${y1} L ${x1},${y1 + s1}`));
      node._lines.push(line1);
      style && style(line1, node);
      if (len > 0) {
        let lin2 = this.lineDraw.path();
        node.style.line(lin2);
        lin2.plot(this.transformPath(`M ${minx},${y1 + s1} L ${maxx},${y1 + s1}`));
        node._lines.push(lin2);
        style && style(lin2, node);
      }
    } else {
      let y1 = top + height2;
      let maxy = -Infinity;
      let x2 = node.left + node.width * 0.3;
      node.children.forEach((item, index) => {
        let y2 = item.top + item.height / 2;
        if (y2 > maxy) {
          maxy = y2;
        }
        let path = "";
        let _left = item.left;
        let _isLeft = item.left + item.width < x2;
        let _isXCenter = false;
        if (_isLeft) {
          _left = item.left + item.width;
        } else if (item.left < x2 && item.left + item.width > x2) {
          _isXCenter = true;
          y2 = item.top;
          maxy = y2;
        }
        if (y2 > top && y2 < y1) {
          path = `M ${_isLeft ? node.left : node.left + node.width},${y2} L ${_left},${y2}`;
        } else if (y2 < y1) {
          if (_isXCenter) {
            y2 = item.top + item.height;
            _left = x2;
          }
          path = `M ${x2},${top} L ${x2},${y2} L ${_left},${y2}`;
        } else {
          if (_isXCenter) {
            _left = x2;
          }
          path = `M ${x2},${y2} L ${_left},${y2}`;
        }
        let nodeUseLineStylePath = this.mindMap.themeConfig.nodeUseLineStyle ? ` L ${_left},${y2 - item.height / 2} L ${_left},${y2 + item.height / 2}` : "";
        path += nodeUseLineStylePath;
        this.setLineStyle(style, lines[index], path, item);
      });
      if (len > 0) {
        let lin2 = this.lineDraw.path();
        expandBtnSize = len > 0 ? expandBtnSize : 0;
        node.style.line(lin2);
        if (maxy < y1 + expandBtnSize) {
          lin2.hide();
        } else {
          lin2.plot(
            this.transformPath(`M ${x2},${y1 + expandBtnSize} L ${x2},${maxy}`)
          );
          lin2.show();
        }
        node._lines.push(lin2);
        style && style(lin2, node);
      }
    }
  }
  //  渲染按钮
  renderExpandBtn(node, btn) {
    let { width: width2, height: height2, expandBtnSize, isRoot } = node;
    if (!isRoot) {
      let { translateX, translateY } = btn.transform();
      btn.translate(
        width2 * 0.3 - expandBtnSize / 2 - translateX,
        height2 + expandBtnSize / 2 - translateY
      );
    }
  }
  //  创建概要节点
  renderGeneralization(list) {
    list.forEach((item) => {
      let {
        top,
        bottom,
        right,
        generalizationLineMargin,
        generalizationNodeMargin
      } = this.getNodeGeneralizationRenderBoundaries(item, "h");
      let x1 = right + generalizationLineMargin;
      let y1 = top;
      let x2 = right + generalizationLineMargin;
      let y2 = bottom;
      let cx2 = x1 + 20;
      let cy2 = y1 + (y2 - y1) / 2;
      let path = `M ${x1},${y1} Q ${cx2},${cy2} ${x2},${y2}`;
      item.generalizationLine.plot(this.transformPath(path));
      item.generalizationNode.left = right + generalizationNodeMargin;
      item.generalizationNode.top = top + (bottom - top - item.generalizationNode.height) / 2;
    });
  }
  // 渲染展开收起按钮的隐藏占位元素
  renderExpandBtnRect(rect, expandBtnSize, width2, height2, node) {
    rect.size(width2, expandBtnSize).x(0).y(height2);
  }
}
class OrganizationStructure extends Base2 {
  //  构造函数
  constructor(opt = {}) {
    super(opt);
  }
  //  布局
  doLayout(callback) {
    let task = [
      () => {
        this.computedBaseValue();
      },
      () => {
        this.computedLeftValue();
      },
      () => {
        this.adjustLeftValue();
      },
      () => {
        callback(this.root);
      }
    ];
    asyncRun(task);
  }
  //  遍历数据计算节点的left、width、height
  computedBaseValue() {
    walk(
      this.renderer.renderTree,
      null,
      (cur, parent, isRoot, layerIndex, index, ancestors) => {
        let newNode = this.createNode(
          cur,
          parent,
          isRoot,
          layerIndex,
          index,
          ancestors
        );
        if (isRoot) {
          this.setNodeCenter(newNode);
        } else {
          newNode.top = parent._node.top + parent._node.height + this.getMarginX(layerIndex);
        }
        if (!cur.data.expand) {
          return true;
        }
      },
      (cur, parent, isRoot, layerIndex) => {
        let len = cur.data.expand === false ? 0 : cur._node.children.length;
        cur._node.childrenAreaWidth = len ? cur._node.children.reduce((h, item) => {
          return h + item.width;
        }, 0) + (len + 1) * this.getMarginY(layerIndex + 1) : 0;
        let generalizationNodeWidth = cur._node.checkHasGeneralization() ? cur._node._generalizationNodeWidth + this.getMarginY(layerIndex + 1) : 0;
        cur._node.childrenAreaWidth2 = Math.max(
          cur._node.childrenAreaWidth,
          generalizationNodeWidth
        );
      },
      true,
      0
    );
  }
  //  遍历节点树计算节点的left
  computedLeftValue() {
    walk(
      this.root,
      null,
      (node, parent, isRoot, layerIndex) => {
        if (node.getData("expand") && node.children && node.children.length) {
          let marginX = this.getMarginY(layerIndex + 1);
          let left = node.left + node.width / 2 - node.childrenAreaWidth / 2;
          let totalLeft = left + marginX;
          node.children.forEach((cur) => {
            cur.left = totalLeft;
            totalLeft += cur.width + marginX;
          });
        }
      },
      null,
      true
    );
  }
  //  调整节点left
  adjustLeftValue() {
    walk(
      this.root,
      null,
      (node, parent, isRoot, layerIndex) => {
        if (!node.getData("expand")) {
          return;
        }
        let difference2 = node.childrenAreaWidth2 - this.getMarginY(layerIndex + 1) * 2 - node.width;
        if (difference2 > 0) {
          this.updateBrothers(node, difference2 / 2);
        }
      },
      null,
      true
    );
  }
  //  更新兄弟节点的left
  updateBrothers(node, addWidth) {
    if (node.parent) {
      let childrenList = node.parent.children;
      let index = getNodeIndexInNodeList(node, childrenList);
      childrenList.forEach((item, _index) => {
        if (item.hasCustomPosition()) {
          return;
        }
        let _offset = 0;
        if (_index < index) {
          _offset = -addWidth;
        } else if (_index > index) {
          _offset = addWidth;
        }
        item.left += _offset;
        if (item.children && item.children.length) {
          this.updateChildren(item.children, "left", _offset);
        }
      });
      this.updateBrothers(node.parent, addWidth);
    }
  }
  //  绘制连线，连接该节点到其子节点
  renderLine(node, lines, style, lineStyle) {
    if (lineStyle === "curve") {
      this.renderLineCurve(node, lines, style);
    } else if (lineStyle === "direct") {
      this.renderLineDirect(node, lines, style);
    } else {
      this.renderLineStraight(node, lines, style);
    }
  }
  //  曲线风格连线
  renderLineCurve(node, lines, style) {
    if (node.children.length <= 0) {
      return [];
    }
    let { left, top, width: width2, height: height2, expandBtnSize } = node;
    const { alwaysShowExpandBtn, notShowExpandBtn } = this.mindMap.opt;
    if (!alwaysShowExpandBtn || notShowExpandBtn) {
      expandBtnSize = 0;
    }
    const {
      nodeUseLineStyle,
      rootLineStartPositionKeepSameInCurve,
      rootLineKeepSameInCurve
    } = this.mindMap.themeConfig;
    node.children.forEach((item, index) => {
      if (node.layerIndex === 0) {
        expandBtnSize = 0;
      }
      let x1 = left + width2 / 2;
      let y1 = node.layerIndex === 0 && !rootLineStartPositionKeepSameInCurve ? top + height2 / 2 : top + height2 + expandBtnSize;
      let x2 = item.left + item.width / 2;
      let y2 = item.top;
      let path = "";
      let nodeUseLineStylePath = nodeUseLineStyle ? ` L ${item.left},${y2} L ${item.left + item.width},${y2}` : "";
      if (node.isRoot && !rootLineKeepSameInCurve) {
        path = this.quadraticCurvePath(x1, y1, x2, y2, true) + nodeUseLineStylePath;
      } else {
        path = this.cubicBezierPath(x1, y1, x2, y2, true) + nodeUseLineStylePath;
      }
      this.setLineStyle(style, lines[index], path, item);
    });
  }
  //  直连风格
  renderLineDirect(node, lines, style) {
    if (node.children.length <= 0) {
      return [];
    }
    let { left, top, width: width2, height: height2 } = node;
    const { nodeUseLineStyle } = this.mindMap.themeConfig;
    let x1 = left + width2 / 2;
    let y1 = top + height2;
    node.children.forEach((item, index) => {
      let x2 = item.left + item.width / 2;
      let y2 = item.top;
      let nodeUseLineStylePath = nodeUseLineStyle ? ` L ${item.left},${y2} L ${item.left + item.width},${y2}` : "";
      let path = `M ${x1},${y1} L ${x2},${y2}` + nodeUseLineStylePath;
      this.setLineStyle(style, lines[index], path, item);
    });
  }
  //  直线风格连线
  renderLineStraight(node, lines, style) {
    if (node.children.length <= 0) {
      return [];
    }
    let { left, top, width: width2, height: height2, expandBtnSize, isRoot } = node;
    const { alwaysShowExpandBtn, notShowExpandBtn } = this.mindMap.opt;
    if (!alwaysShowExpandBtn || notShowExpandBtn) {
      expandBtnSize = 0;
    }
    let x1 = left + width2 / 2;
    let y1 = top + height2;
    let marginX = this.getMarginX(node.layerIndex + 1);
    let s1 = marginX * 0.7;
    let minx = Infinity;
    let maxx = -Infinity;
    let len = node.children.length;
    node.children.forEach((item, index) => {
      let x2 = item.left + item.width / 2;
      let y2 = y1 + s1 > item.top ? item.top + item.height : item.top;
      if (x2 < minx) {
        minx = x2;
      }
      if (x2 > maxx) {
        maxx = x2;
      }
      let nodeUseLineStylePath = this.mindMap.themeConfig.nodeUseLineStyle ? ` L ${item.left},${y2} L ${item.left + item.width},${y2}` : "";
      let path = `M ${x2},${y1 + s1} L ${x2},${y2}` + nodeUseLineStylePath;
      this.setLineStyle(style, lines[index], path, item);
    });
    minx = Math.min(x1, minx);
    maxx = Math.max(x1, maxx);
    let line1 = this.lineDraw.path();
    node.style.line(line1);
    expandBtnSize = len > 0 && !isRoot ? expandBtnSize : 0;
    line1.plot(
      this.transformPath(`M ${x1},${y1 + expandBtnSize} L ${x1},${y1 + s1}`)
    );
    node._lines.push(line1);
    style && style(line1, node);
    if (len > 0) {
      let lin2 = this.lineDraw.path();
      node.style.line(lin2);
      lin2.plot(this.transformPath(`M ${minx},${y1 + s1} L ${maxx},${y1 + s1}`));
      node._lines.push(lin2);
      style && style(lin2, node);
    }
  }
  //  渲染按钮
  renderExpandBtn(node, btn) {
    let { width: width2, height: height2, expandBtnSize } = node;
    let { translateX, translateY } = btn.transform();
    btn.translate(
      width2 / 2 - expandBtnSize / 2 - translateX,
      height2 + expandBtnSize / 2 - translateY
    );
  }
  //  创建概要节点
  renderGeneralization(list) {
    list.forEach((item) => {
      let {
        bottom,
        left,
        right,
        generalizationLineMargin,
        generalizationNodeMargin
      } = this.getNodeGeneralizationRenderBoundaries(item, "v");
      let x1 = left;
      let y1 = bottom + generalizationLineMargin;
      let x2 = right;
      let y2 = bottom + generalizationLineMargin;
      let cx2 = x1 + (x2 - x1) / 2;
      let cy2 = y1 + 20;
      let path = `M ${x1},${y1} Q ${cx2},${cy2} ${x2},${y2}`;
      item.generalizationLine.plot(this.transformPath(path));
      item.generalizationNode.top = bottom + generalizationNodeMargin;
      item.generalizationNode.left = left + (right - left - item.generalizationNode.width) / 2;
    });
  }
  // 渲染展开收起按钮的隐藏占位元素
  renderExpandBtnRect(rect, expandBtnSize, width2, height2, node) {
    rect.size(width2, expandBtnSize).x(0).y(height2);
  }
}
class Timeline2 extends Base2 {
  //  构造函数
  constructor(opt = {}, layout2) {
    super(opt);
    this.layout = layout2;
  }
  //  布局
  doLayout(callback) {
    let task = [
      () => {
        this.computedBaseValue();
      },
      () => {
        this.computedLeftTopValue();
      },
      () => {
        this.adjustLeftTopValue();
      },
      () => {
        callback(this.root);
      }
    ];
    asyncRun(task);
  }
  //  遍历数据创建节点、计算根节点的位置，计算根节点的子节点的top值
  computedBaseValue() {
    walk(
      this.renderer.renderTree,
      null,
      (cur, parent, isRoot, layerIndex, index, ancestors) => {
        let newNode = this.createNode(cur, parent, isRoot, layerIndex, index, ancestors);
        if (isRoot) {
          this.setNodeCenter(newNode);
        } else {
          if (this.layout === CONSTANTS.LAYOUT.TIMELINE2) {
            if (parent._node.dir) {
              newNode.dir = parent._node.dir;
            } else {
              newNode.dir = index % 2 === 0 ? CONSTANTS.LAYOUT_GROW_DIR.BOTTOM : CONSTANTS.LAYOUT_GROW_DIR.TOP;
            }
          } else {
            newNode.dir = "";
          }
          if (parent._node.isRoot) {
            newNode.top = parent._node.top + (cur._node.height > parent._node.height ? -(cur._node.height - parent._node.height) / 2 : (parent._node.height - cur._node.height) / 2);
          }
        }
        if (!cur.data.expand) {
          return true;
        }
      },
      null,
      true,
      0
    );
  }
  //  遍历节点树计算节点的left、top
  computedLeftTopValue() {
    walk(
      this.root,
      null,
      (node, parent, isRoot, layerIndex, index) => {
        if (node.getData("expand") && node.children && node.children.length) {
          let marginX = this.getMarginX(layerIndex + 1);
          let marginY = this.getMarginY(layerIndex + 1);
          if (isRoot) {
            let left = node.left + node.width;
            let totalLeft = left + marginX;
            node.children.forEach((cur) => {
              cur.left = totalLeft;
              totalLeft += cur.width + marginX;
            });
          } else {
            let totalTop = node.top + node.height + marginY + (this.getNodeActChildrenLength(node) > 0 ? node.expandBtnSize : 0);
            node.children.forEach((cur) => {
              cur.left = node.left + node.width * 0.5;
              cur.top = totalTop;
              totalTop += cur.height + marginY + (this.getNodeActChildrenLength(cur) > 0 ? cur.expandBtnSize : 0);
            });
          }
        }
      },
      null,
      true
    );
  }
  //  调整节点left、top
  adjustLeftTopValue() {
    walk(
      this.root,
      null,
      (node, parent, isRoot, layerIndex) => {
        if (!node.getData("expand")) {
          return;
        }
        if (node.isRoot) {
          this.updateBrothersLeft(node);
        }
        let len = node.children.length;
        if (parent && !parent.isRoot && len > 0) {
          let marginY = this.getMarginY(layerIndex + 1);
          let totalHeight = node.children.reduce((h, item) => {
            return h + item.height + (this.getNodeActChildrenLength(item) > 0 ? item.expandBtnSize : 0);
          }, 0) + len * marginY;
          this.updateBrothersTop(node, totalHeight);
        }
      },
      (node, parent, isRoot, layerIndex) => {
        if (parent && parent.isRoot && node.dir === CONSTANTS.LAYOUT_GROW_DIR.TOP) {
          node.children.forEach((item) => {
            let totalHeight = this.getNodeAreaHeight(item);
            let _top = item.top;
            item.top = node.top - (item.top - node.top) - totalHeight + node.height;
            this.updateChildren(item.children, "top", item.top - _top);
          });
        }
      },
      true
    );
  }
  //  递归计算节点的宽度
  getNodeAreaHeight(node) {
    let totalHeight = 0;
    let loop = (node2) => {
      totalHeight += node2.height + (this.getNodeActChildrenLength(node2) > 0 ? node2.expandBtnSize : 0) + this.getMarginY(node2.layerIndex);
      if (node2.children.length) {
        node2.children.forEach((item) => {
          loop(item);
        });
      }
    };
    loop(node);
    return totalHeight;
  }
  //  调整兄弟节点的left
  updateBrothersLeft(node) {
    let childrenList = node.children;
    let totalAddWidth = 0;
    childrenList.forEach((item) => {
      item.left += totalAddWidth;
      if (item.children && item.children.length) {
        this.updateChildren(item.children, "left", totalAddWidth);
      }
      let { left, right } = this.getNodeBoundaries(item, "h");
      let areaWidth = right - left;
      let difference2 = areaWidth - item.width;
      if (difference2 > 0) {
        totalAddWidth += difference2;
      }
    });
  }
  //  调整兄弟节点的top
  updateBrothersTop(node, addHeight) {
    if (node.parent && !node.parent.isRoot) {
      let childrenList = node.parent.children;
      let index = getNodeIndexInNodeList(node, childrenList);
      childrenList.forEach((item, _index) => {
        if (item.hasCustomPosition()) {
          return;
        }
        let _offset = 0;
        if (_index > index) {
          _offset = addHeight;
        }
        item.top += _offset;
        if (item.children && item.children.length) {
          this.updateChildren(item.children, "top", _offset);
        }
      });
      this.updateBrothersTop(node.parent, addHeight);
    }
  }
  //  绘制连线，连接该节点到其子节点
  renderLine(node, lines, style) {
    if (node.children.length <= 0) {
      return [];
    }
    let { left, top, width: width2, height: height2, expandBtnSize } = node;
    const { alwaysShowExpandBtn, notShowExpandBtn } = this.mindMap.opt;
    if (!alwaysShowExpandBtn || notShowExpandBtn) {
      expandBtnSize = 0;
    }
    let len = node.children.length;
    if (node.isRoot) {
      let prevBother = node;
      node.children.forEach((item, index) => {
        let x1 = prevBother.left + prevBother.width;
        let x2 = item.left;
        let y2 = node.top + node.height / 2;
        let path = `M ${x1},${y2} L ${x2},${y2}`;
        this.setLineStyle(style, lines[index], path, item);
        prevBother = item;
      });
    } else {
      let maxy = -Infinity;
      let miny = Infinity;
      let x2 = node.left + node.width * 0.3;
      node.children.forEach((item, index) => {
        let y2 = item.top + item.height / 2;
        if (y2 > maxy) {
          maxy = y2;
        }
        if (y2 < miny) {
          miny = y2;
        }
        let path = `M ${x2},${y2} L ${item.left},${y2}`;
        this.setLineStyle(style, lines[index], path, item);
      });
      if (len > 0) {
        let line = this.lineDraw.path();
        expandBtnSize = len > 0 ? expandBtnSize : 0;
        if (node.parent && node.parent.isRoot && node.dir === CONSTANTS.LAYOUT_GROW_DIR.TOP) {
          line.plot(this.transformPath(`M ${x2},${top} L ${x2},${miny}`));
        } else {
          line.plot(
            this.transformPath(
              `M ${x2},${top + height2 + expandBtnSize} L ${x2},${maxy}`
            )
          );
        }
        node.style.line(line);
        node._lines.push(line);
        style && style(line, node);
      }
    }
  }
  //  渲染按钮
  renderExpandBtn(node, btn) {
    let { width: width2, height: height2, expandBtnSize, isRoot } = node;
    if (!isRoot) {
      let { translateX, translateY } = btn.transform();
      if (node.parent && node.parent.isRoot && node.dir === CONSTANTS.LAYOUT_GROW_DIR.TOP) {
        btn.translate(
          width2 * 0.3 - expandBtnSize / 2 - translateX,
          -expandBtnSize / 2 - translateY
        );
      } else {
        btn.translate(
          width2 * 0.3 - expandBtnSize / 2 - translateX,
          height2 + expandBtnSize / 2 - translateY
        );
      }
    }
  }
  //  创建概要节点
  renderGeneralization(list) {
    list.forEach((item) => {
      let {
        top,
        bottom,
        right,
        generalizationLineMargin,
        generalizationNodeMargin
      } = this.getNodeGeneralizationRenderBoundaries(item, "h");
      let x1 = right + generalizationLineMargin;
      let y1 = top;
      let x2 = right + generalizationLineMargin;
      let y2 = bottom;
      let cx2 = x1 + 20;
      let cy2 = y1 + (y2 - y1) / 2;
      let path = `M ${x1},${y1} Q ${cx2},${cy2} ${x2},${y2}`;
      item.generalizationLine.plot(this.transformPath(path));
      item.generalizationNode.left = right + generalizationNodeMargin;
      item.generalizationNode.top = top + (bottom - top - item.generalizationNode.height) / 2;
    });
  }
  // 渲染展开收起按钮的隐藏占位元素
  renderExpandBtnRect(rect, expandBtnSize, width2, height2, node) {
    if (this.layout === CONSTANTS.LAYOUT.TIMELINE) {
      rect.size(width2, expandBtnSize).x(0).y(height2);
    } else {
      let dir = "";
      if (node.dir === CONSTANTS.LAYOUT_GROW_DIR.TOP) {
        dir = node.layerIndex === 1 ? CONSTANTS.LAYOUT_GROW_DIR.TOP : CONSTANTS.LAYOUT_GROW_DIR.BOTTOM;
      } else {
        dir = CONSTANTS.LAYOUT_GROW_DIR.BOTTOM;
      }
      if (dir === CONSTANTS.LAYOUT_GROW_DIR.TOP) {
        rect.size(width2, expandBtnSize).x(0).y(-expandBtnSize);
      } else {
        rect.size(width2, expandBtnSize).x(0).y(height2);
      }
    }
  }
}
class VerticalTimeline extends Base2 {
  //  构造函数
  constructor(opt = {}, layout2) {
    super(opt);
    this.layout = layout2;
  }
  //  布局
  doLayout(callback) {
    let task = [
      () => {
        this.computedBaseValue();
      },
      () => {
        this.computedTopValue();
      },
      () => {
        this.adjustLeftTopValue();
      },
      () => {
        callback(this.root);
      }
    ];
    asyncRun(task);
  }
  //  遍历数据创建节点、计算根节点的位置，计算根节点的子节点的top值
  computedBaseValue() {
    walk(
      this.renderer.renderTree,
      null,
      (cur, parent, isRoot, layerIndex, index, ancestors) => {
        let newNode = this.createNode(
          cur,
          parent,
          isRoot,
          layerIndex,
          index,
          ancestors
        );
        if (isRoot) {
          this.setNodeCenter(newNode);
        } else {
          if (parent._node.dir) {
            newNode.dir = parent._node.dir;
          } else {
            if (this.layout === CONSTANTS.LAYOUT.VERTICAL_TIMELINE2) {
              newNode.dir = CONSTANTS.LAYOUT_GROW_DIR.LEFT;
            } else if (this.layout === CONSTANTS.LAYOUT.VERTICAL_TIMELINE3) {
              newNode.dir = CONSTANTS.LAYOUT_GROW_DIR.RIGHT;
            } else {
              newNode.dir = index % 2 === 0 ? CONSTANTS.LAYOUT_GROW_DIR.RIGHT : CONSTANTS.LAYOUT_GROW_DIR.LEFT;
            }
          }
          if (parent._node.isRoot) {
            newNode.left = parent._node.left + (cur._node.width > parent._node.width ? -(cur._node.width - parent._node.width) / 2 : (parent._node.width - cur._node.width) / 2);
          } else {
            newNode.left = newNode.dir === CONSTANTS.LAYOUT_GROW_DIR.RIGHT ? parent._node.left + parent._node.width + this.getMarginX(layerIndex) : parent._node.left - this.getMarginX(layerIndex) - newNode.width;
          }
        }
        if (!cur.data.expand) {
          return true;
        }
      },
      (cur, parent, isRoot, layerIndex) => {
        if (isRoot) {
          return;
        }
        let len = cur.data.expand === false ? 0 : cur._node.children.length;
        cur._node.childrenAreaHeight = len ? cur._node.children.reduce((h, item) => {
          return h + item.height;
        }, 0) + (len + 1) * this.getMarginY(layerIndex + 1) : 0;
      },
      true,
      0
    );
  }
  //  遍历节点树计算节点的top
  computedTopValue() {
    walk(
      this.root,
      null,
      (node, parent, isRoot, layerIndex, index) => {
        if (node.getData("expand") && node.children && node.children.length) {
          let marginY = this.getMarginY(layerIndex + 1);
          if (isRoot) {
            let top = node.top + node.height;
            let totalTop = top + marginY;
            node.children.forEach((cur) => {
              cur.top = totalTop;
              totalTop += cur.height + marginY;
            });
          } else {
            let marginY2 = this.getMarginY(layerIndex + 1);
            let baseTop = node.top + node.height / 2 + marginY2;
            let totalTop = baseTop - node.childrenAreaHeight / 2;
            node.children.forEach((cur) => {
              cur.top = totalTop;
              totalTop += cur.height + marginY2;
            });
          }
        }
      },
      null,
      true
    );
  }
  //  调整节点left、top
  adjustLeftTopValue() {
    walk(
      this.root,
      null,
      (node, parent, isRoot, layerIndex) => {
        if (!node.getData("expand")) {
          return;
        }
        if (isRoot) return;
        let base = this.getMarginY(layerIndex + 1) * 2 + node.height;
        let difference2 = node.childrenAreaHeight - base;
        if (difference2 > 0) {
          this.updateBrothers(node, difference2 / 2);
        }
      },
      null,
      true
    );
  }
  //  更新兄弟节点的top
  updateBrothers(node, addHeight) {
    if (node.parent) {
      let childrenList = node.parent.children;
      let index = getNodeIndexInNodeList(node, childrenList);
      childrenList.forEach((item, _index) => {
        if (item.hasCustomPosition()) return;
        if (!node.parent.isRoot && item.uid === node.uid) return;
        let _offset = 0;
        if (node.parent.isRoot) {
          if (_index < index) {
            _offset = 0;
          } else if (_index > index) {
            _offset = addHeight * 2;
          } else {
            _offset = addHeight;
          }
        } else {
          if (_index < index) {
            _offset = -addHeight;
          } else if (_index > index) {
            _offset = addHeight;
          }
        }
        item.top += _offset;
        if (item.children && item.children.length) {
          this.updateChildren(item.children, "top", _offset);
        }
      });
      this.updateBrothers(node.parent, addHeight);
    }
  }
  //  调整兄弟节点的top
  updateBrothersTop(node, addHeight) {
    if (node.parent && !node.parent.isRoot) {
      let childrenList = node.parent.children;
      let index = getNodeIndexInNodeList(node, childrenList);
      childrenList.forEach((item, _index) => {
        if (item.hasCustomPosition()) {
          return;
        }
        let _offset = 0;
        if (_index > index) {
          _offset = addHeight;
        }
        item.top += _offset;
        if (item.children && item.children.length) {
          this.updateChildren(item.children, "top", _offset);
        }
      });
      this.updateBrothersTop(node.parent, addHeight);
    }
  }
  //  绘制连线，连接该节点到其子节点
  renderLine(node, lines, style, lineStyle) {
    if (lineStyle === "curve") {
      this.renderLineCurve(node, lines, style);
    } else if (lineStyle === "direct") {
      this.renderLineDirect(node, lines, style);
    } else {
      this.renderLineStraight(node, lines, style);
    }
  }
  // 直线连接
  renderLineStraight(node, lines, style) {
    if (node.children.length <= 0) {
      return [];
    }
    let { expandBtnSize } = node;
    const { alwaysShowExpandBtn, notShowExpandBtn } = this.mindMap.opt;
    if (!alwaysShowExpandBtn || notShowExpandBtn) {
      expandBtnSize = 0;
    }
    if (node.isRoot) {
      let prevBother = node;
      node.children.forEach((item, index) => {
        let y1 = prevBother.top + prevBother.height;
        let y2 = item.top;
        let x2 = node.left + node.width / 2;
        let path = `M ${x2},${y1} L ${x2},${y2}`;
        this.setLineStyle(style, lines[index], path, item);
        prevBother = item;
      });
    } else {
      if (node.dir === CONSTANTS.LAYOUT_GROW_DIR.RIGHT) {
        let nodeRight = node.left + node.width;
        let nodeYCenter = node.top + node.height / 2;
        let marginX = this.getMarginX(node.layerIndex + 1);
        let offset = (marginX - expandBtnSize) * 0.6;
        node.children.forEach((item, index) => {
          let itemLeft = item.left;
          let itemYCenter = item.top + item.height / 2;
          let path = this.createFoldLine([
            [nodeRight, nodeYCenter],
            [nodeRight + offset, nodeYCenter],
            [nodeRight + offset, itemYCenter],
            [itemLeft, itemYCenter]
          ]);
          this.setLineStyle(style, lines[index], path, item);
        });
      } else {
        let nodeLeft = node.left;
        let nodeYCenter = node.top + node.height / 2;
        let marginX = this.getMarginX(node.layerIndex + 1);
        let offset = (marginX - expandBtnSize) * 0.6;
        node.children.forEach((item, index) => {
          let itemRight = item.left + item.width;
          let itemYCenter = item.top + item.height / 2;
          let path = this.createFoldLine([
            [nodeLeft, nodeYCenter],
            [nodeLeft - offset, nodeYCenter],
            [nodeLeft - offset, itemYCenter],
            [itemRight, itemYCenter]
          ]);
          this.setLineStyle(style, lines[index], path, item);
        });
      }
    }
  }
  // 直连
  renderLineDirect(node, lines, style) {
    if (node.children.length <= 0) {
      return [];
    }
    let { left, top, width: width2, height: height2, expandBtnSize } = node;
    const { alwaysShowExpandBtn, notShowExpandBtn } = this.mindMap.opt;
    if (!alwaysShowExpandBtn || notShowExpandBtn) {
      expandBtnSize = 0;
    }
    node.children.forEach((item, index) => {
      if (node.isRoot) {
        let prevBother = node;
        node.children.forEach((item2, index2) => {
          let y1 = prevBother.top + prevBother.height;
          let y2 = item2.top;
          let x2 = node.left + node.width / 2;
          let path = `M ${x2},${y1} L ${x2},${y2}`;
          this.setLineStyle(style, lines[index2], path, item2);
          prevBother = item2;
        });
      } else {
        let x1 = item.dir === CONSTANTS.LAYOUT_GROW_DIR.LEFT ? left - expandBtnSize : left + width2 + expandBtnSize;
        let y1 = top + height2 / 2;
        let x2 = item.dir === CONSTANTS.LAYOUT_GROW_DIR.LEFT ? item.left + item.width : item.left;
        let y2 = item.top + item.height / 2;
        let path = `M ${x1},${y1} L ${x2},${y2}`;
        this.setLineStyle(style, lines[index], path, item);
      }
    });
  }
  //  曲线风格连线
  renderLineCurve(node, lines, style) {
    if (node.children.length <= 0) {
      return [];
    }
    let { left, top, width: width2, height: height2, expandBtnSize } = node;
    const { alwaysShowExpandBtn, notShowExpandBtn } = this.mindMap.opt;
    if (!alwaysShowExpandBtn || notShowExpandBtn) {
      expandBtnSize = 0;
    }
    node.children.forEach((item, index) => {
      if (node.isRoot) {
        let prevBother = node;
        node.children.forEach((item2, index2) => {
          let y1 = prevBother.top + prevBother.height;
          let y2 = item2.top;
          let x2 = node.left + node.width / 2;
          let path = `M ${x2},${y1} L ${x2},${y2}`;
          this.setLineStyle(style, lines[index2], path, item2);
          prevBother = item2;
        });
      } else {
        let x1 = item.dir === CONSTANTS.LAYOUT_GROW_DIR.LEFT ? left - expandBtnSize : left + width2 + expandBtnSize;
        let y1 = top + height2 / 2;
        let x2 = item.dir === CONSTANTS.LAYOUT_GROW_DIR.LEFT ? item.left + item.width : item.left;
        let y2 = item.top + item.height / 2;
        let path = this.cubicBezierPath(x1, y1, x2, y2);
        this.setLineStyle(style, lines[index], path, item);
      }
    });
  }
  //  渲染按钮
  renderExpandBtn(node, btn) {
    let { width: width2, height: height2, expandBtnSize, isRoot } = node;
    if (!isRoot) {
      let { translateX, translateY } = btn.transform();
      if (node.dir === CONSTANTS.LAYOUT_GROW_DIR.RIGHT) {
        btn.translate(width2 - translateX, height2 / 2 - translateY);
      } else {
        btn.translate(-expandBtnSize - translateX, height2 / 2 - translateY);
      }
    }
  }
  //  创建概要节点
  renderGeneralization(list) {
    list.forEach((item) => {
      let isLeft = item.node.dir === CONSTANTS.LAYOUT_GROW_DIR.LEFT;
      let {
        top,
        bottom,
        left,
        right,
        generalizationLineMargin,
        generalizationNodeMargin
      } = this.getNodeGeneralizationRenderBoundaries(item, "h");
      let x2 = isLeft ? left - generalizationLineMargin : right + generalizationLineMargin;
      let x1 = x2;
      let y1 = top;
      let x22 = x2;
      let y2 = bottom;
      let cx2 = x1 + (isLeft ? -20 : 20);
      let cy2 = y1 + (y2 - y1) / 2;
      let path = `M ${x1},${y1} Q ${cx2},${cy2} ${x22},${y2}`;
      item.generalizationLine.plot(this.transformPath(path));
      item.generalizationNode.left = x2 + (isLeft ? -generalizationNodeMargin : generalizationNodeMargin) - (isLeft ? item.generalizationNode.width : 0);
      item.generalizationNode.top = top + (bottom - top - item.generalizationNode.height) / 2;
    });
  }
  // 渲染展开收起按钮的隐藏占位元素
  renderExpandBtnRect(rect, expandBtnSize, width2, height2, node) {
    if (node.dir === CONSTANTS.LAYOUT_GROW_DIR.LEFT) {
      rect.size(expandBtnSize, height2).x(-expandBtnSize).y(0);
    } else {
      rect.size(expandBtnSize, height2).x(width2).y(0);
    }
  }
}
const utils = {
  top: {
    renderExpandBtn({
      node,
      btn,
      expandBtnSize,
      translateX,
      translateY,
      width: width2,
      height: height2
    }) {
      if (node.parent && node.parent.isRoot) {
        btn.translate(
          width2 * 0.3 - expandBtnSize / 2 - translateX,
          -expandBtnSize / 2 - translateY
        );
      } else {
        btn.translate(
          width2 * 0.3 - expandBtnSize / 2 - translateX,
          height2 + expandBtnSize / 2 - translateY
        );
      }
    },
    renderLine({
      node,
      line,
      top,
      x: x2,
      lineLength,
      height: height2,
      expandBtnSize,
      maxy,
      ctx
    }) {
      if (node.parent && node.parent.isRoot) {
        line.plot(
          ctx.transformPath(
            `M ${x2},${top} L ${x2 + lineLength},${top - Math.tan(degToRad(ctx.mindMap.opt.fishboneDeg)) * lineLength}`
          )
        );
      } else {
        line.plot(
          ctx.transformPath(
            `M ${x2},${top + height2 + expandBtnSize} L ${x2},${maxy}`
          )
        );
      }
    },
    computedLeftTopValue({ layerIndex, node, ctx }) {
      if (layerIndex >= 1 && node.children) {
        let marginY = ctx.getMarginY(layerIndex + 1);
        let startLeft = node.left + node.width * ctx.childIndent;
        let totalTop = node.top + node.height + (ctx.getNodeActChildrenLength(node) > 0 ? node.expandBtnSize : 0) + marginY;
        node.children.forEach((item) => {
          item.left = startLeft;
          item.top += totalTop;
          totalTop += item.height + (ctx.getNodeActChildrenLength(item) > 0 ? item.expandBtnSize : 0) + marginY;
        });
      }
    },
    adjustLeftTopValueBefore({ node, parent, ctx, layerIndex }) {
      let len = node.children.length;
      let marginY = ctx.getMarginY(layerIndex + 1);
      if (parent && !parent.isRoot && len > 0) {
        let totalHeight = node.children.reduce((h, item) => {
          return h + item.height + (ctx.getNodeActChildrenLength(item) > 0 ? item.expandBtnSize : 0) + marginY;
        }, 0);
        ctx.updateBrothersTop(node, totalHeight);
      }
    },
    adjustLeftTopValueAfter({ parent, node, ctx }) {
      if (parent && parent.isRoot) {
        let marginY = ctx.getMarginY(node.layerIndex + 1);
        let totalHeight = node.expandBtnSize + marginY;
        node.children.forEach((item) => {
          let nodeTotalHeight = ctx.getNodeAreaHeight(item);
          let _top = item.top;
          let _left = item.left;
          item.top = node.top - (item.top - node.top) - nodeTotalHeight + node.height;
          item.left = node.left + node.width * ctx.indent + (nodeTotalHeight + totalHeight) / Math.tan(degToRad(ctx.mindMap.opt.fishboneDeg));
          totalHeight += nodeTotalHeight;
          ctx.updateChildrenPro(item.children, {
            top: item.top - _top,
            left: item.left - _left
          });
        });
      }
    }
  },
  bottom: {
    renderExpandBtn({
      node,
      btn,
      expandBtnSize,
      translateX,
      translateY,
      width: width2,
      height: height2
    }) {
      if (node.parent && node.parent.isRoot) {
        btn.translate(
          width2 * 0.3 - expandBtnSize / 2 - translateX,
          height2 + expandBtnSize / 2 - translateY
        );
      } else {
        btn.translate(
          width2 * 0.3 - expandBtnSize / 2 - translateX,
          -expandBtnSize / 2 - translateY
        );
      }
    },
    renderLine({ node, line, top, x: x2, lineLength, height: height2, miny, ctx }) {
      if (node.parent && node.parent.isRoot) {
        line.plot(
          ctx.transformPath(
            `M ${x2},${top + height2} L ${x2 + lineLength},${top + height2 + Math.tan(degToRad(ctx.mindMap.opt.fishboneDeg)) * lineLength}`
          )
        );
      } else {
        line.plot(ctx.transformPath(`M ${x2},${top} L ${x2},${miny}`));
      }
    },
    computedLeftTopValue({ layerIndex, node, ctx }) {
      let marginY = ctx.getMarginY(layerIndex + 1);
      if (layerIndex === 1 && node.children) {
        let startLeft = node.left + node.width * ctx.childIndent;
        let totalTop = node.top + node.height + (ctx.getNodeActChildrenLength(node) > 0 ? node.expandBtnSize : 0) + marginY;
        node.children.forEach((item) => {
          item.left = startLeft;
          item.top = totalTop + (ctx.getNodeActChildrenLength(item) > 0 ? item.expandBtnSize : 0);
          totalTop += item.height + (ctx.getNodeActChildrenLength(item) > 0 ? item.expandBtnSize : 0) + marginY;
        });
      }
      if (layerIndex > 1 && node.children) {
        let startLeft = node.left + node.width * ctx.childIndent;
        let totalTop = node.top - (ctx.getNodeActChildrenLength(node) > 0 ? node.expandBtnSize : 0) - marginY;
        node.children.forEach((item) => {
          item.left = startLeft;
          item.top = totalTop - item.height;
          totalTop -= item.height + (ctx.getNodeActChildrenLength(item) > 0 ? item.expandBtnSize : 0) + marginY;
        });
      }
    },
    adjustLeftTopValueBefore({ node, ctx, layerIndex }) {
      let marginY = ctx.getMarginY(layerIndex + 1);
      let len = node.children.length;
      if (layerIndex > 2 && len > 0) {
        let totalHeight = node.children.reduce((h, item) => {
          return h + item.height + (ctx.getNodeActChildrenLength(item) > 0 ? item.expandBtnSize : 0) + marginY;
        }, 0);
        ctx.updateBrothersTop(node, -totalHeight);
      }
    },
    adjustLeftTopValueAfter({ parent, node, ctx }) {
      if (parent && parent.isRoot) {
        let marginY = ctx.getMarginY(node.layerIndex + 1);
        let totalHeight = 0;
        let totalHeight2 = node.expandBtnSize;
        node.children.forEach((item) => {
          let hasChildren = ctx.getNodeActChildrenLength(item) > 0;
          let nodeTotalHeight = ctx.getNodeAreaHeight(item);
          let offset = hasChildren ? nodeTotalHeight - item.height - (hasChildren ? item.expandBtnSize : 0) : 0;
          offset -= hasChildren ? marginY : 0;
          let _top = totalHeight + offset;
          let _left = item.left;
          item.top += _top;
          item.left = node.left + node.width * ctx.indent + (nodeTotalHeight + totalHeight2) / Math.tan(degToRad(ctx.mindMap.opt.fishboneDeg));
          totalHeight += offset;
          totalHeight2 += nodeTotalHeight;
          ctx.updateChildrenPro(item.children, {
            top: _top,
            left: item.left - _left
          });
        });
      }
    }
  }
};
class Fishbone extends Base2 {
  //  构造函数
  constructor(opt = {}, layout2) {
    super(opt);
    this.layout = layout2;
    this.indent = 0.3;
    this.childIndent = 0.5;
    this.fishTail = null;
    this.maxx = 0;
    this.headRatio = 1;
    this.tailRatio = 0.6;
    this.paddingXRatio = 0.3;
    this.fishHeadPathStr = "M4,181 C4,181, 0,177, 4,173 Q 96.09523809523809,0, 288.2857142857143,0 L 288.2857142857143,354 Q 48.047619047619044,354, 8,218.18367346938777 C8,218.18367346938777, 6,214.18367346938777, 8,214.18367346938777 L 41.183673469387756,214.18367346938777 Z";
    this.fishTailPathStr = "M 606.9342905223708 0 Q 713.1342905223709 -177 819.3342905223708 -177 L 766.2342905223709 0 L 819.3342905223708 177 Q 713.1342905223709 177 606.9342905223708 0 z";
    this.bindEvent();
    this.extendShape();
    this.beforeChange = this.beforeChange.bind(this);
  }
  // 重新渲染时，节点连线是否全部删除
  // 鱼尾鱼骨图会多渲染一些连线，按需删除无法删除掉，只能全部删除重新创建
  nodeIsRemoveAllLines(node) {
    return node.isRoot || node.layerIndex === 1;
  }
  // 是否是带鱼头鱼尾的鱼骨图
  isFishbone2() {
    return this.layout === CONSTANTS.LAYOUT.FISHBONE2;
  }
  bindEvent() {
    if (!this.isFishbone2()) return;
    this.onCheckUpdateFishTail = this.onCheckUpdateFishTail.bind(this);
    this.mindMap.on("afterExecCommand", this.onCheckUpdateFishTail);
  }
  unBindEvent() {
    this.mindMap.off("afterExecCommand", this.onCheckUpdateFishTail);
  }
  // 扩展节点形状
  extendShape() {
    if (!this.isFishbone2()) return;
    this.mindMap.addShape({
      name: "fishHead",
      createShape: (node) => {
        const rect = SVG(`<path d="${this.fishHeadPathStr}"></path>`);
        const { width: width2, height: height2 } = node.shapeInstance.getNodeSize();
        rect.size(width2, height2);
        return rect;
      },
      getPadding: ({ width: width2, height: height2, paddingX, paddingY }) => {
        width2 += paddingX * 2;
        height2 += paddingY * 2;
        let shapePaddingX = this.paddingXRatio * width2;
        let shapePaddingY = 0;
        width2 += shapePaddingX * 2;
        const newHeight = width2 / this.headRatio;
        shapePaddingY = (newHeight - height2) / 2;
        return {
          paddingX: shapePaddingX,
          paddingY: shapePaddingY
        };
      }
    });
  }
  //  布局
  doLayout(callback) {
    let task = [
      () => {
        this.computedBaseValue();
        this.addFishTail();
      },
      () => {
        this.computedLeftTopValue();
      },
      () => {
        this.adjustLeftTopValue();
        this.updateFishTailPosition();
      },
      () => {
        callback(this.root);
      }
    ];
    asyncRun(task);
  }
  // 创建鱼尾
  addFishTail() {
    if (!this.isFishbone2()) return;
    const exist = this.mindMap.lineDraw.findOne(".smm-layout-fishbone-tail");
    if (!exist) {
      this.fishTail = SVG(`<path d="${this.fishTailPathStr}"></path>`);
      this.fishTail.addClass("smm-layout-fishbone-tail");
    } else {
      this.fishTail = exist;
    }
    const tailHeight = this.root.height;
    const tailWidth = tailHeight * this.tailRatio;
    this.fishTail.size(tailWidth, tailHeight);
    this.styleFishTail();
    this.mindMap.lineDraw.add(this.fishTail);
  }
  // 如果根节点更新了形状样式，那么鱼尾也要更新
  onCheckUpdateFishTail(name, node, data2) {
    if (name === "SET_NODE_DATA") {
      let hasShapeProp = false;
      Object.keys(data2).forEach((key) => {
        if (shapeStyleProps.includes(key)) {
          hasShapeProp = true;
        }
      });
      if (hasShapeProp) {
        this.styleFishTail();
      }
    }
  }
  styleFishTail() {
    this.root.style.shape(this.fishTail);
  }
  // 删除鱼尾
  removeFishTail() {
    const exist = this.mindMap.lineDraw.findOne(".smm-layout-fishbone-tail");
    if (exist) {
      exist.remove();
    }
  }
  // 更新鱼尾形状位置
  updateFishTailPosition() {
    if (!this.isFishbone2()) return;
    this.fishTail.x(this.maxx).cy(this.root.top + this.root.height / 2);
  }
  //  遍历数据创建节点、计算根节点的位置，计算根节点的子节点的top值
  computedBaseValue() {
    walk(
      this.renderer.renderTree,
      null,
      (node, parent, isRoot, layerIndex, index, ancestors) => {
        if (isRoot && this.isFishbone2()) {
          node.data.shape = "fishHead";
        }
        let newNode = this.createNode(
          node,
          parent,
          isRoot,
          layerIndex,
          index,
          ancestors
        );
        if (isRoot) {
          this.setNodeCenter(newNode);
        } else {
          if (parent._node.dir) {
            newNode.dir = parent._node.dir;
          } else {
            newNode.dir = index % 2 === 0 ? CONSTANTS.LAYOUT_GROW_DIR.TOP : CONSTANTS.LAYOUT_GROW_DIR.BOTTOM;
          }
          if (parent._node.isRoot) {
            let marginY = this.getMarginY(layerIndex);
            const topOffset = this.isFishbone2() ? parent._node.height / 4 : 0;
            if (this.checkIsTop(newNode)) {
              newNode.top = parent._node.top - newNode.height - marginY + topOffset;
            } else {
              newNode.top = parent._node.top + parent._node.height + marginY - topOffset;
            }
          }
        }
        if (!node.data.expand) {
          return true;
        }
      },
      null,
      true,
      0
    );
  }
  //  遍历节点树计算节点的left、top
  computedLeftTopValue() {
    walk(
      this.root,
      null,
      (node, parent, isRoot, layerIndex) => {
        if (node.isRoot) {
          let marginX = this.getMarginX(layerIndex + 1);
          const heightOffsetRatio = this.isFishbone2() ? 2 : 1;
          let topTotalLeft = node.left + node.width + node.height / heightOffsetRatio + marginX;
          let bottomTotalLeft = node.left + node.width + node.height / heightOffsetRatio + marginX;
          node.children.forEach((item) => {
            if (this.checkIsTop(item)) {
              item.left = topTotalLeft;
              topTotalLeft += item.width + marginX;
            } else {
              item.left = bottomTotalLeft + 20;
              bottomTotalLeft += item.width + marginX;
            }
          });
        }
        let params = { layerIndex, node, ctx: this };
        if (this.checkIsTop(node)) {
          utils.top.computedLeftTopValue(params);
        } else {
          utils.bottom.computedLeftTopValue(params);
        }
      },
      null,
      true
    );
  }
  //  调整节点left、top
  adjustLeftTopValue() {
    walk(
      this.root,
      null,
      (node, parent, isRoot, layerIndex) => {
        if (!node.getData("expand")) {
          return;
        }
        let params = { node, parent, layerIndex, ctx: this };
        if (this.checkIsTop(node)) {
          utils.top.adjustLeftTopValueBefore(params);
        } else {
          utils.bottom.adjustLeftTopValueBefore(params);
        }
      },
      (node, parent) => {
        let params = { parent, node, ctx: this };
        if (this.checkIsTop(node)) {
          utils.top.adjustLeftTopValueAfter(params);
        } else {
          utils.bottom.adjustLeftTopValueAfter(params);
        }
        if (node.isRoot) {
          let topTotalLeft = 0;
          let bottomTotalLeft = 0;
          let maxx = -Infinity;
          node.children.forEach((item) => {
            if (this.checkIsTop(item)) {
              item.left += topTotalLeft;
              this.updateChildren(item.children, "left", topTotalLeft);
              let { left, right } = this.getNodeBoundaries(item, "h");
              if (right > maxx) {
                maxx = right;
              }
              topTotalLeft += right - left;
            } else {
              item.left += bottomTotalLeft;
              this.updateChildren(item.children, "left", bottomTotalLeft);
              let { left, right } = this.getNodeBoundaries(item, "h");
              if (right > maxx) {
                maxx = right;
              }
              bottomTotalLeft += right - left;
            }
          });
          this.maxx = maxx;
        }
      },
      true
    );
  }
  //  递归计算节点的宽度
  getNodeAreaHeight(node) {
    let totalHeight = 0;
    let loop = (node2) => {
      let marginY = this.getMarginY(node2.layerIndex);
      totalHeight += node2.height + (this.getNodeActChildrenLength(node2) > 0 ? node2.expandBtnSize : 0) + marginY;
      if (node2.children.length) {
        node2.children.forEach((item) => {
          loop(item);
        });
      }
    };
    loop(node);
    return totalHeight;
  }
  //  调整兄弟节点的left
  updateBrothersLeft(node) {
    let childrenList = node.children;
    let totalAddWidth = 0;
    childrenList.forEach((item) => {
      item.left += totalAddWidth;
      if (item.children && item.children.length) {
        this.updateChildren(item.children, "left", totalAddWidth);
      }
      let { left, right } = this.getNodeBoundaries(item, "h");
      let areaWidth = right - left;
      let difference2 = areaWidth - item.width;
      if (difference2 > 0) {
        totalAddWidth += difference2;
      }
    });
  }
  //  调整兄弟节点的top
  updateBrothersTop(node, addHeight) {
    if (node.parent && !node.parent.isRoot) {
      let childrenList = node.parent.children;
      let index = getNodeIndexInNodeList(node, childrenList);
      childrenList.forEach((item, _index) => {
        if (item.hasCustomPosition()) {
          return;
        }
        let _offset = 0;
        if (_index > index) {
          _offset = addHeight;
        }
        item.top += _offset;
        if (item.children && item.children.length) {
          this.updateChildren(item.children, "top", _offset);
        }
      });
      if (this.checkIsTop(node)) {
        this.updateBrothersTop(node.parent, addHeight);
      } else {
        this.updateBrothersTop(
          node.parent,
          node.layerIndex === 3 ? 0 : addHeight
        );
      }
    }
  }
  // 检查节点是否是上方节点
  checkIsTop(node) {
    return node.dir === CONSTANTS.LAYOUT_GROW_DIR.TOP;
  }
  //  绘制连线，连接该节点到其子节点
  renderLine(node, lines, style) {
    if (node.layerIndex !== 1 && node.children.length <= 0) {
      return [];
    }
    let { top, height: height2, expandBtnSize } = node;
    const { alwaysShowExpandBtn, notShowExpandBtn } = this.mindMap.opt;
    if (!alwaysShowExpandBtn || notShowExpandBtn) {
      expandBtnSize = 0;
    }
    let len = node.children.length;
    if (node.isRoot) {
      let maxx = -Infinity;
      node.children.forEach((item) => {
        if (item.left > maxx) {
          maxx = item.left;
        }
        let marginY = this.getMarginY(item.layerIndex);
        let nodeLineX = item.left;
        let offset2 = node.height / 2 + marginY - (this.isFishbone2() ? node.height / 4 : 0);
        let offsetX = offset2 / Math.tan(degToRad(this.mindMap.opt.fishboneDeg));
        let line2 = this.lineDraw.path();
        if (this.checkIsTop(item)) {
          line2.plot(
            this.transformPath(
              `M ${nodeLineX - offsetX},${item.top + item.height + offset2} L ${item.left},${item.top + item.height}`
            )
          );
        } else {
          line2.plot(
            this.transformPath(
              `M ${nodeLineX - offsetX},${item.top - offset2} L ${nodeLineX},${item.top}`
            )
          );
        }
        node.style.line(line2);
        node._lines.push(line2);
        style && style(line2, node);
      });
      let nodeHalfTop = node.top + node.height / 2;
      let offset = node.height / 2 + this.getMarginY(node.layerIndex + 1);
      let line = this.lineDraw.path();
      const lineEndX = this.isFishbone2() ? this.maxx : maxx - offset / Math.tan(degToRad(this.mindMap.opt.fishboneDeg));
      line.plot(
        this.transformPath(
          `M ${node.left + node.width},${nodeHalfTop} L ${lineEndX},${nodeHalfTop}`
        )
      );
      node.style.line(line);
      node._lines.push(line);
      style && style(line, node);
    } else {
      let maxy = -Infinity;
      let miny = Infinity;
      let maxx = -Infinity;
      let x2 = node.left + node.width * this.indent;
      node.children.forEach((item, index) => {
        if (item.left > maxx) {
          maxx = item.left;
        }
        let y2 = item.top + item.height / 2;
        if (y2 > maxy) {
          maxy = y2;
        }
        if (y2 < miny) {
          miny = y2;
        }
        if (node.layerIndex > 1) {
          let path = `M ${x2},${y2} L ${item.left},${y2}`;
          this.setLineStyle(style, lines[index], path, item);
        }
      });
      if (len >= 0) {
        let line = this.lineDraw.path();
        expandBtnSize = len > 0 ? expandBtnSize : 0;
        let lineLength = maxx - node.left - node.width * this.indent;
        lineLength = Math.max(lineLength, 0);
        let params = {
          node,
          line,
          top,
          x: x2,
          lineLength,
          height: height2,
          expandBtnSize,
          maxy,
          miny,
          ctx: this
        };
        if (this.checkIsTop(node)) {
          utils.top.renderLine(params);
        } else {
          utils.bottom.renderLine(params);
        }
        node.style.line(line);
        node._lines.push(line);
        style && style(line, node);
      }
    }
  }
  //  渲染按钮
  renderExpandBtn(node, btn) {
    let { width: width2, height: height2, expandBtnSize, isRoot } = node;
    if (!isRoot) {
      let { translateX, translateY } = btn.transform();
      let params = {
        node,
        btn,
        expandBtnSize,
        translateX,
        translateY,
        width: width2,
        height: height2
      };
      if (this.checkIsTop(node)) {
        utils.top.renderExpandBtn(params);
      } else {
        utils.bottom.renderExpandBtn(params);
      }
    }
  }
  //  创建概要节点
  renderGeneralization(list) {
    list.forEach((item) => {
      let {
        top,
        bottom,
        right,
        generalizationLineMargin,
        generalizationNodeMargin
      } = this.getNodeGeneralizationRenderBoundaries(item, "h");
      let x1 = right + generalizationLineMargin;
      let y1 = top;
      let x2 = right + generalizationLineMargin;
      let y2 = bottom;
      let cx2 = x1 + 20;
      let cy2 = y1 + (y2 - y1) / 2;
      let path = `M ${x1},${y1} Q ${cx2},${cy2} ${x2},${y2}`;
      item.generalizationLine.plot(this.transformPath(path));
      item.generalizationNode.left = right + generalizationNodeMargin;
      item.generalizationNode.top = top + (bottom - top - item.generalizationNode.height) / 2;
    });
  }
  // 渲染展开收起按钮的隐藏占位元素
  renderExpandBtnRect(rect, expandBtnSize, width2, height2, node) {
    let dir = "";
    if (node.dir === CONSTANTS.LAYOUT_GROW_DIR.TOP) {
      dir = node.layerIndex === 1 ? CONSTANTS.LAYOUT_GROW_DIR.TOP : CONSTANTS.LAYOUT_GROW_DIR.BOTTOM;
    } else {
      dir = node.layerIndex === 1 ? CONSTANTS.LAYOUT_GROW_DIR.BOTTOM : CONSTANTS.LAYOUT_GROW_DIR.TOP;
    }
    if (dir === CONSTANTS.LAYOUT_GROW_DIR.TOP) {
      rect.size(width2, expandBtnSize).x(0).y(-expandBtnSize);
    } else {
      rect.size(width2, expandBtnSize).x(0).y(height2);
    }
  }
  // 切换切换为其他结构时的处理
  beforeChange() {
    if (!this.isFishbone2()) return;
    this.root.nodeData.data.shape = CONSTANTS.SHAPE.RECTANGLE;
    this.removeFishTail();
    this.unBindEvent();
    this.mindMap.removeShape("fishHead");
  }
}
const SMM_NODE_EDIT_WRAP = "smm-node-edit-wrap";
class TextEdit {
  //  构造函数
  constructor(renderer) {
    this.renderer = renderer;
    this.mindMap = renderer.mindMap;
    this.currentNode = null;
    this.textEditNode = null;
    this.showTextEdit = false;
    this.cacheEditingText = "";
    this.hasBodyMousedown = false;
    this.textNodePaddingX = 5;
    this.textNodePaddingY = 3;
    this.isNeedUpdateTextEditNode = false;
    this.mindMap.addEditNodeClass(SMM_NODE_EDIT_WRAP);
    this.bindEvent();
  }
  //  事件
  bindEvent() {
    this.show = this.show.bind(this);
    this.onScale = this.onScale.bind(this);
    this.onKeydown = this.onKeydown.bind(this);
    this.mindMap.on("node_dblclick", (node, e, isInserting) => {
      this.show({ node, e, isInserting });
    });
    this.mindMap.on("draw_click", () => {
      this.hideEditTextBox();
    });
    this.mindMap.on("body_mousedown", () => {
      this.hasBodyMousedown = true;
    });
    this.mindMap.on("body_click", () => {
      if (!this.hasBodyMousedown) return;
      this.hasBodyMousedown = false;
      if (this.mindMap.opt.isEndNodeTextEditOnClickOuter) {
        this.hideEditTextBox();
      }
    });
    this.mindMap.on("svg_mousedown", () => {
      this.hideEditTextBox();
    });
    this.mindMap.on("expand_btn_click", () => {
      this.hideEditTextBox();
    });
    this.mindMap.on("before_node_active", () => {
      this.hideEditTextBox();
    });
    this.mindMap.on("mousewheel", () => {
      if (this.mindMap.opt.mousewheelAction === CONSTANTS.MOUSE_WHEEL_ACTION.MOVE) {
        this.hideEditTextBox();
      }
    });
    this.mindMap.keyCommand.addShortcut("F2", () => {
      if (this.renderer.activeNodeList.length <= 0) {
        return;
      }
      this.show({
        node: this.renderer.activeNodeList[0]
      });
    });
    this.mindMap.on("scale", this.onScale);
    if (this.mindMap.opt.enableAutoEnterTextEditWhenKeydown) {
      window.addEventListener("keydown", this.onKeydown);
    }
    this.mindMap.on("beforeDestroy", () => {
      this.unBindEvent();
    });
    this.mindMap.on("after_update_config", (opt, lastOpt) => {
      if (opt.openRealtimeRenderOnNodeTextEdit !== lastOpt.openRealtimeRenderOnNodeTextEdit) {
        if (this.mindMap.richText) {
          this.mindMap.richText.onOpenRealtimeRenderOnNodeTextEditConfigUpdate(
            opt.openRealtimeRenderOnNodeTextEdit
          );
        } else {
          this.onOpenRealtimeRenderOnNodeTextEditConfigUpdate(
            opt.openRealtimeRenderOnNodeTextEdit
          );
        }
      }
      if (opt.enableAutoEnterTextEditWhenKeydown !== lastOpt.enableAutoEnterTextEditWhenKeydown) {
        window[opt.enableAutoEnterTextEditWhenKeydown ? "addEventListener" : "removeEventListener"]("keydown", this.onKeydown);
      }
    });
    this.mindMap.on("afterExecCommand", () => {
      if (!this.isShowTextEdit()) return;
      this.isNeedUpdateTextEditNode = true;
    });
    this.mindMap.on("node_tree_render_end", () => {
      if (!this.isShowTextEdit()) return;
      if (this.isNeedUpdateTextEditNode) {
        this.isNeedUpdateTextEditNode = false;
        this.updateTextEditNode();
      }
    });
  }
  // 解绑事件
  unBindEvent() {
    window.removeEventListener("keydown", this.onKeydown);
  }
  // 按键事件
  onKeydown(e) {
    if (e.target !== document.body) return;
    const activeNodeList = this.mindMap.renderer.activeNodeList;
    if (activeNodeList.length <= 0 || activeNodeList.length > 1) return;
    const node = activeNodeList[0];
    if (node && this.checkIsAutoEnterTextEditKey(e)) {
      e.preventDefault();
      this.show({
        node,
        e,
        isInserting: false,
        isFromKeyDown: true
      });
    }
  }
  // 判断是否是自动进入文本编模式的按钮
  checkIsAutoEnterTextEditKey(e) {
    const keyCode = e.keyCode;
    return (keyCode === 229 || keyCode >= 65 && keyCode <= 90 || keyCode >= 48 && keyCode <= 57) && !this.mindMap.keyCommand.hasCombinationKey(e);
  }
  //  注册临时快捷键
  registerTmpShortcut() {
    this.mindMap.keyCommand.addShortcut("Enter", () => {
      this.hideEditTextBox();
    });
    this.mindMap.keyCommand.addShortcut("Tab", () => {
      this.hideEditTextBox();
    });
  }
  // 获取当前文本编辑框是否处于显示状态，也就是是否处在文本编辑状态
  isShowTextEdit() {
    if (this.mindMap.richText) {
      return this.mindMap.richText.showTextEdit;
    }
    return this.showTextEdit;
  }
  // 设置文本编辑框是否处于显示状态
  setIsShowTextEdit(val) {
    this.showTextEdit = val;
    if (val) {
      this.mindMap.keyCommand.stopCheckInSvg();
    } else {
      this.mindMap.keyCommand.recoveryCheckInSvg();
    }
  }
  // 显示文本编辑框
  // isInserting：是否是刚创建的节点
  // isFromKeyDown：是否是在按键事件进入的编辑
  async show({
    node,
    isInserting = false,
    isFromKeyDown = false,
    isFromScale = false
  }) {
    if (node.isUseCustomNodeContent()) {
      return;
    }
    const currentEditNode = this.getCurrentEditNode();
    if (currentEditNode) {
      this.hideEditTextBox();
    }
    const { beforeTextEdit, openRealtimeRenderOnNodeTextEdit } = this.mindMap.opt;
    if (typeof beforeTextEdit === "function") {
      let isShow = false;
      try {
        isShow = await beforeTextEdit(node, isInserting);
      } catch (error) {
        isShow = false;
        this.mindMap.opt.errorHandler(ERROR_TYPES.BEFORE_TEXT_EDIT_ERROR, error);
      }
      if (!isShow) return;
    }
    const { offsetLeft, offsetTop } = checkNodeOuter(this.mindMap, node);
    this.mindMap.view.translateXY(offsetLeft, offsetTop);
    const g = node._textData.node;
    if (openRealtimeRenderOnNodeTextEdit) {
      g.show();
    }
    const rect = g.node.getBoundingClientRect();
    if (openRealtimeRenderOnNodeTextEdit) {
      g.hide();
    }
    const params = {
      node,
      rect,
      isInserting,
      isFromKeyDown,
      isFromScale
    };
    if (this.mindMap.richText) {
      this.mindMap.richText.showEditText(params);
      return;
    }
    this.currentNode = node;
    this.showEditTextBox(params);
  }
  // 当openRealtimeRenderOnNodeTextEdit配置更新后需要更新编辑框样式
  onOpenRealtimeRenderOnNodeTextEditConfigUpdate(openRealtimeRenderOnNodeTextEdit) {
    if (!this.textEditNode) return;
    this.textEditNode.style.background = openRealtimeRenderOnNodeTextEdit ? "transparent" : this.currentNode ? this.getBackground(this.currentNode) : "";
    this.textEditNode.style.boxShadow = openRealtimeRenderOnNodeTextEdit ? "none" : "0 0 20px rgba(0,0,0,.5)";
  }
  // 处理画布缩放
  onScale() {
    const node = this.getCurrentEditNode();
    if (!node) return;
    if (this.mindMap.richText) {
      this.mindMap.richText.cacheEditingText = this.mindMap.richText.getEditText();
      this.mindMap.richText.showTextEdit = false;
    } else {
      this.cacheEditingText = this.getEditText();
      this.setIsShowTextEdit(false);
    }
    this.show({
      node,
      isFromScale: true
    });
  }
  //  显示文本编辑框
  showEditTextBox({ node, rect, isInserting, isFromKeyDown, isFromScale }) {
    if (this.showTextEdit) return;
    const {
      nodeTextEditZIndex,
      textAutoWrapWidth,
      selectTextOnEnterEditText,
      openRealtimeRenderOnNodeTextEdit,
      autoEmptyTextWhenKeydownEnterEdit
    } = this.mindMap.opt;
    if (!isFromScale) {
      this.mindMap.emit("before_show_text_edit");
    }
    this.registerTmpShortcut();
    if (!this.textEditNode) {
      this.textEditNode = document.createElement("div");
      this.textEditNode.classList.add(SMM_NODE_EDIT_WRAP);
      this.textEditNode.style.cssText = `
        position: fixed;
        box-sizing: border-box;
        ${openRealtimeRenderOnNodeTextEdit ? "" : `box-shadow: 0 0 20px rgba(0,0,0,.5);`}
        padding: ${this.textNodePaddingY}px ${this.textNodePaddingX}px;
        margin-left: -${this.textNodePaddingX}px;
        margin-top: -${this.textNodePaddingY}px;
        outline: none; 
        word-break: break-all;
        line-break: anywhere;
      `;
      this.textEditNode.setAttribute("contenteditable", true);
      this.textEditNode.addEventListener("keyup", (e) => {
        e.stopPropagation();
      });
      this.textEditNode.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      this.textEditNode.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });
      this.textEditNode.addEventListener("keydown", (e) => {
        if (this.checkIsAutoEnterTextEditKey(e)) {
          e.stopPropagation();
        }
      });
      this.textEditNode.addEventListener("paste", (e) => {
        const text = e.clipboardData.getData("text");
        const { isSmm, data: data2 } = checkSmmFormatData(text);
        if (isSmm && data2[0] && data2[0].data) {
          handleInputPasteText(e, getTextFromHtml(data2[0].data.text));
        } else {
          handleInputPasteText(e);
        }
        this.emitTextChangeEvent();
      });
      this.textEditNode.addEventListener("input", () => {
        this.emitTextChangeEvent();
      });
      const targetNode = this.mindMap.opt.customInnerElsAppendTo || document.body;
      targetNode.appendChild(this.textEditNode);
    }
    const scale = this.mindMap.view.scale;
    const fontSize = node.style.merge("fontSize");
    const textLines = (this.cacheEditingText || node.getData("text")).split(/\n/gim).map((item) => {
      return htmlEscape(item);
    });
    const isMultiLine = node._textData.node.attr("data-ismultiLine") === "true";
    node.style.domText(this.textEditNode, scale);
    if (!openRealtimeRenderOnNodeTextEdit) {
      this.textEditNode.style.background = this.getBackground(node);
    }
    this.textEditNode.style.zIndex = nodeTextEditZIndex;
    if (isFromKeyDown && autoEmptyTextWhenKeydownEnterEdit) {
      this.textEditNode.innerHTML = "";
    } else {
      this.textEditNode.innerHTML = textLines.join("<br>");
    }
    this.textEditNode.style.minWidth = rect.width + this.textNodePaddingX * 2 + "px";
    this.textEditNode.style.minHeight = rect.height + "px";
    this.textEditNode.style.left = Math.floor(rect.left) + "px";
    this.textEditNode.style.top = Math.floor(rect.top) + "px";
    this.textEditNode.style.display = "block";
    this.textEditNode.style.maxWidth = textAutoWrapWidth * scale + "px";
    if (isMultiLine) {
      this.textEditNode.style.lineHeight = noneRichTextNodeLineHeight;
      this.textEditNode.style.transform = `translateY(${(noneRichTextNodeLineHeight - 1) * fontSize / 2 * scale}px)`;
    } else {
      this.textEditNode.style.lineHeight = "normal";
    }
    this.setIsShowTextEdit(true);
    if (isInserting || selectTextOnEnterEditText && !isFromKeyDown) {
      selectAllInput(this.textEditNode);
    } else {
      focusInput(this.textEditNode);
    }
    this.cacheEditingText = "";
  }
  // 派发节点文本编辑事件
  emitTextChangeEvent() {
    this.mindMap.emit("node_text_edit_change", {
      node: this.currentNode,
      text: this.getEditText(),
      richText: false
    });
  }
  // 更新文本编辑框的大小和位置
  updateTextEditNode() {
    if (this.mindMap.richText) {
      this.mindMap.richText.updateTextEditNode();
      return;
    }
    if (!this.showTextEdit || !this.currentNode) {
      return;
    }
    const rect = this.currentNode._textData.node.node.getBoundingClientRect();
    this.textEditNode.style.minWidth = rect.width + this.textNodePaddingX * 2 + "px";
    this.textEditNode.style.minHeight = rect.height + this.textNodePaddingY * 2 + "px";
    this.textEditNode.style.left = Math.floor(rect.left) + "px";
    this.textEditNode.style.top = Math.floor(rect.top) + "px";
  }
  // 获取编辑区域的背景填充
  getBackground(node) {
    const gradientStyle = node.style.merge("gradientStyle");
    if (gradientStyle) {
      const startColor = node.style.merge("startColor");
      const endColor = node.style.merge("endColor");
      return `linear-gradient(to right, ${startColor}, ${endColor})`;
    } else {
      const bgColor = node.style.merge("fillColor");
      const color = node.style.merge("color");
      return bgColor === "transparent" ? isWhite(color) ? getVisibleColorFromTheme(this.mindMap.themeConfig) : "#fff" : bgColor;
    }
  }
  // 删除文本编辑元素
  removeTextEditEl() {
    if (this.mindMap.richText) {
      this.mindMap.richText.removeTextEditEl();
      return;
    }
    if (!this.textEditNode) return;
    const targetNode = this.mindMap.opt.customInnerElsAppendTo || document.body;
    targetNode.removeChild(this.textEditNode);
  }
  // 获取当前正在编辑的内容
  getEditText() {
    return getStrWithBrFromHtml(this.textEditNode.innerHTML);
  }
  //  隐藏文本编辑框
  hideEditTextBox() {
    if (this.mindMap.richText) {
      return this.mindMap.richText.hideEditText();
    }
    if (!this.showTextEdit) {
      return;
    }
    const currentNode = this.currentNode;
    const text = this.getEditText();
    this.currentNode = null;
    this.textEditNode.style.display = "none";
    this.textEditNode.innerHTML = "";
    this.textEditNode.style.fontFamily = "inherit";
    this.textEditNode.style.fontSize = "inherit";
    this.textEditNode.style.fontWeight = "normal";
    this.textEditNode.style.transform = "translateY(0)";
    this.setIsShowTextEdit(false);
    this.mindMap.execCommand("SET_NODE_TEXT", currentNode, text);
    this.mindMap.render();
    this.mindMap.emit(
      "hide_text_edit",
      this.textEditNode,
      this.renderer.activeNodeList,
      currentNode
    );
  }
  // 获取当前正在编辑中的节点实例
  getCurrentEditNode() {
    if (this.mindMap.richText) {
      return this.mindMap.richText.node;
    }
    return this.currentNode;
  }
}
const layouts = {
  // 逻辑结构图
  [CONSTANTS.LAYOUT.LOGICAL_STRUCTURE]: LogicalStructure,
  // 向左逻辑结构图
  [CONSTANTS.LAYOUT.LOGICAL_STRUCTURE_LEFT]: LogicalStructure,
  // 思维导图
  [CONSTANTS.LAYOUT.MIND_MAP]: MindMap$1,
  // 目录组织图
  [CONSTANTS.LAYOUT.CATALOG_ORGANIZATION]: CatalogOrganization,
  // 组织结构图
  [CONSTANTS.LAYOUT.ORGANIZATION_STRUCTURE]: OrganizationStructure,
  // 时间轴
  [CONSTANTS.LAYOUT.TIMELINE]: Timeline2,
  // 时间轴2
  [CONSTANTS.LAYOUT.TIMELINE2]: Timeline2,
  // 竖向时间轴
  [CONSTANTS.LAYOUT.VERTICAL_TIMELINE]: VerticalTimeline,
  // 竖向时间轴2
  [CONSTANTS.LAYOUT.VERTICAL_TIMELINE2]: VerticalTimeline,
  // 竖向时间轴3
  [CONSTANTS.LAYOUT.VERTICAL_TIMELINE3]: VerticalTimeline,
  // 鱼骨图
  [CONSTANTS.LAYOUT.FISHBONE]: Fishbone,
  // 鱼骨图2
  [CONSTANTS.LAYOUT.FISHBONE2]: Fishbone
};
class Render {
  //  构造函数
  constructor(opt = {}) {
    this.opt = opt;
    this.mindMap = opt.mindMap;
    this.themeConfig = this.mindMap.themeConfig;
    this.renderTree = this.mindMap.opt.data ? deepmerge_1({}, this.mindMap.opt.data) : null;
    this.reRender = false;
    this.isRendering = false;
    this.hasWaitRendering = false;
    this.nodeCache = {};
    this.lastNodeCache = {};
    this.renderSourceList = [];
    this.renderCallbackList = [];
    this.activeNodeList = [];
    this.emitNodeActiveEventTimer = null;
    this.renderTimer = null;
    this.root = null;
    this.textEdit = new TextEdit(this);
    this.beingCopyData = null;
    this.highlightBoxNode = null;
    this.highlightBoxNodeStyle = null;
    this.lastActiveNodeList = [];
    this.setLayout();
    this.bindEvent();
    this.registerCommands();
    this.registerShortcutKeys();
  }
  //  设置布局结构
  setLayout() {
    if (this.layout && this.layout.beforeChange) {
      this.layout.beforeChange();
    }
    const { layout: layout2 } = this.mindMap.opt;
    let L = layouts[layout2] || this.mindMap[layout2];
    if (!L) {
      L = layouts[CONSTANTS.LAYOUT.LOGICAL_STRUCTURE];
      this.mindMap.opt.layout = CONSTANTS.LAYOUT.LOGICAL_STRUCTURE;
    }
    this.layout = new L(this, layout2);
  }
  // 重新设置思维导图数据
  setData(data2) {
    this.renderTree = data2 || null;
  }
  //   绑定事件
  bindEvent() {
    const {
      openPerformance,
      performanceConfig,
      openRealtimeRenderOnNodeTextEdit
    } = this.mindMap.opt;
    this.mindMap.on("draw_click", (e) => {
      this.clearActiveNodeListOnDrawClick(e, "click");
    });
    this.mindMap.on("contextmenu", (e) => {
      this.clearActiveNodeListOnDrawClick(e, "contextmenu");
    });
    this.mindMap.svg.on("dblclick", () => {
      if (!this.mindMap.opt.enableDblclickBackToRootNode) return;
      this.setRootNodeCenter();
    });
    const onViewDataChange = throttle(() => {
      if (!this.renderTree) {
        return;
      }
      if (this.root) {
        this.mindMap.emit("node_tree_render_start");
        this.root.render(
          () => {
            this.mindMap.emit("node_tree_render_end");
          },
          false,
          true
        );
      }
    }, performanceConfig.time);
    if (openPerformance) {
      this.mindMap.on("view_data_change", onViewDataChange);
    }
    this.onNodeTextEditChange = debounce(this.onNodeTextEditChange, 100, this);
    if (openRealtimeRenderOnNodeTextEdit) {
      this.mindMap.on("node_text_edit_change", this.onNodeTextEditChange);
    }
    this.mindMap.on("after_update_config", (opt, lastOpt) => {
      if (opt.openPerformance !== lastOpt.openPerformance) {
        this.mindMap[opt.openPerformance ? "on" : "off"](
          "view_data_change",
          onViewDataChange
        );
        this.forceLoadNode();
      }
      if (opt.openRealtimeRenderOnNodeTextEdit !== lastOpt.openRealtimeRenderOnNodeTextEdit) {
        this.mindMap[opt.openRealtimeRenderOnNodeTextEdit ? "on" : "off"](
          "node_text_edit_change",
          this.onNodeTextEditChange
        );
      }
    });
  }
  // 监听文本编辑事件，实时更新节点大小
  onNodeTextEditChange({ node, text }) {
    node._textData = node.createTextNode(text);
    const { width: width2, height: height2 } = node.getNodeRect();
    node.width = width2;
    node.height = height2;
    node.layout();
    this.mindMap.render(() => {
      this.textEdit.updateTextEditNode();
    });
  }
  // 强制渲染节点，不考虑是否在画布可视区域内
  forceLoadNode(node) {
    node = node || this.root;
    if (node) {
      this.mindMap.emit("node_tree_render_start");
      node.render(() => {
        this.mindMap.emit("node_tree_render_end");
      }, true);
    }
  }
  //  注册命令
  registerCommands() {
    this.selectAll = this.selectAll.bind(this);
    this.mindMap.command.add("SELECT_ALL", this.selectAll);
    this.back = this.back.bind(this);
    this.mindMap.command.add("BACK", this.back);
    this.forward = this.forward.bind(this);
    this.mindMap.command.add("FORWARD", this.forward);
    this.insertNode = this.insertNode.bind(this);
    this.mindMap.command.add("INSERT_NODE", this.insertNode);
    this.insertMultiNode = this.insertMultiNode.bind(this);
    this.mindMap.command.add("INSERT_MULTI_NODE", this.insertMultiNode);
    this.insertChildNode = this.insertChildNode.bind(this);
    this.mindMap.command.add("INSERT_CHILD_NODE", this.insertChildNode);
    this.insertMultiChildNode = this.insertMultiChildNode.bind(this);
    this.mindMap.command.add(
      "INSERT_MULTI_CHILD_NODE",
      this.insertMultiChildNode
    );
    this.insertParentNode = this.insertParentNode.bind(this);
    this.mindMap.command.add("INSERT_PARENT_NODE", this.insertParentNode);
    this.upNode = this.upNode.bind(this);
    this.mindMap.command.add("UP_NODE", this.upNode);
    this.downNode = this.downNode.bind(this);
    this.mindMap.command.add("DOWN_NODE", this.downNode);
    this.moveUpOneLevel = this.moveUpOneLevel.bind(this);
    this.mindMap.command.add("MOVE_UP_ONE_LEVEL", this.moveUpOneLevel);
    this.insertAfter = this.insertAfter.bind(this);
    this.mindMap.command.add("INSERT_AFTER", this.insertAfter);
    this.insertBefore = this.insertBefore.bind(this);
    this.mindMap.command.add("INSERT_BEFORE", this.insertBefore);
    this.moveNodeTo = this.moveNodeTo.bind(this);
    this.mindMap.command.add("MOVE_NODE_TO", this.moveNodeTo);
    this.removeNode = this.removeNode.bind(this);
    this.mindMap.command.add("REMOVE_NODE", this.removeNode);
    this.removeCurrentNode = this.removeCurrentNode.bind(this);
    this.mindMap.command.add("REMOVE_CURRENT_NODE", this.removeCurrentNode);
    this.pasteNode = this.pasteNode.bind(this);
    this.mindMap.command.add("PASTE_NODE", this.pasteNode);
    this.cutNode = this.cutNode.bind(this);
    this.mindMap.command.add("CUT_NODE", this.cutNode);
    this.setNodeStyle = this.setNodeStyle.bind(this);
    this.mindMap.command.add("SET_NODE_STYLE", this.setNodeStyle);
    this.setNodeStyles = this.setNodeStyles.bind(this);
    this.mindMap.command.add("SET_NODE_STYLES", this.setNodeStyles);
    this.setNodeActive = this.setNodeActive.bind(this);
    this.mindMap.command.add("SET_NODE_ACTIVE", this.setNodeActive);
    this.clearActiveNode = this.clearActiveNode.bind(this);
    this.mindMap.command.add("CLEAR_ACTIVE_NODE", this.clearActiveNode);
    this.setNodeExpand = this.setNodeExpand.bind(this);
    this.mindMap.command.add("SET_NODE_EXPAND", this.setNodeExpand);
    this.expandAllNode = this.expandAllNode.bind(this);
    this.mindMap.command.add("EXPAND_ALL", this.expandAllNode);
    this.unexpandAllNode = this.unexpandAllNode.bind(this);
    this.mindMap.command.add("UNEXPAND_ALL", this.unexpandAllNode);
    this.expandToLevel = this.expandToLevel.bind(this);
    this.mindMap.command.add("UNEXPAND_TO_LEVEL", this.expandToLevel);
    this.setNodeData = this.setNodeData.bind(this);
    this.mindMap.command.add("SET_NODE_DATA", this.setNodeData);
    this.setNodeText = this.setNodeText.bind(this);
    this.mindMap.command.add("SET_NODE_TEXT", this.setNodeText);
    this.setNodeImage = this.setNodeImage.bind(this);
    this.mindMap.command.add("SET_NODE_IMAGE", this.setNodeImage);
    this.setNodeIcon = this.setNodeIcon.bind(this);
    this.mindMap.command.add("SET_NODE_ICON", this.setNodeIcon);
    this.setNodeHyperlink = this.setNodeHyperlink.bind(this);
    this.mindMap.command.add("SET_NODE_HYPERLINK", this.setNodeHyperlink);
    this.setNodeNote = this.setNodeNote.bind(this);
    this.mindMap.command.add("SET_NODE_NOTE", this.setNodeNote);
    this.setNodeAttachment = this.setNodeAttachment.bind(this);
    this.mindMap.command.add("SET_NODE_ATTACHMENT", this.setNodeAttachment);
    this.setNodeTag = this.setNodeTag.bind(this);
    this.mindMap.command.add("SET_NODE_TAG", this.setNodeTag);
    this.insertFormula = this.insertFormula.bind(this);
    this.mindMap.command.add("INSERT_FORMULA", this.insertFormula);
    this.addGeneralization = this.addGeneralization.bind(this);
    this.mindMap.command.add("ADD_GENERALIZATION", this.addGeneralization);
    this.removeGeneralization = this.removeGeneralization.bind(this);
    this.mindMap.command.add("REMOVE_GENERALIZATION", this.removeGeneralization);
    this.setNodeCustomPosition = this.setNodeCustomPosition.bind(this);
    this.mindMap.command.add(
      "SET_NODE_CUSTOM_POSITION",
      this.setNodeCustomPosition
    );
    this.resetLayout = this.resetLayout.bind(this);
    this.mindMap.command.add("RESET_LAYOUT", this.resetLayout);
    this.setNodeShape = this.setNodeShape.bind(this);
    this.mindMap.command.add("SET_NODE_SHAPE", this.setNodeShape);
    this.goTargetNode = this.goTargetNode.bind(this);
    this.mindMap.command.add("GO_TARGET_NODE", this.goTargetNode);
    this.removeCustomStyles = this.removeCustomStyles.bind(this);
    this.mindMap.command.add("REMOVE_CUSTOM_STYLES", this.removeCustomStyles);
    this.removeAllNodeCustomStyles = this.removeAllNodeCustomStyles.bind(this);
    this.mindMap.command.add(
      "REMOVE_ALL_NODE_CUSTOM_STYLES",
      this.removeAllNodeCustomStyles
    );
  }
  //  注册快捷键
  registerShortcutKeys() {
    this.mindMap.keyCommand.addShortcut("Tab", () => {
      this.mindMap.execCommand("INSERT_CHILD_NODE");
    });
    this.mindMap.keyCommand.addShortcut("Insert", () => {
      this.mindMap.execCommand("INSERT_CHILD_NODE");
    });
    this.mindMap.keyCommand.addShortcut("Enter", () => {
      this.mindMap.execCommand("INSERT_NODE");
    });
    this.mindMap.keyCommand.addShortcut("Shift+Tab", () => {
      this.mindMap.execCommand("INSERT_PARENT_NODE");
    });
    this.mindMap.keyCommand.addShortcut("Control+g", () => {
      this.mindMap.execCommand("ADD_GENERALIZATION");
    });
    this.toggleActiveExpand = this.toggleActiveExpand.bind(this);
    this.mindMap.keyCommand.addShortcut("/", this.toggleActiveExpand);
    this.mindMap.keyCommand.addShortcut("Del|Backspace", () => {
      this.mindMap.execCommand("REMOVE_NODE");
    });
    this.mindMap.keyCommand.addShortcut("Shift+Backspace", () => {
      this.mindMap.execCommand("REMOVE_CURRENT_NODE");
    });
    this.mindMap.on("before_show_text_edit", () => {
      this.startTextEdit();
    });
    this.mindMap.on("hide_text_edit", () => {
      this.endTextEdit();
    });
    this.mindMap.keyCommand.addShortcut("Control+a", () => {
      this.mindMap.execCommand("SELECT_ALL");
    });
    this.mindMap.keyCommand.addShortcut("Control+l", () => {
      this.mindMap.execCommand("RESET_LAYOUT");
    });
    this.mindMap.keyCommand.addShortcut("Control+Up", () => {
      this.mindMap.execCommand("UP_NODE");
    });
    this.mindMap.keyCommand.addShortcut("Control+Down", () => {
      this.mindMap.execCommand("DOWN_NODE");
    });
    this.mindMap.keyCommand.addShortcut("Control+c", () => {
      this.copy();
    });
    this.mindMap.keyCommand.addShortcut("Control+x", () => {
      this.cut();
    });
    this.mindMap.keyCommand.addShortcut("Control+v", () => {
      this.paste();
    });
    this.mindMap.keyCommand.addShortcut("Control+Enter", () => {
      this.setRootNodeCenter();
    });
  }
  // 派发节点激活事件
  emitNodeActiveEvent(node = null, activeNodeList = [...this.activeNodeList]) {
    const isChange = !checkNodeListIsEqual(
      this.lastActiveNodeList,
      activeNodeList
    );
    if (!isChange) return;
    this.lastActiveNodeList = [...activeNodeList];
    clearTimeout(this.emitNodeActiveEventTimer);
    this.emitNodeActiveEventTimer = setTimeout(() => {
      this.mindMap.emit("node_active", node, activeNodeList);
    }, 0);
  }
  // 鼠标点击画布时清空当前激活节点列表
  clearActiveNodeListOnDrawClick(e, eventType) {
    if (this.activeNodeList.length <= 0) return;
    let isTrueClick = true;
    const { useLeftKeySelectionRightKeyDrag } = this.mindMap.opt;
    if (eventType === "contextmenu" ? !useLeftKeySelectionRightKeyDrag : useLeftKeySelectionRightKeyDrag) {
      const mousedownPos = this.mindMap.event.mousedownPos;
      isTrueClick = Math.abs(e.clientX - mousedownPos.x) <= 5 && Math.abs(e.clientY - mousedownPos.y) <= 5;
    }
    if (isTrueClick) {
      this.mindMap.execCommand("CLEAR_ACTIVE_NODE");
    }
  }
  //  开启文字编辑，会禁用回车键和删除键相关快捷键防止冲突
  startTextEdit() {
    this.mindMap.keyCommand.save();
  }
  //  结束文字编辑，会恢复回车键和删除键相关快捷键
  endTextEdit() {
    this.mindMap.keyCommand.restore();
  }
  // 清空节点缓存池
  clearCache() {
    this.layout.lru.clear();
    this.nodeCache = {};
    this.lastNodeCache = {};
  }
  // 保存触发渲染的参数
  addRenderParams(callback, source) {
    if (callback) {
      const index = this.renderCallbackList.findIndex((fn) => {
        return fn === callback;
      });
      if (index === -1) {
        this.renderCallbackList.push(callback);
      }
    }
    if (source) {
      const index = this.renderSourceList.findIndex((s) => {
        return s === source;
      });
      if (index === -1) {
        this.renderSourceList.push(source);
      }
    }
  }
  // 判断是否包含某种触发渲染源
  checkHasRenderSource(val) {
    val = Array.isArray(val) ? val : [val];
    for (let i = 0; i < this.renderSourceList.length; i++) {
      if (val.includes(this.renderSourceList[i])) {
        return true;
      }
    }
    return false;
  }
  // 渲染完毕的操作
  onRenderEnd() {
    this.renderCallbackList.forEach((fn) => {
      fn();
    });
    this.isRendering = false;
    this.reRender = false;
    this.renderCallbackList = [];
    this.renderSourceList = [];
    this.mindMap.emit("node_tree_render_end");
  }
  // 渲染
  render(callback, source) {
    this.addRenderParams(callback, source);
    clearTimeout(this.renderTimer);
    this.renderTimer = setTimeout(() => {
      this._render();
    }, 0);
  }
  // 真正的渲染
  _render() {
    if (this.checkHasRenderSource(CONSTANTS.CHANGE_THEME)) {
      this.resetUnExpandNodeStyle();
    }
    if (this.isRendering) {
      this.hasWaitRendering = true;
      return;
    }
    this.isRendering = true;
    this.lastNodeCache = this.nodeCache;
    this.nodeCache = {};
    if (this.reRender) {
      this.clearActiveNodeList();
    }
    if (!this.renderTree) {
      this.onRenderEnd();
      return;
    }
    this.mindMap.emit("node_tree_render_start");
    this.root = null;
    this.layout.doLayout((root2) => {
      Object.keys(this.lastNodeCache).forEach((uid) => {
        if (!this.nodeCache[uid]) {
          this.removeNodeFromActiveList(this.lastNodeCache[uid]);
          this.emitNodeActiveEvent();
          this.lastNodeCache[uid].destroy();
        }
      });
      this.root = root2;
      this.root.render(() => {
        this.isRendering = false;
        if (this.hasWaitRendering) {
          this.hasWaitRendering = false;
          this.render();
          return;
        }
        this.onRenderEnd();
      });
    });
    this.emitNodeActiveEvent();
  }
  // 当某个自定义节点内容改变后，可以调用该方法实时更新该节点大小和整体节点的定位
  renderByCustomNodeContentNode(node) {
    node.getSize();
    node.customNodeContentRealtimeLayout();
    this.mindMap.render();
  }
  // 给当前被收起来的节点数据添加更新标志
  resetUnExpandNodeStyle() {
    if (!this.renderTree) return;
    walk(this.renderTree, null, (node) => {
      if (!node.data.expand) {
        walk(node, null, (node2) => {
          node2.data["needUpdate"] = true;
        });
        return true;
      }
    });
  }
  //  清除当前所有激活节点，并会触发事件
  clearActiveNode() {
    if (this.activeNodeList.length <= 0) {
      return;
    }
    this.clearActiveNodeList();
    this.emitNodeActiveEvent(null, []);
  }
  //  清除当前激活的节点列表
  clearActiveNodeList() {
    this.activeNodeList.forEach((item) => {
      this.mindMap.execCommand("SET_NODE_ACTIVE", item, false);
    });
    this.activeNodeList = [];
  }
  // 添加节点到激活列表里
  addNodeToActiveList(node, notEmitBeforeNodeActiveEvent = false) {
    if (this.mindMap.opt.onlyOneEnableActiveNodeOnCooperate && node.userList.length > 0)
      return;
    const index = this.findActiveNodeIndex(node);
    if (index === -1) {
      if (!notEmitBeforeNodeActiveEvent) {
        this.mindMap.emit("before_node_active", node, this.activeNodeList);
      }
      this.mindMap.execCommand("SET_NODE_ACTIVE", node, true);
      this.activeNodeList.push(node);
    }
  }
  // 在激活列表里移除某个节点
  removeNodeFromActiveList(node) {
    let index = this.findActiveNodeIndex(node);
    if (index === -1) {
      return;
    }
    this.mindMap.execCommand("SET_NODE_ACTIVE", node, false);
    this.activeNodeList.splice(index, 1);
  }
  // 手动激活多个节点，激活单个节点请直接调用节点实例的active()方法
  activeMultiNode(nodeList = []) {
    nodeList.forEach((node) => {
      this.mindMap.emit("before_node_active", node, this.activeNodeList);
      this.addNodeToActiveList(node, true);
      this.emitNodeActiveEvent(node);
    });
  }
  // 手动取消激活多个节点
  cancelActiveMultiNode(nodeList = []) {
    nodeList.forEach((node) => {
      this.removeNodeFromActiveList(node);
      this.emitNodeActiveEvent(null);
    });
  }
  //  检索某个节点在激活列表里的索引
  findActiveNodeIndex(node) {
    return getNodeIndexInNodeList(node, this.activeNodeList);
  }
  //  全选
  selectAll() {
    if (this.mindMap.opt.readonly) return;
    walk(
      this.root,
      null,
      (node) => {
        if (!node.getData("isActive")) {
          this.addNodeToActiveList(node);
        }
        if (node._generalizationList && node._generalizationList.length > 0) {
          node._generalizationList.forEach((item) => {
            const gNode = item.generalizationNode;
            if (!gNode.getData("isActive")) {
              this.addNodeToActiveList(gNode);
            }
          });
        }
      },
      null,
      true,
      0,
      0
    );
    this.emitNodeActiveEvent();
  }
  //  回退
  back(step) {
    this.backForward("back", step);
  }
  //  前进
  forward(step) {
    this.backForward("forward", step);
  }
  // 前进回退
  backForward(type, step) {
    this.mindMap.execCommand("CLEAR_ACTIVE_NODE");
    const data2 = this.mindMap.command[type](step);
    if (data2) {
      this.renderTree = data2;
      this.mindMap.render();
    }
    this.mindMap.emit("data_change", data2);
  }
  // 获取创建新节点的行为
  getNewNodeBehavior(openEdit = false, handleMultiNodes = false) {
    const { createNewNodeBehavior } = this.mindMap.opt;
    let focusNewNode = false;
    let inserting = false;
    switch (createNewNodeBehavior) {
      // 默认会激活新创建的节点，并且进入编辑模式。如果同时创建了多个新节点，那么只会激活而不会进入编辑模式
      case CONSTANTS.CREATE_NEW_NODE_BEHAVIOR.DEFAULT:
        focusNewNode = handleMultiNodes || !openEdit;
        inserting = handleMultiNodes ? false : openEdit;
        break;
      // 不激活新创建的节点
      case CONSTANTS.CREATE_NEW_NODE_BEHAVIOR.NOT_ACTIVE:
        focusNewNode = false;
        inserting = false;
        break;
      // 只激活新创建的节点，不进入编辑模式
      case CONSTANTS.CREATE_NEW_NODE_BEHAVIOR.ACTIVE_ONLY:
        focusNewNode = true;
        inserting = false;
        break;
    }
    return {
      focusNewNode,
      inserting
    };
  }
  //  插入同级节点
  insertNode(openEdit = true, appointNodes = [], appointData = null, appointChildren = []) {
    appointNodes = formatDataToArray(appointNodes);
    if (this.activeNodeList.length <= 0 && appointNodes.length <= 0) {
      return;
    }
    this.textEdit.hideEditTextBox();
    const {
      defaultInsertSecondLevelNodeText,
      defaultInsertBelowSecondLevelNodeText
    } = this.mindMap.opt;
    const list = appointNodes.length > 0 ? appointNodes : this.activeNodeList;
    const handleMultiNodes = list.length > 1;
    const isRichText = this.hasRichTextPlugin();
    const { focusNewNode, inserting } = this.getNewNodeBehavior(
      openEdit,
      handleMultiNodes
    );
    const params = {
      expand: true,
      richText: isRichText,
      isActive: focusNewNode
      // 如果同时对多个节点插入子节点，那么需要把新增的节点设为激活状态。如果不进入编辑状态，那么也需要手动设为激活状态
    };
    if (isRichText) params.resetRichText = true;
    appointChildren = addDataToAppointNodes(appointChildren, params);
    const alreadyIsRichText = appointData && appointData.richText;
    let createNewId = false;
    list.forEach((node) => {
      if (node.isGeneralization || node.isRoot) {
        return;
      }
      appointChildren = simpleDeepClone(appointChildren);
      const parent = node.parent;
      const isOneLayer = node.layerIndex === 1;
      const text = isOneLayer ? defaultInsertSecondLevelNodeText : defaultInsertBelowSecondLevelNodeText;
      const index = getNodeDataIndex(node);
      if (alreadyIsRichText && params.resetRichText) {
        delete params.resetRichText;
      }
      const newNodeData = {
        inserting,
        data: {
          text,
          ...params,
          uid: createUid(),
          ...appointData || {}
        },
        children: [...createUidForAppointNodes(appointChildren, createNewId)]
      };
      createNewId = true;
      parent.nodeData.children.splice(index + 1, 0, newNodeData);
    });
    if (focusNewNode) {
      this.clearActiveNodeList();
    }
    this.mindMap.render();
  }
  // 插入多个同级节点
  insertMultiNode(appointNodes, nodeList) {
    if (!nodeList || nodeList.length <= 0) return;
    appointNodes = formatDataToArray(appointNodes);
    if (this.activeNodeList.length <= 0 && appointNodes.length <= 0) {
      return;
    }
    this.textEdit.hideEditTextBox();
    const list = appointNodes.length > 0 ? appointNodes : this.activeNodeList;
    const isRichText = this.hasRichTextPlugin();
    const { focusNewNode } = this.getNewNodeBehavior(false, true);
    const params = {
      expand: true,
      richText: isRichText,
      isActive: focusNewNode
    };
    if (isRichText) params.resetRichText = true;
    nodeList = addDataToAppointNodes(nodeList, params);
    let createNewId = false;
    list.forEach((node) => {
      if (node.isGeneralization || node.isRoot) {
        return;
      }
      nodeList = simpleDeepClone(nodeList);
      const parent = node.parent;
      const index = getNodeDataIndex(node);
      const newNodeList = createUidForAppointNodes(nodeList, createNewId);
      createNewId = true;
      parent.nodeData.children.splice(index + 1, 0, ...newNodeList);
    });
    if (focusNewNode) {
      this.clearActiveNodeList();
    }
    this.mindMap.render();
  }
  //  插入子节点
  insertChildNode(openEdit = true, appointNodes = [], appointData = null, appointChildren = []) {
    appointNodes = formatDataToArray(appointNodes);
    if (this.activeNodeList.length <= 0 && appointNodes.length <= 0) {
      return;
    }
    this.textEdit.hideEditTextBox();
    const {
      defaultInsertSecondLevelNodeText,
      defaultInsertBelowSecondLevelNodeText
    } = this.mindMap.opt;
    const list = appointNodes.length > 0 ? appointNodes : this.activeNodeList;
    const handleMultiNodes = list.length > 1;
    const isRichText = this.hasRichTextPlugin();
    const { focusNewNode, inserting } = this.getNewNodeBehavior(
      openEdit,
      handleMultiNodes
    );
    const params = {
      expand: true,
      richText: isRichText,
      isActive: focusNewNode
    };
    if (isRichText) params.resetRichText = true;
    appointChildren = addDataToAppointNodes(appointChildren, params);
    const alreadyIsRichText = appointData && appointData.richText;
    let createNewId = false;
    list.forEach((node) => {
      if (node.isGeneralization) {
        return;
      }
      appointChildren = simpleDeepClone(appointChildren);
      if (!node.nodeData.children) {
        node.nodeData.children = [];
      }
      const text = node.isRoot ? defaultInsertSecondLevelNodeText : defaultInsertBelowSecondLevelNodeText;
      if (alreadyIsRichText && params.resetRichText) {
        delete params.resetRichText;
      }
      const newNode = {
        inserting,
        data: {
          text,
          uid: createUid(),
          ...params,
          ...appointData || {}
        },
        children: [...createUidForAppointNodes(appointChildren, createNewId)]
      };
      createNewId = true;
      node.nodeData.children.push(newNode);
      node.setData({
        expand: true
      });
    });
    if (focusNewNode) {
      this.clearActiveNodeList();
    }
    this.mindMap.render();
  }
  // 插入多个子节点
  insertMultiChildNode(appointNodes, childList) {
    if (!childList || childList.length <= 0) return;
    appointNodes = formatDataToArray(appointNodes);
    if (this.activeNodeList.length <= 0 && appointNodes.length <= 0) {
      return;
    }
    this.textEdit.hideEditTextBox();
    const list = appointNodes.length > 0 ? appointNodes : this.activeNodeList;
    const isRichText = this.hasRichTextPlugin();
    const { focusNewNode } = this.getNewNodeBehavior(false, true);
    const params = {
      expand: true,
      richText: isRichText,
      isActive: focusNewNode
    };
    if (isRichText) params.resetRichText = true;
    childList = addDataToAppointNodes(childList, params);
    let createNewId = false;
    list.forEach((node) => {
      if (node.isGeneralization) {
        return;
      }
      childList = simpleDeepClone(childList);
      if (!node.nodeData.children) {
        node.nodeData.children = [];
      }
      childList = createUidForAppointNodes(childList, createNewId);
      createNewId = true;
      node.nodeData.children.push(...childList);
      node.setData({
        expand: true
      });
    });
    if (focusNewNode) {
      this.clearActiveNodeList();
    }
    this.mindMap.render();
  }
  // 插入父节点
  insertParentNode(openEdit = true, appointNodes, appointData) {
    appointNodes = formatDataToArray(appointNodes);
    if (this.activeNodeList.length <= 0 && appointNodes.length <= 0) {
      return;
    }
    this.textEdit.hideEditTextBox();
    const {
      defaultInsertSecondLevelNodeText,
      defaultInsertBelowSecondLevelNodeText
    } = this.mindMap.opt;
    const list = appointNodes.length > 0 ? appointNodes : this.activeNodeList;
    const handleMultiNodes = list.length > 1;
    const isRichText = this.hasRichTextPlugin();
    const { focusNewNode, inserting } = this.getNewNodeBehavior(
      openEdit,
      handleMultiNodes
    );
    const params = {
      expand: true,
      richText: isRichText,
      isActive: focusNewNode
    };
    if (isRichText) params.resetRichText = true;
    const alreadyIsRichText = appointData && appointData.richText;
    list.forEach((node) => {
      if (node.isGeneralization || node.isRoot) {
        return;
      }
      const text = node.layerIndex === 1 ? defaultInsertSecondLevelNodeText : defaultInsertBelowSecondLevelNodeText;
      if (alreadyIsRichText && params.resetRichText) {
        delete params.resetRichText;
      }
      const newNode = {
        inserting,
        data: {
          text,
          uid: createUid(),
          ...params,
          ...appointData || {}
        },
        children: [node.nodeData]
      };
      const parent = node.parent;
      const index = getNodeDataIndex(node);
      parent.nodeData.children.splice(index, 1, newNode);
    });
    if (focusNewNode) {
      this.clearActiveNodeList();
    }
    this.mindMap.render();
  }
  //  上移节点，多个节点只会操作第一个节点
  upNode(appointNode) {
    if (this.activeNodeList.length <= 0 && !appointNode) {
      return;
    }
    const list = appointNode ? [appointNode] : this.activeNodeList;
    const node = list[0];
    if (node.isRoot) {
      return;
    }
    let parent = node.parent;
    let childList = parent.children;
    let index = getNodeIndexInNodeList(node, childList);
    if (index === -1 || index === 0) {
      return;
    }
    let insertIndex = index - 1;
    childList.splice(index, 1);
    childList.splice(insertIndex, 0, node);
    parent.nodeData.children.splice(index, 1);
    parent.nodeData.children.splice(insertIndex, 0, node.nodeData);
    this.mindMap.render();
  }
  //  下移节点，多个节点只会操作第一个节点
  downNode(appointNode) {
    if (this.activeNodeList.length <= 0 && !appointNode) {
      return;
    }
    const list = appointNode ? [appointNode] : this.activeNodeList;
    const node = list[0];
    if (node.isRoot) {
      return;
    }
    let parent = node.parent;
    let childList = parent.children;
    let index = getNodeIndexInNodeList(node, childList);
    if (index === -1 || index === childList.length - 1) {
      return;
    }
    let insertIndex = index + 1;
    childList.splice(index, 1);
    childList.splice(insertIndex, 0, node);
    parent.nodeData.children.splice(index, 1);
    parent.nodeData.children.splice(insertIndex, 0, node.nodeData);
    this.mindMap.render();
  }
  // 将节点上移一个层级，多个节点只会操作第一个节点
  moveUpOneLevel(node) {
    node = node || this.activeNodeList[0];
    if (!node || node.isRoot || node.layerIndex <= 1) {
      return;
    }
    const parent = node.parent;
    const grandpa = parent.parent;
    const index = getNodeIndexInNodeList(node, parent.children);
    const parentIndex = getNodeIndexInNodeList(parent, grandpa.children);
    parent.nodeData.children.splice(index, 1);
    grandpa.nodeData.children.splice(parentIndex + 1, 0, node.nodeData);
    this.mindMap.render();
  }
  // 移除节点数据的自定义样式的内部方法
  _handleRemoveCustomStyles(nodeData) {
    let hasCustomStyles = false;
    Object.keys(nodeData).forEach((key) => {
      if (checkIsNodeStyleDataKey(key)) {
        hasCustomStyles = true;
        delete nodeData[key];
      }
    });
    if (this.hasRichTextPlugin()) {
      hasCustomStyles = true;
      nodeData.resetRichText = true;
    }
    return hasCustomStyles;
  }
  // 一键去除自定义样式
  removeCustomStyles(node) {
    node = node || this.activeNodeList[0];
    if (!node) {
      return;
    }
    const hasCustomStyles = this._handleRemoveCustomStyles(node.getData());
    if (hasCustomStyles) {
      this.reRenderNodeCheckChange(node);
    }
  }
  // 一键去除所有节点自定义样式
  removeAllNodeCustomStyles(appointNodes) {
    appointNodes = formatDataToArray(appointNodes);
    let hasCustomStyles = false;
    if (appointNodes.length > 0) {
      appointNodes.forEach((node) => {
        const _hasCustomStyles = this._handleRemoveCustomStyles(node.getData());
        if (_hasCustomStyles) hasCustomStyles = true;
      });
    } else {
      if (!this.renderTree) return;
      walk(this.renderTree, null, (node) => {
        const _hasCustomStyles = this._handleRemoveCustomStyles(node.data);
        if (_hasCustomStyles) hasCustomStyles = true;
        const generalizationList = formatGetNodeGeneralization(node.data);
        if (generalizationList.length > 0) {
          generalizationList.forEach((generalizationData) => {
            const _hasCustomStyles2 = this._handleRemoveCustomStyles(generalizationData);
            if (_hasCustomStyles2) hasCustomStyles = true;
          });
        }
      });
    }
    if (hasCustomStyles) {
      this.mindMap.reRender();
    }
  }
  // 复制节点
  copy() {
    this.beingCopyData = this.copyNode();
    if (!this.beingCopyData) return;
    if (!this.mindMap.opt.disabledClipboard) {
      setDataToClipboard(createSmmFormatData(this.beingCopyData));
    }
  }
  // 剪切节点
  cut() {
    this.mindMap.execCommand("CUT_NODE", (copyData) => {
      this.beingCopyData = copyData;
      if (!this.mindMap.opt.disabledClipboard) {
        setDataToClipboard(createSmmFormatData(copyData));
      }
    });
  }
  // 非https下复制黏贴，获取内容方法
  handlePaste(event) {
    const { disabledClipboard } = this.mindMap.opt;
    if (disabledClipboard) return;
    const clipboardData = event.clipboardData || event.originalEvent.clipboardData;
    const items = clipboardData.items;
    Array.from(items).forEach((item) => {
      if (item.type.indexOf("image") > -1) {
        item.getAsFile();
      }
      if (item.type.indexOf("text") > -1) {
        clipboardData.getData("text");
      }
    });
    this.paste();
  }
  // 粘贴
  async paste() {
    const {
      errorHandler,
      handleIsSplitByWrapOnPasteCreateNewNode,
      handleNodePasteImg,
      disabledClipboard,
      onlyPasteTextWhenHasImgAndText
    } = this.mindMap.opt;
    if (!disabledClipboard && checkClipboardReadEnable()) {
      try {
        const res = await getDataFromClipboard();
        let text = res.text || "";
        let img = res.img || null;
        if (text) {
          let smmData = null;
          let useDefault = true;
          if (this.mindMap.opt.customHandleClipboardText) {
            try {
              const res2 = await this.mindMap.opt.customHandleClipboardText(text);
              if (!isUndef(res2)) {
                useDefault = false;
                const checkRes = checkSmmFormatData(res2);
                if (checkRes.isSmm) {
                  smmData = checkRes.data;
                } else {
                  text = checkRes.data;
                }
              }
            } catch (error) {
              errorHandler(
                ERROR_TYPES.CUSTOM_HANDLE_CLIPBOARD_TEXT_ERROR,
                error
              );
            }
          }
          if (useDefault) {
            const checkRes = checkSmmFormatData(text);
            if (checkRes.isSmm) {
              smmData = checkRes.data;
            } else {
              text = checkRes.data;
            }
          }
          if (smmData) {
            this.mindMap.execCommand(
              "INSERT_MULTI_CHILD_NODE",
              [],
              Array.isArray(smmData) ? smmData : [smmData]
            );
          } else {
            if (this.hasRichTextPlugin()) {
              text = htmlEscape(text);
            }
            const textArr = text.split(new RegExp("\r?\n|(?<!\n)\r", "g")).filter((item) => {
              return !!item;
            });
            if (textArr.length > 1 && handleIsSplitByWrapOnPasteCreateNewNode) {
              handleIsSplitByWrapOnPasteCreateNewNode().then(() => {
                this.mindMap.execCommand(
                  "INSERT_MULTI_CHILD_NODE",
                  [],
                  textArr.map((item) => {
                    return {
                      data: {
                        text: item
                      },
                      children: []
                    };
                  })
                );
              }).catch(() => {
                this.mindMap.execCommand("INSERT_CHILD_NODE", false, [], {
                  text
                });
              });
            } else {
              this.mindMap.execCommand("INSERT_CHILD_NODE", false, [], {
                text
              });
            }
          }
        }
        if (img && (!text || !onlyPasteTextWhenHasImgAndText)) {
          try {
            let imgData = null;
            if (handleNodePasteImg && typeof handleNodePasteImg === "function") {
              imgData = await handleNodePasteImg(img);
            } else {
              imgData = await loadImage(img);
            }
            if (this.activeNodeList.length > 0) {
              this.activeNodeList.forEach((node) => {
                this.mindMap.execCommand("SET_NODE_IMAGE", node, {
                  url: imgData.url,
                  title: "",
                  width: imgData.size.width,
                  height: imgData.size.height
                });
              });
            }
          } catch (error) {
            errorHandler(ERROR_TYPES.LOAD_CLIPBOARD_IMAGE_ERROR, error);
          }
        }
      } catch (error) {
        errorHandler(ERROR_TYPES.READ_CLIPBOARD_ERROR, error);
      }
    } else {
      if (this.beingCopyData) {
        this.mindMap.execCommand("PASTE_NODE", this.beingCopyData);
      }
    }
  }
  //  将节点移动到另一个节点的前面
  insertBefore(node, exist) {
    this.insertTo(node, exist, "before");
  }
  //  将节点移动到另一个节点的后面
  insertAfter(node, exist) {
    this.insertTo(node, exist, "after");
  }
  // 将节点移动到另一个节点的前面或后面
  insertTo(node, exist, dir = "before") {
    let nodeList = formatDataToArray(node);
    nodeList = nodeList.filter((item) => {
      return !item.isRoot;
    });
    if (dir === "after") {
      nodeList.reverse();
    }
    nodeList.forEach((item) => {
      let nodeParent = item.parent;
      let nodeBorthers = nodeParent.children;
      let nodeIndex = getNodeIndexInNodeList(item, nodeBorthers);
      if (nodeIndex === -1) {
        return;
      }
      nodeBorthers.splice(nodeIndex, 1);
      nodeParent.nodeData.children.splice(nodeIndex, 1);
      let existParent = exist.parent;
      let existBorthers = existParent.children;
      let existIndex = getNodeIndexInNodeList(exist, existBorthers);
      if (existIndex === -1) {
        return;
      }
      if (dir === "after") {
        existIndex++;
      }
      existBorthers.splice(existIndex, 0, item);
      existParent.nodeData.children.splice(existIndex, 0, item.nodeData);
    });
    this.mindMap.render();
  }
  //  移除节点
  removeNode(appointNodes = []) {
    appointNodes = formatDataToArray(appointNodes);
    if (this.activeNodeList.length <= 0 && appointNodes.length <= 0) {
      return;
    }
    let needActiveNode = null;
    let isAppointNodes = appointNodes.length > 0;
    let list = isAppointNodes ? appointNodes : this.activeNodeList;
    let root2 = list.find((node) => {
      return node.isRoot;
    });
    if (root2) {
      this.clearActiveNodeList();
      root2.children = [];
      root2.nodeData.children = [];
    } else {
      needActiveNode = this.getNextActiveNode(list);
      for (let i = 0; i < list.length; i++) {
        const node = list[i];
        const currentEditNode = this.textEdit.getCurrentEditNode();
        if (currentEditNode && currentEditNode.getData("uid") === node.getData("uid")) {
          this.textEdit.hideEditTextBox();
        }
        if (isAppointNodes) list.splice(i, 1);
        if (node.isGeneralization) {
          this.deleteNodeGeneralization(node);
          this.removeNodeFromActiveList(node);
          i--;
        } else {
          this.removeNodeFromActiveList(node);
          removeFromParentNodeData(node);
          i--;
        }
      }
    }
    this.activeNodeList = [];
    if (needActiveNode) {
      this.addNodeToActiveList(needActiveNode);
    }
    this.emitNodeActiveEvent();
    this.mindMap.render();
  }
  // 删除概要节点，即从所属节点里删除该概要
  deleteNodeGeneralization(node) {
    const targetNode = node.generalizationBelongNode;
    const index = targetNode.getGeneralizationNodeIndex(node);
    let generalization = targetNode.getData("generalization");
    if (Array.isArray(generalization)) {
      generalization.splice(index, 1);
    } else {
      generalization = null;
    }
    this.mindMap.execCommand("SET_NODE_DATA", targetNode, {
      generalization
    });
    this.closeHighlightNode();
  }
  // 仅删除当前节点
  removeCurrentNode(appointNodes = []) {
    appointNodes = formatDataToArray(appointNodes);
    if (this.activeNodeList.length <= 0 && appointNodes.length <= 0) {
      return;
    }
    let isAppointNodes = appointNodes.length > 0;
    let list = isAppointNodes ? appointNodes : this.activeNodeList;
    list = list.filter((node) => {
      return !node.isRoot;
    });
    let needActiveNode = this.getNextActiveNode(list);
    for (let i = 0; i < list.length; i++) {
      let node = list[i];
      if (node.isGeneralization) {
        this.deleteNodeGeneralization(node);
      } else {
        const parent = node.parent;
        const index = getNodeDataIndex(node);
        parent.nodeData.children.splice(
          index,
          1,
          ...node.nodeData.children || []
        );
      }
    }
    this.activeNodeList = [];
    if (needActiveNode) {
      this.addNodeToActiveList(needActiveNode);
    }
    this.emitNodeActiveEvent();
    this.mindMap.render();
  }
  // 计算下一个可激活的节点
  getNextActiveNode(deleteList) {
    if (deleteList.length !== 1) return null;
    if (this.findActiveNodeIndex(deleteList[0]) === -1) return null;
    let needActiveNode = null;
    if (this.activeNodeList.length === 1 && !this.activeNodeList[0].isGeneralization && this.mindMap.opt.deleteNodeActive) {
      const node = this.activeNodeList[0];
      const broList = node.parent.children;
      const nodeIndex = getNodeIndexInNodeList(node, broList);
      if (nodeIndex < broList.length - 1) {
        needActiveNode = broList[nodeIndex + 1];
      } else {
        if (nodeIndex > 0) {
          needActiveNode = broList[nodeIndex - 1];
        } else {
          needActiveNode = node.parent;
        }
      }
    }
    return needActiveNode;
  }
  //  复制节点
  copyNode() {
    if (this.activeNodeList.length <= 0) {
      return null;
    }
    let nodeList = getTopAncestorsFomNodeList(this.activeNodeList);
    nodeList = sortNodeList(nodeList);
    return nodeList.map((node) => {
      return copyNodeTree({}, node, true);
    });
  }
  //  剪切节点
  cutNode(callback) {
    if (this.activeNodeList.length <= 0) {
      return;
    }
    let nodeList = getTopAncestorsFomNodeList(this.activeNodeList).filter(
      (node) => {
        return !node.isRoot;
      }
    );
    nodeList = sortNodeList(nodeList);
    const copyData = nodeList.map((node) => {
      return copyNodeTree({}, node, true);
    });
    nodeList.forEach((node) => {
      removeFromParentNodeData(node);
    });
    this.clearActiveNodeList();
    this.mindMap.render();
    if (callback && typeof callback === "function") {
      callback(copyData);
    }
  }
  //  移动节点作为另一个节点的子节点
  moveNodeTo(node, toNode) {
    let nodeList = formatDataToArray(node);
    nodeList = nodeList.filter((item) => {
      return !item.isRoot;
    });
    nodeList.forEach((item) => {
      this.removeNodeFromActiveList(item);
      removeFromParentNodeData(item);
      toNode.setData({
        expand: true
      });
      toNode.nodeData.children.push(item.nodeData);
    });
    this.emitNodeActiveEvent();
    this.mindMap.render();
  }
  //   粘贴节点到节点
  pasteNode(data2) {
    data2 = formatDataToArray(data2);
    this.mindMap.execCommand("INSERT_MULTI_CHILD_NODE", [], data2);
  }
  //  设置节点样式
  setNodeStyle(node, prop, value) {
    const data2 = {
      [prop]: value
    };
    this.setNodeDataRender(node, data2);
    if (lineStyleProps.includes(prop)) {
      (node.parent || node).renderLine(true);
    }
  }
  //  设置节点多个样式
  setNodeStyles(node, style) {
    const data2 = { ...style };
    this.setNodeDataRender(node, data2);
    let props = Object.keys(style);
    let hasLineStyleProps = false;
    props.forEach((key) => {
      if (lineStyleProps.includes(key)) {
        hasLineStyleProps = true;
      }
    });
    if (hasLineStyleProps) {
      (node.parent || node).renderLine(true);
    }
  }
  //  设置节点是否激活
  setNodeActive(node, active) {
    this.mindMap.execCommand("SET_NODE_DATA", node, {
      isActive: active
    });
    node.updateNodeByActive(active);
  }
  //  设置节点是否展开
  setNodeExpand(node, expand) {
    this.mindMap.execCommand("SET_NODE_DATA", node, {
      expand
    });
    this.mindMap.render();
  }
  //  展开所有
  expandAllNode(uid = "") {
    if (!this.renderTree) return;
    const _walk = (node, enableExpand) => {
      if (!enableExpand && node.data.uid === uid) {
        enableExpand = true;
      }
      if (enableExpand && !node.data.expand) {
        node.data.expand = true;
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach((child) => {
          _walk(child, enableExpand);
        });
      }
    };
    _walk(this.renderTree, !uid);
    this.mindMap.render();
  }
  //  收起所有
  unexpandAllNode(isSetRootNodeCenter = true, uid = "") {
    if (!this.renderTree) return;
    const _walk = (node, isRoot, enableUnExpand) => {
      if (!enableUnExpand && node.data.uid === uid) {
        enableUnExpand = true;
      }
      if (enableUnExpand && !isRoot && node.children && node.children.length > 0) {
        node.data.expand = false;
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach((child) => {
          _walk(child, false, enableUnExpand);
        });
      }
    };
    _walk(this.renderTree, true, !uid);
    this.mindMap.render(() => {
      if (isSetRootNodeCenter) {
        this.setRootNodeCenter();
      }
    });
  }
  //  展开到指定层级
  expandToLevel(level) {
    if (!this.renderTree) return;
    walk(
      this.renderTree,
      null,
      (node, parent, isRoot, layerIndex) => {
        const expand = layerIndex < level;
        if (expand) {
          node.data.expand = true;
        } else if (!isRoot && node.children && node.children.length > 0) {
          node.data.expand = false;
        }
      },
      null,
      true,
      0,
      0
    );
    this.mindMap.render();
  }
  //  切换激活节点的展开状态
  toggleActiveExpand() {
    this.activeNodeList.forEach((node) => {
      if (node.nodeData.children.length <= 0 || node.isRoot) {
        return;
      }
      this.toggleNodeExpand(node);
    });
  }
  //  切换节点展开状态
  toggleNodeExpand(node) {
    this.mindMap.execCommand("SET_NODE_EXPAND", node, !node.getData("expand"));
  }
  //  设置节点文本
  setNodeText(node, text, richText, resetRichText) {
    richText = richText === void 0 ? node.getData("richText") : richText;
    this.setNodeDataRender(node, {
      text,
      richText,
      resetRichText
    });
  }
  //  设置节点图片
  setNodeImage(node, data2) {
    const {
      url,
      title,
      width: width2,
      height: height2,
      custom = false
    } = data2 || { url: "", title: "", width: 0, height: 0, custom: false };
    this.setNodeDataRender(node, {
      image: url,
      imageTitle: title || "",
      imageSize: {
        width: width2,
        height: height2,
        custom
      }
    });
  }
  //  设置节点图标
  setNodeIcon(node, icons) {
    this.setNodeDataRender(node, {
      icon: icons
    });
  }
  //  设置节点超链接
  setNodeHyperlink(node, link, title = "") {
    this.setNodeDataRender(node, {
      hyperlink: link,
      hyperlinkTitle: title
    });
  }
  //  设置节点备注
  setNodeNote(node, note2) {
    this.setNodeDataRender(node, {
      note: note2
    });
  }
  //  设置节点附件
  setNodeAttachment(node, url, name = "") {
    this.setNodeDataRender(node, {
      attachmentUrl: url,
      attachmentName: name
    });
  }
  //  设置节点标签
  setNodeTag(node, tag) {
    this.setNodeDataRender(node, {
      tag
    });
  }
  // 设置节点公式
  insertFormula(formula, appointNodes = []) {
    if (!this.hasRichTextPlugin() || !this.mindMap.formula) return;
    appointNodes = formatDataToArray(appointNodes);
    const list = appointNodes.length > 0 ? appointNodes : this.activeNodeList;
    list.forEach((node) => {
      this.mindMap.formula.insertFormulaToNode(node, formula);
    });
  }
  //  添加节点概要
  addGeneralization(data2, openEdit = true) {
    if (this.activeNodeList.length <= 0) {
      return;
    }
    const nodeList = this.activeNodeList.filter((node) => {
      return !node.isRoot && !node.isGeneralization && !node.checkHasSelfGeneralization();
    });
    const list = parseAddGeneralizationNodeList(nodeList);
    if (list.length <= 0) return;
    const isRichText = this.hasRichTextPlugin();
    const { focusNewNode, inserting } = this.getNewNodeBehavior(
      openEdit,
      list.length > 1
    );
    let needRender = false;
    const alreadyIsRichText = data2 && data2.richText;
    list.forEach((item) => {
      const newData = {
        inserting,
        ...data2 || {
          text: this.mindMap.opt.defaultGeneralizationText
        },
        range: item.range || null,
        uid: createUid(),
        richText: isRichText,
        isActive: focusNewNode
      };
      if (isRichText && !alreadyIsRichText) newData.resetRichText = isRichText;
      let generalization = item.node.getData("generalization");
      generalization = generalization ? Array.isArray(generalization) ? generalization : [generalization] : [];
      if (item.range) {
        const isExist = !!generalization.find((item2) => {
          return item2.range && item2.range[0] === item.range[0] && item2.range[1] === item.range[1];
        });
        if (isExist) {
          return;
        }
        generalization.push(newData);
      } else {
        generalization.push(newData);
      }
      needRender = true;
      this.mindMap.execCommand("SET_NODE_DATA", item.node, {
        generalization
      });
      item.node.setData({
        expand: true
      });
    });
    if (!needRender) return;
    if (focusNewNode) {
      this.clearActiveNodeList();
    }
    this.mindMap.render(() => {
      this.mindMap.render();
    });
  }
  //  删除节点概要
  removeGeneralization() {
    if (this.activeNodeList.length <= 0) {
      return;
    }
    this.activeNodeList.forEach((node) => {
      if (!node.checkHasGeneralization()) {
        return;
      }
      this.mindMap.execCommand("SET_NODE_DATA", node, {
        generalization: null
      });
    });
    this.mindMap.render();
    this.closeHighlightNode();
  }
  //  设置节点自定义位置
  setNodeCustomPosition(node, left = void 0, top = void 0) {
    let nodeList = [node];
    nodeList.forEach((item) => {
      this.mindMap.execCommand("SET_NODE_DATA", item, {
        customLeft: left,
        customTop: top
      });
    });
  }
  //  一键整理布局，即去除自定义位置
  resetLayout() {
    walk(
      this.root,
      null,
      (node) => {
        node.customLeft = void 0;
        node.customTop = void 0;
        this.mindMap.execCommand("SET_NODE_DATA", node, {
          customLeft: void 0,
          customTop: void 0
        });
        this.mindMap.render();
      },
      null,
      true,
      0,
      0
    );
  }
  //  设置节点形状
  setNodeShape(node, shape) {
    if (!shape || !shapeList.includes(shape)) {
      return;
    }
    let nodeList = [node];
    nodeList.forEach((item) => {
      this.setNodeStyle(item, "shape", shape);
    });
  }
  // 定位到指定节点
  goTargetNode(node, callback = () => {
  }) {
    let uid = typeof node === "string" ? node : node.getData("uid");
    if (!uid) return;
    this.expandToNodeUid(uid, () => {
      let targetNode = this.findNodeByUid(uid);
      if (targetNode) {
        targetNode.active();
        this.moveNodeToCenter(targetNode);
        callback(targetNode);
      }
    });
  }
  //  更新节点数据
  setNodeData(node, data2) {
    Object.keys(data2).forEach((key) => {
      node.nodeData.data[key] = data2[key];
    });
  }
  //  设置节点数据，并判断是否渲染
  setNodeDataRender(node, data2, notRender = false) {
    this.mindMap.execCommand("SET_NODE_DATA", node, data2);
    if (isNodeNotNeedRenderData(data2)) {
      this.mindMap.emit("node_tree_render_end");
      return;
    }
    this.reRenderNodeCheckChange(node, notRender);
  }
  // 重新节点某个节点，判断节点大小是否发生了改变，是的话触发重绘
  reRenderNodeCheckChange(node, notRender) {
    let changed = node.reRender();
    if (changed) {
      if (!notRender) this.mindMap.render();
    } else {
      this.mindMap.emit("node_tree_render_end");
    }
  }
  // 移动节点到画布中心
  // resetScale参数指定是否要将画布缩放值复位为100%，当你没有显式传递时，默认值为undefined，因为实例化选项的resetScaleOnMoveNodeToCenter配置也会决定是否复位缩放，所以当你没有显式传递时使用resetScaleOnMoveNodeToCenter配置，否则使用resetScale配置
  moveNodeToCenter(node, resetScale) {
    let { resetScaleOnMoveNodeToCenter } = this.mindMap.opt;
    if (resetScale !== void 0) {
      resetScaleOnMoveNodeToCenter = resetScale;
    }
    let { transform: transform2, state } = this.mindMap.view.getTransformData();
    let { left, top, width: width2, height: height2 } = node;
    if (!resetScaleOnMoveNodeToCenter) {
      left *= transform2.scaleX;
      top *= transform2.scaleY;
      width2 *= transform2.scaleX;
      height2 *= transform2.scaleY;
    }
    let halfWidth = this.mindMap.width / 2;
    let halfHeight = this.mindMap.height / 2;
    let nodeCenterX = left + width2 / 2;
    let nodeCenterY = top + height2 / 2;
    let targetX = halfWidth - state.x;
    let targetY = halfHeight - state.y;
    let offsetX = targetX - nodeCenterX;
    let offsetY = targetY - nodeCenterY;
    this.mindMap.view.translateX(offsetX);
    this.mindMap.view.translateY(offsetY);
    if (resetScaleOnMoveNodeToCenter) {
      this.mindMap.view.setScale(1);
    }
  }
  // 回到中心主题，即设置根节点到画布中心
  setRootNodeCenter() {
    this.moveNodeToCenter(this.root);
  }
  // 展开到指定uid的节点
  expandToNodeUid(uid, callback = () => {
  }) {
    if (!this.renderTree) {
      callback();
      return;
    }
    let parentsList = [];
    let isGeneralization = false;
    const cache = {};
    bfsWalk(this.renderTree, (node, parent) => {
      if (node.data.uid === uid) {
        parentsList = parent ? [...cache[parent.data.uid], parent] : [];
        return "stop";
      }
      const generalizationList = formatGetNodeGeneralization(node.data);
      generalizationList.forEach((item) => {
        if (item.uid === uid) {
          parentsList = parent ? [...cache[parent.data.uid], parent, node] : [];
          isGeneralization = true;
        }
      });
      if (isGeneralization) {
        return "stop";
      }
      cache[node.data.uid] = parent ? [...cache[parent.data.uid], parent] : [];
    });
    let needRender = false;
    parentsList.forEach((node) => {
      if (!node.data.expand) {
        needRender = true;
        node.data.expand = true;
      }
    });
    if (isGeneralization) {
      const lastNode = parentsList[parentsList.length - 1];
      if (lastNode) {
        walk(lastNode, null, (node) => {
          if (!node.data.expand) {
            needRender = true;
            node.data.expand = true;
          }
        });
      }
    }
    if (needRender) {
      this.mindMap.render(callback);
    } else {
      callback();
    }
  }
  // 根据uid找到对应的节点实例
  findNodeByUid(uid) {
    if (!this.root) return;
    let res = null;
    walk(this.root, null, (node) => {
      if (node.getData("uid") === uid) {
        res = node;
        return true;
      }
      let isGeneralization = false;
      (node._generalizationList || []).forEach((item) => {
        if (item.generalizationNode.getData("uid") === uid) {
          res = item.generalizationNode;
          isGeneralization = true;
        }
      });
      if (isGeneralization) {
        return true;
      }
    });
    return res;
  }
  // 高亮节点或子节点
  highlightNode(node, range, style) {
    if (this.isRendering) return;
    style = {
      stroke: "rgb(94, 200, 248)",
      fill: "transparent",
      ...style || {}
    };
    if (!this.highlightBoxNode) {
      this.highlightBoxNode = new Polygon().stroke({
        color: style.stroke || "transparent"
      }).fill({
        color: style.fill || "transparent"
      });
    } else if (this.highlightBoxNodeStyle) {
      if (this.highlightBoxNodeStyle.stroke !== style.stroke || this.highlightBoxNodeStyle.fill !== style.fill) {
        this.highlightBoxNode.stroke({
          color: style.stroke || "transparent"
        }).fill({
          color: style.fill || "transparent"
        });
      }
    }
    this.highlightBoxNodeStyle = { ...style };
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    if (range) {
      const children = node.children.slice(range[0], range[1] + 1);
      children.forEach((child) => {
        if (child.left < minx) {
          minx = child.left;
        }
        if (child.top < miny) {
          miny = child.top;
        }
        const right = child.left + child.width;
        const bottom = child.top + child.height;
        if (right > maxx) {
          maxx = right;
        }
        if (bottom > maxy) {
          maxy = bottom;
        }
      });
    } else {
      minx = node.left;
      miny = node.top;
      maxx = node.left + node.width;
      maxy = node.top + node.height;
    }
    this.highlightBoxNode.plot([
      [minx, miny],
      [maxx, miny],
      [maxx, maxy],
      [minx, maxy]
    ]);
    this.mindMap.otherDraw.add(this.highlightBoxNode);
  }
  // 关闭高亮
  closeHighlightNode() {
    if (!this.highlightBoxNode) return;
    this.highlightBoxNode.remove();
  }
  // 是否存在富文本插件
  hasRichTextPlugin() {
    return !!this.mindMap.richText;
  }
}
const theme = {
  default: defaultTheme
};
const map = {
  Backspace: 8,
  Tab: 9,
  Enter: 13,
  Shift: 16,
  Control: 17,
  Alt: 18,
  CapsLock: 20,
  Esc: 27,
  Spacebar: 32,
  PageUp: 33,
  PageDown: 34,
  End: 35,
  Home: 36,
  Insert: 45,
  Left: 37,
  Up: 38,
  Right: 39,
  Down: 40,
  Del: 46,
  NumLock: 144,
  Cmd: 91,
  CmdFF: 224,
  F1: 112,
  F2: 113,
  F3: 114,
  F4: 115,
  F5: 116,
  F6: 117,
  F7: 118,
  F8: 119,
  F9: 120,
  F10: 121,
  F11: 122,
  F12: 123,
  "`": 192,
  "=": 187,
  "-": 189,
  "/": 191,
  ".": 190
};
for (let i = 0; i <= 9; i++) {
  map[i] = i + 48;
}
"abcdefghijklmnopqrstuvwxyz".split("").forEach((n, index) => {
  map[n] = index + 65;
});
const keyMap = map;
class KeyCommand {
  //  构造函数
  constructor(opt) {
    this.opt = opt;
    this.mindMap = opt.mindMap;
    this.shortcutMap = {
      //Enter: [fn]
    };
    this.shortcutMapCache = {};
    this.isPause = false;
    this.isInSvg = false;
    this.isStopCheckInSvg = false;
    this.defaultEnableCheck = this.defaultEnableCheck.bind(this);
    this.bindEvent();
  }
  // 扩展按键映射
  extendKeyMap(key, code) {
    keyMap[key] = code;
  }
  // 从按键映射中删除某个键
  removeKeyMap(key) {
    if (typeof keyMap[key] !== "undefined") {
      delete keyMap[key];
    }
  }
  //  暂停快捷键响应
  pause() {
    this.isPause = true;
  }
  //  恢复快捷键响应
  recovery() {
    this.isPause = false;
  }
  //  保存当前注册的快捷键数据，然后清空快捷键数据
  save() {
    if (Object.keys(this.shortcutMapCache).length > 0) {
      return;
    }
    this.shortcutMapCache = this.shortcutMap;
    this.shortcutMap = {};
  }
  //  恢复保存的快捷键数据，然后清空缓存数据
  restore() {
    if (Object.keys(this.shortcutMapCache).length <= 0) {
      return;
    }
    this.shortcutMap = this.shortcutMapCache;
    this.shortcutMapCache = {};
  }
  // 停止对鼠标是否在画布内的检查，前提是开启了enableShortcutOnlyWhenMouseInSvg选项
  // 库内部节点文本编辑、关联线文本编辑、外框文本编辑前都会暂停检查，否则无法响应回车快捷键用于结束编辑
  // 如果你新增了额外的文本编辑，也可以在编辑前调用此方法
  stopCheckInSvg() {
    const { enableShortcutOnlyWhenMouseInSvg } = this.mindMap.opt;
    if (!enableShortcutOnlyWhenMouseInSvg) return;
    this.isStopCheckInSvg = true;
  }
  // 恢复对鼠标是否在画布内的检查
  recoveryCheckInSvg() {
    const { enableShortcutOnlyWhenMouseInSvg } = this.mindMap.opt;
    if (!enableShortcutOnlyWhenMouseInSvg) return;
    this.isStopCheckInSvg = true;
  }
  //  绑定事件
  bindEvent() {
    this.onKeydown = this.onKeydown.bind(this);
    this.mindMap.on("svg_mouseenter", () => {
      this.isInSvg = true;
    });
    this.mindMap.on("svg_mouseleave", () => {
      this.isInSvg = false;
    });
    window.addEventListener("keydown", this.onKeydown);
    this.mindMap.on("beforeDestroy", () => {
      this.unBindEvent();
    });
  }
  // 解绑事件
  unBindEvent() {
    window.removeEventListener("keydown", this.onKeydown);
  }
  // 根据事件目标判断是否响应快捷键事件
  defaultEnableCheck(e) {
    const target = e.target;
    if (target === document.body) return true;
    for (let i = 0; i < this.mindMap.editNodeClassList.length; i++) {
      const cur = this.mindMap.editNodeClassList[i];
      if (target.classList.contains(cur)) {
        return true;
      }
    }
    return false;
  }
  // 按键事件
  onKeydown(e) {
    const {
      enableShortcutOnlyWhenMouseInSvg,
      beforeShortcutRun,
      customCheckEnableShortcut
    } = this.mindMap.opt;
    const checkFn = typeof customCheckEnableShortcut === "function" ? customCheckEnableShortcut : this.defaultEnableCheck;
    if (!checkFn(e)) return;
    if (this.isPause || enableShortcutOnlyWhenMouseInSvg && !this.isStopCheckInSvg && !this.isInSvg) {
      return;
    }
    Object.keys(this.shortcutMap).forEach((key) => {
      if (this.checkKey(e, key)) {
        if (!this.checkKey(e, "Control+v")) {
          e.stopPropagation();
          e.preventDefault();
        }
        if (typeof beforeShortcutRun === "function") {
          const isStop = beforeShortcutRun(key, [
            ...this.mindMap.renderer.activeNodeList
          ]);
          if (isStop) return;
        }
        this.shortcutMap[key].forEach((fn) => {
          fn();
        });
      }
    });
  }
  //  检查键值是否符合
  checkKey(e, key) {
    let o = this.getOriginEventCodeArr(e);
    let k = this.getKeyCodeArr(key);
    if (o.length !== k.length) {
      return false;
    }
    for (let i = 0; i < o.length; i++) {
      let index = k.findIndex((item) => {
        return item === o[i];
      });
      if (index === -1) {
        return false;
      } else {
        k.splice(index, 1);
      }
    }
    return true;
  }
  //  获取事件对象里的键值数组
  getOriginEventCodeArr(e) {
    let arr = [];
    if (e.ctrlKey || e.metaKey) {
      arr.push(keyMap["Control"]);
    }
    if (e.altKey) {
      arr.push(keyMap["Alt"]);
    }
    if (e.shiftKey) {
      arr.push(keyMap["Shift"]);
    }
    if (!arr.includes(e.keyCode)) {
      arr.push(e.keyCode);
    }
    return arr;
  }
  // 判断是否按下了组合键
  hasCombinationKey(e) {
    return e.ctrlKey || e.metaKey || e.altKey || e.shiftKey;
  }
  //  获取快捷键对应的键值数组
  getKeyCodeArr(key) {
    let keyArr = key.split(/\s*\+\s*/);
    let arr = [];
    keyArr.forEach((item) => {
      arr.push(keyMap[item]);
    });
    return arr;
  }
  //  添加快捷键命令
  /**
   * Enter
   * Tab | Insert
   * Shift + a
   */
  addShortcut(key, fn) {
    key.split(/\s*\|\s*/).forEach((item) => {
      if (this.shortcutMap[item]) {
        this.shortcutMap[item].push(fn);
      } else {
        this.shortcutMap[item] = [fn];
      }
    });
  }
  //  移除快捷键命令
  removeShortcut(key, fn) {
    key.split(/\s*\|\s*/).forEach((item) => {
      if (this.shortcutMap[item]) {
        if (fn) {
          let index = this.shortcutMap[item].findIndex((f) => {
            return f === fn;
          });
          if (index !== -1) {
            this.shortcutMap[item].splice(index, 1);
          }
        } else {
          this.shortcutMap[item] = [];
          delete this.shortcutMap[item];
        }
      }
    });
  }
  //  获取指定快捷键的处理函数
  getShortcutFn(key) {
    let res = [];
    key.split(/\s*\|\s*/).forEach((item) => {
      res = this.shortcutMap[item] || [];
    });
    return res;
  }
}
const version = "0.14.0-fix.3";
const pkg = {
  version
};
class Command {
  //  构造函数
  constructor(opt = {}) {
    this.opt = opt;
    this.mindMap = opt.mindMap;
    this.commands = {};
    this.history = [];
    this.activeHistoryIndex = 0;
    this.registerShortcutKeys();
    this.originAddHistory = this.addHistory.bind(this);
    this.addHistory = throttle(
      this.addHistory,
      this.mindMap.opt.addHistoryTime,
      this
    );
    this.isPause = false;
  }
  // 暂停收集历史数据
  pause() {
    this.isPause = true;
  }
  // 恢复收集历史数据
  recovery() {
    this.isPause = false;
  }
  //  清空历史数据
  clearHistory() {
    this.history = [];
    this.activeHistoryIndex = 0;
    this.mindMap.emit("back_forward", 0, 0);
  }
  //  注册快捷键
  registerShortcutKeys() {
    this.mindMap.keyCommand.addShortcut("Control+z", () => {
      this.mindMap.execCommand("BACK");
    });
    this.mindMap.keyCommand.addShortcut("Control+y", () => {
      this.mindMap.execCommand("FORWARD");
    });
  }
  //  执行命令
  exec(name, ...args) {
    if (this.commands[name]) {
      this.commands[name].forEach((fn) => {
        fn(...args);
      });
      this.mindMap.emit("afterExecCommand", name, ...args);
      if (["BACK", "FORWARD", "SET_NODE_ACTIVE", "CLEAR_ACTIVE_NODE"].includes(
        name
      )) {
        return;
      }
      this.addHistory();
    }
  }
  //  添加命令
  add(name, fn) {
    if (this.commands[name]) {
      this.commands[name].push(fn);
    } else {
      this.commands[name] = [fn];
    }
  }
  //  移除命令
  remove(name, fn) {
    if (!this.commands[name]) {
      return;
    }
    if (!fn) {
      this.commands[name] = [];
      delete this.commands[name];
    } else {
      let index = this.commands[name].find((item) => {
        return item === fn;
      });
      if (index !== -1) {
        this.commands[name].splice(index, 1);
      }
    }
  }
  //  添加回退数据
  addHistory() {
    if (this.mindMap.opt.readonly || this.isPause) {
      return;
    }
    this.mindMap.emit("beforeAddHistory");
    const lastDataStr = this.history.length > 0 ? this.history[this.activeHistoryIndex] : null;
    const data2 = this.getCopyData();
    const dataStr = JSON.stringify(data2);
    if (lastDataStr && lastDataStr === dataStr) {
      return;
    }
    this.emitDataUpdatesEvent(lastDataStr, dataStr);
    this.history = this.history.slice(0, this.activeHistoryIndex + 1);
    this.history.push(dataStr);
    if (this.history.length > this.mindMap.opt.maxHistoryCount) {
      this.history.shift();
    }
    this.activeHistoryIndex = this.history.length - 1;
    this.mindMap.emit("data_change", data2);
    this.mindMap.emit(
      "back_forward",
      this.activeHistoryIndex,
      this.history.length
    );
  }
  //  回退
  back(step = 1) {
    if (this.mindMap.opt.readonly) {
      return;
    }
    if (this.activeHistoryIndex - step >= 0) {
      const lastDataStr = this.history[this.activeHistoryIndex];
      this.activeHistoryIndex -= step;
      this.mindMap.emit(
        "back_forward",
        this.activeHistoryIndex,
        this.history.length
      );
      const dataStr = this.history[this.activeHistoryIndex];
      const data2 = JSON.parse(dataStr);
      this.emitDataUpdatesEvent(lastDataStr, dataStr);
      return data2;
    }
  }
  //  前进
  forward(step = 1) {
    if (this.mindMap.opt.readonly) {
      return;
    }
    let len = this.history.length;
    if (this.activeHistoryIndex + step <= len - 1) {
      const lastDataStr = this.history[this.activeHistoryIndex];
      this.activeHistoryIndex += step;
      this.mindMap.emit(
        "back_forward",
        this.activeHistoryIndex,
        this.history.length
      );
      const dataStr = this.history[this.activeHistoryIndex];
      const data2 = JSON.parse(dataStr);
      this.emitDataUpdatesEvent(lastDataStr, dataStr);
      return data2;
    }
  }
  //  获取渲染树数据副本
  getCopyData() {
    if (!this.mindMap.renderer.renderTree) return null;
    const res = copyRenderTree({}, this.mindMap.renderer.renderTree, true);
    res.smmVersion = pkg.version;
    return res;
  }
  // 移除节点数据中的uid
  removeDataUid(data2) {
    data2 = simpleDeepClone(data2);
    let walk2 = (root2) => {
      delete root2.data.uid;
      if (root2.children && root2.children.length > 0) {
        root2.children.forEach((item) => {
          walk2(item);
        });
      }
    };
    walk2(data2);
    return data2;
  }
  // 派发思维导图更新明细事件
  emitDataUpdatesEvent(lastDataStr, dataStr) {
    try {
      const eventName = "data_change_detail";
      const count = this.mindMap.event.listenerCount(eventName);
      if (count > 0 && lastDataStr && dataStr) {
        const lastData = JSON.parse(lastDataStr);
        const data2 = JSON.parse(dataStr);
        const lastDataObj = simpleDeepClone(transformTreeDataToObject(lastData));
        const dataObj = simpleDeepClone(transformTreeDataToObject(data2));
        const res = [];
        const walkReplace = (root2, obj) => {
          if (root2.children && root2.children.length > 0) {
            root2.children.forEach((childUid, index) => {
              root2.children[index] = typeof childUid === "string" ? obj[childUid] : obj[childUid.data.uid];
              walkReplace(root2.children[index], obj);
            });
          }
          return root2;
        };
        Object.keys(dataObj).forEach((uid) => {
          if (!lastDataObj[uid]) {
            res.push({
              action: "create",
              data: walkReplace(dataObj[uid], dataObj)
            });
          } else if (!isSameObject(lastDataObj[uid], dataObj[uid])) {
            res.push({
              action: "update",
              oldData: walkReplace(lastDataObj[uid], lastDataObj),
              data: walkReplace(dataObj[uid], dataObj)
            });
          }
        });
        Object.keys(lastDataObj).forEach((uid) => {
          if (!dataObj[uid]) {
            res.push({
              action: "delete",
              data: walkReplace(lastDataObj[uid], lastDataObj)
            });
          }
        });
        this.mindMap.emit(eventName, res);
      }
    } catch (error) {
      this.mindMap.opt.errorHandler(
        ERROR_TYPES.DATA_CHANGE_DETAIL_EVENT_ERROR,
        error
      );
    }
  }
}
class BatchExecution {
  //  构造函数
  constructor() {
    this.has = {};
    this.queue = [];
    this.nextTick = nextTick(this.flush, this);
  }
  //  添加任务
  push(name, fn) {
    if (this.has[name]) {
      this.replaceTask(name, fn);
      return;
    }
    this.has[name] = true;
    this.queue.push({
      name,
      fn
    });
    this.nextTick();
  }
  // 替换任务
  replaceTask(name, fn) {
    const index = this.queue.findIndex((item) => {
      return item.name === name;
    });
    if (index !== -1) {
      this.queue[index] = {
        name,
        fn
      };
    }
  }
  //   执行队列
  flush() {
    let fns = this.queue.slice(0);
    this.queue = [];
    fns.forEach(({ name, fn }) => {
      this.has[name] = false;
      fn();
    });
  }
}
const defaultOpt = {
  // 【基本】
  // 容器元素，必传，必须为DOM元素
  el: null,
  // 思维导图回显数据
  data: null,
  // 要恢复的视图数据，一般通过mindMap.view.getTransformData()方法获取
  viewData: null,
  // 是否只读
  readonly: false,
  // 布局
  layout: CONSTANTS.LAYOUT.LOGICAL_STRUCTURE,
  // 如果结构为鱼骨图，那么可以通过该选项控制倾斜角度
  fishboneDeg: 45,
  // 主题
  theme: "default",
  // 内置主题：default（默认主题）
  // 主题配置，会和所选择的主题进行合并
  themeConfig: {},
  // 放大缩小的增量比例
  scaleRatio: 0.2,
  // 平移的步长比例，只在鼠标滚轮和触控板触发的平移中应用
  translateRatio: 1,
  // 最小缩小值，百分数，最小为0，该选项只会影响view.narrow方法（影响的行为为Ctrl+-快捷键、鼠标滚轮及触控板），不会影响其他方法，比如view.setScale，所以需要你自行限制大小
  minZoomRatio: 20,
  // 最大放大值，百分数，传-1代表不限制，否则传0以上数字，，该选项只会影响view.enlarge方法
  maxZoomRatio: 400,
  // 自定义判断wheel事件是否来自电脑的触控板
  // 默认是通过判断e.deltaY的值是否小于10，显然这种方法是不准确的，当鼠标滚动的很慢，或者触摸移动的很快时判断就失效了，如果你有更好的方法，欢迎提交issue
  // 如果你希望自己来判断，那么传递一个函数，接收一个参数e（事件对象），需要返回true或false，代表是否是来自触控板
  customCheckIsTouchPad: null,
  // 鼠标缩放是否以鼠标当前位置为中心点，否则以画布中心点
  mouseScaleCenterUseMousePosition: true,
  // 最多显示几个标签
  maxTag: 5,
  // 展开收缩按钮尺寸
  expandBtnSize: 20,
  // 节点里图片和文字的间距
  imgTextMargin: 5,
  // 节点里各种文字信息的间距，如图标和文字的间距
  textContentMargin: 2,
  // 自定义节点备注内容显示
  customNoteContentShow: null,
  /*
          {
              show(){},
              hide(){}
          }
      */
  // 达到该宽度文本自动换行
  textAutoWrapWidth: 500,
  // 自定义鼠标滚轮事件处理
  // 可以传一个函数，回调参数为事件对象
  customHandleMousewheel: null,
  // 鼠标滚动的行为，如果customHandleMousewheel传了自定义函数，这个属性不生效
  mousewheelAction: CONSTANTS.MOUSE_WHEEL_ACTION.MOVE,
  // zoom（放大缩小）、move（上下移动）
  // 当mousewheelAction设为move时，可以通过该属性控制鼠标滚动一下视图移动的步长，单位px
  mousewheelMoveStep: 100,
  // 当mousewheelAction设为zoom时，或者按住Ctrl键时，默认向前滚动是缩小，向后滚动是放大，如果该属性设为true，那么会反过来
  mousewheelZoomActionReverse: true,
  // 默认插入的二级节点的文字
  defaultInsertSecondLevelNodeText: "二级节点",
  // 默认插入的二级以下节点的文字
  defaultInsertBelowSecondLevelNodeText: "分支主题",
  // 展开收起按钮的颜色
  expandBtnStyle: {
    color: "#808080",
    fill: "#fff",
    fontSize: 13,
    strokeColor: "#333333"
  },
  // 自定义展开收起按钮的图标
  expandBtnIcon: {
    open: "",
    // svg字符串
    close: ""
  },
  // 处理收起节点数量
  expandBtnNumHandler: null,
  // 是否显示带数量的收起按钮
  isShowExpandNum: true,
  // 是否只有当鼠标在画布内才响应快捷键事件
  enableShortcutOnlyWhenMouseInSvg: true,
  // 自定义判断是否响应快捷键事件，优先级比enableShortcutOnlyWhenMouseInSvg选项高
  // 可以传递一个函数，接收事件对象e为参数，需要返回true或false，返回true代表允许响应快捷键事件，反之不允许，库默认当事件目标为body，或为文本编辑框元素（普通文本编辑框、富文本编辑框、关联线文本编辑框）时响应快捷键，其他不响应
  customCheckEnableShortcut: null,
  // 初始根节点的位置
  initRootNodePosition: null,
  // 节点文本编辑框的z-index
  nodeTextEditZIndex: 3e3,
  // 节点备注浮层的z-index
  nodeNoteTooltipZIndex: 3e3,
  // 是否在点击了画布外的区域时结束节点文本的编辑状态
  isEndNodeTextEditOnClickOuter: true,
  // 最大历史记录数
  maxHistoryCount: 500,
  // 是否一直显示节点的展开收起按钮，默认为鼠标移上去和激活时才显示
  alwaysShowExpandBtn: false,
  // 不显示展开收起按钮，优先级比alwaysShowExpandBtn配置高
  notShowExpandBtn: false,
  // 扩展节点可插入的图标
  iconList: [
    // {
    //   name: '',// 分组名称
    //   type: '',// 分组的值
    //   list: [// 分组下的图标列表
    //     {
    //       name: '',// 图标名称
    //       icon:''// 图标，可以传svg或图片
    //     }
    //   ]
    // }
  ],
  // 节点最大缓存数量
  maxNodeCacheCount: 1e3,
  // 思维导图适应画布大小时的内边距
  fitPadding: 50,
  // 是否开启按住ctrl键多选节点功能
  enableCtrlKeyNodeSelection: true,
  // 设置为左键多选节点，右键拖动画布
  useLeftKeySelectionRightKeyDrag: false,
  // 节点即将进入编辑前的回调方法，如果该方法返回true以外的值，那么将取消编辑，函数可以返回一个值，或一个Promise，回调参数为节点实例
  beforeTextEdit: null,
  // 是否开启自定义节点内容
  isUseCustomNodeContent: false,
  // 自定义返回节点内容的方法
  customCreateNodeContent: null,
  // 指定内部一些元素（节点文本编辑元素、节点备注显示元素、关联线文本编辑元素、节点图片调整按钮元素）添加到的位置，默认添加到document.body下
  customInnerElsAppendTo: null,
  // 是否在存在一个激活节点时，当按下中文、英文、数字按键时自动进入文本编辑模式
  // 开启该特性后，需要给你的输入框绑定keydown事件，并禁止冒泡
  enableAutoEnterTextEditWhenKeydown: false,
  // 当enableAutoEnterTextEditWhenKeydown选项开启时生效，当通过按键进入文本编辑时是否自动清空原有文本
  autoEmptyTextWhenKeydownEnterEdit: false,
  // 自定义对剪贴板文本的处理。当按ctrl+v粘贴时会读取用户剪贴板中的文本和图片，默认只会判断文本是否是普通文本和simple-mind-map格式的节点数据，如果你想处理其他思维导图的数据，比如processon、zhixi等，那么可以传递一个函数，接受当前剪贴板中的文本为参数，返回处理后的数据，可以返回两种类型：
  /*
      1.返回一个纯文本，那么会直接以该文本创建一个子节点
  
      2.返回一个节点对象，格式如下：
        {
          // 代表是simple-mind-map格式的数据
          simpleMindMap: true,
          // 节点数据，同simple-mind-map节点数据格式
          data: {
            data: {
              text: ''
            },
            children: []
          }
        }
    */
  // 如果你的处理逻辑存在异步逻辑，也可以返回一个promise
  customHandleClipboardText: null,
  // 禁止鼠标滚轮缩放，你仍旧可以使用api进行缩放
  disableMouseWheelZoom: false,
  // 错误处理函数
  errorHandler: (code, error) => {
    console.error(code, error);
  },
  // 是否在鼠标双击时回到根节点，也就是让根节点居中显示
  enableDblclickBackToRootNode: false,
  // 节点鼠标hover和激活时显示的矩形边框的颜色
  hoverRectColor: "rgb(94, 200, 248)",
  // 节点鼠标hover和激活时显示的矩形边框距节点内容的距离
  hoverRectPadding: 2,
  // 双击节点进入节点文本编辑时是否默认选中文本，默认只在创建新节点时会选中
  selectTextOnEnterEditText: false,
  // 删除节点后激活相邻节点
  deleteNodeActive: true,
  // 是否首次加载fit view
  fit: false,
  // 自定义标签的颜色
  // {pass: 'green, unpass: 'red'}
  tagsColorMap: {},
  // 节点协作样式配置
  cooperateStyle: {
    avatarSize: 22,
    // 头像大小
    fontSize: 12
    // 如果是文字头像，那么文字的大小
  },
  // 协同编辑时，同一个节点不能同时被多人选中
  onlyOneEnableActiveNodeOnCooperate: false,
  // 插入概要的默认文本
  defaultGeneralizationText: "概要",
  // 粘贴文本的方式创建新节点时，控制是否按换行自动分割节点，即如果存在换行，那么会根据换行创建多个节点，否则只会创建一个节点
  // 可以传递一个函数，返回promise，resolve代表根据换行分割，reject代表忽略换行
  handleIsSplitByWrapOnPasteCreateNewNode: null,
  // 多少时间内只允许添加一次历史记录，避免添加没有必要的中间状态，单位：ms
  addHistoryTime: 100,
  // 是否禁止拖动画布
  isDisableDrag: false,
  // 创建新节点时的行为
  /*
    DEFAULT  ：默认会激活新创建的节点，并且进入编辑模式。如果同时创建了多个新节点，那么只会激活而不会进入编辑模式
    NOT_ACTIVE  : 不激活新创建的节点
    ACTIVE_ONLY  : 只激活新创建的节点，不进入编辑模式
  */
  createNewNodeBehavior: CONSTANTS.CREATE_NEW_NODE_BEHAVIOR.DEFAULT,
  // 当节点图片加载失败时显示的默认图片
  defaultNodeImage: "",
  // 是否将思维导图限制在画布内
  // 比如向右拖动时，思维导图图形的最左侧到达画布中心时将无法继续向右拖动，其他同理
  isLimitMindMapInCanvas: false,
  // 在节点上粘贴剪贴板中的图片的处理方法，默认是转换为data:url数据插入到节点中，你可以通过该方法来将图片数据上传到服务器，实现保存图片的url
  // 可以传递一个异步方法，接收Blob类型的图片数据，需要返回如下结构：
  /*
    {
      url,    // 图片url
      size: {
        width,  // 图片的宽度
        height  //图片的高度
      }
    }
  */
  handleNodePasteImg: null,
  // 自定义创建节点形状的方法，可以传一个函数，均接收一个参数
  // 矩形、圆角矩形、椭圆、圆等形状会调用该方法
  // 接收svg path字符串，返回svg节点
  customCreateNodePath: null,
  // 菱形、平行四边形、八角矩形、外三角矩形、内三角矩形等形状会调用该方法
  // 接收points数组点位，返回svg节点
  customCreateNodePolygon: null,
  // 自定义转换节点连线路径的方法
  // 接收svg path字符串，返回转换后的svg path字符串
  customTransformNodeLinePath: null,
  // 快捷键操作即将执行前的生命周期函数，返回true可以阻止操作执行
  // 函数接收两个参数：key（快捷键）、activeNodeList（当前激活的节点列表）
  beforeShortcutRun: null,
  // 移动节点到画布中心、回到根节点等操作时是否将缩放层级复位为100%
  // 该选项实际影响的是render.moveNodeToCenter方法，moveNodeToCenter方法本身也存在第二个参数resetScale来设置是否复位，如果resetScale参数没有传递，那么使用resetScaleOnMoveNodeToCenter配置，否则使用resetScale配置
  resetScaleOnMoveNodeToCenter: false,
  // 添加附加的节点前置内容，前置内容指和文本同一行的区域中的前置内容，不包括节点图片部分。如果存在编号、任务勾选框内容，这里添加的前置内容会在这两者之后
  createNodePrefixContent: null,
  // 添加附加的节点后置内容，后置内容指和文本同一行的区域中的后置内容，不包括节点图片部分
  createNodePostfixContent: null,
  // 禁止粘贴用户剪贴板中的数据，禁止将复制的数据写入用户的剪贴板中
  disabledClipboard: false,
  // 自定义超链接的跳转
  // 如果不传，默认会以新窗口的方式打开超链接，可以传递一个函数，函数接收两个参数：link（超链接的url）、node（所属节点实例），只要传递了函数，就会阻止默认的跳转
  customHyperlinkJump: null,
  // 是否开启性能模式，默认情况下所有节点都会直接渲染，无论是否处于画布可视区域，这样当节点数量比较多时（1000+）会比较卡，如果你的数据量比较大，那么可以通过该配置开启性能模式，即只渲染画布可视区域内的节点，超出的节点不渲染，这样会大幅提高渲染速度，当然同时也会带来一些其他问题，比如：1.当拖动或是缩放画布时会实时计算并渲染未节点的节点，所以会带来一定卡顿；2.导出图片、svg、pdf时需要先渲染全部节点，所以会比较慢；3.其他目前未发现的问题
  openPerformance: false,
  // 性能优化模式配置
  performanceConfig: {
    time: 250,
    // 当视图改变后多久刷新一次节点，单位：ms，
    padding: 100,
    // 超出画布四周指定范围内依旧渲染节点
    removeNodeWhenOutCanvas: true
    // 节点移除画布可视区域后从画布删除
  },
  // 如果节点文本为空，那么为了避免空白节点高度塌陷，会用该字段指定的文本测量一个高度
  emptyTextMeasureHeightText: "abc123我和你",
  // 是否在进行节点文本编辑时实时更新节点大小和节点位置，开启后当节点数量比较多时可能会造成卡顿
  openRealtimeRenderOnNodeTextEdit: false,
  // 默认会给容器元素el绑定mousedown事件，可通过该选项设置是否阻止其默认事件
  // 如果设置为true，会带来一定问题，比如你聚焦在思维导图外的其他输入框，点击画布就不会触发其失焦
  mousedownEventPreventDefault: false,
  // 在激活上粘贴用户剪贴板中的数据时，如果同时存在文本和图片，那么只粘贴文本，忽略图片
  onlyPasteTextWhenHasImgAndText: true,
  // 是否允许拖拽调整节点的宽度，实际上压缩的是节点里面文本内容的宽度，当节点文本内容宽度压缩到最小时无法继续压缩。如果节点存在图片，那么最小值以图片宽度和文本内容最小宽度的最大值为准（目前该特性仅在两种情况下可用：1.开启了富文本模式，即注册了RichText插件；2.自定义节点内容）
  enableDragModifyNodeWidth: true,
  // 当允许拖拽调整节点的宽度时，可以通过该选项设置节点文本内容允许压缩的最小宽度
  minNodeTextModifyWidth: 20,
  // 同minNodeTextModifyWidth，最大值，传-1代表不限制
  maxNodeTextModifyWidth: -1,
  // 自定义处理节点的连线方法，可以传递一个函数，函数接收三个参数：node（节点实例）、line（节点的某条连线，@svgjs库的path对象）, { width, color, dasharray }，dasharray（该条连线的虚线样式，为none代表实线），你可以修改line对象来达到修改节点连线样式的效果，比如增加流动效果
  customHandleLine: null,
  // 实例化完后是否立刻进行一次历史数据入栈操作
  // 即调用mindMap.command.addHistory方法
  addHistoryOnInit: true,
  // 自定义节点备注图标
  noteIcon: {
    icon: "",
    // svg字符串，如果不是确定要使用svg自带的样式，否则请去除其中的fill等样式属性
    style: {
      // size: 20,// 图标大小，不手动设置则会使用主题的iconSize配置
      // color: '',// 图标颜色，不手动设置则会使用节点文本的颜色
    }
  },
  // 自定义节点超链接图标
  hyperlinkIcon: {
    icon: "",
    // svg字符串，如果不是确定要使用svg自带的样式，否则请去除其中的fill等样式属性
    style: {
      // size: 20,// 图标大小，不手动设置则会使用主题的iconSize配置
      // color: '',// 图标颜色，不手动设置则会使用节点文本的颜色
    }
  },
  // 自定义节点附件图标
  attachmentIcon: {
    icon: "",
    // svg字符串，如果不是确定要使用svg自带的样式，否则请去除其中的fill等样式属性
    style: {
      // size: 20,// 图标大小，不手动设置则会使用主题的iconSize配置
      // color: '',// 图标颜色，不手动设置则会使用节点文本的颜色
    }
  },
  // 是否显示快捷创建子节点按钮
  isShowCreateChildBtnIcon: true,
  // 自定义快捷创建子节点按钮图标
  quickCreateChildBtnIcon: {
    icon: "",
    // svg字符串，如果不是确定要使用svg自带的样式，否则请去除其中的fill等样式属性
    style: {
      // 图标大小使用的是expandBtnSize选项
      // color: '',// 图标颜色，不手动设置则会使用expandBtnStyle选项的color字段
    }
  },
  // 自定义快捷创建子节点按钮的点击操作，
  customQuickCreateChildBtnClick: null,
  // 添加自定义的节点内容
  // 可传递一个对象，格式如下：
  /*
    {
      // 返回要添加的DOM元素详细
      create: (node) => { 
        return {
          el, // DOM节点
          width: 20, // 宽高
          height: 20
        }
      },
      // 处理生成的@svgdotjs/svg.js库的ForeignObject节点实例，可以设置其在节点内的位置
      handle: ({ content, element, node }) => {
        
      }
    }
  */
  addCustomContentToNode: null,
  // 节点连线样式是否允许继承祖先的连线样式
  enableInheritAncestorLineStyle: true,
  // 【Select插件】
  // 多选节点时鼠标移动到边缘时的画布移动偏移量
  selectTranslateStep: 3,
  // 多选节点时鼠标移动距边缘多少距离时开始偏移
  selectTranslateLimit: 20,
  // 【Drag插件】
  // 是否开启节点自由拖拽
  enableFreeDrag: false,
  // 拖拽节点时鼠标移动到画布边缘是否开启画布自动移动
  autoMoveWhenMouseInEdgeOnDrag: true,
  // 拖拽多个节点时随鼠标移动的示意矩形的样式配置
  dragMultiNodeRectConfig: {
    width: 40,
    height: 20,
    fill: "rgb(94, 200, 248)"
    // 填充颜色
  },
  // 节点拖拽时新位置的示意矩形的填充颜色
  dragPlaceholderRectFill: "rgb(94, 200, 248)",
  // 节点拖拽时新位置的示意连线的样式配置
  dragPlaceholderLineConfig: {
    color: "rgb(94, 200, 248)",
    width: 2
  },
  // 节点拖拽时的透明度配置
  dragOpacityConfig: {
    cloneNodeOpacity: 0.5,
    // 跟随鼠标移动的克隆节点或矩形的透明度
    beingDragNodeOpacity: 0.3
    // 被拖拽节点的透明度
  },
  // 拖拽单个节点时会克隆被拖拽节点，如果想修改该克隆节点，那么可以通过该选项提供一个处理函数，函数接收克隆节点对象
  // 需要注意的是节点对象指的是@svgdotjs/svg.js库的元素对象，所以你需要阅读该库的文档来操作该对象
  handleDragCloneNode: null,
  // 即将拖拽完成前调用该函数，函数接收一个对象作为参数：{overlapNodeUid,prevNodeUid,nextNodeUid}，代表拖拽信息，如果要阻止本次拖拽，那么可以返回true，此时node_dragend事件不会再触发。函数可以是异步函数，返回Promise实例
  beforeDragEnd: null,
  // 即将开始调整节点前调用该函数，函数接收当前即将被拖拽的节点实例列表作为参数，如果要阻止本次拖拽，那么可以返回true
  beforeDragStart: null,
  // 【Watermark插件】
  // 水印配置
  watermarkConfig: {
    onlyExport: false,
    // 是否仅在导出时添加水印
    text: "",
    lineSpacing: 100,
    textSpacing: 100,
    angle: 30,
    textStyle: {
      color: "#999",
      opacity: 0.5,
      fontSize: 14
    },
    belowNode: false
  },
  // 【Export插件】
  // 导出png、svg、pdf时的图形内边距，注意是单侧内边距
  exportPaddingX: 10,
  exportPaddingY: 10,
  // 设置导出图片和svg时，针对富文本节点内容，也就是嵌入到svg中的html节点的默认样式覆盖
  // 如果不覆盖，会发生偏移问题
  resetCss: `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
  `,
  // 导出图片时canvas的缩放倍数，该配置会和window.devicePixelRatio值取最大值
  minExportImgCanvasScale: 2,
  // 导出png、svg、pdf时在头部和尾部添加自定义内容
  // 可传递一个函数，这个函数可以返回null代表不添加内容，也可以返回如下数据：
  /*
    {
      el,// 要追加的自定义DOM节点，样式可内联
      cssText,// 可选，如果样式不想内联，可以传递该值，一个css字符串
      height: 50// 返回的DOM节点的高度，必须传递
    }
  */
  addContentToHeader: null,
  addContentToFooter: null,
  // 导出png、svg、pdf时会获取画布上的svg数据进行克隆，然后通过该克隆的元素进行导出，如果你想对该克隆元素做一些处理，比如新增、替换、修改其中的一些元素，那么可以通过该参数传递一个处理函数，接收svg元素对象，处理后，需要返回原svg元素对象。
  // 需要注意的是svg对象指的是@svgdotjs/svg.js库的元素对象，所以你需要阅读该库的文档来操作该对象
  handleBeingExportSvg: null,
  // 导出图片或pdf都是通过canvas将svg绘制出来，再导出，所以如果思维导图特别大，宽高可能会超出canvas支持的上限，所以会进行缩放，这个上限可以通过该参数设置，代表canvas宽和高的最大宽度
  maxCanvasSize: 16384,
  // 【AssociativeLine插件】
  // 关联线默认文字
  defaultAssociativeLineText: "关联",
  // 关联线是否始终显示在节点上层
  // false：即创建关联线和激活关联线时处于最顶层，其他情况下处于节点下方
  associativeLineIsAlwaysAboveNode: true,
  // 默认情况下，新创建的关联线两个端点的位置是根据两个节点中心点的相对位置来计算的，如果你想固定位置，可以通过这个属性来配置
  // from和to都不传，则都自动计算，如果只传一个，另一个则会自动计算
  associativeLineInitPointsPosition: {
    // from和to可选值：left、top、bottom、right
    from: "",
    // 关联线起始节点上端点的位置
    to: ""
    // 关联线目标节点上端点的位置
  },
  // 是否允许调整关联线两个端点的位置
  enableAdjustAssociativeLinePoints: true,
  // 关联线连接即将完成时执行，如果要阻止本次连接可以返回true，函数接收一个参数：node（目标节点实例）
  beforeAssociativeLineConnection: null,
  // 【TouchEvent插件】
  // 禁止双指缩放，你仍旧可以使用api进行缩放
  // 需要注册TouchEvent插件后生效
  disableTouchZoom: false,
  // 允许最大和最小的缩放值，百分数
  // 传-1代表不限制
  minTouchZoomScale: 20,
  maxTouchZoomScale: -1,
  // 【Scrollbar插件】
  // 当注册了滚动条插件（Scrollbar）时，是否将思维导图限制在画布内，isLimitMindMapInCanvas不再起作用
  isLimitMindMapInCanvasWhenHasScrollbar: true,
  // 【Search插件】
  // 是否仅搜索当前渲染的节点，被收起的节点不会被搜索到
  isOnlySearchCurrentRenderNodes: false,
  // 【Cooperate插件】
  // 协同编辑时，节点操作即将更新到其他客户端前的生命周期函数
  // 函数接收一个对象作为参数：
  /*
    {
      type: createOrUpdate（创建节点或更新节点）、delete（删除节点）
      data: 1.当type=createOrUpdate时，代表被创建或被更新的节点数据，即将同步到其他客户端，所以你可以修改该数据；2.当type=delete时，代表被删除的节点数据
    }
  */
  beforeCooperateUpdate: null,
  // 【RainbowLines插件】
  // 彩虹线条配置，需要先注册RainbowLines插件
  rainbowLinesConfig: {
    open: false,
    // 是否开启彩虹线条
    colorsList: []
    // 自定义彩虹线条的颜色列表，如果不设置，会使用默认颜色列表
    /*
    [
      'rgb(255, 213, 73)',
      'rgb(255, 136, 126)',
      'rgb(107, 225, 141)',
      'rgb(151, 171, 255)',
      'rgb(129, 220, 242)',
      'rgb(255, 163, 125)',
      'rgb(152, 132, 234)'
    ]
    */
  },
  // 【Demonstrate插件】
  // 演示插件配置
  demonstrateConfig: null,
  // 【Formula插件】
  // 是否开启在富文本编辑框中直接编辑数学公式
  enableEditFormulaInRichTextEdit: true,
  // katex库的字体文件的请求路径。仅当katex的output配置为html时才会请求字体文件。可以通过mindMap.formula.getKatexConfig()方法来获取当前的配置
  // 字体文件可以从node_modules中找到：katex/dist/fonts/。可以上传到你的服务器或cdn
  // 最终的字体请求路径为`${katexFontPath}fonts/KaTeX_AMS-Regular.woff2`，可以自行拼接进行测试是否可以访问
  katexFontPath: "https://unpkg.com/katex@0.16.11/dist/",
  // 自定义katex库的输出模式。默认当Chrome内核100以下会使用html方式，否则使用mathml方式，如果你有自己的规则，那么可以传递一个函数，函数返回值为：mathml或html
  getKatexOutputType: null,
  // 【RichText插件】
  // 转换富文本内容，当进入富文本编辑时，可以通过该参数传递一个函数，函数接收文本内容，需要返回你处理后的文本内容
  transformRichTextOnEnterEdit: null,
  // 可以传递一个函数，即将结束富文本编辑前会执行该函数，函数接收richText实例，所以你可以在此时机更新quill文档数据
  beforeHideRichTextEdit: null,
  // 【OuterFrame】插件
  outerFramePaddingX: 10,
  outerFramePaddingY: 10,
  defaultOuterFrameText: "外框",
  // 【Painter】插件
  // 是否只格式刷节点手动设置的样式，不考虑节点通过主题的应用的样式
  onlyPainterNodeCustomStyles: false,
  // 【NodeImgAdjust】插件
  // 拦截节点图片的删除，点击节点图片上的删除按钮删除图片前会调用该函数，如果函数返回true则取消删除
  beforeDeleteNodeImg: null,
  // 删除和调整两个按钮的大小
  imgResizeBtnSize: 25,
  // 最小允许缩放的尺寸，请传入>=0的数字
  minImgResizeWidth: 50,
  minImgResizeHeight: 50,
  // 最大允许缩放的尺寸依据主题的配置，即主题的imgMaxWidth和imgMaxHeight配置，如果设置为false，那么使用maxImgResizeWidth和maxImgResizeHeight选项
  maxImgResizeWidthInheritTheme: false,
  // 最大允许缩放的尺寸，maxImgResizeWidthInheritTheme选项设置为false时生效，不限制最大值可传递Infinity
  maxImgResizeWidth: Infinity,
  maxImgResizeHeight: Infinity,
  // 自定义删除按钮和尺寸调整按钮的内容
  // 默认为内置图标，你可以传递一个svg字符串，或者其他的html字符串
  // 整体大小请使用上面的minImgResizeWidth和minImgResizeHeight选项设置
  customDeleteBtnInnerHTML: "",
  customResizeBtnInnerHTML: ""
};
class MindMap2 {
  //  构造函数
  /**
   *
   * @param {defaultOpt} opt
   */
  constructor(opt = {}) {
    MindMap2.instanceCount++;
    this.opt = this.handleOpt(deepmerge_1(defaultOpt, opt));
    this.opt.data = this.handleData(this.opt.data);
    this.el = this.opt.el;
    if (!this.el) throw new Error("缺少容器元素el");
    this.getElRectInfo();
    this.initWidth = this.width;
    this.initHeight = this.height;
    this.cssEl = null;
    this.cssTextMap = {};
    this.nodeInnerPrefixList = [];
    this.nodeInnerPostfixList = [];
    this.editNodeClassList = [];
    this.extendShapeList = [];
    this.initContainer();
    this.initTheme();
    this.initCache();
    MindMap2.pluginList.filter((plugin) => {
      return plugin.preload;
    }).forEach((plugin) => {
      this.initPlugin(plugin);
    });
    this.event = new Event({
      mindMap: this
    });
    this.keyCommand = new KeyCommand({
      mindMap: this
    });
    this.command = new Command({
      mindMap: this
    });
    this.renderer = new Render({
      mindMap: this
    });
    this.view = new View({
      mindMap: this
    });
    this.batchExecution = new BatchExecution();
    MindMap2.pluginList.filter((plugin) => {
      return !plugin.preload;
    }).forEach((plugin) => {
      this.initPlugin(plugin);
    });
    this.addCss();
    this.render(this.opt.fit ? () => this.view.fit() : () => {
    });
    if (this.opt.addHistoryOnInit && this.opt.data) {
      this.command.addHistory();
    }
  }
  //  配置参数处理
  handleOpt(opt) {
    if (!layoutValueList.includes(opt.layout)) {
      opt.layout = CONSTANTS.LAYOUT.LOGICAL_STRUCTURE;
    }
    opt.theme = opt.theme && theme[opt.theme] ? opt.theme : "default";
    return opt;
  }
  // 预处理节点数据
  handleData(data2) {
    if (isUndef(data2) || Object.keys(data2).length <= 0) return null;
    data2 = simpleDeepClone(data2 || {});
    if (data2.data && !data2.data.expand) {
      data2.data.expand = true;
    }
    createUidForAppointNodes([data2], false, null, true);
    return data2;
  }
  // 创建容器元素
  initContainer() {
    const { associativeLineIsAlwaysAboveNode } = this.opt;
    this.el.classList.add("smm-mind-map-container");
    const createAssociativeLineDraw = () => {
      this.associativeLineDraw = this.draw.group();
      this.associativeLineDraw.addClass("smm-associative-line-container");
    };
    this.svg = SVG().addTo(this.el).size(this.width, this.height);
    this.draw = this.svg.group();
    this.draw.addClass("smm-container");
    this.lineDraw = this.draw.group();
    this.lineDraw.addClass("smm-line-container");
    if (!associativeLineIsAlwaysAboveNode) {
      createAssociativeLineDraw();
    }
    this.nodeDraw = this.draw.group();
    this.nodeDraw.addClass("smm-node-container");
    if (associativeLineIsAlwaysAboveNode) {
      createAssociativeLineDraw();
    }
    this.otherDraw = this.draw.group();
    this.otherDraw.addClass("smm-other-container");
  }
  // 清空各容器
  clearDraw() {
    this.lineDraw.clear();
    this.associativeLineDraw.clear();
    this.nodeDraw.clear();
    this.otherDraw.clear();
  }
  // 追加必要的css样式
  // 该样式在实例化时会动态添加到页面，同时导出为svg时也会添加到svg源码中
  appendCss(key, str) {
    this.cssTextMap[key] = str;
    this.removeCss();
    this.addCss();
  }
  // 移除追加的css样式
  removeAppendCss(key) {
    if (this.cssTextMap[key]) {
      delete this.cssTextMap[key];
      this.removeCss();
      this.addCss();
    }
  }
  // 拼接必要的css样式
  joinCss() {
    return cssContent + Object.keys(this.cssTextMap).map((key) => {
      return this.cssTextMap[key];
    }).join("\n");
  }
  // 添加必要的css样式到页面
  addCss() {
    this.cssEl = document.createElement("style");
    this.cssEl.type = "text/css";
    this.cssEl.innerHTML = this.joinCss();
    document.head.appendChild(this.cssEl);
  }
  // 移除css
  removeCss() {
    if (this.cssEl) document.head.removeChild(this.cssEl);
  }
  // 检查某个编辑节点类名是否存在，返回索引
  checkEditNodeClassIndex(className) {
    return this.editNodeClassList.findIndex((item) => {
      return item === className;
    });
  }
  // 添加一个编辑节点类名
  addEditNodeClass(className) {
    const index = this.checkEditNodeClassIndex(className);
    if (index === -1) {
      this.editNodeClassList.push(className);
    }
  }
  // 删除一个编辑节点类名
  deleteEditNodeClass(className) {
    const index = this.checkEditNodeClassIndex(className);
    if (index !== -1) {
      this.editNodeClassList.splice(index, 1);
    }
  }
  //  渲染，部分渲染
  render(callback, source = "") {
    this.initTheme();
    this.renderer.render(callback, source);
  }
  //  重新渲染
  reRender(callback, source = "") {
    this.renderer.reRender = true;
    this.renderer.clearCache();
    this.clearDraw();
    this.render(callback, source);
  }
  // 获取或更新容器尺寸位置信息
  getElRectInfo() {
    this.elRect = this.el.getBoundingClientRect();
    this.width = this.elRect.width;
    this.height = this.elRect.height;
    if (this.width <= 0 || this.height <= 0)
      throw new Error("容器元素el的宽高不能为0");
  }
  //  容器尺寸变化，调整尺寸
  resize() {
    const oldWidth = this.width;
    const oldHeight = this.height;
    this.getElRectInfo();
    this.svg.size(this.width, this.height);
    if (oldWidth !== this.width || oldHeight !== this.height) {
      if (this.demonstrate) {
        if (!this.demonstrate.isInDemonstrate) {
          this.render();
        }
      } else {
        this.render();
      }
    }
    this.emit("resize");
  }
  //  监听事件
  on(event, fn) {
    this.event.on(event, fn);
  }
  //  触发事件
  emit(event, ...args) {
    this.event.emit(event, ...args);
  }
  //  解绑事件
  off(event, fn) {
    this.event.off(event, fn);
  }
  // 初始化缓存数据
  initCache() {
    this.commonCaches = {
      measureCustomNodeContentSizeEl: null,
      measureRichtextNodeTextSizeEl: null
    };
  }
  //  设置主题
  initTheme() {
    this.themeConfig = mergeTheme(
      theme[this.opt.theme] || theme.default,
      this.opt.themeConfig
    );
    Style2.setBackgroundStyle(this.el, this.themeConfig);
  }
  //  设置主题
  setTheme(theme2, notRender = false) {
    this.execCommand("CLEAR_ACTIVE_NODE");
    this.opt.theme = theme2;
    if (!notRender) {
      this.render(null, CONSTANTS.CHANGE_THEME);
    }
    this.emit("view_theme_change", theme2);
  }
  //  获取当前主题
  getTheme() {
    return this.opt.theme;
  }
  //  设置主题配置
  setThemeConfig(config, notRender = false) {
    const changedConfig = getObjectChangedProps(this.themeConfig, config);
    this.opt.themeConfig = config;
    if (!notRender) {
      const res = checkIsNodeSizeIndependenceConfig(changedConfig);
      this.render(null, res ? "" : CONSTANTS.CHANGE_THEME);
    }
  }
  //  获取自定义主题配置
  getCustomThemeConfig() {
    return this.opt.themeConfig;
  }
  //  获取某个主题配置值
  getThemeConfig(prop) {
    return prop === void 0 ? this.themeConfig : this.themeConfig[prop];
  }
  // 获取配置
  getConfig(prop) {
    return prop === void 0 ? this.opt : this.opt[prop];
  }
  // 更新配置
  updateConfig(opt = {}) {
    this.emit("before_update_config", this.opt);
    const lastOpt = {
      ...this.opt
    };
    this.opt = this.handleOpt(deepmerge_1.all([defaultOpt, this.opt, opt]));
    this.emit("after_update_config", this.opt, lastOpt);
  }
  //  获取当前布局结构
  getLayout() {
    return this.opt.layout;
  }
  //  设置布局结构
  setLayout(layout2, notRender = false) {
    if (!layoutValueList.includes(layout2)) {
      layout2 = CONSTANTS.LAYOUT.LOGICAL_STRUCTURE;
    }
    this.opt.layout = layout2;
    this.view.reset();
    this.renderer.setLayout();
    if (!notRender) {
      this.render(null, CONSTANTS.CHANGE_LAYOUT);
    }
    this.emit("layout_change", layout2);
  }
  //  执行命令
  execCommand(...args) {
    this.command.exec(...args);
  }
  // 更新画布数据，如果新的数据是在当前画布节点数据基础上增删改查后形成的，那么可以使用该方法来更新画布数据
  updateData(data2) {
    data2 = this.handleData(data2);
    this.emit("before_update_data", data2);
    this.renderer.setData(data2);
    this.render();
    this.command.addHistory();
    this.emit("update_data", data2);
  }
  //  动态设置思维导图数据，纯节点数据
  setData(data2) {
    data2 = this.handleData(data2);
    this.emit("before_set_data", data2);
    this.opt.data = data2;
    this.execCommand("CLEAR_ACTIVE_NODE");
    this.command.clearHistory();
    this.command.addHistory();
    this.renderer.setData(data2);
    this.reRender();
    this.emit("set_data", data2);
  }
  //  动态设置思维导图数据，包括节点数据、布局、主题、视图
  setFullData(data2) {
    if (data2.root) {
      this.setData(data2.root);
    }
    if (data2.layout) {
      this.setLayout(data2.layout);
    }
    if (data2.theme) {
      if (data2.theme.template) {
        this.setTheme(data2.theme.template);
      }
      if (data2.theme.config) {
        this.setThemeConfig(data2.theme.config);
      }
    }
    if (data2.view) {
      this.view.setTransformData(data2.view);
    }
  }
  //  获取思维导图数据，节点树、主题、布局等
  getData(withConfig) {
    let nodeData = this.command.getCopyData();
    let data2 = {};
    if (withConfig) {
      data2 = {
        layout: this.getLayout(),
        root: nodeData,
        theme: {
          template: this.getTheme(),
          config: this.getCustomThemeConfig()
        },
        view: this.view.getTransformData()
      };
    } else {
      data2 = nodeData;
    }
    return simpleDeepClone(data2);
  }
  //  导出
  async export(...args) {
    try {
      if (!this.doExport) {
        throw new Error("请注册Export插件！");
      }
      let result = await this.doExport.export(...args);
      return result;
    } catch (error) {
      this.opt.errorHandler(ERROR_TYPES.EXPORT_ERROR, error);
    }
  }
  //  转换位置
  toPos(x2, y2) {
    return {
      x: x2 - this.elRect.left,
      y: y2 - this.elRect.top
    };
  }
  //  设置只读模式、编辑模式
  setMode(mode) {
    if (![CONSTANTS.MODE.READONLY, CONSTANTS.MODE.EDIT].includes(mode)) {
      return;
    }
    const isReadonly = mode === CONSTANTS.MODE.READONLY;
    if (isReadonly === this.opt.readonly) return;
    if (isReadonly) {
      if (this.renderer.textEdit.isShowTextEdit()) {
        this.renderer.textEdit.hideEditTextBox();
        this.command.originAddHistory();
      }
      this.execCommand("CLEAR_ACTIVE_NODE");
    }
    this.opt.readonly = isReadonly;
    if (!isReadonly && this.command.history.length <= 0) {
      this.command.originAddHistory();
    }
    this.emit("mode_change", mode);
  }
  // 获取svg数据
  getSvgData({
    paddingX = 0,
    paddingY = 0,
    ignoreWatermark = false,
    addContentToHeader,
    addContentToFooter,
    node
  } = {}) {
    const { watermarkConfig, openPerformance } = this.opt;
    if (openPerformance) {
      this.renderer.forceLoadNode(node);
    }
    const { cssTextList, header, headerHeight, footer, footerHeight } = handleGetSvgDataExtraContent({
      addContentToHeader,
      addContentToFooter
    });
    const svg2 = this.svg;
    const draw = this.draw;
    const origWidth = svg2.width();
    const origHeight = svg2.height();
    const origTransform = draw.transform();
    const elRect = this.elRect;
    draw.scale(1 / origTransform.scaleX, 1 / origTransform.scaleY);
    const rect = draw.rbox();
    let clipData = null;
    if (node) {
      clipData = getNodeTreeBoundingRect(
        node,
        rect.x,
        rect.y,
        paddingX,
        paddingY
      );
    }
    const fixHeight = 0;
    rect.width += paddingX * 2;
    rect.height += paddingY * 2 + fixHeight + headerHeight + footerHeight;
    draw.translate(paddingX, paddingY);
    svg2.size(rect.width, rect.height);
    draw.translate(-rect.x + elRect.left, -rect.y + elRect.top);
    let clone2 = svg2.clone();
    const hasWatermark = this.watermark && this.watermark.hasWatermark();
    if (!ignoreWatermark && hasWatermark) {
      this.watermark.isInExport = true;
      const { onlyExport } = watermarkConfig;
      const needReDrawWatermark = rect.width > origWidth || rect.height > origHeight;
      if (needReDrawWatermark) {
        this.width = rect.width;
        this.height = rect.height;
        this.watermark.onResize();
        clone2 = svg2.clone();
        this.width = origWidth;
        this.height = origHeight;
        this.watermark.onResize();
      } else if (onlyExport) {
        this.watermark.onResize();
        clone2 = svg2.clone();
      }
      if (onlyExport) {
        this.watermark.clear();
      }
      this.watermark.isInExport = false;
    }
    [this.joinCss(), ...cssTextList].forEach((s) => {
      clone2.add(SVG(`<style>${s}</style>`));
    });
    if (header && headerHeight > 0) {
      clone2.findOne(".smm-container").translate(0, headerHeight);
      header.width(rect.width);
      header.y(paddingY);
      clone2.add(header, 0);
    }
    if (footer && footerHeight > 0) {
      footer.width(rect.width);
      footer.y(rect.height - paddingY - footerHeight);
      clone2.add(footer);
    }
    const defs = svg2.find("defs");
    const defs2 = clone2.find("defs");
    defs.forEach((def, defIndex) => {
      const def2 = defs2[defIndex];
      if (!def2) return;
      const children = def.children();
      const children2 = def2.children();
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const child2 = children2[i];
        if (child && child2) {
          child2.attr("id", child.attr("id"));
        }
      }
    });
    svg2.size(origWidth, origHeight);
    draw.transform(origTransform);
    return {
      svg: clone2,
      // 思维导图图形的整体svg元素，包括：svg（画布容器）、g（实际的思维导图组）
      svgHTML: clone2.svg(),
      // svg字符串
      clipData,
      rect: {
        ...rect,
        // 思维导图图形未缩放时的位置尺寸等信息
        ratio: rect.width / rect.height
        // 思维导图图形的宽高比
      },
      origWidth,
      // 画布宽度
      origHeight,
      // 画布高度
      scaleX: origTransform.scaleX,
      // 思维导图图形的水平缩放值
      scaleY: origTransform.scaleY
      // 思维导图图形的垂直缩放值
    };
  }
  // 扩展节点形状
  addShape(shape) {
    if (!shape) return;
    const exist = this.extendShapeList.find((item) => {
      return item.name === shape.name;
    });
    if (exist) return;
    this.extendShapeList.push(shape);
  }
  // 删除扩展的形状
  removeShape(name) {
    const index = this.extendShapeList.findIndex((item) => {
      return item.name === name;
    });
    if (index !== -1) {
      this.extendShapeList.splice(index, 1);
    }
  }
  // 获取SVG.js库的一些对象
  getSvgObjects() {
    return {
      SVG,
      G,
      Rect
    };
  }
  // 添加插件
  addPlugin(plugin, opt) {
    let index = MindMap2.hasPlugin(plugin);
    if (index === -1) {
      MindMap2.usePlugin(plugin, opt);
    }
    this.initPlugin(plugin);
  }
  // 移除插件
  removePlugin(plugin) {
    let index = MindMap2.hasPlugin(plugin);
    if (index !== -1) {
      MindMap2.pluginList.splice(index, 1);
      if (this[plugin.instanceName]) {
        if (this[plugin.instanceName].beforePluginRemove) {
          this[plugin.instanceName].beforePluginRemove();
        }
        delete this[plugin.instanceName];
      }
    }
  }
  // 实例化插件
  initPlugin(plugin) {
    if (this[plugin.instanceName]) return;
    this[plugin.instanceName] = new plugin({
      mindMap: this,
      pluginOpt: plugin.pluginOpt
    });
  }
  // 销毁
  destroy() {
    this.emit("beforeDestroy");
    this.renderer.textEdit.hideEditTextBox();
    this.renderer.textEdit.removeTextEditEl();
    [...MindMap2.pluginList].forEach((plugin) => {
      if (this[plugin.instanceName] && this[plugin.instanceName].beforePluginDestroy) {
        this[plugin.instanceName].beforePluginDestroy();
      }
      this[plugin.instanceName] = null;
    });
    this.event.unbind();
    this.svg.remove();
    Style2.removeBackgroundStyle(this.el);
    this.el.classList.remove("smm-mind-map-container");
    this.el.innerHTML = "";
    this.el = null;
    this.removeCss();
    MindMap2.instanceCount--;
  }
}
let _extendNodeDataNoStylePropList = [];
MindMap2.extendNodeDataNoStylePropList = (list = []) => {
  _extendNodeDataNoStylePropList.push(...list);
  nodeDataNoStylePropList.push(...list);
};
MindMap2.resetNodeDataNoStylePropList = () => {
  _extendNodeDataNoStylePropList.forEach((item) => {
    const index = nodeDataNoStylePropList.findIndex((item2) => {
      return item2 === item;
    });
    if (index !== -1) {
      nodeDataNoStylePropList.splice(index, 1);
    }
  });
  _extendNodeDataNoStylePropList = [];
};
MindMap2.pluginList = [];
MindMap2.usePlugin = (plugin, opt = {}) => {
  if (MindMap2.hasPlugin(plugin) !== -1) return MindMap2;
  plugin.pluginOpt = opt;
  MindMap2.pluginList.push(plugin);
  return MindMap2;
};
MindMap2.hasPlugin = (plugin) => {
  return MindMap2.pluginList.findIndex((item) => {
    return item === plugin;
  });
};
MindMap2.instanceCount = 0;
MindMap2.defineTheme = (name, config = {}) => {
  if (theme[name]) {
    return new Error("该主题名称已存在");
  }
  theme[name] = mergeTheme(defaultTheme, config);
};
MindMap2.removeTheme = (name) => {
  if (theme[name]) {
    theme[name] = null;
  }
};
class AutoMove {
  constructor(mindMap) {
    this.mindMap = mindMap;
    this.autoMoveTimer = null;
  }
  //  鼠标移动事件
  onMove(x2, y2, callback = () => {
  }, handle = () => {
  }) {
    callback();
    let step = this.mindMap.opt.selectTranslateStep;
    let limit = this.mindMap.opt.selectTranslateLimit;
    let count = 0;
    if (x2 <= this.mindMap.elRect.left + limit) {
      handle("left", step);
      this.mindMap.view.translateX(step);
      count++;
    }
    if (x2 >= this.mindMap.elRect.right - limit) {
      handle("right", step);
      this.mindMap.view.translateX(-step);
      count++;
    }
    if (y2 <= this.mindMap.elRect.top + limit) {
      handle("top", step);
      this.mindMap.view.translateY(step);
      count++;
    }
    if (y2 >= this.mindMap.elRect.bottom - limit) {
      handle("bottom", step);
      this.mindMap.view.translateY(-step);
      count++;
    }
    if (count > 0) {
      this.startAutoMove(x2, y2, callback, handle);
    }
  }
  //  开启自动移动
  startAutoMove(x2, y2, callback, handle) {
    this.autoMoveTimer = setTimeout(() => {
      this.onMove(x2, y2, callback, handle);
    }, 20);
  }
  // 清除自动移动定时器
  clearAutoMoveTimer() {
    clearTimeout(this.autoMoveTimer);
  }
}
class Drag extends Base2 {
  //  构造函数
  constructor({ mindMap }) {
    super(mindMap.renderer);
    this.mindMap = mindMap;
    this.autoMove = new AutoMove(mindMap);
    this.reset();
    this.bindEvent();
  }
  //  复位
  reset() {
    this.isDragging = false;
    this.mousedownNode = null;
    this.beingDragNodeList = [];
    this.nodeList = [];
    this.overlapNode = null;
    this.prevNode = null;
    this.nextNode = null;
    this.drawTransform = null;
    this.clone = null;
    this.placeholder = null;
    this.placeholderWidth = 50;
    this.placeholderHeight = 10;
    this.placeHolderLine = null;
    this.placeHolderExtraLines = [];
    this.offsetX = 0;
    this.offsetY = 0;
    this.isMousedown = false;
    this.mouseDownX = 0;
    this.mouseDownY = 0;
    this.mouseMoveX = 0;
    this.mouseMoveY = 0;
    this.checkDragOffset = 10;
    this.minOffset = 10;
  }
  //  绑定事件
  bindEvent() {
    this.onNodeMousedown = this.onNodeMousedown.bind(this);
    this.onMousemove = this.onMousemove.bind(this);
    this.onMouseup = this.onMouseup.bind(this);
    this.checkOverlapNode = throttle(this.checkOverlapNode, 300, this);
    this.mindMap.on("node_mousedown", this.onNodeMousedown);
    this.mindMap.on("mousemove", this.onMousemove);
    this.mindMap.on("node_mouseup", this.onMouseup);
    this.mindMap.on("mouseup", this.onMouseup);
  }
  // 解绑事件
  unBindEvent() {
    this.mindMap.off("node_mousedown", this.onNodeMousedown);
    this.mindMap.off("mousemove", this.onMousemove);
    this.mindMap.off("node_mouseup", this.onMouseup);
    this.mindMap.off("mouseup", this.onMouseup);
  }
  // 节点鼠标按下事件
  onNodeMousedown(node, e) {
    if (this.mindMap.opt.readonly || e.which !== 1 || node.isGeneralization || node.isRoot) {
      return;
    }
    this.isMousedown = true;
    this.mousedownNode = node;
    const { x: x2, y: y2 } = this.mindMap.toPos(e.clientX, e.clientY);
    this.mouseDownX = x2;
    this.mouseDownY = y2;
  }
  // 鼠标移动事件
  onMousemove(e) {
    if (this.mindMap.opt.readonly || !this.isMousedown) {
      return;
    }
    e.preventDefault();
    const { x: x2, y: y2 } = this.mindMap.toPos(e.clientX, e.clientY);
    this.mouseMoveX = x2;
    this.mouseMoveY = y2;
    if (!this.isDragging && Math.abs(x2 - this.mouseDownX) <= this.checkDragOffset && Math.abs(y2 - this.mouseDownY) <= this.checkDragOffset) {
      return;
    }
    this.mindMap.emit("node_dragging", this.mousedownNode);
    this.handleStartMove();
    this.onMove(x2, y2, e);
  }
  //  鼠标松开事件
  async onMouseup(e) {
    if (!this.isMousedown) {
      return;
    }
    const { autoMoveWhenMouseInEdgeOnDrag, enableFreeDrag, beforeDragEnd } = this.mindMap.opt;
    if (autoMoveWhenMouseInEdgeOnDrag && this.mindMap.select) {
      this.autoMove.clearAutoMoveTimer();
    }
    this.isMousedown = false;
    this.beingDragNodeList.forEach((node) => {
      node.setOpacity(1);
      node.showChildren();
      node.endDrag();
    });
    this.removeCloneNode();
    let overlapNodeUid = this.overlapNode ? this.overlapNode.getData("uid") : "";
    let prevNodeUid = this.prevNode ? this.prevNode.getData("uid") : "";
    let nextNodeUid = this.nextNode ? this.nextNode.getData("uid") : "";
    if (this.isDragging && typeof beforeDragEnd === "function") {
      const isCancel = await beforeDragEnd({
        overlapNodeUid,
        prevNodeUid,
        nextNodeUid,
        beingDragNodeList: [...this.beingDragNodeList]
      });
      if (isCancel) {
        this.reset();
        return;
      }
    }
    if (this.overlapNode) {
      this.removeNodeActive(this.overlapNode);
      this.mindMap.execCommand(
        "MOVE_NODE_TO",
        this.beingDragNodeList,
        this.overlapNode
      );
    } else if (this.prevNode) {
      this.removeNodeActive(this.prevNode);
      this.mindMap.execCommand(
        "INSERT_AFTER",
        this.beingDragNodeList,
        this.prevNode
      );
    } else if (this.nextNode) {
      this.removeNodeActive(this.nextNode);
      this.mindMap.execCommand(
        "INSERT_BEFORE",
        this.beingDragNodeList,
        this.nextNode
      );
    } else if (this.clone && enableFreeDrag && this.beingDragNodeList.length === 1) {
      let { x: x2, y: y2 } = this.mindMap.toPos(
        e.clientX - this.offsetX,
        e.clientY - this.offsetY
      );
      let { scaleX, scaleY, translateX, translateY } = this.drawTransform;
      x2 = (x2 - translateX) / scaleX;
      y2 = (y2 - translateY) / scaleY;
      this.mousedownNode.left = x2;
      this.mousedownNode.top = y2;
      this.mousedownNode.customLeft = x2;
      this.mousedownNode.customTop = y2;
      this.mindMap.execCommand(
        "SET_NODE_CUSTOM_POSITION",
        this.mousedownNode,
        x2,
        y2
      );
      this.mindMap.render();
    }
    if (this.isDragging) {
      this.mindMap.emit("node_dragend", {
        overlapNodeUid,
        prevNodeUid,
        nextNodeUid
      });
    }
    this.reset();
  }
  // 移除节点的激活状态
  removeNodeActive(node) {
    if (node.getData("isActive")) {
      this.mindMap.execCommand("SET_NODE_ACTIVE", node, false);
    }
  }
  //  拖动中
  onMove(x2, y2, e) {
    if (!this.isMousedown || !this.isDragging) {
      return;
    }
    let { scaleX, scaleY, translateX, translateY } = this.drawTransform;
    let cloneNodeLeft = x2 - this.offsetX;
    let cloneNodeTop = y2 - this.offsetY;
    x2 = (cloneNodeLeft - translateX) / scaleX;
    y2 = (cloneNodeTop - translateY) / scaleY;
    let t = this.clone.transform();
    this.clone.translate(x2 - t.translateX, y2 - t.translateY);
    this.checkOverlapNode();
    this.drawTransform = this.mindMap.draw.transform();
    this.autoMove.clearAutoMoveTimer();
    this.autoMove.onMove(e.clientX, e.clientY);
  }
  // 开始拖拽时初始化一些数据
  async handleStartMove() {
    if (!this.isDragging) {
      let node = this.mousedownNode;
      this.drawTransform = this.mindMap.draw.transform();
      let { scaleX, scaleY, translateX, translateY } = this.drawTransform;
      this.offsetX = this.mouseDownX - (node.left * scaleX + translateX);
      this.offsetY = this.mouseDownY - (node.top * scaleY + translateY);
      if (node.getData("isActive")) {
        this.beingDragNodeList = sortNodeList(
          getTopAncestorsFomNodeList(
            // 过滤掉根节点和概要节点
            this.mindMap.renderer.activeNodeList.filter((item) => {
              return !item.isRoot && !item.isGeneralization;
            })
          )
        );
      } else {
        this.beingDragNodeList = [node];
      }
      const { beforeDragStart } = this.mindMap.opt;
      if (typeof beforeDragStart === "function") {
        const stop = await beforeDragStart([...this.beingDragNodeList]);
        if (stop) return;
      }
      this.nodeTreeToList();
      this.createCloneNode();
      this.mindMap.execCommand("CLEAR_ACTIVE_NODE");
      this.isDragging = true;
    }
  }
  // 节点由树转换成数组，从子节点到根节点
  nodeTreeToList() {
    const list = [];
    bfsWalk(this.mindMap.renderer.root, (node) => {
      if (this.checkIsInBeingDragNodeList(node)) {
        return;
      }
      if (!list[node.layerIndex]) {
        list[node.layerIndex] = [];
      }
      list[node.layerIndex].push(node);
    });
    this.nodeList = list.reduceRight((res, cur) => {
      return [...res, ...cur];
    }, []);
  }
  //  创建克隆节点
  createCloneNode() {
    if (!this.clone) {
      const {
        dragMultiNodeRectConfig,
        dragPlaceholderRectFill,
        dragPlaceholderLineConfig,
        dragOpacityConfig,
        handleDragCloneNode
      } = this.mindMap.opt;
      const {
        width: rectWidth,
        height: rectHeight,
        fill: rectFill
      } = dragMultiNodeRectConfig;
      const node = this.beingDragNodeList[0];
      const lineColor = node.style.merge("lineColor", true);
      if (this.beingDragNodeList.length > 1) {
        this.clone = this.mindMap.otherDraw.rect().size(rectWidth, rectHeight).radius(rectHeight / 2).fill({
          color: rectFill || lineColor
        });
        this.offsetX = rectWidth / 2;
        this.offsetY = rectHeight / 2;
      } else {
        this.clone = node.group.clone();
        const expandEl = this.clone.findOne(".smm-expand-btn");
        if (expandEl) {
          expandEl.remove();
        }
        this.mindMap.otherDraw.add(this.clone);
        if (typeof handleDragCloneNode === "function") {
          handleDragCloneNode(this.clone);
        }
      }
      this.clone.opacity(dragOpacityConfig.cloneNodeOpacity);
      this.clone.css("z-index", 99999);
      this.placeholder = this.mindMap.otherDraw.rect().fill({
        color: dragPlaceholderRectFill || lineColor
      }).radius(5);
      this.placeHolderLine = this.mindMap.otherDraw.path().stroke({
        color: dragPlaceholderLineConfig.color || lineColor,
        width: dragPlaceholderLineConfig.width
      }).fill({ color: "none" });
      this.beingDragNodeList.forEach((node2) => {
        node2.setOpacity(dragOpacityConfig.beingDragNodeOpacity);
        node2.hideChildren();
        node2.startDrag();
      });
    }
  }
  //  移除克隆节点
  removeCloneNode() {
    if (!this.clone) {
      return;
    }
    this.clone.remove();
    this.placeholder.remove();
    this.placeHolderLine.remove();
    this.removeExtraLines();
  }
  // 移除额外创建的连线
  removeExtraLines() {
    this.placeHolderExtraLines.forEach((item) => {
      item.remove();
    });
    this.placeHolderExtraLines = [];
  }
  //  检测重叠节点
  checkOverlapNode() {
    if (!this.drawTransform || !this.placeholder) {
      return;
    }
    const {
      LOGICAL_STRUCTURE,
      LOGICAL_STRUCTURE_LEFT,
      MIND_MAP,
      ORGANIZATION_STRUCTURE,
      CATALOG_ORGANIZATION,
      TIMELINE,
      TIMELINE2,
      VERTICAL_TIMELINE,
      VERTICAL_TIMELINE2,
      VERTICAL_TIMELINE3,
      FISHBONE,
      FISHBONE2,
      RIGHT_FISHBONE,
      RIGHT_FISHBONE2
    } = CONSTANTS.LAYOUT;
    this.overlapNode = null;
    this.prevNode = null;
    this.nextNode = null;
    this.placeholder.size(0, 0);
    this.placeHolderLine.hide();
    this.removeExtraLines();
    this.nodeList.forEach((node) => {
      if (node.getData("isActive")) {
        this.mindMap.execCommand("SET_NODE_ACTIVE", node, false);
      }
      if (this.overlapNode || this.prevNode && this.nextNode) {
        return;
      }
      switch (this.mindMap.opt.layout) {
        case LOGICAL_STRUCTURE:
        case LOGICAL_STRUCTURE_LEFT:
          this.handleLogicalStructure(node);
          break;
        case MIND_MAP:
          this.handleMindMap(node);
          break;
        case ORGANIZATION_STRUCTURE:
          this.handleOrganizationStructure(node);
          break;
        case CATALOG_ORGANIZATION:
          this.handleCatalogOrganization(node);
          break;
        case TIMELINE:
          this.handleTimeLine(node);
          break;
        case TIMELINE2:
          this.handleTimeLine2(node);
          break;
        case VERTICAL_TIMELINE:
        case VERTICAL_TIMELINE2:
        case VERTICAL_TIMELINE3:
          this.handleLogicalStructure(node);
          break;
        case FISHBONE:
        case FISHBONE2:
        case RIGHT_FISHBONE:
        case RIGHT_FISHBONE2:
          this.handleFishbone(node);
          break;
        default:
          this.handleLogicalStructure(node);
      }
    });
    if (this.overlapNode) {
      this.handleOverlapNode();
    }
  }
  // 处理作为子节点的情况
  handleOverlapNode() {
    const {
      LOGICAL_STRUCTURE,
      LOGICAL_STRUCTURE_LEFT,
      MIND_MAP,
      ORGANIZATION_STRUCTURE,
      CATALOG_ORGANIZATION,
      TIMELINE,
      TIMELINE2,
      VERTICAL_TIMELINE,
      VERTICAL_TIMELINE2,
      VERTICAL_TIMELINE3,
      FISHBONE,
      FISHBONE2,
      RIGHT_FISHBONE,
      RIGHT_FISHBONE2
    } = CONSTANTS.LAYOUT;
    const { LEFT, TOP, RIGHT, BOTTOM } = CONSTANTS.LAYOUT_GROW_DIR;
    const layerIndex = this.overlapNode.layerIndex;
    const children = this.overlapNode.children;
    const marginX = this.mindMap.renderer.layout.getMarginX(layerIndex + 1);
    const marginY = this.mindMap.renderer.layout.getMarginY(layerIndex + 1);
    const halfPlaceholderWidth = this.placeholderWidth / 2;
    const halfPlaceholderHeight = this.placeholderHeight / 2;
    let dir = "";
    let x2 = "";
    let y2 = "";
    let rotate = false;
    let notRenderPlaceholder = false;
    if (children.length > 0) {
      const lastChild = children[children.length - 1];
      const lastNodeRect = this.getNodeRect(lastChild);
      dir = this.getNewChildNodeDir(lastChild);
      switch (this.mindMap.opt.layout) {
        case LOGICAL_STRUCTURE:
        case MIND_MAP:
          x2 = dir === LEFT ? lastNodeRect.originRight - this.placeholderWidth : lastNodeRect.originLeft;
          y2 = lastNodeRect.originBottom + this.minOffset - halfPlaceholderHeight;
          break;
        case LOGICAL_STRUCTURE_LEFT:
          x2 = lastNodeRect.originRight - this.placeholderWidth;
          y2 = lastNodeRect.originBottom + this.minOffset - halfPlaceholderHeight;
          break;
        case ORGANIZATION_STRUCTURE:
          rotate = true;
          x2 = lastNodeRect.originRight + this.minOffset - halfPlaceholderHeight;
          y2 = lastNodeRect.originTop;
          break;
        case CATALOG_ORGANIZATION:
          if (layerIndex === 0) {
            rotate = true;
            x2 = lastNodeRect.originRight + this.minOffset - halfPlaceholderHeight;
            y2 = lastNodeRect.originTop;
          } else {
            x2 = lastNodeRect.originLeft;
            y2 = lastNodeRect.originBottom + this.minOffset - halfPlaceholderHeight;
          }
          break;
        case TIMELINE:
          if (layerIndex === 0) {
            rotate = true;
            x2 = lastNodeRect.originRight + this.minOffset - halfPlaceholderHeight;
            y2 = lastNodeRect.originTop + lastNodeRect.originHeight / 2 - halfPlaceholderWidth;
          } else {
            x2 = lastNodeRect.originLeft;
            y2 = lastNodeRect.originBottom + this.minOffset - halfPlaceholderHeight;
          }
          break;
        case TIMELINE2:
          if (layerIndex === 0) {
            rotate = true;
            x2 = lastNodeRect.originRight + this.minOffset - halfPlaceholderHeight;
            y2 = lastNodeRect.originTop + lastNodeRect.originHeight / 2 - halfPlaceholderWidth;
          } else {
            x2 = lastNodeRect.originLeft;
            if (layerIndex === 1) {
              y2 = dir === TOP ? lastNodeRect.originTop - this.placeholderHeight - this.minOffset + halfPlaceholderHeight : lastNodeRect.originBottom + this.minOffset - halfPlaceholderHeight;
            } else {
              y2 = lastNodeRect.originBottom + this.minOffset - halfPlaceholderHeight;
            }
          }
          break;
        case VERTICAL_TIMELINE:
        case VERTICAL_TIMELINE2:
        case VERTICAL_TIMELINE3:
          if (layerIndex === 0) {
            x2 = lastNodeRect.originLeft + lastNodeRect.originWidth / 2 - halfPlaceholderWidth;
            y2 = lastNodeRect.originBottom + this.minOffset - halfPlaceholderHeight;
          } else {
            x2 = dir === RIGHT ? lastNodeRect.originLeft : lastNodeRect.originRight - this.placeholderWidth;
            y2 = lastNodeRect.originBottom + this.minOffset - halfPlaceholderHeight;
          }
          break;
        case FISHBONE:
        case FISHBONE2:
        case RIGHT_FISHBONE:
        case RIGHT_FISHBONE2:
          if (layerIndex <= 1) {
            notRenderPlaceholder = true;
            this.mindMap.execCommand("SET_NODE_ACTIVE", this.overlapNode, true);
          } else {
            x2 = lastNodeRect.originLeft;
            y2 = dir === TOP ? lastNodeRect.originBottom + this.minOffset - halfPlaceholderHeight : lastNodeRect.originTop - this.placeholderHeight - this.minOffset + halfPlaceholderHeight;
          }
          break;
      }
    } else {
      const nodeRect = this.getNodeRect(this.overlapNode);
      dir = this.getNewChildNodeDir(this.overlapNode);
      switch (this.mindMap.opt.layout) {
        case LOGICAL_STRUCTURE:
        case MIND_MAP:
          x2 = dir === RIGHT ? nodeRect.originRight + marginX : nodeRect.originLeft - this.placeholderWidth - marginX;
          y2 = nodeRect.originTop + (nodeRect.originHeight - this.placeholderHeight) / 2;
          break;
        case LOGICAL_STRUCTURE_LEFT:
          x2 = nodeRect.originLeft - this.placeholderWidth - marginX;
          y2 = nodeRect.originTop + (nodeRect.originHeight - this.placeholderHeight) / 2;
          break;
        case ORGANIZATION_STRUCTURE:
          rotate = true;
          x2 = nodeRect.originLeft + (nodeRect.originWidth - this.placeholderHeight) / 2;
          y2 = nodeRect.originBottom + marginX;
          break;
        case CATALOG_ORGANIZATION:
          if (layerIndex === 0) {
            rotate = true;
          }
          x2 = nodeRect.originLeft + nodeRect.originWidth * 0.5;
          y2 = nodeRect.originBottom + marginX;
          break;
        case TIMELINE:
          if (layerIndex === 0) {
            rotate = true;
          }
          x2 = nodeRect.originLeft + nodeRect.originWidth * 0.5;
          y2 = nodeRect.originBottom + marginY;
          break;
        case TIMELINE2:
          if (layerIndex === 0) {
            rotate = true;
          }
          x2 = nodeRect.originLeft + nodeRect.originWidth * 0.5;
          if (layerIndex === 1) {
            y2 = dir === TOP ? nodeRect.originTop - this.placeholderHeight - marginX : nodeRect.originBottom + marginX;
          } else {
            y2 = nodeRect.originBottom + marginX;
          }
          break;
        case VERTICAL_TIMELINE:
        case VERTICAL_TIMELINE2:
        case VERTICAL_TIMELINE3:
          if (layerIndex === 0) {
            rotate = true;
          }
          x2 = dir === RIGHT ? nodeRect.originRight + marginX : nodeRect.originLeft - this.placeholderWidth - marginX;
          y2 = nodeRect.originTop + nodeRect.originHeight / 2 - halfPlaceholderHeight;
          break;
        case FISHBONE:
        case FISHBONE2:
        case RIGHT_FISHBONE:
        case RIGHT_FISHBONE2:
          if (layerIndex <= 1) {
            notRenderPlaceholder = true;
            this.mindMap.execCommand("SET_NODE_ACTIVE", this.overlapNode, true);
          } else {
            x2 = nodeRect.originLeft + nodeRect.originWidth * 0.5;
            y2 = dir === BOTTOM ? nodeRect.originTop - this.placeholderHeight - this.minOffset + halfPlaceholderHeight : nodeRect.originBottom + this.minOffset - halfPlaceholderHeight;
          }
          break;
      }
    }
    if (!notRenderPlaceholder) {
      this.setPlaceholderRect({
        x: x2,
        y: y2,
        dir,
        rotate
      });
    }
  }
  // 获取节点的生长方向
  getNewChildNodeDir(node) {
    const {
      LOGICAL_STRUCTURE,
      LOGICAL_STRUCTURE_LEFT,
      MIND_MAP,
      TIMELINE2,
      VERTICAL_TIMELINE,
      VERTICAL_TIMELINE2,
      VERTICAL_TIMELINE3,
      FISHBONE,
      FISHBONE2,
      RIGHT_FISHBONE,
      RIGHT_FISHBONE2
    } = CONSTANTS.LAYOUT;
    switch (this.mindMap.opt.layout) {
      case LOGICAL_STRUCTURE:
        return CONSTANTS.LAYOUT_GROW_DIR.RIGHT;
      case LOGICAL_STRUCTURE_LEFT:
        return CONSTANTS.LAYOUT_GROW_DIR.LEFT;
      case MIND_MAP:
      case TIMELINE2:
      case VERTICAL_TIMELINE:
      case VERTICAL_TIMELINE2:
      case VERTICAL_TIMELINE3:
      case FISHBONE:
      case FISHBONE2:
      case RIGHT_FISHBONE:
      case RIGHT_FISHBONE2:
        return node.dir;
      default:
        return "";
    }
  }
  // 垂直方向比较
  // isReverse：是否反向
  handleVerticalCheck(node, checkList, isReverse = false) {
    const { layout: layout2 } = this.mindMap.opt;
    const { LAYOUT, LAYOUT_GROW_DIR } = CONSTANTS;
    const {
      VERTICAL_TIMELINE,
      VERTICAL_TIMELINE2,
      VERTICAL_TIMELINE3,
      FISHBONE,
      FISHBONE2,
      RIGHT_FISHBONE,
      RIGHT_FISHBONE2
    } = LAYOUT;
    const { LEFT } = LAYOUT_GROW_DIR;
    const mouseMoveX = this.mouseMoveX;
    const mouseMoveY = this.mouseMoveY;
    const nodeRect = this.getNodeRect(node);
    const dir = this.getNewChildNodeDir(node);
    const layerIndex = node.layerIndex;
    if (isReverse) {
      checkList = checkList.reverse();
    }
    let oneFourthHeight = nodeRect.originHeight / 4;
    let { prevBrotherOffset, nextBrotherOffset } = this.getNodeDistanceToSiblingNode(checkList, node, nodeRect, "v");
    if (nodeRect.left <= mouseMoveX && nodeRect.right >= mouseMoveX) {
      if (!this.overlapNode && !this.prevNode && !this.nextNode && !node.isRoot) {
        let checkIsPrevNode = nextBrotherOffset > 0 ? mouseMoveY > nodeRect.bottom && mouseMoveY <= nodeRect.bottom + nextBrotherOffset : mouseMoveY >= nodeRect.bottom - oneFourthHeight && mouseMoveY <= nodeRect.bottom;
        let checkIsNextNode = prevBrotherOffset > 0 ? mouseMoveY < nodeRect.top && mouseMoveY >= nodeRect.top - prevBrotherOffset : mouseMoveY >= nodeRect.top && mouseMoveY <= nodeRect.top + oneFourthHeight;
        const { scaleY } = this.drawTransform;
        let x2 = dir === LEFT ? nodeRect.originRight - this.placeholderWidth : nodeRect.originLeft;
        let notRenderLine = false;
        switch (layout2) {
          case VERTICAL_TIMELINE:
          case VERTICAL_TIMELINE2:
          case VERTICAL_TIMELINE3:
            if (layerIndex === 1) {
              x2 = nodeRect.originLeft + nodeRect.originWidth / 2 - this.placeholderWidth / 2;
            }
            break;
          case RIGHT_FISHBONE:
          case RIGHT_FISHBONE2:
            x2 = nodeRect.originLeft + nodeRect.originWidth - this.placeholderWidth;
            break;
        }
        if (checkIsPrevNode) {
          if (isReverse) {
            this.nextNode = node;
          } else {
            this.prevNode = node;
          }
          let y2 = nodeRect.originBottom + nextBrotherOffset / scaleY - //nextBrotherOffset已经是实际间距的一半了
          this.placeholderHeight / 2;
          switch (layout2) {
            case FISHBONE:
            case FISHBONE2:
            case RIGHT_FISHBONE:
            case RIGHT_FISHBONE2:
              if (layerIndex === 2) {
                notRenderLine = true;
                y2 = nodeRect.originBottom + this.minOffset - this.placeholderHeight / 2;
              }
              break;
          }
          this.setPlaceholderRect({
            x: x2,
            y: y2,
            dir,
            notRenderLine
          });
        } else if (checkIsNextNode) {
          if (isReverse) {
            this.prevNode = node;
          } else {
            this.nextNode = node;
          }
          let y2 = nodeRect.originTop - this.placeholderHeight - prevBrotherOffset / scaleY + this.placeholderHeight / 2;
          switch (layout2) {
            case FISHBONE:
            case FISHBONE2:
            case RIGHT_FISHBONE:
            case RIGHT_FISHBONE2:
              if (layerIndex === 2) {
                notRenderLine = true;
                y2 = nodeRect.originTop - this.placeholderHeight - this.minOffset + this.placeholderHeight / 2;
              }
              break;
          }
          this.setPlaceholderRect({
            x: x2,
            y: y2,
            dir,
            notRenderLine
          });
        }
      }
      this.checkIsOverlap({
        node,
        dir: "v",
        prevBrotherOffset,
        nextBrotherOffset,
        size: oneFourthHeight,
        pos: mouseMoveY,
        nodeRect
      });
    }
  }
  // 水平方向比较
  handleHorizontalCheck(node, checkList) {
    const { layout: layout2 } = this.mindMap.opt;
    const { LAYOUT } = CONSTANTS;
    const {
      FISHBONE,
      FISHBONE2,
      RIGHT_FISHBONE,
      RIGHT_FISHBONE2,
      TIMELINE,
      TIMELINE2
    } = LAYOUT;
    let mouseMoveX = this.mouseMoveX;
    let mouseMoveY = this.mouseMoveY;
    let nodeRect = this.getNodeRect(node);
    let oneFourthWidth = nodeRect.originWidth / 4;
    let { prevBrotherOffset, nextBrotherOffset } = this.getNodeDistanceToSiblingNode(checkList, node, nodeRect, "h");
    if (nodeRect.top <= mouseMoveY && nodeRect.bottom >= mouseMoveY) {
      if (!this.overlapNode && !this.prevNode && !this.nextNode && !node.isRoot) {
        let checkIsPrevNode = nextBrotherOffset > 0 ? mouseMoveX < nodeRect.right + nextBrotherOffset && mouseMoveX >= nodeRect.right : mouseMoveX <= nodeRect.right && mouseMoveX >= nodeRect.right - oneFourthWidth;
        let checkIsNextNode = prevBrotherOffset > 0 ? mouseMoveX > nodeRect.left - prevBrotherOffset && mouseMoveX <= nodeRect.left : mouseMoveX <= nodeRect.left + oneFourthWidth && mouseMoveX >= nodeRect.left;
        const { scaleX } = this.drawTransform;
        const layerIndex = node.layerIndex;
        let y2 = nodeRect.originTop;
        let notRenderLine = false;
        switch (layout2) {
          case TIMELINE:
          case TIMELINE2:
            y2 = nodeRect.originTop + nodeRect.originHeight / 2 - this.placeholderWidth / 2;
            break;
          case FISHBONE:
          case FISHBONE2:
          case RIGHT_FISHBONE:
          case RIGHT_FISHBONE2:
            if (layerIndex === 1) {
              notRenderLine = true;
              y2 = nodeRect.originTop + nodeRect.originHeight / 2 - this.placeholderWidth / 2;
            }
            break;
        }
        if (checkIsPrevNode) {
          if ([RIGHT_FISHBONE, RIGHT_FISHBONE2].includes(layout2)) {
            this.nextNode = node;
          } else {
            this.prevNode = node;
          }
          this.setPlaceholderRect({
            x: nodeRect.originRight + nextBrotherOffset / scaleX - //nextBrotherOffset已经是实际间距的一半了
            this.placeholderHeight / 2,
            y: y2,
            rotate: true,
            notRenderLine
          });
        } else if (checkIsNextNode) {
          if ([RIGHT_FISHBONE, RIGHT_FISHBONE2].includes(layout2)) {
            this.prevNode = node;
          } else {
            this.nextNode = node;
          }
          this.setPlaceholderRect({
            x: nodeRect.originLeft - this.placeholderHeight - prevBrotherOffset / scaleX + this.placeholderHeight / 2,
            y: y2,
            rotate: true,
            notRenderLine
          });
        }
      }
      this.checkIsOverlap({
        node,
        dir: "h",
        prevBrotherOffset,
        nextBrotherOffset,
        size: oneFourthWidth,
        pos: mouseMoveX,
        nodeRect
      });
    }
  }
  // 获取节点距前一个和后一个节点的距离
  getNodeDistanceToSiblingNode(checkList, node, nodeRect, dir) {
    const { TOP, LEFT, BOTTOM, RIGHT } = CONSTANTS.LAYOUT_GROW_DIR;
    let { scaleX, scaleY } = this.drawTransform;
    let dir1 = dir === "v" ? TOP : LEFT;
    let dir2 = dir === "v" ? BOTTOM : RIGHT;
    let scale = dir === "v" ? scaleY : scaleX;
    let minOffset = this.minOffset * scale;
    let index = getNodeIndexInNodeList(node, checkList);
    let prevBrother = null;
    let nextBrother = null;
    if (index !== -1) {
      if (index - 1 >= 0) {
        prevBrother = checkList[index - 1];
      }
      if (index + 1 <= checkList.length - 1) {
        nextBrother = checkList[index + 1];
      }
    }
    let prevBrotherOffset = 0;
    if (prevBrother) {
      let prevNodeRect = this.getNodeRect(prevBrother);
      prevBrotherOffset = nodeRect[dir1] - prevNodeRect[dir2];
      prevBrotherOffset = prevBrotherOffset >= minOffset ? prevBrotherOffset / 2 : 0;
    } else {
      prevBrotherOffset = minOffset;
    }
    let nextBrotherOffset = 0;
    if (nextBrother) {
      let nextNodeRect = this.getNodeRect(nextBrother);
      nextBrotherOffset = nextNodeRect[dir1] - nodeRect[dir2];
      nextBrotherOffset = nextBrotherOffset >= minOffset ? nextBrotherOffset / 2 : 0;
    } else {
      nextBrotherOffset = minOffset;
    }
    return {
      prevBrother,
      prevBrotherOffset,
      nextBrother,
      nextBrotherOffset
    };
  }
  // 设置提示元素的大小和位置
  setPlaceholderRect({ x: x2, y: y2, dir, rotate, notRenderLine }) {
    let w = this.placeholderWidth;
    let h = this.placeholderHeight;
    if (rotate) {
      const tmp = w;
      w = h;
      h = tmp;
    }
    this.placeholder.size(w, h).move(x2, y2);
    if (notRenderLine) {
      return;
    }
    const { dragPlaceholderLineConfig } = this.mindMap.opt;
    let node = null;
    let parent = null;
    if (this.overlapNode) {
      node = this.overlapNode;
      parent = this.overlapNode;
    } else {
      node = this.prevNode || this.nextNode;
      parent = node.parent;
    }
    parent = parent.fakeClone();
    node = node.fakeClone();
    const tmpNode = this.beingDragNodeList[0].fakeClone();
    tmpNode.dir = dir;
    tmpNode.left = x2;
    tmpNode.top = y2;
    tmpNode.width = w;
    tmpNode.height = h;
    parent.children = [tmpNode];
    parent._lines = [];
    this.placeHolderLine.show();
    this.mindMap.renderer.layout.renderLine(
      parent,
      [this.placeHolderLine],
      (...args) => {
      },
      node.style.getStyle("lineStyle", true)
    );
    this.placeHolderExtraLines = [...parent._lines];
    this.placeHolderExtraLines.forEach((line) => {
      this.mindMap.otherDraw.add(line);
      line.stroke({
        color: dragPlaceholderLineConfig.color,
        width: dragPlaceholderLineConfig.width
      }).fill({ color: "none" });
    });
  }
  // 检测是否重叠
  checkIsOverlap({
    node,
    dir,
    prevBrotherOffset,
    nextBrotherOffset,
    size: size2,
    pos,
    nodeRect
  }) {
    const { TOP, LEFT, BOTTOM, RIGHT } = CONSTANTS.LAYOUT_GROW_DIR;
    let dir1 = dir === "v" ? TOP : LEFT;
    let dir2 = dir === "v" ? BOTTOM : RIGHT;
    if (!this.overlapNode && !this.prevNode && !this.nextNode) {
      if (nodeRect[dir1] + (prevBrotherOffset > 0 ? 0 : size2) <= pos && nodeRect[dir2] - (nextBrotherOffset > 0 ? 0 : size2) >= pos) {
        this.overlapNode = node;
      }
    }
  }
  // 处理逻辑结构图
  handleLogicalStructure(node) {
    const checkList = this.commonGetNodeCheckList(node);
    this.handleVerticalCheck(node, checkList);
  }
  // 处理思维导图
  handleMindMap(node) {
    const checkList = node.parent ? node.parent.children.filter((item) => {
      let sameDir = true;
      if (node.layerIndex === 1) {
        sameDir = item.dir === node.dir;
      }
      return sameDir && !this.checkIsInBeingDragNodeList(item);
    }) : [];
    this.handleVerticalCheck(node, checkList);
  }
  // 处理组织结构图
  handleOrganizationStructure(node) {
    const checkList = this.commonGetNodeCheckList(node);
    this.handleHorizontalCheck(node, checkList);
  }
  // 处理目录组织图
  handleCatalogOrganization(node) {
    const checkList = this.commonGetNodeCheckList(node);
    if (node.layerIndex === 1) {
      this.handleHorizontalCheck(node, checkList);
    } else {
      this.handleVerticalCheck(node, checkList);
    }
  }
  // 处理时间轴
  handleTimeLine(node) {
    let checkList = this.commonGetNodeCheckList(node);
    if (node.layerIndex === 1) {
      this.handleHorizontalCheck(node, checkList);
    } else {
      this.handleVerticalCheck(node, checkList);
    }
  }
  // 处理时间轴2
  handleTimeLine2(node) {
    let checkList = this.commonGetNodeCheckList(node);
    if (node.layerIndex === 1) {
      this.handleHorizontalCheck(node, checkList);
    } else {
      if (node.dir === CONSTANTS.LAYOUT_GROW_DIR.TOP && node.layerIndex === 2) {
        this.handleVerticalCheck(node, checkList, true);
      } else {
        this.handleVerticalCheck(node, checkList);
      }
    }
  }
  // 处理鱼骨图
  handleFishbone(node) {
    let checkList = node.parent ? node.parent.children.filter((item) => {
      return item.layerIndex > 1 && !this.checkIsInBeingDragNodeList(item);
    }) : [];
    if (node.layerIndex === 1) {
      this.handleHorizontalCheck(node, checkList);
    } else {
      const is2LayerTop = node.dir === CONSTANTS.LAYOUT_GROW_DIR.TOP && node.layerIndex === 2;
      const is2MoreLayerBottom = node.dir === CONSTANTS.LAYOUT_GROW_DIR.BOTTOM && node.layerIndex >= 3;
      if (is2LayerTop || is2MoreLayerBottom) {
        this.handleVerticalCheck(node, checkList, true);
      } else {
        this.handleVerticalCheck(node, checkList);
      }
    }
  }
  // 获取节点的兄弟节点列表通用方法
  commonGetNodeCheckList(node) {
    return node.parent ? [...node.parent.children].filter((item) => {
      return !this.checkIsInBeingDragNodeList(item);
    }) : [];
  }
  // 计算节点的位置尺寸信息
  getNodeRect(node) {
    let { scaleX, scaleY, translateX, translateY } = this.drawTransform;
    let { left, top, width: width2, height: height2 } = node;
    let originWidth = width2;
    let originHeight = height2;
    let originLeft = left;
    let originTop = top;
    let originBottom = top + height2;
    let originRight = left + width2;
    let right = (left + width2) * scaleX + translateX;
    let bottom = (top + height2) * scaleY + translateY;
    left = left * scaleX + translateX;
    top = top * scaleY + translateY;
    return {
      left,
      top,
      right,
      bottom,
      originWidth,
      originHeight,
      originLeft,
      originTop,
      originBottom,
      originRight
    };
  }
  // 检查某个节点是否在被拖拽节点内
  checkIsInBeingDragNodeList(node) {
    return !!this.beingDragNodeList.find((item) => {
      return item.uid === node.uid || item.isAncestor(node);
    });
  }
  // 插件被移除前做的事情
  beforePluginRemove() {
    this.unBindEvent();
  }
  // 插件被卸载前做的事情
  beforePluginDestroy() {
    this.unBindEvent();
  }
}
Drag.instanceName = "drag";
class Select {
  //  构造函数
  constructor({ mindMap }) {
    this.mindMap = mindMap;
    this.rect = null;
    this.isMousedown = false;
    this.mouseDownX = 0;
    this.mouseDownY = 0;
    this.mouseMoveX = 0;
    this.mouseMoveY = 0;
    this.isSelecting = false;
    this.cacheActiveList = [];
    this.autoMove = new AutoMove(mindMap);
    this.bindEvent();
  }
  //  绑定事件
  bindEvent() {
    this.onMousedown = this.onMousedown.bind(this);
    this.onMousemove = this.onMousemove.bind(this);
    this.onMouseup = this.onMouseup.bind(this);
    this.checkInNodes = throttle(this.checkInNodes, 300, this);
    this.mindMap.on("mousedown", this.onMousedown);
    this.mindMap.on("mousemove", this.onMousemove);
    this.mindMap.on("mouseup", this.onMouseup);
    this.mindMap.on("node_mouseup", this.onMouseup);
  }
  // 解绑事件
  unBindEvent() {
    this.mindMap.off("mousedown", this.onMousedown);
    this.mindMap.off("mousemove", this.onMousemove);
    this.mindMap.off("mouseup", this.onMouseup);
    this.mindMap.off("node_mouseup", this.onMouseup);
  }
  // 鼠标按下
  onMousedown(e) {
    const { readonly, mousedownEventPreventDefault } = this.mindMap.opt;
    if (readonly) {
      return;
    }
    let { useLeftKeySelectionRightKeyDrag } = this.mindMap.opt;
    if (!(e.ctrlKey || e.metaKey) && (useLeftKeySelectionRightKeyDrag ? e.which !== 1 : e.which !== 3)) {
      return;
    }
    if (mousedownEventPreventDefault) {
      e.preventDefault();
    }
    this.isMousedown = true;
    this.cacheActiveList = [...this.mindMap.renderer.activeNodeList];
    let { x: x2, y: y2 } = this.mindMap.toPos(e.clientX, e.clientY);
    this.mouseDownX = x2;
    this.mouseDownY = y2;
    this.createRect(x2, y2);
  }
  // 鼠标移动
  onMousemove(e) {
    if (this.mindMap.opt.readonly) {
      return;
    }
    if (!this.isMousedown) {
      return;
    }
    let { x: x2, y: y2 } = this.mindMap.toPos(e.clientX, e.clientY);
    this.mouseMoveX = x2;
    this.mouseMoveY = y2;
    if (Math.abs(x2 - this.mouseDownX) <= 10 && Math.abs(y2 - this.mouseDownY) <= 10) {
      return;
    }
    this.autoMove.clearAutoMoveTimer();
    this.autoMove.onMove(
      e.clientX,
      e.clientY,
      () => {
        this.isSelecting = true;
        if (this.rect) {
          this.rect.plot([
            [this.mouseDownX, this.mouseDownY],
            [this.mouseMoveX, this.mouseDownY],
            [this.mouseMoveX, this.mouseMoveY],
            [this.mouseDownX, this.mouseMoveY]
          ]);
        }
        this.checkInNodes();
      },
      (dir, step) => {
        switch (dir) {
          case "left":
            this.mouseDownX += step;
            break;
          case "top":
            this.mouseDownY += step;
            break;
          case "right":
            this.mouseDownX -= step;
            break;
          case "bottom":
            this.mouseDownY -= step;
            break;
        }
      }
    );
  }
  // 结束框选
  onMouseup() {
    if (this.mindMap.opt.readonly) {
      return;
    }
    if (!this.isMousedown) {
      return;
    }
    this.checkTriggerNodeActiveEvent();
    this.autoMove.clearAutoMoveTimer();
    this.isMousedown = false;
    this.cacheActiveList = [];
    if (this.rect) this.rect.remove();
    this.rect = null;
    setTimeout(() => {
      this.isSelecting = false;
    }, 0);
  }
  // 如果激活节点改变了，那么触发事件
  checkTriggerNodeActiveEvent() {
    let isNumChange = this.cacheActiveList.length !== this.mindMap.renderer.activeNodeList.length;
    let isNodeChange = false;
    if (!isNumChange) {
      for (let i = 0; i < this.cacheActiveList.length; i++) {
        let cur = this.cacheActiveList[i];
        if (!this.mindMap.renderer.activeNodeList.find((item) => {
          return item.getData("uid") === cur.getData("uid");
        })) {
          isNodeChange = true;
          break;
        }
      }
    }
    if (isNumChange || isNodeChange) {
      this.mindMap.renderer.emitNodeActiveEvent();
    }
  }
  //  创建矩形
  createRect(x2, y2) {
    if (this.rect) this.rect.remove();
    this.rect = this.mindMap.svg.polygon().stroke({
      color: "#0984e3"
    }).fill({
      color: "rgba(9,132,227,0.3)"
    }).plot([[x2, y2]]);
  }
  //  检测在选区里的节点
  checkInNodes() {
    let { scaleX, scaleY, translateX, translateY } = this.mindMap.draw.transform();
    let minx = Math.min(this.mouseDownX, this.mouseMoveX);
    let miny = Math.min(this.mouseDownY, this.mouseMoveY);
    let maxx = Math.max(this.mouseDownX, this.mouseMoveX);
    let maxy = Math.max(this.mouseDownY, this.mouseMoveY);
    const check = (node) => {
      let { left, top, width: width2, height: height2 } = node;
      let right = (left + width2) * scaleX + translateX;
      let bottom = (top + height2) * scaleY + translateY;
      left = left * scaleX + translateX;
      top = top * scaleY + translateY;
      if (checkTwoRectIsOverlap(minx, maxx, miny, maxy, left, right, top, bottom)) {
        if (node.getData("isActive")) {
          return;
        }
        this.mindMap.renderer.addNodeToActiveList(node);
        this.mindMap.renderer.emitNodeActiveEvent();
      } else if (node.getData("isActive")) {
        if (!node.getData("isActive")) {
          return;
        }
        this.mindMap.renderer.removeNodeFromActiveList(node);
        this.mindMap.renderer.emitNodeActiveEvent();
      }
    };
    bfsWalk(this.mindMap.renderer.root, (node) => {
      check(node);
      if (node._generalizationList && node._generalizationList.length > 0) {
        node._generalizationList.forEach((item) => {
          check(item.generalizationNode);
        });
      }
    });
  }
  // 是否存在选区
  hasSelectRange() {
    return this.isSelecting;
  }
  // 插件被移除前做的事情
  beforePluginRemove() {
    this.unBindEvent();
  }
  // 插件被卸载前做的事情
  beforePluginDestroy() {
    this.unBindEvent();
  }
}
Select.instanceName = "select";
class MiniMap {
  //  构造函数
  constructor(opt) {
    this.mindMap = opt.mindMap;
    this.isMousedown = false;
    this.mousedownPos = {
      x: 0,
      y: 0
    };
    this.startViewPos = {
      x: 0,
      y: 0
    };
    this.currentState = null;
  }
  //  计算小地图的渲染数据
  /**
   * boxWidth：小地图容器的宽度
   * boxHeight：小地图容器的高度
   */
  calculationMiniMap(boxWidth, boxHeight) {
    let { svg: svg2, rect, origWidth, origHeight, scaleX, scaleY } = this.mindMap.getSvgData({
      ignoreWatermark: true
    });
    const elRect = this.mindMap.elRect;
    rect.x -= elRect.left;
    rect.x2 -= elRect.left;
    rect.y -= elRect.top;
    rect.y2 -= elRect.top;
    let boxRatio = boxWidth / boxHeight;
    let actWidth = 0;
    let actHeight = 0;
    if (boxRatio > rect.ratio) {
      actHeight = boxHeight;
      actWidth = rect.ratio * actHeight;
    } else {
      actWidth = boxWidth;
      actHeight = actWidth / rect.ratio;
    }
    let miniMapBoxScale = actWidth / rect.width;
    let miniMapBoxLeft = (boxWidth - actWidth) / 2;
    let miniMapBoxTop = (boxHeight - actHeight) / 2;
    let _rectWidth = rect.width * scaleX;
    let _rectHeight = rect.height * scaleY;
    let _rectWidthOffsetHalf = (_rectWidth - rect.width) / 2;
    let _rectHeightOffsetHalf = (_rectHeight - rect.height) / 2;
    let _rectX = rect.x - _rectWidthOffsetHalf;
    let _rectX2 = rect.x2 + _rectWidthOffsetHalf;
    let _rectY = rect.y - _rectHeightOffsetHalf;
    let _rectY2 = rect.y2 + _rectHeightOffsetHalf;
    let viewBoxStyle = {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0
    };
    viewBoxStyle.left = Math.max(0, -_rectX / _rectWidth * actWidth) + miniMapBoxLeft;
    viewBoxStyle.right = Math.max(0, (_rectX2 - origWidth) / _rectWidth * actWidth) + miniMapBoxLeft;
    viewBoxStyle.top = Math.max(0, -_rectY / _rectHeight * actHeight) + miniMapBoxTop;
    viewBoxStyle.bottom = Math.max(0, (_rectY2 - origHeight) / _rectHeight * actHeight) + miniMapBoxTop;
    if (viewBoxStyle.top > miniMapBoxTop + actHeight) {
      viewBoxStyle.top = miniMapBoxTop + actHeight;
    }
    if (viewBoxStyle.left > miniMapBoxLeft + actWidth) {
      viewBoxStyle.left = miniMapBoxLeft + actWidth;
    }
    Object.keys(viewBoxStyle).forEach((key) => {
      viewBoxStyle[key] = viewBoxStyle[key] + "px";
    });
    this.removeNodeContent(svg2);
    const svgStr = svg2.svg();
    this.currentState = {
      viewBoxStyle: {
        ...viewBoxStyle
      },
      miniMapBoxScale,
      miniMapBoxLeft,
      miniMapBoxTop
    };
    return {
      getImgUrl: async (callback) => {
        const res = await this.mindMap.doExport.fixSvgStrAndToBlob(svgStr);
        callback(res);
      },
      svgHTML: svgStr,
      // 小地图html
      viewBoxStyle,
      // 视图框的位置信息
      miniMapBoxScale,
      // 视图框的缩放值
      miniMapBoxLeft,
      // 视图框的left值
      miniMapBoxTop
      // 视图框的top值
    };
  }
  // 移除节点的内容
  removeNodeContent(svg2) {
    if (svg2.hasClass("smm-node")) {
      let shape = svg2.findOne(".smm-node-shape");
      let fill = shape.attr("fill");
      if (isWhite(fill) || isTransparent(fill)) {
        shape.attr("fill", getVisibleColorFromTheme(this.mindMap.themeConfig));
      }
      svg2.clear();
      svg2.add(shape);
      return;
    }
    let children = svg2.children();
    if (children && children.length > 0) {
      children.forEach((node) => {
        this.removeNodeContent(node);
      });
    }
  }
  //  小地图鼠标按下事件
  onMousedown(e) {
    this.isMousedown = true;
    this.mousedownPos = {
      x: e.clientX,
      y: e.clientY
    };
    let transformData = this.mindMap.view.getTransformData();
    this.startViewPos = {
      x: transformData.state.x,
      y: transformData.state.y
    };
  }
  //  小地图鼠标移动事件
  onMousemove(e, sensitivityNum = 5) {
    if (!this.isMousedown || this.isViewBoxMousedown) {
      return;
    }
    let ox = e.clientX - this.mousedownPos.x;
    let oy = e.clientY - this.mousedownPos.y;
    this.mindMap.view.translateXTo(ox * sensitivityNum + this.startViewPos.x);
    this.mindMap.view.translateYTo(oy * sensitivityNum + this.startViewPos.y);
  }
  //  小地图鼠标松开事件
  onMouseup() {
    this.isMousedown = false;
    this.isViewBoxMousedown = false;
  }
  // 视口框鼠标按下事件
  onViewBoxMousedown(e) {
    this.isViewBoxMousedown = true;
    this.mousedownPos = {
      x: e.clientX,
      y: e.clientY
    };
    let transformData = this.mindMap.view.getTransformData();
    this.startViewPos = {
      x: transformData.state.x,
      y: transformData.state.y
    };
  }
  // 视口框鼠标移动事件
  onViewBoxMousemove(e) {
    if (!this.isViewBoxMousedown || !this.currentState || this.isMousedown)
      return;
    let ox = e.clientX - this.mousedownPos.x;
    let oy = e.clientY - this.mousedownPos.y;
    const { viewBoxStyle, miniMapBoxScale, miniMapBoxLeft, miniMapBoxTop } = this.currentState;
    const left = Math.max(
      miniMapBoxLeft,
      Number.parseFloat(viewBoxStyle.left) + ox
    );
    const right = Math.max(
      miniMapBoxLeft,
      Number.parseFloat(viewBoxStyle.right) - ox
    );
    const top = Math.max(
      miniMapBoxTop,
      Number.parseFloat(viewBoxStyle.top) + oy
    );
    const bottom = Math.max(
      miniMapBoxTop,
      Number.parseFloat(viewBoxStyle.bottom) - oy
    );
    this.mindMap.emit("mini_map_view_box_position_change", {
      left: left + "px",
      right: right + "px",
      top: top + "px",
      bottom: bottom + "px"
    });
    this.mindMap.view.translateXTo(-ox / miniMapBoxScale + this.startViewPos.x);
    this.mindMap.view.translateYTo(-oy / miniMapBoxScale + this.startViewPos.y);
  }
}
MiniMap.instanceName = "miniMap";
class Search {
  //  构造函数
  constructor({ mindMap }) {
    this.mindMap = mindMap;
    this.isSearching = false;
    this.searchText = "";
    this.matchNodeList = [];
    this.currentIndex = -1;
    this.notResetSearchText = false;
    this.isJumpNext = false;
    this.bindEvent();
  }
  bindEvent() {
    this.onDataChange = this.onDataChange.bind(this);
    this.onModeChange = this.onModeChange.bind(this);
    this.mindMap.on("data_change", this.onDataChange);
    this.mindMap.on("mode_change", this.onModeChange);
  }
  unBindEvent() {
    this.mindMap.off("data_change", this.onDataChange);
    this.mindMap.off("mode_change", this.onModeChange);
  }
  // 节点数据改变了，需要重新搜索
  onDataChange() {
    if (this.isJumpNext) {
      this.isJumpNext = false;
      this.search(this.searchText);
      return;
    }
    if (this.notResetSearchText) {
      this.notResetSearchText = false;
      return;
    }
    this.searchText = "";
  }
  // 监听只读模式切换
  onModeChange(mode) {
    const isReadonly = mode === CONSTANTS.MODE.READONLY;
    if (!isReadonly && this.isSearching && this.matchNodeList[this.currentIndex]) {
      this.matchNodeList[this.currentIndex].closeHighlight();
    }
  }
  // 搜索
  search(text, callback = () => {
  }) {
    if (isUndef(text)) return this.endSearch();
    text = String(text);
    this.isSearching = true;
    if (this.searchText === text) {
      this.searchNext(callback);
    } else {
      this.searchText = text;
      this.doSearch();
      this.searchNext(callback);
    }
    this.emitEvent();
  }
  // 更新匹配节点列表
  updateMatchNodeList(list) {
    this.matchNodeList = list;
    this.mindMap.emit("search_match_node_list_change", list);
  }
  // 结束搜索
  endSearch() {
    if (!this.isSearching) return;
    if (this.mindMap.opt.readonly && this.matchNodeList[this.currentIndex]) {
      this.matchNodeList[this.currentIndex].closeHighlight();
    }
    this.searchText = "";
    this.updateMatchNodeList([]);
    this.currentIndex = -1;
    this.notResetSearchText = false;
    this.isSearching = false;
    this.emitEvent();
  }
  // 搜索匹配的节点
  doSearch() {
    this.clearHighlightOnReadonly();
    this.updateMatchNodeList([]);
    this.currentIndex = -1;
    const { isOnlySearchCurrentRenderNodes } = this.mindMap.opt;
    const tree = isOnlySearchCurrentRenderNodes ? this.mindMap.renderer.root : this.mindMap.renderer.renderTree;
    if (!tree) return;
    const matchList = [];
    bfsWalk(tree, (node) => {
      let { richText, text, generalization } = isOnlySearchCurrentRenderNodes ? node.getData() : node.data;
      if (richText) {
        text = getTextFromHtml(text);
      }
      if (text.includes(this.searchText)) {
        matchList.push(node);
      }
      const generalizationList = formatGetNodeGeneralization({
        generalization
      });
      generalizationList.forEach((gNode) => {
        let { richText: richText2, text: text2, uid } = gNode;
        if (isOnlySearchCurrentRenderNodes && !this.mindMap.renderer.findNodeByUid(uid)) {
          return;
        }
        if (richText2) {
          text2 = getTextFromHtml(text2);
        }
        if (text2.includes(this.searchText)) {
          matchList.push({
            data: gNode
          });
        }
      });
    });
    this.updateMatchNodeList(matchList);
  }
  // 判断对象是否是节点实例
  isNodeInstance(node) {
    return node instanceof MindMapNode;
  }
  // 搜索下一个或指定索引，定位到下一个匹配节点
  searchNext(callback, index) {
    if (!this.isSearching || this.matchNodeList.length <= 0) return;
    if (index !== void 0 && Number.isInteger(index) && index >= 0 && index < this.matchNodeList.length) {
      this.currentIndex = index;
    } else {
      if (this.currentIndex < this.matchNodeList.length - 1) {
        this.currentIndex++;
      } else {
        this.currentIndex = 0;
      }
    }
    const { readonly } = this.mindMap.opt;
    this.clearHighlightOnReadonly();
    const currentNode = this.matchNodeList[this.currentIndex];
    this.notResetSearchText = true;
    const uid = this.isNodeInstance(currentNode) ? currentNode.getData("uid") : currentNode.data.uid;
    if (!uid) {
      callback();
      return;
    }
    const targetNode = this.mindMap.renderer.findNodeByUid(uid);
    this.mindMap.execCommand("GO_TARGET_NODE", uid, (node) => {
      if (!this.isNodeInstance(currentNode)) {
        this.matchNodeList[this.currentIndex] = node;
        this.updateMatchNodeList(this.matchNodeList);
      }
      callback();
      if (readonly) {
        node.highlight();
      }
      if (targetNode) {
        this.notResetSearchText = false;
      }
    });
  }
  // 只读模式下清除现有匹配节点的高亮
  clearHighlightOnReadonly() {
    const { readonly } = this.mindMap.opt;
    if (readonly) {
      this.matchNodeList.forEach((node) => {
        if (this.isNodeInstance(node)) {
          node.closeHighlight();
        }
      });
    }
  }
  // 定位到指定搜索结果索引的节点
  jump(index, callback = () => {
  }) {
    this.searchNext(callback, index);
  }
  // 替换当前节点
  replace(replaceText, jumpNext = false) {
    if (replaceText === null || replaceText === void 0 || !this.isSearching || this.matchNodeList.length <= 0)
      return;
    this.isJumpNext = jumpNext;
    replaceText = String(replaceText);
    let currentNode = this.matchNodeList[this.currentIndex];
    if (!currentNode) return;
    const keep = replaceText.includes(this.searchText);
    const text = this.getReplacedText(currentNode, this.searchText, replaceText);
    this.notResetSearchText = true;
    currentNode.setText(text, currentNode.getData("richText"));
    if (keep) {
      this.updateMatchNodeList(this.matchNodeList);
      return;
    }
    const newList = this.matchNodeList.filter((node) => {
      return currentNode !== node;
    });
    this.updateMatchNodeList(newList);
    if (this.currentIndex > this.matchNodeList.length - 1) {
      this.currentIndex = -1;
    } else {
      this.currentIndex--;
    }
    this.emitEvent();
  }
  // 替换所有
  replaceAll(replaceText) {
    if (replaceText === null || replaceText === void 0 || !this.isSearching || this.matchNodeList.length <= 0)
      return;
    replaceText = String(replaceText);
    const keep = replaceText.includes(this.searchText);
    this.notResetSearchText = true;
    this.matchNodeList.forEach((node) => {
      const text = this.getReplacedText(node, this.searchText, replaceText);
      if (this.isNodeInstance(node)) {
        const data2 = {
          text
        };
        this.mindMap.renderer.setNodeDataRender(node, data2, true);
      } else {
        node.data.text = text;
      }
    });
    this.mindMap.render();
    this.mindMap.command.addHistory();
    if (keep) {
      this.updateMatchNodeList(this.matchNodeList);
    } else {
      this.endSearch();
    }
  }
  // 获取某个节点替换后的文本
  getReplacedText(node, searchText, replaceText) {
    let { richText, text } = this.isNodeInstance(node) ? node.getData() : node.data;
    if (richText) {
      return replaceHtmlText(text, searchText, replaceText);
    } else {
      return text.replace(new RegExp(searchText, "g"), replaceText);
    }
  }
  // 发送事件
  emitEvent() {
    this.mindMap.emit("search_info_change", {
      currentIndex: this.currentIndex,
      total: this.matchNodeList.length
    });
  }
  // 插件被移除前做的事情
  beforePluginRemove() {
    this.unBindEvent();
  }
  // 插件被卸载前做的事情
  beforePluginDestroy() {
    this.unBindEvent();
  }
}
Search.instanceName = "search";
const getNumberValueFromStr = (value) => {
  let arr = String(value).split(/\s+/);
  return arr.map((item) => {
    if (/^[\d.]+/.test(item)) {
      let res = /^([\d.]+)(.*)$/.exec(item);
      return [Number(res[1]), res[2]];
    } else {
      return item;
    }
  });
};
const zoomWidth = (ratio, height2) => {
  return ratio * height2;
};
const zoomHeight = (ratio, width2) => {
  return width2 / ratio;
};
const keyWordToPercentageMap = {
  left: 0,
  top: 0,
  center: 50,
  bottom: 100,
  right: 100
};
const handleBackgroundSize = ({
  backgroundSize,
  drawOpt,
  imageRatio,
  canvasWidth,
  canvasHeight,
  canvasRatio
}) => {
  if (backgroundSize) {
    let backgroundSizeValueArr = getNumberValueFromStr(backgroundSize);
    if (backgroundSizeValueArr[0] === "auto" && backgroundSizeValueArr[1] === "auto") {
      return;
    }
    if (backgroundSizeValueArr[0] === "cover") {
      if (imageRatio > canvasRatio) {
        drawOpt.height = canvasHeight;
        drawOpt.width = zoomWidth(imageRatio, canvasHeight);
      } else {
        drawOpt.width = canvasWidth;
        drawOpt.height = zoomHeight(imageRatio, canvasWidth);
      }
      return;
    }
    if (backgroundSizeValueArr[0] === "contain") {
      if (imageRatio > canvasRatio) {
        drawOpt.width = canvasWidth;
        drawOpt.height = zoomHeight(imageRatio, canvasWidth);
      } else {
        drawOpt.height = canvasHeight;
        drawOpt.width = zoomWidth(imageRatio, canvasHeight);
      }
      return;
    }
    let newNumberWidth = -1;
    if (backgroundSizeValueArr[0]) {
      if (Array.isArray(backgroundSizeValueArr[0])) {
        if (backgroundSizeValueArr[0][1] === "%") {
          drawOpt.width = backgroundSizeValueArr[0][0] / 100 * canvasWidth;
          newNumberWidth = drawOpt.width;
        } else {
          drawOpt.width = backgroundSizeValueArr[0][0];
          newNumberWidth = backgroundSizeValueArr[0][0];
        }
      } else if (backgroundSizeValueArr[0] === "auto") {
        if (backgroundSizeValueArr[1]) {
          if (backgroundSizeValueArr[1][1] === "%") {
            drawOpt.width = zoomWidth(
              imageRatio,
              backgroundSizeValueArr[1][0] / 100 * canvasHeight
            );
          } else {
            drawOpt.width = zoomWidth(imageRatio, backgroundSizeValueArr[1][0]);
          }
        }
      }
    }
    if (backgroundSizeValueArr[1] && Array.isArray(backgroundSizeValueArr[1])) {
      if (backgroundSizeValueArr[1][1] === "%") {
        drawOpt.height = backgroundSizeValueArr[1][0] / 100 * canvasHeight;
      } else {
        drawOpt.height = backgroundSizeValueArr[1][0];
      }
    } else if (newNumberWidth !== -1) {
      drawOpt.height = zoomHeight(imageRatio, newNumberWidth);
    }
  }
};
const handleBackgroundPosition = ({
  backgroundPosition,
  drawOpt,
  imgWidth,
  imgHeight,
  canvasWidth,
  canvasHeight
}) => {
  if (backgroundPosition) {
    let backgroundPositionValueArr = getNumberValueFromStr(backgroundPosition);
    backgroundPositionValueArr = backgroundPositionValueArr.map((item) => {
      if (typeof item === "string") {
        return keyWordToPercentageMap[item] !== void 0 ? [keyWordToPercentageMap[item], "%"] : item;
      }
      return item;
    });
    if (Array.isArray(backgroundPositionValueArr[0])) {
      if (backgroundPositionValueArr.length === 1) {
        backgroundPositionValueArr.push([50, "%"]);
      }
      if (backgroundPositionValueArr[0][1] === "%") {
        let canvasX = backgroundPositionValueArr[0][0] / 100 * canvasWidth;
        let imgX = backgroundPositionValueArr[0][0] / 100 * imgWidth;
        drawOpt.x = canvasX - imgX;
      } else {
        drawOpt.x = backgroundPositionValueArr[0][0];
      }
      if (backgroundPositionValueArr[1][1] === "%") {
        let canvasY = backgroundPositionValueArr[1][0] / 100 * canvasHeight;
        let imgY = backgroundPositionValueArr[1][0] / 100 * imgHeight;
        drawOpt.y = canvasY - imgY;
      } else {
        drawOpt.y = backgroundPositionValueArr[1][0];
      }
    }
  }
};
const handleBackgroundRepeat = ({
  ctx,
  image,
  backgroundRepeat,
  drawOpt,
  imgWidth,
  imgHeight,
  canvasWidth,
  canvasHeight
}) => {
  if (backgroundRepeat) {
    let ox = drawOpt.x;
    let oy = drawOpt.y;
    let oxRepeatNum = Math.ceil(ox / imgWidth);
    let oyRepeatNum = Math.ceil(oy / imgHeight);
    let oxRepeatX = ox - oxRepeatNum * imgWidth;
    let oxRepeatY = oy - oyRepeatNum * imgHeight;
    let backgroundRepeatValueArr = getNumberValueFromStr(backgroundRepeat);
    if (backgroundRepeatValueArr[0] === "no-repeat" || imgWidth >= canvasWidth && imgHeight >= canvasHeight) {
      return;
    }
    if (backgroundRepeatValueArr[0] === "repeat-x") {
      if (canvasWidth > imgWidth) {
        let x2 = oxRepeatX;
        while (x2 < canvasWidth) {
          drawImage(ctx, image, {
            ...drawOpt,
            x: x2
          });
          x2 += imgWidth;
        }
        return true;
      }
    }
    if (backgroundRepeatValueArr[0] === "repeat-y") {
      if (canvasHeight > imgHeight) {
        let y2 = oxRepeatY;
        while (y2 < canvasHeight) {
          drawImage(ctx, image, {
            ...drawOpt,
            y: y2
          });
          y2 += imgHeight;
        }
        return true;
      }
    }
    if (backgroundRepeatValueArr[0] === "repeat") {
      let x2 = oxRepeatX;
      while (x2 < canvasWidth) {
        if (canvasHeight > imgHeight) {
          let y2 = oxRepeatY;
          while (y2 < canvasHeight) {
            drawImage(ctx, image, {
              ...drawOpt,
              x: x2,
              y: y2
            });
            y2 += imgHeight;
          }
        }
        x2 += imgWidth;
      }
      return true;
    }
  }
};
const drawImage = (ctx, image, drawOpt) => {
  ctx.drawImage(
    image,
    drawOpt.sx,
    drawOpt.sy,
    drawOpt.swidth,
    drawOpt.sheight,
    drawOpt.x,
    drawOpt.y,
    drawOpt.width,
    drawOpt.height
  );
};
const drawBackgroundImageToCanvas = (ctx, width2, height2, img, { backgroundSize, backgroundPosition, backgroundRepeat }, callback = () => {
}) => {
  let canvasRatio = width2 / height2;
  let image = new Image();
  image.src = img;
  image.onload = () => {
    let imgWidth = image.width;
    let imgHeight = image.height;
    let imageRatio = imgWidth / imgHeight;
    let drawOpt = {
      sx: 0,
      sy: 0,
      swidth: imgWidth,
      sheight: imgHeight,
      x: 0,
      y: 0,
      width: imgWidth,
      height: imgHeight
    };
    handleBackgroundSize({
      backgroundSize,
      drawOpt,
      imageRatio,
      canvasWidth: width2,
      canvasHeight: height2,
      canvasRatio
    });
    handleBackgroundPosition({
      backgroundPosition,
      drawOpt,
      imgWidth: drawOpt.width,
      imgHeight: drawOpt.height,
      canvasWidth: width2,
      canvasHeight: height2
    });
    let notNeedDraw = handleBackgroundRepeat({
      ctx,
      image,
      backgroundRepeat,
      drawOpt,
      imgWidth: drawOpt.width,
      imgHeight: drawOpt.height,
      canvasWidth: width2,
      canvasHeight: height2
    });
    if (!notNeedDraw) {
      drawImage(ctx, image, drawOpt);
    }
    callback();
  };
  image.onerror = (e) => {
    callback(e);
  };
};
const getNodeText$1 = (data2) => {
  return data2.richText ? nodeRichTextToTextWithWrap(data2.text) : data2.text;
};
const getTitleMark = (level) => {
  return new Array(level).fill("#").join("");
};
const getIndentMark = (level) => {
  return new Array(level - 6).fill("   ").join("") + "*";
};
const transformToMarkdown = (root2) => {
  let content = "";
  walk(
    root2,
    null,
    (node, parent, isRoot, layerIndex) => {
      const level = layerIndex + 1;
      if (level <= 6) {
        content += getTitleMark(level);
      } else {
        content += getIndentMark(level);
      }
      content += " " + getNodeText$1(node.data);
      const generalization = node.data.generalization;
      if (Array.isArray(generalization)) {
        content += generalization.map((item) => {
          return ` [${getNodeText$1(item)}]`;
        });
      } else if (generalization && generalization.text) {
        const generalizationText = getNodeText$1(generalization);
        content += ` [${generalizationText}]`;
      }
      content += "\n\n";
      if (node.data.note) {
        content += node.data.note + "\n\n";
      }
    },
    () => {
    },
    true
  );
  return content;
};
const getNodeText = (data2) => {
  return data2.richText ? nodeRichTextToTextWithWrap(data2.text) : data2.text;
};
const getIndent = (level) => {
  return new Array(level).fill("   ").join("");
};
const transformToTxt = (root2) => {
  let content = "";
  walk(
    root2,
    null,
    (node, parent, isRoot, layerIndex) => {
      content += getIndent(layerIndex);
      content += " " + getNodeText(node.data);
      const generalization = node.data.generalization;
      if (Array.isArray(generalization)) {
        content += generalization.map((item) => {
          return ` [${getNodeText(item)}]`;
        });
      } else if (generalization && generalization.text) {
        content += ` [${getNodeText(generalization)}]`;
      }
      content += "\n\n";
    },
    () => {
    },
    true
  );
  return content;
};
class Export {
  //  构造函数
  constructor(opt) {
    this.mindMap = opt.mindMap;
  }
  //  导出
  async export(type, isDownload = true, name = "思维导图", ...args) {
    if (this[type]) {
      const result = await this[type](name, ...args);
      if (isDownload) {
        downloadFile(result, name + "." + type);
      }
      return result;
    } else {
      return null;
    }
  }
  // 创建图片url转换任务
  createTransformImgTaskList(svg2, tagName, propName, getUrlFn) {
    const imageList = svg2.find(tagName);
    return imageList.map(async (item) => {
      const imgUlr = getUrlFn(item);
      if (/^data:/.test(imgUlr) || imgUlr === "none") {
        return;
      }
      const imgData = await imgToDataUrl(imgUlr);
      item.attr(propName, imgData);
    });
  }
  //  获取svg数据
  async getSvgData(node) {
    let {
      exportPaddingX,
      exportPaddingY,
      errorHandler,
      resetCss,
      addContentToHeader,
      addContentToFooter,
      handleBeingExportSvg
    } = this.mindMap.opt;
    let { svg: svg2, svgHTML, clipData } = this.mindMap.getSvgData({
      paddingX: exportPaddingX,
      paddingY: exportPaddingY,
      addContentToHeader,
      addContentToFooter,
      node
    });
    if (clipData) {
      clipData.paddingX = exportPaddingX;
      clipData.paddingY = exportPaddingY;
    }
    let svgIsChange = false;
    const task1 = this.createTransformImgTaskList(
      svg2,
      "image",
      "href",
      (item) => {
        return item.attr("href") || item.attr("xlink:href");
      }
    );
    const task2 = this.createTransformImgTaskList(svg2, "img", "src", (item) => {
      return item.attr("src");
    });
    const taskList = [...task1, ...task2];
    try {
      await Promise.all(taskList);
    } catch (error) {
      errorHandler(ERROR_TYPES.EXPORT_LOAD_IMAGE_ERROR, error);
    }
    if (this.mindMap.richText) {
      const foreignObjectList = svg2.find("foreignObject");
      if (foreignObjectList.length > 0) {
        foreignObjectList[0].add(SVG(`<style>${resetCss}</style>`));
        svgIsChange = true;
      }
      if (this.mindMap.formula) {
        const formulaList = svg2.find(".ql-formula");
        if (formulaList.length > 0) {
          const styleText = this.mindMap.formula.getStyleText();
          if (styleText) {
            const styleEl = document.createElement("style");
            styleEl.innerHTML = styleText;
            addXmlns(styleEl);
            foreignObjectList[0].add(styleEl);
            svgIsChange = true;
          }
        }
      }
    }
    if (typeof handleBeingExportSvg === "function") {
      svgIsChange = true;
      svg2 = handleBeingExportSvg(svg2);
    }
    if (taskList.length > 0 || svgIsChange) {
      svgHTML = svg2.svg();
    }
    return {
      node: svg2,
      str: svgHTML,
      clipData
    };
  }
  //   svg转png
  svgToPng(svgSrc, transparent, clipData = null, fitBg = false, format = "image/png") {
    const { maxCanvasSize, minExportImgCanvasScale } = this.mindMap.opt;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.setAttribute("crossOrigin", "anonymous");
      img.onload = async () => {
        try {
          const canvas = document.createElement("canvas");
          const dpr = Math.max(window.devicePixelRatio, minExportImgCanvasScale);
          let imgWidth = img.width;
          let imgHeight = img.height;
          let paddingX = 0;
          let paddingY = 0;
          if (clipData) {
            paddingX = clipData.paddingX;
            paddingY = clipData.paddingY;
            imgWidth = clipData.width + paddingX * 2;
            imgHeight = clipData.height + paddingY * 2;
          }
          let fitBgImgWidth = 0;
          let fitBgImgHeight = 0;
          const { backgroundImage } = this.mindMap.themeConfig;
          if (fitBg && backgroundImage && !transparent) {
            const bgImgSize = await new Promise((resolve2) => {
              const bgImg = new Image();
              bgImg.onload = () => {
                resolve2([bgImg.width, bgImg.height]);
              };
              bgImg.onerror = () => {
                resolve2(null);
              };
              bgImg.src = backgroundImage;
            });
            if (bgImgSize) {
              const imgRatio = imgWidth / imgHeight;
              const bgRatio = bgImgSize[0] / bgImgSize[1];
              if (imgRatio > bgRatio) {
                fitBgImgWidth = imgWidth;
                fitBgImgHeight = imgWidth / bgRatio;
              } else {
                fitBgImgHeight = imgHeight;
                fitBgImgWidth = imgHeight * bgRatio;
              }
            }
          }
          let scaleX = 1;
          let scaleY = 1;
          let canvasWidth = (fitBgImgWidth || imgWidth) * dpr;
          let canvasHeight = (fitBgImgHeight || imgHeight) * dpr;
          if (canvasWidth > maxCanvasSize || canvasHeight > maxCanvasSize) {
            let newWidth = null;
            let newHeight = null;
            if (canvasWidth > maxCanvasSize) {
              newWidth = maxCanvasSize;
            } else if (canvasHeight > maxCanvasSize) {
              newHeight = maxCanvasSize;
            }
            const res = resizeImgSize(
              canvasWidth,
              canvasHeight,
              newWidth,
              newHeight
            );
            scaleX = res[0] / canvasWidth;
            scaleY = res[1] / canvasHeight;
            canvasWidth = res[0];
            canvasHeight = res[1];
          }
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          const styleWidth = canvasWidth / dpr;
          const styleHeight = canvasHeight / dpr;
          canvas.style.width = styleWidth + "px";
          canvas.style.height = styleHeight + "px";
          const ctx = canvas.getContext("2d");
          ctx.scale(dpr, dpr);
          if (!transparent) {
            await this.drawBackgroundToCanvas(ctx, styleWidth, styleHeight);
          }
          const fitBgLeft = (fitBgImgWidth > 0 ? (fitBgImgWidth - imgWidth) / 2 : 0) * scaleX;
          const fitBgTop = (fitBgImgHeight > 0 ? (fitBgImgHeight - imgHeight) / 2 : 0) * scaleY;
          if (clipData) {
            ctx.drawImage(
              img,
              clipData.left,
              clipData.top,
              clipData.width,
              clipData.height,
              paddingX * scaleX + fitBgLeft,
              paddingY * scaleY + fitBgTop,
              clipData.width * scaleX,
              clipData.height * scaleY
            );
          } else {
            ctx.drawImage(
              img,
              fitBgLeft,
              fitBgTop,
              imgWidth * scaleX,
              imgHeight * scaleY
            );
          }
          resolve(canvas.toDataURL(format));
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = (e) => {
        reject(e);
      };
      img.src = svgSrc;
    });
  }
  //  在canvas上绘制思维导图背景
  drawBackgroundToCanvas(ctx, width2, height2) {
    return new Promise((resolve, reject) => {
      const {
        backgroundColor = "#fff",
        backgroundImage,
        backgroundRepeat = "no-repeat",
        backgroundPosition = "center center",
        backgroundSize = "cover"
      } = this.mindMap.themeConfig;
      ctx.save();
      ctx.rect(0, 0, width2, height2);
      ctx.fillStyle = backgroundColor;
      ctx.fill();
      ctx.restore();
      if (backgroundImage && backgroundImage !== "none") {
        ctx.save();
        drawBackgroundImageToCanvas(
          ctx,
          width2,
          height2,
          backgroundImage,
          {
            backgroundRepeat,
            backgroundPosition,
            backgroundSize
          },
          (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
            ctx.restore();
          }
        );
      } else {
        resolve();
      }
    });
  }
  //  在svg上绘制思维导图背景
  drawBackgroundToSvg(svg2) {
    return new Promise(async (resolve) => {
      const {
        backgroundColor = "#fff",
        backgroundImage,
        backgroundRepeat = "repeat"
      } = this.mindMap.themeConfig;
      svg2.css("background-color", backgroundColor);
      if (backgroundImage && backgroundImage !== "none") {
        const imgDataUrl = await imgToDataUrl(backgroundImage);
        svg2.css("background-image", `url(${imgDataUrl})`);
        svg2.css("background-repeat", backgroundRepeat);
        resolve();
      } else {
        resolve();
      }
    });
  }
  // 导出为指定格式的图片
  async _image(format, name, transparent = false, node = null, fitBg = false) {
    this.mindMap.renderer.textEdit.hideEditTextBox();
    this.handleNodeExport(node);
    const { str, clipData } = await this.getSvgData(node);
    const svgUrl = await this.fixSvgStrAndToBlob(str);
    const res = await this.svgToPng(
      svgUrl,
      transparent,
      clipData,
      fitBg,
      format
    );
    return res;
  }
  //  导出为png
  /**
   * 方法1.把svg的图片都转化成data:url格式，再转换
   * 方法2.把svg的图片提取出来再挨个绘制到canvas里，最后一起转换
   */
  async png(...args) {
    const res = await this._image("image/png", ...args);
    return res;
  }
  // 导出为jpg
  async jpg(...args) {
    const res = await this._image("image/jpg", ...args);
    return res;
  }
  // 导出指定节点，如果该节点是激活状态，那么取消激活和隐藏展开收起按钮
  handleNodeExport(node) {
    if (node && node.getData("isActive")) {
      node.deactivate();
      const { alwaysShowExpandBtn, notShowExpandBtn } = this.mindMap.opt;
      if (!alwaysShowExpandBtn && !notShowExpandBtn && node.getData("expand")) {
        node.removeExpandBtn();
      }
    }
  }
  //  导出为pdf
  async pdf(name, transparent = false, fitBg = false) {
    if (!this.mindMap.doExportPDF) {
      throw new Error("请注册ExportPDF插件");
    }
    const img = await this.png(name, transparent, null, fitBg);
    const res = await this.mindMap.doExportPDF.pdf(img);
    return res;
  }
  // 导出为xmind
  async xmind(name) {
    if (!this.mindMap.doExportXMind) {
      throw new Error("请注册ExportXMind插件");
    }
    const data2 = this.mindMap.getData();
    const blob = await this.mindMap.doExportXMind.xmind(data2, name);
    const res = await readBlob(blob);
    return res;
  }
  //  导出为svg
  async svg(name) {
    this.mindMap.renderer.textEdit.hideEditTextBox();
    const { node } = await this.getSvgData();
    node.first().before(SVG(`<title>${name}</title>`));
    await this.drawBackgroundToSvg(node);
    const str = node.svg();
    const res = await this.fixSvgStrAndToBlob(str);
    return res;
  }
  // 修复svg字符串，并且转换为blob数据
  async fixSvgStrAndToBlob(str) {
    str = removeHTMLEntities(str);
    str = handleSelfCloseTags(str);
    const blob = new Blob([str], {
      type: "image/svg+xml"
    });
    const res = await readBlob(blob);
    return res;
  }
  //  导出为json
  async json(name, withConfig = true) {
    const data2 = this.mindMap.getData(withConfig);
    const str = JSON.stringify(data2);
    const blob = new Blob([str]);
    const res = await readBlob(blob);
    return res;
  }
  //  专有文件，其实就是json文件
  async smm(name, withConfig) {
    const res = await this.json(name, withConfig);
    return res;
  }
  // markdown文件
  async md() {
    const data2 = this.mindMap.getData();
    const content = transformToMarkdown(data2);
    const blob = new Blob([content]);
    const res = await readBlob(blob);
    return res;
  }
  // txt文件
  async txt() {
    const data2 = this.mindMap.getData();
    const content = transformToTxt(data2);
    const blob = new Blob([content]);
    const res = await readBlob(blob);
    return res;
  }
}
Export.instanceName = "doExport";
let registered = false;
function registerMindMapPlugins() {
  if (registered) return;
  [Drag, Select, MiniMap, Search, Export].forEach((plugin) => MindMap2.usePlugin(plugin));
  registered = true;
}
function createMindMap(options) {
  registerMindMapPlugins();
  const settings = options.settings;
  return new MindMap2({
    el: options.el,
    data: options.data,
    viewData: options.viewData,
    theme: options.theme ?? "default",
    layout: options.layout ?? "logicalStructure",
    readonly: Boolean(options.readonly),
    enableFreeDrag: true,
    enableCtrlKeyNodeSelection: true,
    useLeftKeySelectionRightKeyDrag: (settings == null ? void 0 : settings.canvasMode) === "select",
    mousewheelAction: (settings == null ? void 0 : settings.wheelMode) === "zoom" ? "zoom" : "move",
    disableMouseWheelZoom: (settings == null ? void 0 : settings.wheelMode) === "none",
    mousewheelMoveStep: 60,
    selectTextOnEnterEditText: true,
    isEndNodeTextEditOnClickOuter: true,
    enableDragModifyNodeWidth: true,
    isShowCreateChildBtnIcon: (settings == null ? void 0 : settings.showQuickCreate) ?? true,
    fit: (settings == null ? void 0 : settings.autoFitOnOpen) ?? true,
    addHistoryOnInit: true,
    defaultInsertSecondLevelNodeText: "新节点",
    defaultInsertBelowSecondLevelNodeText: "新节点",
    errorHandler: (_code, error) => console.error("[YeMind Zen]", error)
  });
}
function createCommandAdapter(mindMap) {
  return {
    addChild: () => mindMap.execCommand("INSERT_CHILD_NODE"),
    addSibling: () => mindMap.execCommand("INSERT_NODE"),
    addParent: () => mindMap.execCommand("INSERT_PARENT_NODE"),
    moveUp: () => mindMap.execCommand("UP_NODE"),
    moveDown: () => mindMap.execCommand("DOWN_NODE"),
    toggleExpand: () => mindMap.renderer.toggleActiveExpand(),
    remove: () => mindMap.execCommand("REMOVE_NODE"),
    removeOnlyCurrent: () => mindMap.execCommand("REMOVE_CURRENT_NODE"),
    undo: () => mindMap.execCommand("BACK"),
    redo: () => mindMap.execCommand("FORWARD"),
    fit: () => mindMap.view.fit(),
    resetZoom: () => mindMap.view.reset(),
    zoomIn: () => mindMap.view.enlarge(void 0, void 0, false),
    zoomOut: () => mindMap.view.narrow(void 0, void 0, false),
    edit: () => mindMap.renderer.startTextEdit()
  };
}
function openNodeContextMenu(event, commands) {
  event.preventDefault();
  event.stopPropagation();
  const menu = new siyuan.Menu("siyuan-yemind-zen-node-menu");
  menu.addItem({ icon: "iconEdit", label: "编辑节点", accelerator: "F2", click: () => commands.edit() });
  menu.addSeparator();
  menu.addItem({ icon: "iconAdd", label: "添加子节点", accelerator: "Tab", click: () => commands.addChild() });
  menu.addItem({ icon: "iconAdd", label: "添加同级节点", accelerator: "Enter", click: () => commands.addSibling() });
  menu.addItem({ icon: "iconAdd", label: "添加父节点", accelerator: "Shift+Tab", click: () => commands.addParent() });
  menu.addSeparator();
  menu.addItem({ icon: "iconUp", label: "上移节点", click: () => commands.moveUp() });
  menu.addItem({ icon: "iconDown", label: "下移节点", click: () => commands.moveDown() });
  menu.addItem({ icon: "iconRefresh", label: "展开/折叠", accelerator: "/", click: () => commands.toggleExpand() });
  menu.addSeparator();
  menu.addItem({ icon: "iconTrashcan", label: "仅删除节点，保留子节点", accelerator: "Shift+Backspace", click: () => commands.removeOnlyCurrent() });
  menu.addItem({ icon: "iconTrashcan", label: "删除节点和子树", accelerator: "Backspace", warning: true, click: () => commands.remove() });
  menu.open({ x: event.clientX, y: event.clientY });
}
function plainText(value) {
  return String(value ?? "").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}
function countWords(value) {
  return value ? value.split(/\s+/).filter(Boolean).length : 0;
}
function calculateEditorStats(tree) {
  let nodes = 0;
  let words = 0;
  const walk2 = (node) => {
    nodes += 1;
    words += countWords(plainText(node.data.text));
    node.children.forEach(walk2);
  };
  walk2(tree);
  return { roots: 1, nodes, words };
}
function createEditorTemplate(title) {
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
function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
class YeMindEditor {
  constructor(options) {
    __publicField(this, "map", null);
    __publicField(this, "commands", null);
    __publicField(this, "saveTimer", null);
    __publicField(this, "unsubscribe", null);
    __publicField(this, "destroyed", false);
    __publicField(this, "current");
    __publicField(this, "rootEl");
    __publicField(this, "canvasEl");
    __publicField(this, "statsEl");
    __publicField(this, "zoomEl");
    __publicField(this, "saveStateEl");
    __publicField(this, "titleEl");
    this.options = options;
    const map2 = options.repository.get(options.mapId);
    if (!map2) throw new Error(`Map not found: ${options.mapId}`);
    this.current = map2;
    this.mount();
  }
  resize() {
    var _a;
    (_a = this.map) == null ? void 0 : _a.resize();
  }
  destroy() {
    var _a, _b;
    this.destroyed = true;
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    (_a = this.unsubscribe) == null ? void 0 : _a.call(this);
    (_b = this.map) == null ? void 0 : _b.destroy();
    this.map = null;
    this.options.container.innerHTML = "";
  }
  mount() {
    this.options.container.innerHTML = createEditorTemplate(this.current.title);
    this.rootEl = this.options.container.querySelector(".ymz-editor");
    this.canvasEl = this.options.container.querySelector('[data-role="canvas"]');
    this.statsEl = this.options.container.querySelector('[data-role="stats"]');
    this.zoomEl = this.options.container.querySelector('[data-role="zoom"]');
    this.saveStateEl = this.options.container.querySelector('[data-role="save-state"]');
    this.titleEl = this.options.container.querySelector('[data-role="title"]');
    const layoutSelect = this.options.container.querySelector('[data-action="layout"]');
    if (layoutSelect) layoutSelect.value = this.current.layout;
    this.map = createMindMap({
      el: this.canvasEl,
      data: this.current.data,
      viewData: this.current.viewData,
      theme: this.current.theme,
      layout: this.current.layout,
      settings: this.options.settingsStore.get()
    });
    this.commands = createCommandAdapter(this.map);
    this.bindToolbar();
    this.bindMapEvents();
    this.unsubscribe = this.options.repository.subscribe((state) => {
      var _a, _b;
      const next2 = state.maps.find((item) => item.id === this.current.id);
      if (!next2) {
        (_b = (_a = this.options).onMissing) == null ? void 0 : _b.call(_a);
        return;
      }
      if (next2.title !== this.current.title) {
        this.current.title = next2.title;
        this.titleEl.textContent = next2.title;
        this.titleEl.title = next2.title;
      }
    });
    this.updateStats(this.current.data);
    this.updateZoom();
  }
  bindToolbar() {
    var _a;
    this.rootEl.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button || !this.commands || !this.map) return;
      const action = button.dataset.action;
      switch (action) {
        case "undo":
          this.commands.undo();
          break;
        case "redo":
          this.commands.redo();
          break;
        case "add-child":
          this.commands.addChild();
          break;
        case "add-sibling":
          this.commands.addSibling();
          break;
        case "remove":
          this.commands.remove();
          break;
        case "fit":
          this.commands.fit();
          break;
        case "reset":
          this.commands.resetZoom();
          break;
        case "zoom-in":
          this.commands.zoomIn();
          break;
        case "zoom-out":
          this.commands.zoomOut();
          break;
        case "readonly":
          this.toggleReadonly(button);
          break;
        case "zen":
          this.toggleZen(true);
          break;
        case "zen-exit":
          this.toggleZen(false);
          break;
        case "fullscreen":
          void this.toggleFullscreen();
          break;
        case "help":
          this.openHelp();
          break;
      }
    });
    (_a = this.rootEl.querySelector('[data-action="layout"]')) == null ? void 0 : _a.addEventListener("change", (event) => {
      if (!this.map) return;
      const layout2 = event.target.value;
      this.map.setLayout(layout2);
      this.current.layout = layout2;
      this.scheduleSave();
    });
  }
  bindMapEvents() {
    if (!this.map) return;
    this.map.on("data_change", (data2) => {
      this.current.data = data2;
      this.updateStats(data2);
      this.scheduleSave();
    });
    this.map.on("view_data_change", (viewData) => {
      this.current.viewData = viewData;
      this.updateZoom();
      this.scheduleSave();
    });
    this.map.on("node_contextmenu", (event) => {
      if (this.commands) openNodeContextMenu(event, this.commands);
    });
    this.map.on("node_active", (_node, list) => {
      this.rootEl.dataset.hasSelection = list.length > 0 ? "true" : "false";
    });
    this.map.on("scale", () => this.updateZoom());
  }
  scheduleSave() {
    if (this.destroyed) return;
    this.saveStateEl.textContent = "保存中…";
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      void this.persist();
    }, 350);
  }
  async persist() {
    if (!this.map || this.destroyed) return;
    try {
      await this.options.repository.update(this.current.id, {
        data: this.map.getData(false),
        layout: this.map.getLayout(),
        theme: this.map.getTheme(),
        viewData: this.map.view.getTransformData()
      });
      this.saveStateEl.textContent = "已保存";
    } catch (error) {
      console.error("[YeMind Zen] save failed", error);
      this.saveStateEl.textContent = "保存失败";
      siyuan.showMessage("YeMind Zen 保存失败", 5e3, "error");
    }
  }
  updateStats(data2) {
    const stats = calculateEditorStats(data2);
    this.statsEl.textContent = `roots ${stats.roots} · nodes ${stats.nodes} · words ${stats.words}`;
  }
  updateZoom() {
    var _a, _b;
    const scale = Number(((_b = (_a = this.map) == null ? void 0 : _a.view) == null ? void 0 : _b.scale) ?? 1);
    this.zoomEl.textContent = `${Math.round(scale * 100)}%`;
  }
  toggleReadonly(button) {
    if (!this.map) return;
    const next2 = this.rootEl.dataset.readonly !== "true";
    this.rootEl.dataset.readonly = String(next2);
    button.classList.toggle("is-active", next2);
    this.map.setMode(next2 ? "readonly" : "edit");
  }
  toggleZen(enabled) {
    this.rootEl.dataset.zen = String(enabled);
  }
  async toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await this.rootEl.requestFullscreen();
    }
  }
  openHelp() {
    new siyuan.Dialog({
      title: "YeMind Zen 快速操作",
      content: `<div class="b3-dialog__content ymz-help">
        <p><b>双击</b> 编辑节点</p>
        <p><b>Tab</b> 添加子节点，<b>Enter</b> 添加同级节点</p>
        <p><b>拖拽节点</b> 调整层级，<b>Ctrl/Cmd + 拖拽</b> 框选</p>
        <p><b>Backspace/Delete</b> 删除节点，<b>Ctrl/Cmd + Z</b> 撤销</p>
      </div>`,
      width: "420px"
    });
  }
}
function registerYeMindTab(plugin, host) {
  const editors = /* @__PURE__ */ new WeakMap();
  const unregisterTabs = /* @__PURE__ */ new WeakMap();
  plugin.addTab({
    type: TAB_TYPE,
    init() {
      var _a;
      const container = this.element;
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.minHeight = "0";
      const mapId = String(((_a = this.data) == null ? void 0 : _a.mapId) ?? "");
      const map2 = host.repository.get(mapId);
      if (!map2) {
        container.innerHTML = '<div class="ymz-missing"><b>导图不存在</b><span>它可能已被删除。</span></div>';
        return;
      }
      this.tab.updateTitle(map2.title);
      const unregister = host.tabRegistry.register(mapId, {
        activate: () => {
          var _a2;
          return (_a2 = this.tab.headElement) == null ? void 0 : _a2.click();
        },
        close: () => this.tab.close(),
        updateTitle: (title) => this.tab.updateTitle(title)
      });
      unregisterTabs.set(this, unregister);
      const editor = new YeMindEditor({
        container,
        mapId,
        repository: host.repository,
        settingsStore: host.settingsStore,
        onMissing: () => this.tab.close()
      });
      editors.set(this, editor);
    },
    resize() {
      var _a;
      (_a = editors.get(this)) == null ? void 0 : _a.resize();
    },
    destroy() {
      var _a, _b;
      (_a = editors.get(this)) == null ? void 0 : _a.destroy();
      editors.delete(this);
      (_b = unregisterTabs.get(this)) == null ? void 0 : _b();
      unregisterTabs.delete(this);
    }
  });
}
class OpenMapTabRegistry {
  constructor() {
    __publicField(this, "handles", /* @__PURE__ */ new Map());
  }
  register(mapId, handle) {
    this.handles.set(mapId, handle);
    return () => {
      if (this.handles.get(mapId) === handle) this.handles.delete(mapId);
    };
  }
  activate(mapId) {
    const handle = this.handles.get(mapId);
    if (!handle) return false;
    handle.activate();
    return true;
  }
  close(mapId) {
    const handle = this.handles.get(mapId);
    if (!handle) return false;
    handle.close();
    return true;
  }
  updateTitle(mapId, title) {
    var _a;
    (_a = this.handles.get(mapId)) == null ? void 0 : _a.updateTitle(title);
  }
}
function parseYeMindMapUrl(value, pluginName) {
  var _a;
  try {
    const url = new URL(value);
    if (url.protocol !== "siyuan:" || url.hostname !== "plugins") return null;
    const targetPlugin = url.pathname.replace(/^\/+|\/+$/g, "");
    if (targetPlugin !== pluginName) return null;
    const mapId = (_a = url.searchParams.get("map")) == null ? void 0 : _a.trim();
    return mapId || null;
  } catch {
    return null;
  }
}
class YeMindZenPlugin extends siyuan.Plugin {
  constructor() {
    super(...arguments);
    __publicField(this, "repository");
    __publicField(this, "settingsStore");
    __publicField(this, "tabRegistry", new OpenMapTabRegistry());
    __publicField(this, "onOpenPluginUrl", (event) => {
      var _a;
      const mapId = parseYeMindMapUrl(((_a = event.detail) == null ? void 0 : _a.url) ?? "", this.name);
      if (mapId) void this.openMap(mapId);
    });
  }
  onload() {
    this.addIcons(`<symbol id="${ICON_ID}" viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="7" fill="#176b50"/><text x="16" y="21" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">Ye</text></symbol>`);
    this.repository = new MapRepository({
      load: () => this.loadData(MAP_STORAGE_NAME),
      save: async (value) => {
        await this.saveData(MAP_STORAGE_NAME, value);
      }
    });
    this.settingsStore = new SettingsStore({
      load: () => this.loadData(SETTINGS_STORAGE_NAME),
      save: async (value) => {
        await this.saveData(SETTINGS_STORAGE_NAME, value);
      }
    });
    registerYeMindTab(this, this);
    registerYeMindDock(this, this);
    registerSettings(this, this.settingsStore);
    this.registerCommands();
    this.eventBus.on("open-siyuan-url-plugin", this.onOpenPluginUrl);
    void this.bootstrap();
  }
  onLayoutReady() {
    this.registerTopBar();
  }
  onunload() {
    this.eventBus.off("open-siyuan-url-plugin", this.onOpenPluginUrl);
  }
  async openMap(mapId) {
    const map2 = this.repository.get(mapId);
    if (!map2) {
      siyuan.showMessage("导图不存在或已被删除", 4e3, "error");
      return;
    }
    await this.repository.setActiveMap(mapId);
    if (this.tabRegistry.activate(mapId)) return;
    await siyuan.openTab({
      app: this.app,
      custom: {
        id: `${this.name}${TAB_TYPE}`,
        icon: ICON_ID,
        title: map2.title,
        data: { mapId }
      },
      openNewTab: true,
      keepCursor: false
    });
  }
  async createMap() {
    const title = await promptText("新建导图", "未命名导图", "导图名称");
    if (!title) return;
    const map2 = await this.repository.create(title);
    const settings = this.settingsStore.get();
    await this.repository.update(map2.id, { layout: settings.defaultLayout });
    await this.openMap(map2.id);
  }
  async renameMap(mapId) {
    const map2 = this.repository.get(mapId);
    if (!map2) return;
    const title = await promptText("重命名导图", map2.title, "导图名称");
    if (!title || title === map2.title) return;
    await this.repository.rename(mapId, title);
    this.tabRegistry.updateTitle(mapId, title);
  }
  async deleteMap(mapId) {
    const map2 = this.repository.get(mapId);
    if (!map2) return;
    const confirmed = await confirmAction("删除导图", `确认删除“${map2.title}”？删除后无法撤销。`, "删除");
    if (!confirmed) return;
    this.tabRegistry.close(mapId);
    await this.repository.remove(mapId);
  }
  async copyMapLink(mapId) {
    const link = `siyuan://plugins/${this.name}?map=${encodeURIComponent(mapId)}`;
    try {
      await navigator.clipboard.writeText(link);
      siyuan.showMessage("导图链接已复制");
    } catch {
      siyuan.showMessage(link, 8e3);
    }
  }
  async bootstrap() {
    try {
      await Promise.all([this.repository.load(), this.settingsStore.load()]);
    } catch (error) {
      console.error("[YeMind Zen] failed to load storage", error);
      siyuan.showMessage("YeMind Zen 数据加载失败", 6e3, "error");
    }
  }
  registerTopBar() {
    this.addTopBar({
      icon: ICON_ID,
      title: "YeMind Zen",
      position: "right",
      callback: (event) => {
        const menu = new siyuan.Menu("siyuan-yemind-zen-top-menu");
        menu.addItem({ icon: "iconAdd", label: "新建导图", click: () => this.createMap() });
        const maps = this.repository.list();
        if (maps.length > 0) {
          menu.addSeparator();
          maps.slice(0, 12).forEach((map2) => {
            menu.addItem({ icon: ICON_ID, label: map2.title, click: () => this.openMap(map2.id) });
          });
        }
        menu.addSeparator();
        menu.addItem({ icon: "iconSettings", label: "设置", click: () => this.openSetting() });
        menu.open({ x: event.clientX, y: event.clientY });
      }
    });
  }
  registerCommands() {
    this.addCommand({
      langKey: "newYeMindMap",
      langText: "新建 YeMind 导图",
      hotkey: "⌥⇧M",
      callback: () => {
        void this.createMap();
      }
    });
    this.addCommand({
      langKey: "openActiveYeMindMap",
      langText: "打开最近的 YeMind 导图",
      callback: () => {
        var _a;
        const id = this.repository.getActiveMapId() ?? ((_a = this.repository.list()[0]) == null ? void 0 : _a.id);
        if (id) void this.openMap(id);
        else void this.createMap();
      }
    });
  }
}
module.exports = YeMindZenPlugin;
//# sourceMappingURL=index.js.map
