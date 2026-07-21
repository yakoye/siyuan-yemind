"use strict";

const { Plugin, Dialog, Menu, openTab, showMessage } = require("siyuan");

const STORAGE_NAME = "yemind-zen-state.json";
const TAB_TYPE = "yemind-zen-tab";
const DOCK_TYPE = "yemind-zen-dock";
const APP_VERSION = "0.1.0";
const ICON_ID = "iconYeMindZen";
const BRAND_ICON = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="1" y="1" width="30" height="30" rx="7" fill="#176b50"/><text x="16" y="21" text-anchor="middle" font-size="14" font-weight="700" font-family="Arial,sans-serif" fill="#fff">Ye</text></svg>`;
const SIYUAN_LINK_RE = /siyuan:\/\/blocks\/(\d{14}-[a-z0-9]{7})/i;


const OFFICIAL_KMIND_ROOTS = [
  "/data/storage/petal/siyuan-kmind-zen/maps/dock",
  "/data/storage/petal/kmind-zen/maps/dock",
];
const OFFICIAL_PROJECT_FILE = "project.kmindz.svg";
const OFFICIAL_PLUGIN_NAME = "siyuan-kmind-zen";
const OFFICIAL_TAB_TYPE = "Mindmap";
const OFFICIAL_TAB_ID = `${OFFICIAL_PLUGIN_NAME}${OFFICIAL_TAB_TYPE}`;
const STUDY_PROTOCOL_PATH = "/yemind-zen";

function buildYeMindMapLink(mapId) {
  const data = encodeURIComponent(JSON.stringify({ schemaVersion: 1, mapId: String(mapId || "") }));
  return `siyuan://plugins${STUDY_PROTOCOL_PATH}?data=${data}`;
}

function parseYeMindMapLink(value) {
  try {
    const url = new URL(decodeURI(String(value || "").trim()));
    if (url.protocol !== "siyuan:" || url.hostname !== "plugins" || url.pathname !== STUDY_PROTOCOL_PATH) return null;
    const raw = url.searchParams.get("data");
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.schemaVersion !== 1 || !data?.mapId) return null;
    return { mapId: String(data.mapId) };
  } catch { return null; }
}

async function readSiyuanDir(path) {
  const data = await kernelPost("/api/file/readDir", { path });
  return Array.isArray(data) ? data : [];
}

async function readSiyuanTextFile(path) {
  const response = await fetch("/api/file/getFile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`读取文件失败：${path}`);
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && typeof parsed.code === "number" && parsed.code !== 0) {
      throw new Error(parsed.msg || `读取文件失败：${path}`);
    }
  } catch (error) {
    if (error instanceof SyntaxError) return text;
    throw error;
  }
  return text;
}

function decodeXmlText(value = "") {
  return String(value)
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}

function metadataValue(svg, id) {
  const escaped = String(id).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`<metadata\\b[^>]*\\bid=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/metadata>`, "i").exec(String(svg || ""));
  return match ? String(match[1] || "") : "";
}

function parseOfficialPackage(svg) {
  try {
    const rawHeader = decodeXmlText(metadataValue(svg, "kmindz").trim());
    if (!rawHeader) return null;
    const header = JSON.parse(rawHeader);
    if (header?.format !== "kmindz-project-svg" || Number(header?.version) !== 3 || !header?.rootDocId) return null;
    return {
      header,
      docsZipB64: metadataValue(svg, "kmindz-docs").replace(/\s+/g, ""),
    };
  } catch {
    return null;
  }
}

function base64Bytes(value = "") {
  const binary = atob(String(value).replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function u16(view, offset) { return view.getUint16(offset, true); }
function u32(view, offset) { return view.getUint32(offset, true); }

async function inflateZipEntry(bytes, method) {
  if (method === 0) return bytes;
  if (method !== 8) throw new Error(`暂不支持 ZIP 压缩方式 ${method}`);
  if (typeof DecompressionStream !== "function") throw new Error("当前思源内核不支持 ZIP 解压");
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipEntries(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  const min = Math.max(0, bytes.length - 0xffff - 22);
  for (let i = bytes.length - 22; i >= min; i -= 1) {
    if (u32(view, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("YeMind 文件中的 ZIP 目录无效");
  const total = u16(view, eocd + 10);
  let offset = u32(view, eocd + 16);
  const decoder = new TextDecoder();
  const result = new Map();
  for (let index = 0; index < total; index += 1) {
    if (u32(view, offset) !== 0x02014b50) throw new Error("YeMind ZIP 中央目录无效");
    const method = u16(view, offset + 10);
    const compressedSize = u32(view, offset + 20);
    const nameLength = u16(view, offset + 28);
    const extraLength = u16(view, offset + 30);
    const commentLength = u16(view, offset + 32);
    const localOffset = u32(view, offset + 42);
    const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    if (u32(view, localOffset) !== 0x04034b50) throw new Error("YeMind ZIP 本地文件头无效");
    const localNameLength = u16(view, localOffset + 26);
    const localExtraLength = u16(view, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    result.set(name, await inflateZipEntry(compressed, method));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return result;
}

function officialContentText(content) {
  if (!content || typeof content !== "object") return "";
  if (typeof content.text === "string") return content.text;
  if (Array.isArray(content.blocks)) {
    const parts = [];
    const walk = (value) => {
      if (value == null) return;
      if (typeof value === "string") { parts.push(value); return; }
      if (Array.isArray(value)) { value.forEach(walk); return; }
      if (typeof value !== "object") return;
      if (typeof value.text === "string") parts.push(value.text);
      if (typeof value.latex === "string") parts.push(value.latex);
      for (const key of ["children", "spans", "runs", "content", "blocks"]) if (key in value) walk(value[key]);
    };
    walk(content.blocks);
    return parts.join(" ").replace(/\s+/g, " ").trim();
  }
  return "";
}

function officialNodeText(node) {
  const text = typeof node?.text === "string" ? node.text : officialContentText(node?.content);
  return String(text || "未命名节点").trim() || "未命名节点";
}

function convertOfficialDocument(record, info, settings) {
  const documentData = record?.doc && typeof record.doc === "object" ? record.doc : record;
  const sourceNodes = documentData?.nodes && typeof documentData.nodes === "object" ? documentData.nodes : {};
  const nodes = {};
  for (const [id, source] of Object.entries(sourceNodes)) {
    const contentWidth = source?.contentWidth || {};
    const width = Number(contentWidth.width || contentWidth.wrapWidth || source?.maxWidth || settings.defaultNodeWidth);
    const attrs = source?.attrs && typeof source.attrs === "object" ? source.attrs : {};
    nodes[id] = {
      ...createNode(officialNodeText(source), source?.parentId || null, settings),
      id,
      parentId: source?.parentId || null,
      children: Array.isArray(source?.children) ? source.children.filter((child) => sourceNodes[child]) : [],
      html: esc(officialNodeText(source)),
      width: clamp(Number.isFinite(width) ? width : settings.defaultNodeWidth, 100, 520),
      collapsed: Boolean(source?.collapsed || attrs.collapsed),
      style: {},
      official: { sourceNodeId: id },
    };
  }
  const roots = Array.isArray(documentData?.roots) ? documentData.roots : (Array.isArray(documentData?.rootIds) ? documentData.rootIds : []);
  let rootIds = roots.filter((id) => nodes[id]);
  if (!rootIds.length) rootIds = Object.values(nodes).filter((node) => !node.parentId || !nodes[node.parentId]).map((node) => node.id);
  if (!rootIds.length) {
    const fallback = createNode(record?.title || info.title || "YeMind", null, settings);
    nodes[fallback.id] = fallback;
    rootIds = [fallback.id];
  }
  const rootLayout = nodes[rootIds[0]] && sourceNodes[rootIds[0]]?.layout;
  const supported = new Set(LAYOUTS.map(([value]) => value));
  const map = {
    ...createMap(record?.title || info.title || "YeMind", settings),
    id: uid("map"),
    title: record?.title || info.title || "YeMind",
    rootIds,
    nodes,
    relations: [],
    summaries: [],
    layout: supported.has(rootLayout) ? rootLayout : settings.defaultLayout,
    view: settings.defaultView,
    officialSource: {
      rootDocId: info.rootDocId,
      filePath: info.filePath,
      importedAt: now(),
      sourceVersion: info.packageVersion || 3,
    },
    createdAt: now(),
    updatedAt: now(),
  };
  return map;
}

async function decodeOfficialMap(svg, info, settings) {
  const pkg = parseOfficialPackage(svg);
  if (!pkg?.docsZipB64) throw new Error("该原版导图缺少可编辑文档数据");
  const entries = await readZipEntries(base64Bytes(pkg.docsZipB64));
  const manifestBytes = entries.get("manifest.json");
  if (!manifestBytes) throw new Error("该原版导图缺少 manifest.json");
  const manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
  const rootDocId = pkg.header.rootDocId;
  const descriptor = Array.isArray(manifest?.documents) ? manifest.documents.find((item) => item?.id === rootDocId) : null;
  const docPath = descriptor?.path || `docs/${rootDocId}.json`;
  const documentBytes = entries.get(docPath);
  if (!documentBytes) throw new Error(`该原版导图缺少 ${docPath}`);
  const record = JSON.parse(new TextDecoder().decode(documentBytes));
  return convertOfficialDocument(record, { ...info, rootDocId, packageVersion: pkg.header.version }, settings);
}

const DEFAULT_SHORTCUTS = {
  openSubmap: "Cmd+Alt+D / Ctrl+Alt+D",
  projectSearch: "Ctrl+F / Cmd+F",
  toggleZen: "Cmd+Alt+Z / Ctrl+Alt+Z",
  toggleReadonly: "Cmd+Alt+R / Ctrl+Alt+R",
  undo: "Cmd+Z / Ctrl+Z",
  redo: "Cmd+Shift+Z / Ctrl+Shift+Z / Cmd+Y / Ctrl+Y",
  deleteSelection: "Backspace / Delete",
  deleteNodeOnly: "Shift+Backspace",
  zoomIn: "Cmd+= / Ctrl+= / Cmd++ / Ctrl++",
  zoomOut: "Cmd+- / Ctrl+-",
  fitView: "Cmd+0 / Ctrl+0",
  resetZoom: "Cmd+Alt+0 / Ctrl+Alt+0",
  firstRoot: "Cmd+Enter / Ctrl+Enter",
  addParent: "Alt+Enter",
  moveUp: "Alt+ArrowUp",
  moveDown: "Alt+ArrowDown",
  collapse: "Alt+ArrowLeft",
  expand: "Alt+ArrowRight",
  summary: "Cmd+Alt+G / Ctrl+Alt+G",
  relation: "Cmd+Alt+L / Ctrl+Alt+L",
  toggleTodo: "Cmd+Alt+X / Ctrl+Alt+X",
  editNotes: "Cmd+Alt+N / Ctrl+Alt+N",
  addComment: "Cmd+Alt+M / Ctrl+Alt+M",
  copyNodeLink: "Cmd+Alt+C / Ctrl+Alt+C",
  copyPlainText: "Cmd+Alt+P / Ctrl+Alt+P",
  pasteSubtree: "Cmd+Alt+V / Ctrl+Alt+V",
  copySubtreeMarkdown: "Cmd+Shift+Alt+M / Ctrl+Shift+Alt+M",
  copySubtreePng: "Cmd+Shift+Alt+C / Ctrl+Shift+Alt+C",
  saveMap: "Cmd+S / Ctrl+S",
  createSubdoc: "Cmd+Shift+Alt+D / Ctrl+Shift+Alt+D",
  richBold: "Cmd+B / Ctrl+B",
  richItalic: "Cmd+I / Ctrl+I",
  richStrike: "Cmd+Shift+S / Ctrl+Shift+S",
  richInlineCode: "Cmd+E / Ctrl+E",
  richCodeBlock: "Cmd+Alt+C / Ctrl+Alt+C",
  richFormula: "Cmd+M / Ctrl+M",
  richSlashMenu: "/",
  richLineBreak: "Shift+Enter",
  richParagraph: "Alt+Enter",
  richFinish: "Enter / Cmd+Enter / Ctrl+Enter",
  richCancel: "Escape",
};

const SHORTCUT_SECTIONS = [
  ["导图命令", [
    ["openSubmap", "打开子导图"], ["projectSearch", "项目内搜索"], ["toggleZen", "切换禅模式"], ["toggleReadonly", "切换只读模式"],
    ["undo", "撤销"], ["redo", "重做"], ["deleteSelection", "删除选中"], ["deleteNodeOnly", "仅删除节点（保留子节点）"],
    ["zoomIn", "放大"], ["zoomOut", "缩小"], ["fitView", "适配视图"], ["resetZoom", "重置缩放"], ["firstRoot", "回到第一个根节点"],
    ["addParent", "添加父节点"], ["moveUp", "上移节点"], ["moveDown", "下移节点"], ["collapse", "收缩节点"], ["expand", "展开节点"],
    ["summary", "概要"], ["relation", "关联线"], ["toggleTodo", "切换待办模式"], ["editNotes", "编辑备注"], ["addComment", "添加批注"],
    ["copyNodeLink", "复制节点链接"], ["copyPlainText", "复制纯文本"], ["pasteSubtree", "粘贴节点子树"],
    ["copySubtreeMarkdown", "复制节点子树为 Markdown"], ["copySubtreePng", "复制节点子树为 PNG"], ["saveMap", "保存导图"], ["createSubdoc", "创建节点子文档"],
  ]],
  ["富文本编辑", [
    ["richBold", "加粗"], ["richItalic", "斜体"], ["richStrike", "删除线"], ["richInlineCode", "行内代码"], ["richCodeBlock", "代码块"], ["richFormula", "公式"],
    ["richSlashMenu", "斜杠菜单", "在行首或空白后触发"], ["richLineBreak", "换行"], ["richParagraph", "新段落"],
    ["richFinish", "完成编辑", "Enter 是否继续创建同级节点取决于当前编辑模式"], ["richCancel", "取消编辑"],
  ]],
];

const DEFAULT_SETTINGS = {
  defaultView: "mindmap",
  defaultLayout: "logical-right",
  defaultZenMode: false,
  defaultReadOnlyMode: false,
  autosave: true,
  autosaveDelay: 650,
  canvasDrag: "pan",
  wheelBehavior: "panZoom",
  zoomSpeed: 0.12,
  showAddChildButton: true,
  showNodeMenuButton: true,
  compressInsertedImages: true,
  blockPreviewScale: "1x",
  defaultNodeWidth: 190,
  defaultFontSize: 14,
  clozeMode: "blur",
  theme: "light",
  background: "#f6f8fb",
  nodeColor: "#ffffff",
  nodeBorder: "#9fb3c8",
  edgeColor: "#8aa0b8",
  accent: "#176b50",
  generalTheme: "blue",
  generalTemplate: "blank",
  docMapTheme: "inherit",
  docMapStructure: "heading-outline",
  docMapLayout: "logical-right",
  docMapCompact: false,
  docTreeTheme: "inherit",
  docTreeTemplate: "blank",
  dockTheme: "inherit",
  dockTemplate: "blank",
  blockTheme: "inherit",
  blockTemplate: "blank",
  exportScale: 2,
  exportBackground: true,
  liveSiyuanPreview: true,
  mirrorRefreshOnOpen: true,
  siyuanRefreshSeconds: 60,
  siyuanDefaultNotebook: "",
  siyuanSubdocBasePath: "/YeMind",
  siyuanCardPreviewLength: 160,
  siyuanCardView: "rich",
  mirrorConflictPolicy: "ask",
  docTreeUpdateLocalTitles: false,
  shortcuts: cloneShortcutDefaults(),
};

function cloneShortcutDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS));
}

const THEME_PRESETS = {
  light: { background: "#f6f8fb", nodeColor: "#ffffff", nodeBorder: "#9fb3c8", edgeColor: "#8aa0b8", accent: "#176b50" },
  paper: { background: "#fbfaf6", nodeColor: "#fffef9", nodeBorder: "#b8ad94", edgeColor: "#9e947e", accent: "#6b5b3e" },
  blue: { background: "#f2f6fb", nodeColor: "#ffffff", nodeBorder: "#9bb7da", edgeColor: "#7b9fc9", accent: "#356fae" },
  green: { background: "#f2f8f5", nodeColor: "#ffffff", nodeBorder: "#96baa9", edgeColor: "#75a18d", accent: "#176b50" },
  dark: { background: "#161b22", nodeColor: "#252d38", nodeBorder: "#526577", edgeColor: "#71869b", accent: "#45a383" },
};

const LAYOUTS = [
  ["logical-right", "向右逻辑图"],
  ["logical-left", "向左逻辑图"],
  ["tree-down", "向下树状图"],
  ["tree-up", "向上树状图"],
  ["mindmap-both", "双向思维导图"],
];

const uid = (prefix = "id") => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
const now = () => new Date().toISOString();
const clone = (value) => JSON.parse(JSON.stringify(value));
const esc = (value = "") => String(value).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
const stripHtml = (html = "") => {
  if (typeof document === "undefined") return String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || "").trim();
};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const isMacPlatform = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || "");
const normalizeShortcutKey = (key = "") => {
  const value = String(key);
  const lower = value.toLowerCase();
  const aliases = { " ": "Space", spacebar: "Space", esc: "Escape", del: "Delete", return: "Enter", arrowup: "ArrowUp", arrowdown: "ArrowDown", arrowleft: "ArrowLeft", arrowright: "ArrowRight" };
  if (aliases[lower]) return aliases[lower];
  if (value.length === 1) return value.toUpperCase();
  return value;
};
const shortcutAlternatives = (binding = "") => String(binding).split("/").map((item) => item.trim()).filter(Boolean);
const parseShortcut = (binding = "") => {
  const tokens = String(binding).split("+").map((item) => item.trim()).filter(Boolean);
  const spec = { ctrl: false, meta: false, alt: false, shift: false, key: "" };
  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (["ctrl", "control"].includes(lower)) spec.ctrl = true;
    else if (["cmd", "command", "meta"].includes(lower)) spec.meta = true;
    else if (["alt", "option"].includes(lower)) spec.alt = true;
    else if (lower === "shift") spec.shift = true;
    else spec.key = normalizeShortcutKey(token);
  }
  return spec;
};
const shortcutMatches = (event, binding = "") => shortcutAlternatives(binding).some((alt) => {
  const spec = parseShortcut(alt);
  const eventKey = normalizeShortcutKey(event.key);
  return Boolean(spec.key) && spec.ctrl === Boolean(event.ctrlKey) && spec.meta === Boolean(event.metaKey) && spec.alt === Boolean(event.altKey) && spec.shift === Boolean(event.shiftKey) && spec.key.toLowerCase() === eventKey.toLowerCase();
});
const shortcutFromEvent = (event) => {
  const key = normalizeShortcutKey(event.key);
  if (["Control", "Meta", "Alt", "Shift"].includes(key)) return "";
  const parts = [];
  if (event.metaKey) parts.push("Cmd");
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  parts.push(key === "+" ? "+" : key);
  return parts.join("+");
};
const shortcutConflicts = (shortcuts = {}) => {
  const found = new Map();
  const conflicts = new Set();
  for (const [id, binding] of Object.entries(shortcuts || {})) {
    const context = id.startsWith("rich") ? "rich" : "map";
    for (const alt of shortcutAlternatives(binding)) {
      const normalized = `${context}:${alt.toLowerCase().replace(/\s+/g, "")}`;
      if (!alt.trim()) continue;
      if (found.has(normalized)) { conflicts.add(id); conflicts.add(found.get(normalized)); }
      else found.set(normalized, id);
    }
  }
  return conflicts;
};
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const dateLabel = (iso) => {
  try { return new Date(iso).toLocaleString(); } catch { return iso || ""; }
};

const hashText = (value = "") => {
  let hash = 2166136261;
  const text = String(value);
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

function markdownPreviewHtml(markdown = "", maxLength = 1200) {
  const source = String(markdown)
    .replace(/\{:\s+[^}]*\}/g, "")
    .replace(/\r/g, "")
    .slice(0, Math.max(120, Number(maxLength) || 1200));
  const inline = (value) => esc(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/~~([^~]+)~~/g, "<s>$1</s>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  const lines = source.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 12);
  if (!lines.length) return "";
  return lines.map((line) => {
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) return `<div class="kmzs-preview-heading">${inline(heading[1])}</div>`;
    const task = line.match(/^[-*+]\s+\[([ xX])\]\s+(.+)$/);
    if (task) return `<div class="kmzs-preview-line">${task[1].toLowerCase() === "x" ? "☑" : "☐"} ${inline(task[2])}</div>`;
    const bullet = line.match(/^[-*+]\s+(.+)$/);
    if (bullet) return `<div class="kmzs-preview-line">• ${inline(bullet[1])}</div>`;
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (ordered) return `<div class="kmzs-preview-line">• ${inline(ordered[1])}</div>`;
    return `<div class="kmzs-preview-line">${inline(line)}</div>`;
  }).join("");
}

const mirrorSourceText = (snapshot) => String(snapshot?.sourceText || snapshot?.preview || snapshot?.title || "思源镜像块").slice(0, 5000);
const nodePlainText = (node) => stripHtml(node?.html || "");


const SIYUAN_ID_RE = /^\d{14}-[a-z0-9]{7}$/i;
const SIYUAN_ID_GLOBAL_RE = /\b\d{14}-[a-z0-9]{7}\b/ig;

async function kernelPost(endpoint, payload = {}) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  if (!response.ok) throw new Error(`思源 API 请求失败：HTTP ${response.status}`);
  const result = await response.json();
  if (result?.code !== 0) throw new Error(result?.msg || `思源 API 请求失败：${endpoint}`);
  return result?.data;
}

function cleanSiyuanText(value = "") {
  return String(value)
    .replace(/\{:\s+[^}]*\}/g, " ")
    .replace(/\(\((\d{14}-[a-z0-9]{7})(?:\s+"([^"]*)")?\)\)/ig, (_, __, title) => title || "块引用")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " [图片] ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_>#~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSiyuanIds(dataTransfer) {
  const found = new Set();
  const add = (value) => {
    if (!value) return;
    for (const match of String(value).matchAll(SIYUAN_ID_GLOBAL_RE)) found.add(match[0]);
  };
  add(dataTransfer?.getData?.("text/plain"));
  add(dataTransfer?.getData?.("text/uri-list"));
  add(dataTransfer?.getData?.("application/json"));
  for (const type of Array.from(dataTransfer?.types || [])) {
    try { add(dataTransfer.getData(type)); } catch {}
  }
  return [...found].filter((id) => SIYUAN_ID_RE.test(id));
}

async function fetchSiyuanBlockSnapshot(id, previewLength = 160) {
  if (!SIYUAN_ID_RE.test(id)) throw new Error("思源块 ID 格式不正确");
  const rows = await kernelPost("/api/query/sql", {
    stmt: `SELECT id, parent_id, root_id, box, path, hpath, type, subtype, content, markdown, updated FROM blocks WHERE id='${id}' LIMIT 1`,
  });
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) throw new Error("没有找到该思源文档或块");
  let source = row.markdown || row.content || "";
  try {
    const kramdown = await kernelPost("/api/block/getBlockKramdown", { id });
    if (kramdown?.kramdown) source = kramdown.kramdown;
  } catch {}
  source = String(source || "").slice(0, 20000);
  const text = cleanSiyuanText(source || row.content || "");
  const hpath = String(row.hpath || "");
  const fallbackTitle = hpath.split("/").filter(Boolean).pop() || (row.type === "d" ? "思源文档" : "思源块");
  const title = cleanSiyuanText(row.content || "") || fallbackTitle;
  const limit = Math.max(40, Number(previewLength) || 160);
  return {
    id,
    kind: row.type === "d" ? "doc" : "block",
    type: row.type || "",
    subtype: row.subtype || "",
    title: title.slice(0, 120),
    preview: (text || fallbackTitle).slice(0, limit),
    previewHtml: markdownPreviewHtml(source || text, Math.max(limit * 4, 600)),
    sourceText: (text || fallbackTitle).slice(0, 5000),
    sourceHash: hashText(source || text || fallbackTitle),
    hpath,
    path: row.path || "",
    box: row.box || "",
    rootId: row.root_id || id,
    parentId: row.parent_id || "",
    updated: row.updated || "",
    lastSyncedAt: now(),
    error: "",
  };
}

async function renameSiyuanDocumentById(id, title) {
  if (!SIYUAN_ID_RE.test(String(id || ""))) throw new Error("思源文档 ID 格式不正确");
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) throw new Error("文档标题不能为空");
  await kernelPost("/api/filetree/renameDocByID", { id, title: cleanTitle });
}

async function listSiyuanNotebooks() {
  const data = await kernelPost("/api/notebook/lsNotebooks", {});
  return Array.isArray(data?.notebooks) ? data.notebooks.filter((item) => item && !item.closed) : [];
}

async function createSiyuanDocument(notebook, path, markdown = "") {
  if (!notebook) throw new Error("请选择笔记本");
  const normalized = `/${String(path || "").replace(/^\/+/, "").replace(/\/+$/, "")}`;
  const id = await kernelPost("/api/filetree/createDocWithMd", { notebook, path: normalized, markdown });
  if (!SIYUAN_ID_RE.test(String(id || ""))) throw new Error("创建文档后没有返回有效 ID");
  return String(id);
}

async function listSiyuanDocChildren(notebook, path) {
  const data = await kernelPost("/api/filetree/listDocsByPath", {
    notebook,
    path,
    maxListCount: 0,
    ignoreMaxListHint: true,
  });
  return Array.isArray(data?.files) ? data.files : [];
}

async function imageFileToDataUrl(file, compress = true) {
  const type = String(file?.type || "").toLowerCase();
  if (!compress || type.includes("svg") || type.includes("gif") || !type.startsWith("image/")) {
    return await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
  }
  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = source; });
    const maxSide = 2400;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", 0.86);
  } finally { URL.revokeObjectURL(source); }
}

function createNode(text = "新节点", parentId = null, settings = DEFAULT_SETTINGS) {
  return {
    id: uid("node"),
    parentId,
    children: [],
    html: esc(text),
    width: settings.defaultNodeWidth,
    collapsed: false,
    notes: "",
    comments: [],
    todos: [],
    links: [],
    tags: [],
    icons: [],
    images: [],
    style: {},
    siyuan: null,
    subdocs: [],
    createdAt: now(),
    updatedAt: now(),
  };
}

function createMap(title = "未命名导图", settings = DEFAULT_SETTINGS, options = {}) {
  const root = createNode(title, null, settings);
  const childA = createNode("主要主题", root.id, settings);
  const childB = createNode("另一个主题", root.id, settings);
  root.children = [childA.id, childB.id];
  return {
    id: uid("map"),
    title,
    rootIds: [root.id],
    nodes: { [root.id]: root, [childA.id]: childA, [childB.id]: childB },
    relations: [],
    summaries: [],
    layout: settings.defaultLayout,
    view: settings.defaultView,
    theme: options.themePreset || "inherit",
    themeColors: options.themeColors ? clone(options.themeColors) : null,
    zenMode: options.zenMode ?? null,
    readOnlyMode: options.readOnlyMode ?? null,
    createdAt: now(),
    updatedAt: now(),
  };
}

function defaultState() {
  const settings = clone(DEFAULT_SETTINGS);
  const map = createMap("我的第一张导图", settings);
  return {
    schemaVersion: 1,
    settings,
    maps: [map],
    activeMapId: map.id,
    trash: [],
    pinned: [],
    checkpoints: {},
    templates: [],
    migrations: {},
  };
}

class MindMapLayout {
  constructor(map, settings) {
    this.map = map;
    this.settings = settings;
    this.positions = new Map();
    this.nodeGap = 24;
    this.levelGap = 86;
  }

  nodeSize(id) {
    const node = this.map.nodes[id];
    const width = clamp(Number(node?.width || this.settings.defaultNodeWidth), 100, 520);
    const text = stripHtml(node?.html || "");
    const lines = Math.max(1, Math.ceil((text.length + (node?.icons?.length || 0) * 2) / Math.max(10, width / 14)));
    const cardHeight = node?.siyuan ? ((node.siyuan.cardView || this.settings.siyuanCardView) === "rich" ? 82 : 48) : 0;
    const height = clamp(34 + (lines - 1) * 18 + ((node?.images?.length || 0) ? 45 : 0) + cardHeight, 44, 198);
    return { width, height };
  }

  visibleChildren(id) {
    const node = this.map.nodes[id];
    return node && !node.collapsed ? node.children.filter((child) => this.map.nodes[child]) : [];
  }

  measure(id) {
    const size = this.nodeSize(id);
    const children = this.visibleChildren(id);
    if (!children.length) return size.height;
    const total = children.reduce((sum, child) => sum + this.measure(child), 0) + this.nodeGap * (children.length - 1);
    return Math.max(size.height, total);
  }

  placeSide(id, depth, top, side) {
    const size = this.nodeSize(id);
    const total = this.measure(id);
    const y = top + total / 2 - size.height / 2;
    const x = side * depth * (this.levelGap + 150) - (side < 0 ? size.width : 0);
    this.positions.set(id, { x, y, width: size.width, height: size.height, side });
    const children = this.visibleChildren(id);
    let childTop = top;
    for (const child of children) {
      const childHeight = this.measure(child);
      this.placeSide(child, depth + 1, childTop, side);
      childTop += childHeight + this.nodeGap;
    }
    return total;
  }

  computeHorizontal(direction = 1) {
    let top = 0;
    for (const rootId of this.map.rootIds.filter((id) => this.map.nodes[id])) {
      const total = this.measure(rootId);
      this.placeSide(rootId, 0, top, direction);
      top += total + 60;
    }
  }

  computeBoth() {
    let top = 0;
    for (const rootId of this.map.rootIds.filter((id) => this.map.nodes[id])) {
      const root = this.map.nodes[rootId];
      const rootSize = this.nodeSize(rootId);
      const children = this.visibleChildren(rootId);
      const left = children.filter((_, i) => i % 2 === 1);
      const right = children.filter((_, i) => i % 2 === 0);
      const leftHeight = left.length ? left.reduce((s, id) => s + this.measure(id), 0) + this.nodeGap * (left.length - 1) : rootSize.height;
      const rightHeight = right.length ? right.reduce((s, id) => s + this.measure(id), 0) + this.nodeGap * (right.length - 1) : rootSize.height;
      const total = Math.max(rootSize.height, leftHeight, rightHeight);
      const rootY = top + total / 2 - rootSize.height / 2;
      this.positions.set(rootId, { x: -rootSize.width / 2, y: rootY, width: rootSize.width, height: rootSize.height, side: 0 });
      let lt = top + (total - leftHeight) / 2;
      for (const id of left) { const h = this.measure(id); this.placeSide(id, 1, lt, -1); lt += h + this.nodeGap; }
      let rt = top + (total - rightHeight) / 2;
      for (const id of right) { const h = this.measure(id); this.placeSide(id, 1, rt, 1); rt += h + this.nodeGap; }
      top += total + 60;
    }
  }

  compute() {
    const layout = this.map.layout || "logical-right";
    if (layout === "mindmap-both") this.computeBoth();
    else this.computeHorizontal(layout === "logical-left" ? -1 : 1);
    if (layout === "tree-down" || layout === "tree-up") {
      const sign = layout === "tree-up" ? -1 : 1;
      for (const [id, p] of this.positions) {
        const nx = p.y;
        const ny = sign * p.x;
        this.positions.set(id, { x: nx, y: ny, width: p.width, height: p.height, side: sign });
      }
    }
    return this.positions;
  }
}

class YeMindZenApp {
  constructor(plugin, host, data = {}) {
    this.plugin = plugin;
    this.host = host;
    this.mapId = data.mapId || plugin.state.activeMapId;
    this.selectedIds = new Set();
    this.editingId = null;
    this.savedRange = null;
    this.activeEditable = null;
    this.richbarInteracting = false;
    this.history = [];
    this.redoStack = [];
    this.transform = { x: 360, y: 180, scale: 1 };
    this.drag = null;
    this.resizeState = null;
    this.relationSource = null;
    this.saveTimer = null;
    this.siyuanRefreshTimer = null;
    this.siyuanRefreshing = false;
    this.destroyed = false;
    this.lastNodePointer = null;
    this.onSelectionChange = this.onSelectionChange.bind(this);
    this.onWindowPointerDown = this.onWindowPointerDown.bind(this);
    this.onHostActivate = () => this.plugin.setActiveDock("mindmap", this.mapId);
  }

  get state() { return this.plugin.state; }
  get settings() { return this.state.settings; }
  get map() {
    let map = this.state.maps.find((item) => item.id === this.mapId);
    if (!map) {
      map = this.state.maps[0] || createMap("新导图", this.settings);
      if (!this.state.maps.includes(map)) this.state.maps.push(map);
      this.mapId = map.id;
    }
    return map;
  }
  get selectedId() { return [...this.selectedIds][0] || null; }
  get selectedNode() { return this.map.nodes[this.selectedId] || null; }

  mount() {
    this.host.classList.add("fn__flex", "fn__flex-1", "fn__flex-column");
    Object.assign(this.host.style, { width: "100%", height: "100%", minWidth: "0", minHeight: "0", overflow: "hidden" });
    this.host.innerHTML = this.template();
    this.root = this.host.querySelector(".kmzs-app");
    if (!this.root) throw new Error("YeMind Zen 界面初始化失败");
    this.canvas = this.root.querySelector(".kmzs-canvas");
    this.graph = this.root.querySelector(".kmzs-graph");
    this.outline = this.root.querySelector(".kmzs-outline-pane");
    this.richbar = this.root.querySelector(".kmzs-richbar");
    this.searchPanel = this.root.querySelector(".kmzs-search");
    this.bindEvents();
    this.host.addEventListener("pointerdown", this.onHostActivate, true);
    this.host.addEventListener("focusin", this.onHostActivate, true);
    this.applySettingsTheme();
    this.applyDefaultViewModes();
    this.renderAll();
    this.plugin.setActiveDock("mindmap", this.mapId);
    this.startSiyuanRefreshTimer();
    if (this.settings.mirrorRefreshOnOpen || this.settings.liveSiyuanPreview) {
      setTimeout(() => this.refreshAllSiyuanNodes({ silent: true }), 180);
    }
    setTimeout(() => { this.fitView(); this.plugin.consumePendingEdit(this); }, 60);
  }

  destroy() {
    this.destroyed = true;
    clearTimeout(this.saveTimer);
    clearInterval(this.siyuanRefreshTimer);
    document.removeEventListener("selectionchange", this.onSelectionChange);
    window.removeEventListener("pointerdown", this.onWindowPointerDown, true);
    this.host.removeEventListener("pointerdown", this.onHostActivate, true);
    this.host.removeEventListener("focusin", this.onHostActivate, true);
  }

  template() {
    const layoutOptions = LAYOUTS.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
    return `<div class="kmzs-app kmzs-app--simple">
      <header class="kmzs-topbar kmzs-topbar--simple">
        <div class="kmzs-brand kmzs-brand--simple" title="YeMind Zen">${BRAND_ICON}</div>
        <input class="kmzs-title-input" data-action="rename-map" value="${esc(this.map.title)}" aria-label="导图标题" title="导图标题">
        <div class="kmzs-toolbar-group">
          <button class="kmzs-btn" data-action="undo" title="撤销">↶</button>
          <button class="kmzs-btn" data-action="redo" title="重做">↷</button>
          <button class="kmzs-btn" data-action="add-child" title="添加子节点 Tab">＋子</button>
          <button class="kmzs-btn" data-action="add-sibling" title="添加同级节点 Enter">＋同</button>
          <button class="kmzs-btn kmzs-btn--danger" data-action="delete-node" title="删除节点">删除</button>
        </div>
        <div class="kmzs-toolbar-group">
          <select class="kmzs-select" data-action="view" title="视图"><option value="mindmap">导图</option><option value="split">分屏</option><option value="outline">大纲</option></select>
          <select class="kmzs-select" data-action="layout" title="布局">${layoutOptions}</select>
        </div>
        <div class="kmzs-spacer"></div>
        <div class="kmzs-toolbar-group">
          <button class="kmzs-btn" data-action="save" title="保存 Ctrl+S">保存</button>
          <button class="kmzs-btn" data-action="search" title="搜索 Ctrl+F">⌕</button>
          <button class="kmzs-btn" data-action="zoom-out" title="缩小">−</button>
          <button class="kmzs-btn" data-action="fit" title="适配视图 Ctrl+0">适配</button>
          <button class="kmzs-btn" data-action="zoom-in" title="放大">＋</button>
          <button class="kmzs-btn" data-action="readonly" title="只读模式">只读</button>
          <button class="kmzs-btn" data-action="zen" title="禅模式">禅</button>
          <button class="kmzs-btn" data-action="more" title="更多">•••</button>
        </div>
      </header>
      <div class="kmzs-workspace">
        <main class="kmzs-main" data-view="${esc(this.map.view || this.settings.defaultView)}">
          <section class="kmzs-canvas-pane">
            <svg class="kmzs-canvas" tabindex="0">
              <defs><pattern id="kmzs-grid-pattern" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="rgba(127,127,127,.20)"/></pattern></defs>
              <rect class="kmzs-grid" width="100%" height="100%"></rect>
              <g class="kmzs-viewport"><g class="kmzs-graph"></g></g>
            </svg>
            <div class="kmzs-search"><div class="kmzs-search-head"><input class="kmzs-input" data-role="search-input" placeholder="搜索节点、备注、批注"><button class="kmzs-btn" data-action="close-search">×</button></div><div class="kmzs-search-results"></div></div>
          </section>
          <section class="kmzs-outline-pane"></section>
        </main>
      </div>
      <button type="button" class="kmzs-zen-exit" data-action="zen" title="退出禅模式"><span class="kmzs-zen-exit__icon">◉</span><i></i><strong>退出禅模式</strong></button>
      <footer class="kmzs-status kmzs-status--floating">
        <button type="button" class="kmzs-status__title" data-action="fit" title="适配视图"><span data-role="status-title">${esc(this.map.title)}</span></button>
        <span class="kmzs-status__stats" data-role="status-stats">roots 0　nodes 0　words 0</span>
        <button type="button" class="kmzs-status__icon" data-action="search" title="搜索">⌕</button>
        <button type="button" class="kmzs-status__icon" data-action="readonly" title="只读模式">♙</button>
        <button type="button" class="kmzs-status__icon" data-action="fit" title="适配视图">⌖</button>
        <button type="button" class="kmzs-status__icon" data-action="zoom-out" title="缩小">−</button>
        <span class="kmzs-status__zoom" data-role="status-zoom">100%</span>
        <button type="button" class="kmzs-status__icon" data-action="zoom-in" title="放大">＋</button>
        <button type="button" class="kmzs-status__icon" data-action="help" title="快速开始">?</button>
        <span class="kmzs-status__save" data-role="status-save">已保存</span>
        <span class="kmzs-status__node" data-role="status-node">未选择节点</span>
      </footer>
      ${this.richbarTemplate()}
    </div>`;
  }

  richbarTemplate() {
    return `<div class="kmzs-richbar" role="toolbar">
      <button data-rich="bold"><b>B</b></button><button data-rich="italic"><i>I</i></button><button data-rich="underline"><u>U</u></button><button data-rich="strikeThrough"><s>S</s></button>
      <div class="kmzs-richbar-sep"></div><button data-rich="code">&lt;/&gt;</button><button data-rich="block">代码块</button>
      <div class="kmzs-richbar-sep"></div><label>A <input class="kmzs-color" type="color" value="#1f2937" data-rich-color="foreColor"></label><button data-rich="removeFore">×</button>
      <label>Bg <input class="kmzs-color" type="color" value="#fff1a8" data-rich-color="hiliteColor"></label><button data-rich="removeBack">×</button>
      <select data-rich-select="fontSize"><option value="3">自动</option><option value="2">小</option><option value="3">中</option><option value="4">大</option><option value="5">特大</option></select>
      <select data-rich-select="fontName"><option value="inherit">继承</option><option value="Microsoft YaHei">微软雅黑</option><option value="SimSun">宋体</option><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Consolas">Consolas</option></select>
      <button data-rich="link">链接</button><button data-rich="cloze">挖空</button><button data-rich="formula">Fx</button>
    </div>`;
  }

  bindEvents() {
    this.root.addEventListener("click", (event) => this.onClick(event));
    this.root.addEventListener("change", (event) => this.onChange(event));
    this.root.addEventListener("input", (event) => this.onInput(event));
    this.root.addEventListener("dblclick", (event) => this.onDoubleClick(event));
    this.root.addEventListener("contextmenu", (event) => this.onContextMenu(event));
    this.root.addEventListener("keydown", (event) => this.onKeyDown(event));
    this.root.addEventListener("keyup", (event) => { if (event.key === " ") this.spaceDown = false; });
    this.canvas.addEventListener("wheel", (event) => this.onWheel(event), { passive: false });
    this.canvas.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    this.canvas.addEventListener("dragover", (event) => event.preventDefault());
    this.canvas.addEventListener("drop", (event) => this.onDrop(event));
    document.addEventListener("selectionchange", this.onSelectionChange);
    window.addEventListener("pointerdown", this.onWindowPointerDown, true);
    this.richbar.addEventListener("pointerdown", (event) => {
      this.richbarInteracting = true;
      if (event.target.closest("button")) event.preventDefault();
    });
    const endRichbarInteraction = () => setTimeout(() => { this.richbarInteracting = false; }, 0);
    this.richbar.addEventListener("pointerup", endRichbarInteraction);
    this.richbar.addEventListener("pointercancel", endRichbarInteraction);
  }

  applyDefaultViewModes() {
    const zen = this.map.zenMode == null ? Boolean(this.settings.defaultZenMode) : Boolean(this.map.zenMode);
    const readonly = this.map.readOnlyMode == null ? Boolean(this.settings.defaultReadOnlyMode) : Boolean(this.map.readOnlyMode);
    this.root.classList.toggle("kmzs-zen", zen);
    this.root.classList.toggle("kmzs-readonly", readonly);
  }

  setViewMode(mode, value = null) {
    const className = mode === "zen" ? "kmzs-zen" : "kmzs-readonly";
    const mapKey = mode === "zen" ? "zenMode" : "readOnlyMode";
    const next = value == null ? !this.root.classList.contains(className) : Boolean(value);
    this.root.classList.toggle(className, next);
    this.map[mapKey] = next;
    this.renderStatus();
    this.scheduleSave(mode === "zen" ? "禅模式" : "只读模式");
  }

  applySettingsTheme() {
    const s = this.settings;
    const preset = this.map?.themeColors || null;
    const colors = preset ? { ...s, ...preset } : s;
    this.root.dataset.theme = (this.map?.theme === "dark" || (!preset && s.theme === "dark")) ? "dark" : "light";
    this.root.style.setProperty("--kmzs-bg", colors.background);
    this.root.style.setProperty("--kmzs-node", colors.nodeColor);
    this.root.style.setProperty("--kmzs-node-border", colors.nodeBorder);
    this.root.style.setProperty("--kmzs-edge", colors.edgeColor);
    this.root.style.setProperty("--kmzs-accent", colors.accent);
  }

  renderAll() {
    if (this.destroyed) return;
    this.state.activeMapId = this.map.id;
    this.mapId = this.map.id;
    const main = this.root.querySelector(".kmzs-main");
    main.dataset.view = this.map.view || "mindmap";
    this.root.querySelector('[data-action="view"]').value = this.map.view || "mindmap";
    this.root.querySelector('[data-action="layout"]').value = this.map.layout || "logical-right";
    this.root.querySelector('[data-action="rename-map"]').value = this.map.title;
    this.renderSidebar();
    this.renderCanvas();
    this.renderOutline();
    this.renderStatus();
    this.plugin.refreshDock();
  }

  renderSidebar() {
    const list = this.root.querySelector(".kmzs-map-list");
    if (!list) return;
    list.innerHTML = this.state.maps.map((map) => `<div class="kmzs-map-item ${map.id === this.map.id ? "is-active" : ""}" data-map-id="${map.id}"><span>◇</span><div class="kmzs-map-item__title">${esc(map.title)}</div><div class="kmzs-map-item__meta">${Object.keys(map.nodes).length}</div></div>`).join("") || `<div class="kmzs-empty">暂无导图</div>`;
  }

  renderCanvas() {
    const layout = new MindMapLayout(this.map, this.settings);
    this.positions = layout.compute();
    const edges = [];
    const nodes = [];
    for (const [id, pos] of this.positions) {
      const node = this.map.nodes[id];
      if (!node) continue;
      for (const childId of layout.visibleChildren(id)) {
        const child = this.positions.get(childId);
        if (!child) continue;
        edges.push(this.edgePath(pos, child));
      }
      nodes.push(this.nodeSvg(node, pos));
    }
    const relations = this.map.relations.map((rel) => this.relationSvg(rel)).join("");
    const summaries = this.map.summaries.map((sum) => this.summarySvg(sum)).join("");
    this.graph.innerHTML = `<g class="kmzs-edges">${edges.join("")}</g><g class="kmzs-relations">${relations}</g><g class="kmzs-summaries">${summaries}</g><g class="kmzs-nodes">${nodes.join("")}</g>`;
    this.updateTransform();
    this.hydrateRichContent(this.graph);
  }

  edgePath(parent, child) {
    const horizontal = !["tree-down", "tree-up"].includes(this.map.layout);
    if (horizontal) {
      const right = child.x >= parent.x;
      const x1 = right ? parent.x + parent.width : parent.x;
      const y1 = parent.y + parent.height / 2;
      const x2 = right ? child.x : child.x + child.width;
      const y2 = child.y + child.height / 2;
      const mid = (x1 + x2) / 2;
      return `<path class="kmzs-edge" d="M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}"/>`;
    }
    const down = child.y >= parent.y;
    const x1 = parent.x + parent.width / 2;
    const y1 = down ? parent.y + parent.height : parent.y;
    const x2 = child.x + child.width / 2;
    const y2 = down ? child.y : child.y + child.height;
    const mid = (y1 + y2) / 2;
    return `<path class="kmzs-edge" d="M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}"/>`;
  }

  nodeSvg(node, pos) {
    const selected = this.selectedIds.has(node.id) ? "is-selected" : "";
    const badges = [];
    const unfinished = (node.todos || []).filter((todo) => !todo.done).length;
    if (unfinished) badges.push(`待${unfinished}`);
    if (node.comments?.length) badges.push(`批${node.comments.length}`);
    if (node.notes) badges.push("注");
    if (node.links?.length) badges.push(`链${node.links.length}`);
    if (node.siyuan) badges.push(node.siyuan.mode === "mirror" ? "镜" : (node.siyuan.kind === "doc" ? "文" : "块"));
    if (node.subdocs?.length) badges.push(`子${node.subdocs.length}`);
    const hasFormula = /kmzs-formula/.test(node.html || "");
    const hasCloze = /kmzs-cloze/.test(node.html || "");
    if (hasFormula) badges.push("ƒ");
    if (hasCloze) badges.push("空");
    const badgeSvg = badges.slice(0, 5).map((text, i) => `<g transform="translate(${pos.width - 2 - i * 27},-8)"><rect class="kmzs-badge-bg" x="-24" y="0" width="24" height="16" rx="8"/><text class="kmzs-badge" x="-12" y="11" text-anchor="middle">${esc(text)}</text></g>`).join("");
    const toggle = node.children.length ? `<circle class="kmzs-node-toggle" data-action="toggle-node" data-node-id="${node.id}" cx="${pos.width + 9}" cy="${pos.height / 2}" r="8"/><text class="kmzs-node-toggle-text" x="${pos.width + 9}" y="${pos.height / 2 + 4}" text-anchor="middle">${node.collapsed ? "+" : "−"}</text>` : "";
    const entryButtons = this.selectedIds.has(node.id) ? `<g class="kmzs-node-entry" transform="translate(${pos.width + 3},${pos.height + 3})">${this.settings.showAddChildButton ? `<g data-action="node-add-child" data-node-id="${node.id}" transform="translate(0,0)"><circle r="9"/><text y="4" text-anchor="middle">+</text></g>` : ""}${this.settings.showNodeMenuButton ? `<g data-action="node-open-menu" data-node-id="${node.id}" transform="translate(${this.settings.showAddChildButton ? 22 : 0},0)"><circle r="9"/><text y="3" text-anchor="middle">⋯</text></g>` : ""}</g>` : "";
    return `<g class="kmzs-node ${selected}" data-node-id="${node.id}" transform="translate(${pos.x},${pos.y})">
      <rect class="kmzs-node-shape" width="${pos.width}" height="${pos.height}" rx="10" style="${this.nodeStyle(node)}"/>
      <foreignObject width="${pos.width}" height="${pos.height}"><div xmlns="http://www.w3.org/1999/xhtml" class="kmzs-node-content" data-editable-node="${node.id}" style="font-size:${node.style?.fontSize || this.settings.defaultFontSize}px">${this.decorateNodeHtml(node)}</div></foreignObject>
      ${toggle}<rect class="kmzs-resize-handle" data-action="resize-node" data-node-id="${node.id}" x="${pos.width - 5}" y="4" width="10" height="${Math.max(20, pos.height - 8)}"/>
      <g class="kmzs-badges">${badgeSvg}</g>${entryButtons}
    </g>`;
  }

  decorateNodeHtml(node) {
    const icons = (node.icons || []).map((icon) => `<span>${esc(icon)}</span>`).join("");
    const todo = node.todos?.length ? `<span title="待办">${node.todos.every((t) => t.done) ? "☑" : "☐"}</span>` : "";
    const img = node.images?.[0] ? `<img src="${esc(node.images[0].src)}" style="max-width:42px;max-height:42px;border-radius:5px;object-fit:cover">` : "";
    const primary = `<div class="kmzs-node-main">${todo}${icons}${img}<span class="kmzs-node-text">${node.html || ""}</span></div>`;
    if (!node.siyuan) return primary;
    const card = node.siyuan;
    const kind = card.mode === "mirror" ? "镜" : (card.kind === "doc" ? "文" : "块");
    const view = card.cardView || this.settings.siyuanCardView || "rich";
    const status = card.error ? "error" : (card.syncStatus || "synced");
    const statusText = status === "conflict" ? "冲突" : status === "local" ? "本地改动" : status === "missing" ? "源已移除" : status === "error" ? "同步失败" : "";
    const title = card.title || card.hpath || card.id;
    const preview = card.error ? card.error : (card.preview || card.hpath || title);
    const rich = view === "rich" ? `<div class="kmzs-siyuan-rich"><div class="kmzs-siyuan-title">${esc(title)}</div><div class="kmzs-siyuan-html">${card.previewHtml || `<div class="kmzs-preview-line">${esc(preview)}</div>`}</div></div>` : `<span class="kmzs-siyuan-preview">${esc(preview)}</span>`;
    return `${primary}<div class="kmzs-siyuan-card is-${status} is-${view}" data-open-siyuan="${esc(card.id)}" title="${esc(card.hpath || card.id)}"><span class="kmzs-siyuan-kind">${kind}</span>${rich}${statusText ? `<button type="button" class="kmzs-siyuan-status" data-siyuan-card-action="manage" data-siyuan-node="${node.id}">${statusText}</button>` : ""}<button type="button" class="kmzs-siyuan-refresh" data-siyuan-card-action="refresh" data-siyuan-node="${node.id}" title="刷新">↻</button></div>`;
  }

  nodeStyle(node) {
    const style = node.style || {};
    const parts = [];
    if (style.background) parts.push(`fill:${style.background}`);
    if (style.border) parts.push(`stroke:${style.border}`);
    if (style.borderWidth) parts.push(`stroke-width:${style.borderWidth}`);
    return parts.join(";");
  }

  relationSvg(rel) {
    const a = this.positions.get(rel.from);
    const b = this.positions.get(rel.to);
    if (!a || !b) return "";
    const x1 = a.x + a.width / 2, y1 = a.y + a.height / 2;
    const x2 = b.x + b.width / 2, y2 = b.y + b.height / 2;
    const bend = Math.max(50, Math.abs(x2 - x1) * 0.3);
    const d = `M${x1},${y1} C${x1 + bend},${y1 - 40} ${x2 - bend},${y2 - 40} ${x2},${y2}`;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - 32;
    return `<path class="kmzs-relation ${rel.dash ? "is-dashed" : ""}" d="${d}" style="stroke:${rel.color || "#a46bcb"}"/><text class="kmzs-relation-label" x="${mx}" y="${my}" text-anchor="middle">${esc(rel.label || "")}</text>`;
  }

  summarySvg(summary) {
    const points = summary.nodeIds.map((id) => this.positions.get(id)).filter(Boolean);
    if (!points.length) return "";
    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y + p.height));
    const maxX = Math.max(...points.map((p) => p.x + p.width));
    const x = maxX + 22;
    return `<path d="M${x + 14},${minY} Q${x},${minY} ${x},${minY + 14} L${x},${maxY - 14} Q${x},${maxY} ${x + 14},${maxY}" fill="none" stroke="var(--kmzs-accent)" stroke-width="2"/><text x="${x + 20}" y="${(minY + maxY) / 2}" fill="var(--kmzs-text)" dominant-baseline="middle">${esc(summary.text || "概要")}</text>`;
  }

  renderOutline() {
    this.outline.innerHTML = `<h2 class="kmzs-outline-title">${esc(this.map.title)}</h2><ul class="kmzs-outline-list">${this.map.rootIds.map((id) => this.outlineNode(id)).join("")}</ul>`;
    this.hydrateRichContent(this.outline);
  }

  outlineNode(id) {
    const node = this.map.nodes[id];
    if (!node) return "";
    const children = node.collapsed ? [] : node.children;
    return `<li data-outline-id="${id}"><div class="kmzs-outline-row"><span class="kmzs-outline-bullet" data-action="toggle-node" data-node-id="${id}">${node.children.length ? (node.collapsed ? "▸" : "▾") : "•"}</span><div class="kmzs-outline-content ${this.selectedIds.has(id) ? "is-selected" : ""}" data-editable-node="${id}">${this.decorateNodeHtml(node)}</div></div>${children.length ? `<ul class="kmzs-outline-list">${children.map((child) => this.outlineNode(child)).join("")}</ul>` : ""}</li>`;
  }

  hydrateRichContent(container) {
    container.querySelectorAll(".kmzs-formula").forEach((el) => {
      const latex = el.dataset.latex || el.textContent || "";
      if (window.katex?.renderToString) {
        try { el.innerHTML = window.katex.renderToString(latex, { throwOnError: false, displayMode: el.dataset.display === "true" }); } catch { el.textContent = latex; }
      } else el.textContent = latex;
    });
    if (this.settings.clozeMode === "hidden") container.querySelectorAll(".kmzs-cloze").forEach((el) => el.style.color = "transparent");
  }

  renderStatus() {
    const node = this.selectedNode;
    const nodes = Object.values(this.map.nodes || {});
    const words = nodes.reduce((sum, item) => sum + stripHtml(item.html || "").replace(/\s+/g, "").length, 0);
    this.root.querySelector('[data-role="status-title"]').textContent = this.map.title;
    this.root.querySelector('[data-role="status-stats"]').textContent = `roots ${this.map.rootIds.length}　nodes ${nodes.length}　words ${words}`;
    this.root.querySelector('[data-role="status-node"]').textContent = node ? `已选：${stripHtml(node.html).slice(0, 32)}` : "未选择节点";
    this.root.querySelector('[data-role="status-zoom"]').textContent = `${Math.round(this.transform.scale * 100)}%`;
    this.root.querySelector('[data-action="undo"]').disabled = !this.history.length;
    this.root.querySelector('[data-action="redo"]').disabled = !this.redoStack.length;
    this.root.querySelectorAll('[data-action="readonly"]').forEach((button) => button.classList.toggle("is-active", this.root.classList.contains("kmzs-readonly")));
    this.root.querySelectorAll('[data-action="zen"]').forEach((button) => button.classList.toggle("is-active", this.root.classList.contains("kmzs-zen")));
  }

  updateTransform() {
    const viewport = this.root.querySelector(".kmzs-viewport");
    if (viewport) viewport.setAttribute("transform", `translate(${this.transform.x} ${this.transform.y}) scale(${this.transform.scale})`);
    if (this.root) this.root.querySelector('[data-role="status-zoom"]').textContent = `${Math.round(this.transform.scale * 100)}%`;
  }

  snapshot() {
    return clone(this.map);
  }

  pushHistory(before) {
    this.history.push(before || this.snapshot());
    if (this.history.length > 80) this.history.shift();
    this.redoStack.length = 0;
  }

  mutate(label, fn, options = {}) {
    if (this.root.classList.contains("kmzs-readonly")) return;
    const before = this.snapshot();
    fn();
    this.map.updatedAt = now();
    if (options.history !== false) this.pushHistory(before);
    if (options.render !== false) this.renderAll();
    this.scheduleSave(label);
  }

  scheduleSave(label = "") {
    const status = this.root.querySelector('[data-role="status-save"]');
    status.textContent = "未保存";
    if (!this.settings.autosave) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(label), Number(this.settings.autosaveDelay) || 650);
  }

  async save(label = "") {
    clearTimeout(this.saveTimer);
    await this.plugin.persist();
    const status = this.root.querySelector('[data-role="status-save"]');
    if (status) status.textContent = label ? `已保存 · ${label}` : "已保存";
  }

  undo() {
    const previous = this.history.pop();
    if (!previous) return;
    this.redoStack.push(this.snapshot());
    const index = this.state.maps.findIndex((item) => item.id === this.map.id);
    this.state.maps[index] = previous;
    this.renderAll();
    this.scheduleSave("撤销");
  }

  redo() {
    const next = this.redoStack.pop();
    if (!next) return;
    this.history.push(this.snapshot());
    const index = this.state.maps.findIndex((item) => item.id === this.map.id);
    this.state.maps[index] = next;
    this.renderAll();
    this.scheduleSave("重做");
  }

  onClick(event) {
    const cardAction = event.target.closest("[data-siyuan-card-action]");
    if (cardAction) {
      event.preventDefault(); event.stopPropagation();
      const nodeId = cardAction.dataset.siyuanNode;
      if (cardAction.dataset.siyuanCardAction === "refresh") this.refreshSiyuanNode(nodeId).then(() => { this.renderAll(); this.save("刷新思源卡片"); });
      else this.openSiyuanCard(nodeId);
      return;
    }
    const siyuanLink = event.target.closest("[data-open-siyuan]");
    if (siyuanLink) { event.preventDefault(); event.stopPropagation(); this.openSiyuanBlock(siyuanLink.dataset.openSiyuan); return; }
    const rich = event.target.closest("[data-rich]")?.dataset.rich;
    if (rich) { this.richCommand(rich); return; }
    const action = event.target.closest("[data-action]")?.dataset.action;
    const mapItem = event.target.closest("[data-map-id]");
    const editable = event.target.closest("[data-editable-node]");
    const nodeEl = event.target.closest("[data-node-id]");
    if (mapItem) { this.switchMap(mapItem.dataset.mapId); return; }
    if (action) { this.handleAction(action, event); return; }
    const id = nodeEl?.dataset.nodeId || editable?.dataset.editableNode;
    if (id) {
      if (this.relationSource && this.relationSource !== id) { this.createRelation(id); return; }
      const additive = event.ctrlKey || event.metaKey || event.shiftKey;
      if (!event.target.closest('[contenteditable="true"]') && (additive || !this.selectedIds.has(id))) this.selectNode(id, additive);
    }
  }

  handleAction(action, event) {
    const nodeId = event.target.closest("[data-node-id]")?.dataset.nodeId;
    const handlers = {
      sidebar: () => this.root.querySelector(".kmzs-sidebar").classList.toggle("is-collapsed"),
      "new-map": () => this.newMap(),
      save: () => this.save(),
      undo: () => this.undo(),
      redo: () => this.redo(),
      "add-child": () => this.addChild(),
      "add-sibling": () => this.addSibling(),
      "delete-node": () => this.deleteSelection(),
      "zoom-in": () => this.zoomAt(1.15),
      "zoom-out": () => this.zoomAt(1 / 1.15),
      fit: () => this.fitView(),
      search: () => this.openSearch(),
      "close-search": () => this.closeSearch(),
      readonly: () => this.setViewMode("readonly"),
      zen: () => this.setViewMode("zen"),
      more: () => this.openMoreMenu(event.currentTarget || event.target),
      help: () => this.plugin.openQuickStart(),
      trash: () => this.openTrash(),
      "toggle-node": () => this.toggleNode(nodeId),
      "node-add-child": () => this.addChild(nodeId),
      "node-open-menu": () => this.openNodeMenu(event.clientX, event.clientY, nodeId),
      "resize-node": () => {},
    };
    handlers[action]?.();
  }

  onChange(event) {
    const target = event.target;
    const action = target.dataset.action;
    if (action === "view") this.mutate("切换视图", () => { this.map.view = target.value; }, { history: false });
    if (action === "layout") this.mutate("切换布局", () => { this.map.layout = target.value; });
    if (target.dataset.richSelect) {
      const kind = target.dataset.richSelect;
      if (kind === "fontSize") {
        const sizeMap = { "2": "12px", "3": "14px", "4": "18px", "5": "24px" };
        this.applyInlineStyle("fontSize", sizeMap[target.value] || "inherit");
      } else if (kind === "fontName") this.applyInlineStyle("fontFamily", target.value || "inherit");
    }
    if (target.dataset.richColor) {
      const property = target.dataset.richColor === "foreColor" ? "color" : "backgroundColor";
      this.applyInlineStyle(property, target.value);
    }
  }

  onInput(event) {
    const target = event.target;
    if (target.matches('[data-action="rename-map"]')) {
      this.map.title = target.value.trim() || "未命名导图";
      this.map.updatedAt = now();
      this.renderSidebar();
      this.scheduleSave("重命名");
      return;
    }
    if (target.matches('[data-role="search-input"]')) this.renderSearchResults(target.value);
  }

  onDoubleClick(event) {
    const formula = event.target.closest(".kmzs-formula");
    if (formula && !this.root.classList.contains("kmzs-readonly")) {
      event.preventDefault(); event.stopPropagation();
      const editableRoot = formula.closest("[data-editable-node]");
      if (editableRoot) {
        this.activeEditable = editableRoot;
        const range = document.createRange(); range.selectNode(formula); this.savedRange = range.cloneRange();
        this.insertFormulaAtSelection();
      }
      return;
    }
    const editable = event.target.closest("[data-editable-node]");
    if (!editable || this.root.classList.contains("kmzs-readonly")) return;
    const id = editable.dataset.editableNode;
    this.selectNode(id, false);
    this.beginEdit(editable, id);
  }

  beginEditNode(id, selectAll = false) {
    if (!id || this.root.classList.contains("kmzs-readonly")) return;
    if (!this.selectedIds.has(id) || this.selectedIds.size !== 1) this.selectNode(id, false);
    requestAnimationFrame(() => {
      const editable = this.root.querySelector(`[data-editable-node="${id}"]`);
      if (editable) this.beginEdit(editable, id, selectAll);
    });
  }

  beginEdit(editable, id, selectAll = false) {
    if (!editable || !this.map.nodes[id] || this.root.classList.contains("kmzs-readonly")) return;
    if (this.editingId === id && editable.querySelector('[contenteditable="true"]')) return;
    this.editingId = id;
    const text = editable.querySelector(".kmzs-node-text") || editable;
    editable.contentEditable = "false";
    text.contentEditable = "true";
    text.spellcheck = false;
    const before = this.snapshot();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      const current = editable.querySelector(".kmzs-node-text") || editable;
      const node = this.map.nodes[id];
      if (node) {
        node.html = current.innerHTML || esc("未命名节点");
        node.updatedAt = now();
        this.updateMirrorLocalState(node);
      }
      current.contentEditable = "false";
      editable.contentEditable = "false";
      this.editingId = null;
      this.hideRichbar();
      this.pushHistory(before);
      this.renderAll();
      this.scheduleSave("编辑节点");
    };
    const onBlur = () => {
      setTimeout(() => {
        const active = document.activeElement;
        if (this.richbarInteracting || this.richbar.contains(active) || this.richbar.matches(":hover")) return;
        finish();
      }, 60);
    };
    text.addEventListener("blur", onBlur);
    text.focus();
    const range = document.createRange();
    range.selectNodeContents(text);
    if (!selectAll) range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    this.savedRange = range.cloneRange();
  }

  onContextMenu(event) {
    const nodeEl = event.target.closest("[data-node-id], [data-outline-id]");
    if (!nodeEl) return;
    event.preventDefault();
    const id = nodeEl.dataset.nodeId || nodeEl.dataset.outlineId;
    this.selectNode(id, event.ctrlKey || event.metaKey);
    this.openNodeMenu(event.clientX, event.clientY, id);
  }

  onKeyDown(event) {
    if (event.key === "Escape" && this.root.classList.contains("kmzs-zen") && !event.target.closest('[contenteditable="true"]')) {
      event.preventDefault();
      this.setViewMode("zen", false);
      return;
    }
    if (event.key === " ") this.spaceDown = true;
    const editing = event.target.closest('[contenteditable="true"]');
    if (!editing && ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
    const shortcuts = { ...DEFAULT_SHORTCUTS, ...(this.settings.shortcuts || {}) };
    if (editing) {
      const richCommands = [
        ["richBold", () => this.richCommand("bold")], ["richItalic", () => this.richCommand("italic")], ["richStrike", () => this.richCommand("strikeThrough")],
        ["richInlineCode", () => this.richCommand("code")], ["richCodeBlock", () => this.richCommand("block")], ["richFormula", () => this.richCommand("formula")],
      ];
      for (const [id, run] of richCommands) {
        if (shortcuts[id] && shortcutMatches(event, shortcuts[id])) { event.preventDefault(); run(); return; }
      }
      if (shortcuts.richCancel && shortcutMatches(event, shortcuts.richCancel)) { event.preventDefault(); editing.blur(); this.hideRichbar(); return; }
      if (shortcuts.richLineBreak && shortcutMatches(event, shortcuts.richLineBreak)) { event.preventDefault(); document.execCommand("insertLineBreak"); this.syncActiveEditable(); return; }
      if (shortcuts.richParagraph && shortcutMatches(event, shortcuts.richParagraph)) { event.preventDefault(); document.execCommand("insertParagraph"); this.syncActiveEditable(); return; }
      if (shortcuts.richFinish && shortcutMatches(event, shortcuts.richFinish)) { event.preventDefault(); editing.blur(); return; }
      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) this.showSlashHint(editing);
      return;
    }
    const commands = [
      ["openSubmap", () => this.openSelectedSubmap()], ["projectSearch", () => this.openSearch()], ["toggleZen", () => this.setViewMode("zen")], ["toggleReadonly", () => this.setViewMode("readonly")],
      ["undo", () => this.undo()], ["redo", () => this.redo()], ["deleteNodeOnly", () => this.deleteSelection(true)], ["deleteSelection", () => this.deleteSelection(false)],
      ["zoomIn", () => this.zoomAt(1.15)], ["zoomOut", () => this.zoomAt(1 / 1.15)], ["fitView", () => this.fitView()], ["resetZoom", () => this.resetZoom()],
      ["firstRoot", () => this.panToNode(this.map.rootIds[0])], ["addParent", () => this.selectedId && this.addParent(this.selectedId)], ["moveUp", () => this.moveNode(-1)], ["moveDown", () => this.moveNode(1)],
      ["collapse", () => this.setSelectedCollapsed(true)], ["expand", () => this.setSelectedCollapsed(false)], ["summary", () => this.createSummary()], ["relation", () => this.startRelationFromSelected()],
      ["toggleTodo", () => this.toggleSelectedTodo()], ["editNotes", () => this.selectedId && this.openNotes(this.selectedId)], ["addComment", () => this.selectedId && this.openComments(this.selectedId)],
      ["copyNodeLink", () => this.copySelectedNodeLink()], ["copyPlainText", () => this.copySelectedPlainText()], ["pasteSubtree", () => this.pasteSubtreeFromClipboard()],
      ["copySubtreeMarkdown", () => this.copySelectedSubtreeMarkdown()], ["copySubtreePng", () => this.copySelectedSubtreePng()], ["saveMap", () => this.save()], ["createSubdoc", () => this.selectedId && this.openNodeSubdocs(this.selectedId)],
    ];
    for (const [id, run] of commands) {
      if (shortcuts[id] && shortcutMatches(event, shortcuts[id])) { event.preventDefault(); Promise.resolve(run()).catch((error) => showMessage(error.message || String(error))); return; }
    }
    if (event.key === "Tab") { event.preventDefault(); this.addChild(); }
    else if (event.key === "Enter") { event.preventDefault(); this.addSibling(); }
    else if (event.key === "F2" && this.selectedNode) {
      const el = this.root.querySelector(`[data-editable-node="${this.selectedId}"]`);
      if (el) this.beginEdit(el, this.selectedId);
    }
    else if (event.key === "Escape") { this.selectedIds.clear(); this.hideRichbar(); this.renderAll(); }
  }

  onWheel(event) {
    const mode = this.settings.wheelBehavior || "panZoom";
    if (mode === "disabled") return;
    event.preventDefault();
    const mod = event.ctrlKey || event.metaKey;
    if (mode === "panZoom" && !mod) {
      if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) this.transform.x -= event.deltaX || event.deltaY;
      else this.transform.y -= event.deltaY;
      this.updateTransform();
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left, my = event.clientY - rect.top;
    const old = this.transform.scale;
    const factor = event.deltaY < 0 ? 1 + Number(this.settings.zoomSpeed) : 1 - Number(this.settings.zoomSpeed);
    const next = clamp(old * factor, 0.18, 3.5);
    this.transform.x = mx - (mx - this.transform.x) * (next / old);
    this.transform.y = my - (my - this.transform.y) * (next / old);
    this.transform.scale = next;
    this.updateTransform();
  }

  onPointerDown(event) {
    if (event.button !== 0) return;
    if (event.target.closest('[data-action="node-add-child"], [data-action="node-open-menu"]')) return;
    const resize = event.target.closest('[data-action="resize-node"]');
    if (resize) { this.startResize(event, resize.dataset.nodeId); return; }
    const nodeEl = event.target.closest(".kmzs-node");
    if (nodeEl && !event.target.closest("[contenteditable=true]")) {
      const id = nodeEl.dataset.nodeId;
      const tick = Date.now();
      const isDouble = event.detail >= 2 || (this.lastNodePointer?.id === id && tick - this.lastNodePointer.time < 420);
      this.lastNodePointer = isDouble ? null : { id, time: tick };
      if (isDouble) {
        event.preventDefault();
        event.stopPropagation();
        this.beginEditNode(id, true);
        return;
      }
      const additive = event.ctrlKey || event.metaKey || event.shiftKey;
      if (additive || !this.selectedIds.has(id) || this.selectedIds.size !== 1) this.selectNode(id, additive);
      this.startNodeDrag(event, id);
      return;
    }
    if (!event.target.closest(".kmzs-node")) {
      const selectMode = this.settings.canvasDrag === "select";
      const shouldSelect = selectMode ? !this.spaceDown : (event.ctrlKey || event.metaKey);
      if (shouldSelect) this.startMarquee(event);
      else {
        if (!event.ctrlKey && !event.metaKey) { this.selectedIds.clear(); this.renderAll(); }
        this.startPan(event);
      }
    }
  }

  startPan(event) {
    const start = { x: event.clientX, y: event.clientY, tx: this.transform.x, ty: this.transform.y };
    const move = (e) => { this.transform.x = start.tx + e.clientX - start.x; this.transform.y = start.ty + e.clientY - start.y; this.updateTransform(); };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up, { once: true });
  }

  startMarquee(event) {
    const pane = this.root.querySelector(".kmzs-canvas-pane");
    let marquee = pane.querySelector(".kmzs-marquee");
    if (!marquee) { marquee = document.createElement("div"); marquee.className = "kmzs-marquee"; pane.appendChild(marquee); }
    const paneRect = pane.getBoundingClientRect();
    const start = { x: event.clientX, y: event.clientY };
    marquee.classList.add("is-visible");
    const paint = (x, y) => {
      const left = Math.min(start.x, x), top = Math.min(start.y, y), width = Math.abs(x - start.x), height = Math.abs(y - start.y);
      Object.assign(marquee.style, { left: `${left - paneRect.left}px`, top: `${top - paneRect.top}px`, width: `${width}px`, height: `${height}px` });
      return { left, top, right: left + width, bottom: top + height };
    };
    const move = (e) => paint(e.clientX, e.clientY);
    const up = (e) => {
      const box = paint(e.clientX, e.clientY);
      const selected = new Set();
      this.root.querySelectorAll(".kmzs-node[data-node-id]").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.right >= box.left && rect.left <= box.right && rect.bottom >= box.top && rect.top <= box.bottom) selected.add(el.dataset.nodeId);
      });
      this.selectedIds = selected;
      marquee.classList.remove("is-visible");
      this.renderAll();
      window.removeEventListener("pointermove", move);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up, { once: true });
  }

  startResize(event, id) {
    event.stopPropagation();
    const node = this.map.nodes[id];
    if (!node || this.root.classList.contains("kmzs-readonly")) return;
    const startX = event.clientX, startWidth = node.width;
    const before = this.snapshot();
    const move = (e) => { node.width = clamp(startWidth + (e.clientX - startX) / this.transform.scale, 100, 520); this.renderCanvas(); };
    const up = () => { this.pushHistory(before); this.renderAll(); this.scheduleSave("调整节点宽度"); window.removeEventListener("pointermove", move); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up, { once: true });
  }

  startNodeDrag(event, id) {
    if (this.root.classList.contains("kmzs-readonly")) return;
    const start = { x: event.clientX, y: event.clientY, moved: false };
    const nodeEl = this.root.querySelector(`.kmzs-node[data-node-id="${id}"]`);
    const move = (e) => {
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < 5) return;
      start.moved = true;
      nodeEl?.classList.add("is-dragging");
      this.root.querySelectorAll(".kmzs-drop-target").forEach((el) => el.classList.remove("kmzs-drop-target"));
      const under = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".kmzs-node");
      if (under && under.dataset.nodeId !== id && !this.isDescendant(under.dataset.nodeId, id)) under.classList.add("kmzs-drop-target");
    };
    const up = (e) => {
      nodeEl?.classList.remove("is-dragging");
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".kmzs-node");
      this.root.querySelectorAll(".kmzs-drop-target").forEach((el) => el.classList.remove("kmzs-drop-target"));
      if (start.moved && target && target.dataset.nodeId !== id && !this.isDescendant(target.dataset.nodeId, id)) this.reparentNode(id, target.dataset.nodeId);
      window.removeEventListener("pointermove", move);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up, { once: true });
  }

  isDescendant(id, ancestorId) {
    let current = this.map.nodes[id];
    while (current?.parentId) { if (current.parentId === ancestorId) return true; current = this.map.nodes[current.parentId]; }
    return false;
  }

  reparentNode(id, newParentId) {
    this.mutate("移动节点", () => {
      const node = this.map.nodes[id];
      if (!node) return;
      if (node.parentId) {
        const old = this.map.nodes[node.parentId];
        if (old) old.children = old.children.filter((child) => child !== id);
      } else this.map.rootIds = this.map.rootIds.filter((root) => root !== id);
      node.parentId = newParentId;
      const parent = this.map.nodes[newParentId];
      parent.children.push(id);
      parent.collapsed = false;
    });
  }

  async onDrop(event) {
    event.preventDefault();
    const ids = extractSiyuanIds(event.dataTransfer);
    if (ids.length) {
      const targetId = event.target.closest(".kmzs-node")?.dataset.nodeId || this.selectedId || null;
      const mode = event.altKey ? "mirror" : "card";
      await this.importSiyuanIds(ids, targetId, mode);
      return;
    }
    const text = event.dataTransfer?.getData("text/plain") || event.dataTransfer?.getData("text/uri-list") || "";
    if (text.trim()) {
      const targetId = event.target.closest(".kmzs-node")?.dataset.nodeId || this.selectedId;
      if (targetId) this.addChild(targetId, text.trim().slice(0, 200));
    }
  }

  onSelectionChange() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      if (!this.richbarInteracting) this.hideRichbar();
      return;
    }
    const range = selection.getRangeAt(0);
    const editable = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer.closest?.("[data-editable-node]") : range.commonAncestorContainer.parentElement?.closest?.("[data-editable-node]");
    if (!editable || !this.root.contains(editable)) { if (!this.richbarInteracting) this.hideRichbar(); return; }
    this.savedRange = range.cloneRange();
    this.activeEditable = editable;
    const rect = range.getBoundingClientRect();
    const top = rect.bottom + 8 + 42 < window.innerHeight ? rect.bottom + 8 : rect.top - 42;
    this.richbar.style.left = `${clamp(rect.left, 6, window.innerWidth - Math.min(760, window.innerWidth - 12))}px`;
    this.richbar.style.top = `${Math.max(6, top)}px`;
    this.richbar.classList.add("is-visible");
  }

  onWindowPointerDown(event) {
    if (!this.root) return;
    if (!this.richbar.contains(event.target) && !event.target.closest?.("[data-editable-node]")) this.hideRichbar();
    document.querySelectorAll(".kmzs-menu").forEach((menu) => { if (!menu.contains(event.target)) menu.remove(); });
  }

  hideRichbar() { this.richbar?.classList.remove("is-visible"); }

  restoreSelection() {
    if (!this.savedRange || !this.savedRange.startContainer?.isConnected || !this.savedRange.endContainer?.isConnected) return false;
    if (this.activeEditable && !this.activeEditable.contains(this.savedRange.commonAncestorContainer)) return false;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(this.savedRange.cloneRange());
    return true;
  }

  currentRange() {
    if (!this.restoreSelection()) return null;
    const selection = window.getSelection();
    return selection?.rangeCount ? selection.getRangeAt(0) : null;
  }

  saveCurrentRange(range = null) {
    const selection = window.getSelection();
    const activeRange = range || (selection?.rangeCount ? selection.getRangeAt(0) : null);
    if (activeRange) this.savedRange = activeRange.cloneRange();
  }

  selectedWrapper(selector) {
    const range = this.currentRange();
    if (!range || !this.activeEditable) return null;
    if (range.startContainer === range.endContainer && range.startContainer.nodeType === 1 && range.endOffset === range.startOffset + 1) {
      const selectedNode = range.startContainer.childNodes[range.startOffset];
      if (selectedNode?.nodeType === 1 && selectedNode.matches?.(selector) && this.activeEditable.contains(selectedNode)) return selectedNode;
    }
    let node = range.commonAncestorContainer;
    if (node.nodeType !== 1) node = node.parentElement;
    const wrapper = node?.closest?.(selector);
    return wrapper && this.activeEditable.contains(wrapper) ? wrapper : null;
  }

  unwrapElement(element) {
    if (!element?.parentNode) return;
    const parent = element.parentNode;
    const first = element.firstChild;
    const last = element.lastChild;
    while (element.firstChild) parent.insertBefore(element.firstChild, element);
    parent.removeChild(element);
    parent.normalize();
    const range = document.createRange();
    if (first?.isConnected && last?.isConnected) { range.setStartBefore(first); range.setEndAfter(last); }
    else range.selectNodeContents(parent);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); this.saveCurrentRange(range);
  }

  wrapCurrentSelection(tag, options = {}) {
    const range = this.currentRange();
    if (!range || range.collapsed) return null;
    const element = document.createElement(tag);
    if (options.className) element.className = options.className;
    if (options.attrs) Object.entries(options.attrs).forEach(([key, value]) => element.setAttribute(key, value));
    if (options.style) Object.assign(element.style, options.style);
    element.appendChild(range.extractContents());
    range.insertNode(element);
    range.selectNodeContents(element);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); this.saveCurrentRange(range);
    return element;
  }

  toggleInlineTag(selector, tag, options = {}) {
    const existing = this.selectedWrapper(selector);
    if (existing) { this.unwrapElement(existing); return; }
    this.wrapCurrentSelection(tag, options);
  }

  applyInlineStyle(property, value) {
    const range = this.currentRange();
    if (!range || range.collapsed) return;
    const existing = this.selectedWrapper("span[style]");
    if (existing && existing.style[property] !== undefined && range.toString() === existing.textContent) {
      existing.style[property] = value;
      if (!existing.getAttribute("style")?.trim()) this.unwrapElement(existing);
      else this.saveCurrentRange(range);
    } else this.wrapCurrentSelection("span", { style: { [property]: value } });
    this.syncActiveEditable();
  }

  clearInlineStyle(property) {
    const existing = this.selectedWrapper("span[style]");
    if (existing) {
      existing.style[property] = "";
      if (!existing.getAttribute("style")?.trim()) this.unwrapElement(existing);
    }
    this.syncActiveEditable();
  }

  syncActiveEditable() {
    if (!this.activeEditable) return;
    const id = this.activeEditable.dataset.editableNode;
    const node = this.map.nodes[id];
    if (!node) return;
    const current = this.activeEditable.querySelector(".kmzs-node-text") || this.activeEditable;
    node.html = current.innerHTML;
    node.updatedAt = now();
    this.updateMirrorLocalState(node);
    this.scheduleSave("格式化");
    this.saveCurrentRange();
  }

  richCommand(command) {
    if (!this.currentRange()) return;
    if (command === "bold") this.toggleInlineTag("strong,b", "strong");
    else if (command === "italic") this.toggleInlineTag("em,i", "em");
    else if (command === "underline") this.toggleInlineTag("u", "u");
    else if (command === "strikeThrough") this.toggleInlineTag("s,strike", "s");
    else if (command === "code") this.toggleInlineTag("code.kmzs-inline-code", "code", { className: "kmzs-inline-code" });
    else if (command === "block") this.toggleInlineTag("code.kmzs-code-block", "code", { className: "kmzs-code-block" });
    else if (command === "removeFore") this.clearInlineStyle("color");
    else if (command === "removeBack") this.clearInlineStyle("backgroundColor");
    else if (command === "link") this.insertLinkAtSelection();
    else if (command === "cloze") this.insertClozeAtSelection();
    else if (command === "formula") this.insertFormulaAtSelection();
    this.syncActiveEditable();
  }

  insertLinkAtSelection() {
    const range = this.currentRange();
    if (!range) return;
    const selected = range.toString();
    const url = window.prompt("链接地址", "https://");
    if (!url) return;
    if (!this.restoreSelection()) return;
    if (selected) this.wrapCurrentSelection("a", { attrs: { href: url, target: "_blank", rel: "noopener noreferrer" } });
    else {
      const link = document.createElement("a"); link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = url;
      const active = this.currentRange(); active.insertNode(link); active.selectNodeContents(link); this.saveCurrentRange(active);
    }
  }

  insertClozeAtSelection() {
    const existing = this.selectedWrapper(".kmzs-cloze");
    if (existing) { this.unwrapElement(existing); return; }
    const range = this.currentRange();
    const text = range?.toString() || "";
    if (!text) { showMessage("请先选择要挖空的文字"); return; }
    this.wrapCurrentSelection("span", { className: "kmzs-cloze", attrs: { "data-answer": text, title: "鼠标移入显示答案；再次选择后点击挖空可取消" } });
  }

  insertFormulaAtSelection() {
    const existing = this.selectedWrapper(".kmzs-formula");
    const selected = existing?.dataset.latex || this.currentRange()?.toString() || "";
    this.openFormulaDialog(selected, (latex, display) => {
      if (!latex?.trim()) return;
      if (!this.restoreSelection()) return;
      if (existing?.isConnected) {
        existing.dataset.latex = latex;
        existing.dataset.display = String(display);
        existing.textContent = latex;
        const range = document.createRange(); range.selectNode(existing); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); this.saveCurrentRange(range);
      } else {
        const range = this.currentRange();
        const span = document.createElement("span");
        span.className = "kmzs-formula";
        span.dataset.latex = latex;
        span.dataset.display = String(display);
        span.textContent = latex;
        range.deleteContents(); range.insertNode(span); range.selectNode(span); this.saveCurrentRange(range);
      }
      this.syncActiveEditable();
      this.hydrateRichContent(this.activeEditable);
    });
  }

  onRichbarClick(event) {
    const command = event.target.closest("[data-rich]")?.dataset.rich;
    if (command) this.richCommand(command);
  }

  selectNode(id, additive = false) {
    if (!this.map.nodes[id]) return;
    if (!additive) this.selectedIds.clear();
    if (additive && this.selectedIds.has(id)) this.selectedIds.delete(id); else this.selectedIds.add(id);
    this.renderCanvas(); this.renderOutline(); this.renderStatus();
  }

  toggleNode(id) { this.mutate("折叠节点", () => { const node = this.map.nodes[id]; if (node) node.collapsed = !node.collapsed; }); }

  addChild(parentId = this.selectedId, text = "新节点") {
    if (!parentId) parentId = this.map.rootIds[0];
    let createdId = null;
    this.mutate("添加子节点", () => {
      const parent = this.map.nodes[parentId];
      if (!parent) return;
      const node = createNode(text, parentId, this.settings);
      createdId = node.id;
      this.map.nodes[node.id] = node;
      parent.children.push(node.id);
      parent.collapsed = false;
      this.selectedIds = new Set([node.id]);
    });
    if (createdId) setTimeout(() => this.beginEditNode(createdId, true), 30);
  }

  addSibling(text = "新节点") {
    const selected = this.selectedNode;
    if (!selected) return this.addRoot(text);
    if (!selected.parentId) return this.addRoot(text);
    let createdId = null;
    this.mutate("添加同级节点", () => {
      const parent = this.map.nodes[selected.parentId];
      const node = createNode(text, parent.id, this.settings);
      createdId = node.id;
      this.map.nodes[node.id] = node;
      const index = parent.children.indexOf(selected.id);
      parent.children.splice(index + 1, 0, node.id);
      this.selectedIds = new Set([node.id]);
    });
    if (createdId) setTimeout(() => this.beginEditNode(createdId, true), 30);
  }

  addRoot(text = "新根节点") {
    this.mutate("添加根节点", () => {
      const node = createNode(text, null, this.settings);
      this.map.nodes[node.id] = node;
      this.map.rootIds.push(node.id);
      this.selectedIds = new Set([node.id]);
    });
  }

  deleteSelection(keepChildren = false) {
    const ids = [...this.selectedIds];
    if (!ids.length) return;
    this.mutate("删除节点", () => {
      for (const id of ids) this.deleteNode(id, keepChildren);
      this.selectedIds.clear();
    });
  }

  deleteNode(id, keepChildren = false) {
    const node = this.map.nodes[id];
    if (!node) return;
    if (node.parentId) {
      const parent = this.map.nodes[node.parentId];
      if (parent) {
        const index = parent.children.indexOf(id);
        parent.children.splice(index, 1, ...(keepChildren ? node.children : []));
        if (keepChildren) node.children.forEach((child) => { if (this.map.nodes[child]) this.map.nodes[child].parentId = parent.id; });
      }
    } else {
      const index = this.map.rootIds.indexOf(id);
      this.map.rootIds.splice(index, 1, ...(keepChildren ? node.children : []));
      if (keepChildren) node.children.forEach((child) => { if (this.map.nodes[child]) this.map.nodes[child].parentId = null; });
    }
    if (!keepChildren) {
      const remove = (nodeId) => { const n = this.map.nodes[nodeId]; if (!n) return; n.children.forEach(remove); delete this.map.nodes[nodeId]; };
      remove(id);
    } else delete this.map.nodes[id];
    this.map.relations = this.map.relations.filter((rel) => rel.from !== id && rel.to !== id);
  }

  moveNode(delta) {
    const node = this.selectedNode;
    if (!node) return;
    const list = node.parentId ? this.map.nodes[node.parentId].children : this.map.rootIds;
    const index = list.indexOf(node.id), next = clamp(index + delta, 0, list.length - 1);
    if (next === index) return;
    this.mutate("移动顺序", () => { list.splice(index, 1); list.splice(next, 0, node.id); });
  }

  resetZoom() {
    this.transform.scale = 1;
    this.transform.x = 360;
    this.transform.y = 180;
    this.updateTransform();
  }

  setSelectedCollapsed(collapsed) {
    const node = this.selectedNode;
    if (!node || !node.children?.length) return;
    this.mutate(collapsed ? "收缩节点" : "展开节点", () => { node.collapsed = collapsed; });
  }

  startRelationFromSelected() {
    if (!this.selectedId) { showMessage("请先选择一个节点"); return; }
    this.relationSource = this.selectedId;
    showMessage("请选择关系线的目标节点");
  }

  toggleSelectedTodo() {
    const node = this.selectedNode;
    if (!node) return;
    this.mutate("切换待办", () => {
      node.todos ||= [];
      if (!node.todos.length) node.todos.push({ id: uid("todo"), text: stripHtml(node.html) || "待办", done: false, createdAt: now() });
      else node.todos[0].done = !node.todos[0].done;
    });
  }

  copySelectedNodeLink() {
    if (!this.selectedId) return;
    navigator.clipboard?.writeText(`kmind-mindmap://${this.map.id}/${this.selectedId}`);
    showMessage("已复制节点链接");
  }

  copySelectedPlainText() {
    if (!this.selectedNode) return;
    navigator.clipboard?.writeText(stripHtml(this.selectedNode.html));
    showMessage("已复制纯文本");
  }

  copySelectedSubtreeMarkdown() {
    if (!this.selectedId) return;
    navigator.clipboard?.writeText(this.nodeToMarkdown(this.selectedId));
    showMessage("已复制 Markdown");
  }

  serializeSubtree(id) {
    const node = this.map.nodes[id];
    if (!node) return null;
    return {
      ...clone(node),
      children: (node.children || []).map((childId) => this.serializeSubtree(childId)).filter(Boolean),
    };
  }

  async pasteSubtreeFromClipboard() {
    if (!this.selectedId) { showMessage("请先选择父节点"); return; }
    const text = await navigator.clipboard?.readText?.();
    if (!text?.trim()) { showMessage("剪贴板中没有文本"); return; }
    const lines = text.split(/\r?\n/).map((line) => line.replace(/^\s*(?:[-*+] |\d+[.)] |#+\s*)/, "")).filter((line) => line.trim());
    if (!lines.length) return;
    this.mutate("粘贴节点子树", () => {
      const parent = this.map.nodes[this.selectedId];
      for (const line of lines) {
        const node = createNode(line.trim().slice(0, 300), parent.id, this.settings);
        this.map.nodes[node.id] = node; parent.children.push(node.id);
      }
      parent.collapsed = false;
    });
  }

  collectSubtreeIds(rootId) {
    const ids = new Set();
    const walk = (id) => { if (!id || ids.has(id) || !this.map.nodes[id]) return; ids.add(id); for (const child of this.map.nodes[id].children || []) walk(child); };
    walk(rootId);
    return ids;
  }

  async copySelectedSubtreePng() {
    if (!this.selectedId) return;
    const ids = this.collectSubtreeIds(this.selectedId);
    const values = [...ids].map((id) => this.positions.get(id)).filter(Boolean);
    if (!values.length) return;
    const minX = Math.min(...values.map((p) => p.x)) - 36, minY = Math.min(...values.map((p) => p.y)) - 36;
    const maxX = Math.max(...values.map((p) => p.x + p.width)) + 36, maxY = Math.max(...values.map((p) => p.y + p.height)) + 36;
    const width = Math.max(1, maxX - minX), height = Math.max(1, maxY - minY);
    const edges = [];
    for (const id of ids) {
      const parent = this.positions.get(id);
      if (!parent) continue;
      for (const childId of this.map.nodes[id]?.children || []) {
        if (!ids.has(childId)) continue;
        const child = this.positions.get(childId);
        if (child) edges.push(this.edgePath(parent, child));
      }
    }
    const nodes = [...ids].map((id) => { const node = this.map.nodes[id], pos = this.positions.get(id); return node && pos ? this.nodeSvg(node, pos) : ""; }).join("");
    const background = this.settings.exportBackground ? `<rect width="100%" height="100%" fill="${this.settings.background}"/>` : "";
    const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>${this.exportCss()}</style>${background}<g transform="translate(${-minX} ${-minY})"><g class="kmzs-edges">${edges.join("")}</g><g class="kmzs-nodes">${nodes}</g></g></svg>`;
    const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
    const url = URL.createObjectURL(svgBlob);
    try {
      const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url; });
      const scale = Number(this.settings.exportScale) || 2;
      const canvas = document.createElement("canvas"); canvas.width = width * scale; canvas.height = height * scale;
      const ctx = canvas.getContext("2d"); ctx.scale(scale, scale); ctx.drawImage(image, 0, 0);
      const png = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!png) throw new Error("PNG 生成失败");
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
        showMessage("已复制节点子树 PNG");
      } else {
        downloadBlob(png, `${this.safeName(stripHtml(this.selectedNode?.html) || "subtree")}.png`);
        showMessage("当前环境不支持图片剪贴板，已下载 PNG");
      }
    } finally { URL.revokeObjectURL(url); }
  }

  openSelectedSubmap() {
    const node = this.selectedNode;
    if (!node) { showMessage("请先选择节点"); return; }
    if (node.submapId && this.state.maps.some((map) => map.id === node.submapId)) { this.switchMap(node.submapId); return; }
    const title = `${stripHtml(node.html) || "节点"} · 子导图`;
    const map = createMap(title, this.settings, { themePreset: this.map.theme, themeColors: this.map.themeColors });
    this.state.maps.push(map);
    node.submapId = map.id;
    this.scheduleSave("创建子导图");
    this.switchMap(map.id);
  }

  showSlashHint(editing) {
    const rect = editing.getBoundingClientRect();
    this.createMenu(rect.left, Math.min(window.innerHeight - 260, rect.bottom + 5), [
      ["加粗", () => this.richCommand("bold")], ["行内代码", () => this.richCommand("code")], ["代码块", () => this.richCommand("block")], ["公式", () => this.richCommand("formula")], ["挖空", () => this.richCommand("cloze")],
    ]);
  }

  newMap() {
    this.plugin.openCreateMapDialog(this);
  }

  switchMap(id) {
    if (!this.state.maps.some((map) => map.id === id)) return;
    this.mapId = id; this.selectedIds.clear(); this.history = []; this.redoStack = [];
    this.plugin.setActiveDock("mindmap", id);
    this.applySettingsTheme(); this.applyDefaultViewModes();
    this.renderAll(); setTimeout(() => this.fitView(), 20); this.save();
  }

  duplicateMap() {
    const copy = clone(this.map);
    copy.id = uid("map"); copy.title += " 副本"; copy.createdAt = now(); copy.updatedAt = now();
    this.state.maps.push(copy); this.mapId = copy.id; this.renderAll(); this.save("复制导图");
  }

  deleteMap() {
    this.plugin.confirmDeleteMap(this.map.id);
  }

  zoomAt(factor) { this.transform.scale = clamp(this.transform.scale * factor, 0.18, 3.5); this.updateTransform(); }

  fitView() {
    if (!this.graph || !this.positions?.size) return;
    const values = [...this.positions.values()];
    const minX = Math.min(...values.map((p) => p.x)) - 70;
    const minY = Math.min(...values.map((p) => p.y)) - 70;
    const maxX = Math.max(...values.map((p) => p.x + p.width)) + 70;
    const maxY = Math.max(...values.map((p) => p.y + p.height)) + 70;
    const rect = this.canvas.getBoundingClientRect();
    const scale = clamp(Math.min(rect.width / (maxX - minX), rect.height / (maxY - minY)), 0.18, 1.4);
    this.transform.scale = scale;
    this.transform.x = (rect.width - (minX + maxX) * scale) / 2;
    this.transform.y = (rect.height - (minY + maxY) * scale) / 2;
    this.updateTransform();
  }

  openSearch() {
    this.searchPanel.classList.add("is-visible");
    const input = this.searchPanel.querySelector('[data-role="search-input"]');
    input.focus(); input.select(); this.renderSearchResults(input.value);
  }
  closeSearch() { this.searchPanel.classList.remove("is-visible"); }
  renderSearchResults(query) {
    const q = query.trim().toLowerCase();
    const result = this.searchPanel.querySelector(".kmzs-search-results");
    if (!q) { result.innerHTML = `<div class="kmzs-empty">输入关键词</div>`; return; }
    const items = Object.values(this.map.nodes).filter((node) => {
      const hay = [stripHtml(node.html), node.notes, ...(node.comments || []).map((c) => c.text), ...(node.todos || []).map((t) => t.text), ...(node.tags || [])].join(" ").toLowerCase();
      return hay.includes(q);
    });
    result.innerHTML = items.map((node) => `<div class="kmzs-search-item" data-search-node="${node.id}"><b>${esc(stripHtml(node.html) || "空节点")}</b><div class="kmzs-muted">${esc((node.notes || "").slice(0, 80))}</div></div>`).join("") || `<div class="kmzs-empty">没有结果</div>`;
    result.querySelectorAll("[data-search-node]").forEach((el) => el.addEventListener("click", () => { this.selectNode(el.dataset.searchNode); this.panToNode(el.dataset.searchNode); }));
  }

  panToNode(id) {
    const p = this.positions.get(id); if (!p) return;
    const rect = this.canvas.getBoundingClientRect();
    this.transform.x = rect.width / 2 - (p.x + p.width / 2) * this.transform.scale;
    this.transform.y = rect.height / 2 - (p.y + p.height / 2) * this.transform.scale;
    this.updateTransform();
  }

  openMoreMenu(anchor) {
    const rect = anchor.getBoundingClientRect();
    this.createMenu(rect.right - 210, rect.bottom + 6, [
      ["导入文件", () => this.openImport()],
      ["导出 JSON", () => this.exportJson()],
      ["导出 Markdown", () => this.exportMarkdown()],
      ["导出 OPML", () => this.exportOpml()],
      ["导出 SVG", () => this.exportSvg()],
      ["导出 PNG", () => this.exportPng()],
      ["写入为新思源文档", () => this.exportToSiyuanDocument()],
      null,
      ["从思源文档生成导图", () => this.openDocumentTreeImport()],
      ...(this.map.sourceDocId ? [["刷新当前文档树", () => this.openDocumentTreeSync()], ["写回文档标题", () => this.writeBackDocumentTreeTitles()]] : []),
      ["思源同步中心", () => this.openSiyuanSyncCenter()],
      ["刷新全部思源卡片", () => this.refreshAllSiyuanNodes()],
      null,
      ["创建检查点", () => this.createCheckpoint()],
      ["检查点与历史", () => this.openCheckpoints()],
      ["主题设计", () => this.openThemeDesigner()],
      ["设置", () => this.openSettings()],
      null,
      ["复制当前导图", () => this.duplicateMap()],
      ["删除当前导图", () => this.deleteMap()],
      ["关于", () => this.openAbout()],
    ]);
  }

  openNodeMenu(x, y, id) {
    const node = this.map.nodes[id];
    if (!node) return;
    if (!this.selectedIds.has(id)) this.selectNode(id, false);
    const shortcuts = { ...DEFAULT_SHORTCUTS, ...(this.settings.shortcuts || {}) };
    const menu = new Menu("yeMindZenNodeContext");
    const add = (icon, label, click, shortcut = "") => menu.addItem({ icon, label, accelerator: shortcut || undefined, click });

    add("iconEdit", "编辑节点", () => this.beginEditNode(id), "F2");
    add("iconAdd", "添加子节点", () => this.addChild(id), "Tab");
    add("iconAdd", "添加同级节点", () => this.addSibling(), "Enter");
    add("iconAdd", "添加父节点", () => this.addParent(id), "Alt+Enter");
    add("iconAdd", "添加根节点", () => this.addRoot());
    menu.addSeparator();

    add("iconCheck", node.todos?.length ? "待办" : "添加待办", () => this.openTodos(id), shortcuts.toggleTodo);
    add("iconFile", "备注", () => this.openNotes(id), shortcuts.editNotes);
    add("iconComment", "批注", () => this.openComments(id), shortcuts.addComment);
    add("iconTags", "标签与图标", () => this.openTagsIcons(id));
    add("iconLink", "链接", () => this.openLinks(id));
    add("iconImage", "图片", () => this.openImages(id));
    add("iconTheme", "节点样式", () => this.openNodeStyle(id));
    menu.addSeparator();

    add("iconCopy", "复制纯文本", () => this.copySelectedPlainText(), shortcuts.copyPlainText);
    add("iconCopy", "复制节点子树", () => navigator.clipboard?.writeText(JSON.stringify(this.serializeSubtree(id))), "");
    add("iconCopy", "复制节点子树为 Markdown", () => this.copySelectedSubtreeMarkdown(), shortcuts.copySubtreeMarkdown);
    add("iconCopy", "复制节点链接", () => this.copySelectedNodeLink(), shortcuts.copyNodeLink);
    menu.addSeparator();

    add("iconUp", "上移节点", () => this.moveNode(-1), shortcuts.moveUp);
    add("iconDown", "下移节点", () => this.moveNode(1), shortcuts.moveDown);
    add("iconFold", node.collapsed ? "展开节点" : "收缩节点", () => this.toggleNode(id), node.collapsed ? shortcuts.expand : shortcuts.collapse);
    add("iconLink", "开始关系线", () => { this.relationSource = id; showMessage("请选择关系线的目标节点"); }, shortcuts.relation);
    add("iconGraph", "为所选节点创建概要", () => this.createSummary(), shortcuts.summary);
    menu.addSeparator();

    add("iconTrashcan", "仅删除节点（保留子节点）", () => this.deleteSelection(true), shortcuts.deleteNodeOnly);
    add("iconTrashcan", "删除节点和子树", () => this.deleteSelection(false), shortcuts.deleteSelection);
    menu.addSeparator();

    add("iconLink", node.siyuan ? "思源卡片与镜像" : "绑定思源文档或块", () => this.openSiyuanCard(id));
    add("iconFile", "节点子文档", () => this.openNodeSubdocs(id));
    if (node.siyuan?.kind === "doc") add("iconRefresh", "从此文档生成导图", () => this.createMapFromSiyuanDoc(node.siyuan.id));
    menu.open({ x: clamp(x, 6, window.innerWidth - 260), y: clamp(y, 6, window.innerHeight - 40), isLeft: false });
  }

  createMenu(x, y, items) {
    this.root.querySelectorAll(".kmzs-menu").forEach((el) => el.remove());
    const menu = document.createElement("div");
    menu.className = "kmzs-menu";
    menu.style.left = `${clamp(x, 4, window.innerWidth - 220)}px`;
    menu.style.top = `${clamp(y, 4, window.innerHeight - Math.min(520, items.length * 34))}px`;
    for (const item of items) {
      if (!item) { menu.insertAdjacentHTML("beforeend", `<div class="kmzs-menu-sep"></div>`); continue; }
      const row = document.createElement("div"); row.className = `kmzs-menu-item ${item[2] === "danger" ? "kmzs-btn--danger" : ""}`; row.textContent = item[0];
      row.addEventListener("click", () => { menu.remove(); item[1](); }); menu.appendChild(row);
    }
    document.body.appendChild(menu);
  }

  addParent(id) {
    this.mutate("添加父节点", () => {
      const node = this.map.nodes[id]; if (!node) return;
      const parent = createNode("新父节点", node.parentId, this.settings);
      this.map.nodes[parent.id] = parent; parent.children = [id];
      if (node.parentId) {
        const old = this.map.nodes[node.parentId]; const index = old.children.indexOf(id); old.children[index] = parent.id;
      } else { const index = this.map.rootIds.indexOf(id); this.map.rootIds[index] = parent.id; }
      node.parentId = parent.id; this.selectedIds = new Set([parent.id]);
    });
  }

  createSummary() {
    const ids = [...this.selectedIds];
    if (ids.length < 2) { showMessage("请按 Ctrl/Cmd 多选至少两个同级节点"); return; }
    const parents = new Set(ids.map((id) => this.map.nodes[id]?.parentId));
    if (parents.size > 1) { showMessage("概要节点必须属于同一个父节点"); return; }
    const text = window.prompt("概要文字", "概要"); if (!text) return;
    this.mutate("创建概要", () => this.map.summaries.push({ id: uid("summary"), nodeIds: ids, text }));
  }

  createRelation(targetId) {
    const from = this.relationSource; this.relationSource = null;
    if (!from || from === targetId) return;
    const label = window.prompt("关系线文字（可留空）", "");
    this.mutate("创建关系线", () => this.map.relations.push({ id: uid("rel"), from, to: targetId, label: label || "", color: "#a46bcb", dash: false }));
  }

  dialog(title, body, width = "520px") {
    const dialog = new Dialog({ title, content: `<div class="b3-dialog__content">${body}</div>`, width });
    const s = this.settings;
    dialog.element.style.setProperty("--kmzs-bg", s.background);
    dialog.element.style.setProperty("--kmzs-panel", s.nodeColor);
    dialog.element.style.setProperty("--kmzs-text", s.theme === "dark" ? "#e6edf3" : "#1f2937");
    dialog.element.style.setProperty("--kmzs-muted", s.theme === "dark" ? "#9aa7b5" : "#667085");
    dialog.element.style.setProperty("--kmzs-border", s.nodeBorder);
    dialog.element.style.setProperty("--kmzs-accent", s.accent);
    return dialog;
  }

  openFormulaDialog(initial, callback) {
    const d = this.dialog("公式", `<div class="kmzs-row" style="justify-content:flex-end;margin-bottom:8px"><label><input type="radio" name="formula-mode" value="inline" checked> 行内</label><label><input type="radio" name="formula-mode" value="block"> 块级</label></div><textarea class="kmzs-textarea" data-role="latex">${esc(initial || "")}</textarea><div class="kmzs-field"><label>预览</label><div class="kmzs-card" data-role="formula-preview"></div></div><div class="kmzs-row" style="justify-content:flex-end"><button class="b3-button b3-button--cancel" data-role="cancel">取消</button><button class="b3-button b3-button--text" data-role="apply">应用</button></div>`, "480px");
    const input = d.element.querySelector('[data-role="latex"]'); const preview = d.element.querySelector('[data-role="formula-preview"]');
    const update = () => { const latex = input.value; if (window.katex?.renderToString) { try { preview.innerHTML = window.katex.renderToString(latex, { throwOnError: false, displayMode: d.element.querySelector('[name="formula-mode"]:checked').value === "block" }); } catch { preview.textContent = latex; } } else preview.textContent = latex; };
    input.addEventListener("input", update); d.element.querySelectorAll('[name="formula-mode"]').forEach((el) => el.addEventListener("change", update)); update(); input.focus();
    d.element.querySelector('[data-role="cancel"]').onclick = () => d.destroy();
    d.element.querySelector('[data-role="apply"]').onclick = () => { const latex = input.value.trim(); if (!latex) return; callback(latex, d.element.querySelector('[name="formula-mode"]:checked').value === "block"); d.destroy(); };
  }

  openNotes(id) {
    const node = this.map.nodes[id]; const d = this.dialog("备注", `<textarea class="kmzs-textarea" data-role="notes" placeholder="节点备注">${esc(node.notes || "")}</textarea><div class="kmzs-row" style="justify-content:flex-end"><button class="b3-button b3-button--cancel">取消</button><button class="b3-button b3-button--text">保存</button></div>`, "420px");
    const buttons = d.element.querySelectorAll("button"); buttons[0].onclick = () => d.destroy(); buttons[1].onclick = () => { const value = d.element.querySelector('[data-role="notes"]').value; this.mutate("保存备注", () => node.notes = value); d.destroy(); };
  }

  openComments(id) {
    const node = this.map.nodes[id]; const render = () => `<div class="kmzs-list">${(node.comments || []).map((c) => `<div class="kmzs-card"><div class="kmzs-card-head"><b>${esc(dateLabel(c.createdAt))}</b><span class="kmzs-spacer"></span><button class="kmzs-btn kmzs-btn--danger" data-delete-comment="${c.id}">删除</button></div><div class="kmzs-card-body">${esc(c.text)}</div></div>`).join("") || `<div class="kmzs-empty">暂无批注</div>`}</div><div class="kmzs-field" style="margin-top:10px"><textarea class="kmzs-textarea" data-role="new-comment" placeholder="新增批注"></textarea></div><div class="kmzs-row" style="justify-content:flex-end"><button class="b3-button b3-button--text" data-role="add-comment">添加</button></div>`;
    const d = this.dialog("批注", `<div data-role="comments-root">${render()}</div>`, "500px");
    const bind = () => {
      d.element.querySelector('[data-role="add-comment"]').onclick = () => { const input = d.element.querySelector('[data-role="new-comment"]'); const text = input.value.trim(); if (!text) return; this.mutate("添加批注", () => node.comments.push({ id: uid("comment"), text, createdAt: now() })); d.element.querySelector('[data-role="comments-root"]').innerHTML = render(); bind(); };
      d.element.querySelectorAll("[data-delete-comment]").forEach((btn) => btn.onclick = () => { this.mutate("删除批注", () => node.comments = node.comments.filter((c) => c.id !== btn.dataset.deleteComment)); d.element.querySelector('[data-role="comments-root"]').innerHTML = render(); bind(); });
    }; bind();
  }

  openTodos(id) {
    const node = this.map.nodes[id]; const render = () => `<div class="kmzs-list">${(node.todos || []).map((t) => `<div class="kmzs-card"><div class="kmzs-card-head"><input type="checkbox" data-toggle-todo="${t.id}" ${t.done ? "checked" : ""}><span style="${t.done ? "text-decoration:line-through;opacity:.65" : ""}">${esc(t.text)}</span><span class="kmzs-spacer"></span><button class="kmzs-btn kmzs-btn--danger" data-delete-todo="${t.id}">删除</button></div></div>`).join("") || `<div class="kmzs-empty">暂无待办</div>`}</div><div class="kmzs-row" style="margin-top:10px"><input class="kmzs-input" data-role="new-todo" placeholder="新增待办"><button class="b3-button b3-button--text" data-role="add-todo">添加</button></div>`;
    const d = this.dialog("待办", `<div data-role="todos-root">${render()}</div>`, "480px");
    const bind = () => {
      d.element.querySelector('[data-role="add-todo"]').onclick = () => { const input = d.element.querySelector('[data-role="new-todo"]'); const text = input.value.trim(); if (!text) return; this.mutate("添加待办", () => node.todos.push({ id: uid("todo"), text, done: false, createdAt: now() })); d.element.querySelector('[data-role="todos-root"]').innerHTML = render(); bind(); };
      d.element.querySelectorAll("[data-toggle-todo]").forEach((el) => el.onchange = () => { this.mutate("更新待办", () => { const todo = node.todos.find((t) => t.id === el.dataset.toggleTodo); if (todo) todo.done = el.checked; }); d.element.querySelector('[data-role="todos-root"]').innerHTML = render(); bind(); });
      d.element.querySelectorAll("[data-delete-todo]").forEach((btn) => btn.onclick = () => { this.mutate("删除待办", () => node.todos = node.todos.filter((t) => t.id !== btn.dataset.deleteTodo)); d.element.querySelector('[data-role="todos-root"]').innerHTML = render(); bind(); });
    }; bind();
  }

  openTagsIcons(id) {
    const node = this.map.nodes[id]; const d = this.dialog("标签与图标", `<div class="kmzs-field"><label>标签，使用逗号分隔</label><input class="kmzs-input" data-role="tags" value="${esc((node.tags || []).join(", "))}"></div><div class="kmzs-field"><label>图标 / Emoji，使用空格分隔</label><input class="kmzs-input" data-role="icons" value="${esc((node.icons || []).join(" "))}"></div><div class="kmzs-row" style="justify-content:flex-end"><button class="b3-button b3-button--cancel">取消</button><button class="b3-button b3-button--text">保存</button></div>`, "440px");
    const buttons = d.element.querySelectorAll("button"); buttons[0].onclick = () => d.destroy(); buttons[1].onclick = () => { this.mutate("标签与图标", () => { node.tags = d.element.querySelector('[data-role="tags"]').value.split(/[,，]/).map((v) => v.trim()).filter(Boolean); node.icons = d.element.querySelector('[data-role="icons"]').value.split(/\s+/).filter(Boolean); }); d.destroy(); };
  }

  addLink(id, url, title = "链接") { const node = this.map.nodes[id]; this.mutate("添加链接", () => node.links.push({ id: uid("link"), url, title, icon: "🔗" })); }
  createLinkNode(url, title) { this.addRoot(title); const node = this.selectedNode; node.links.push({ id: uid("link"), url, title, icon: "🔗" }); this.save("创建链接节点"); }

  openLinks(id) {
    const node = this.map.nodes[id]; const render = () => `<div class="kmzs-list">${(node.links || []).map((link) => `<div class="kmzs-card"><div class="kmzs-card-head"><span>${esc(link.icon || "🔗")}</span><a href="${esc(link.url)}" data-open-link="${link.id}">${esc(link.title || link.url)}</a><span class="kmzs-spacer"></span><button class="kmzs-btn kmzs-btn--danger" data-delete-link="${link.id}">删除</button></div><div class="kmzs-muted">${esc(link.url)}</div></div>`).join("") || `<div class="kmzs-empty">暂无链接</div>`}</div><div class="kmzs-row" style="margin-top:10px"><input class="kmzs-input" data-role="link-title" placeholder="标题"><input class="kmzs-input" data-role="link-url" placeholder="https:// 或 siyuan://blocks/"><button class="b3-button b3-button--text" data-role="add-link">添加</button></div>`;
    const d = this.dialog("链接", `<div data-role="links-root">${render()}</div>`, "620px");
    const bind = () => {
      d.element.querySelector('[data-role="add-link"]').onclick = () => { const url = d.element.querySelector('[data-role="link-url"]').value.trim(); const title = d.element.querySelector('[data-role="link-title"]').value.trim() || url; if (!url) return; this.mutate("添加链接", () => node.links.push({ id: uid("link"), url, title, icon: "🔗" })); d.element.querySelector('[data-role="links-root"]').innerHTML = render(); bind(); };
      d.element.querySelectorAll("[data-delete-link]").forEach((btn) => btn.onclick = () => { this.mutate("删除链接", () => node.links = node.links.filter((l) => l.id !== btn.dataset.deleteLink)); d.element.querySelector('[data-role="links-root"]').innerHTML = render(); bind(); });
      d.element.querySelectorAll("[data-open-link]").forEach((el) => el.onclick = (e) => { e.preventDefault(); const link = node.links.find((l) => l.id === el.dataset.openLink); if (link?.url.startsWith("siyuan://")) window.location.href = link.url; else window.open(link?.url, "_blank"); });
    }; bind();
  }

  openSiyuanBlock(id) {
    if (!SIYUAN_ID_RE.test(String(id || ""))) return;
    window.location.href = `siyuan://blocks/${id}`;
  }

  startSiyuanRefreshTimer() {
    clearInterval(this.siyuanRefreshTimer);
    const seconds = Math.max(15, Number(this.settings.siyuanRefreshSeconds) || 60);
    if (!this.settings.liveSiyuanPreview) return;
    this.siyuanRefreshTimer = setInterval(() => this.refreshAllSiyuanNodes({ silent: true }), seconds * 1000);
  }

  makeSiyuanBinding(snapshot, mode = "card", previous = null) {
    const normalizedMode = mode === "mirror" ? "mirror" : "card";
    const sourceText = mirrorSourceText(snapshot);
    return {
      ...(previous || {}),
      ...snapshot,
      mode: normalizedMode,
      cardView: previous?.cardView || this.settings.siyuanCardView || "rich",
      sourceTitle: snapshot.title || previous?.sourceTitle || "",
      sourceHash: snapshot.sourceHash || hashText(sourceText),
      appliedText: normalizedMode === "mirror" ? (previous?.appliedText || sourceText) : (previous?.appliedText || ""),
      appliedHash: normalizedMode === "mirror" ? (previous?.appliedHash || hashText(sourceText)) : (previous?.appliedHash || ""),
      syncStatus: snapshot.error ? "error" : (previous?.syncStatus === "conflict" ? "conflict" : "synced"),
      conflict: previous?.conflict || null,
      missing: false,
    };
  }

  updateMirrorLocalState(node) {
    const card = node?.siyuan;
    if (!card || card.mode !== "mirror") return;
    const localHash = hashText(nodePlainText(node));
    if (card.syncStatus === "conflict") {
      card.localHash = localHash;
      if (card.conflict) card.conflict.localText = nodePlainText(node);
      return;
    }
    card.localHash = localHash;
    card.syncStatus = localHash === card.appliedHash ? "synced" : "local";
  }

  applyMirrorSource(node, snapshot, previous = node.siyuan) {
    const sourceText = mirrorSourceText(snapshot);
    node.html = esc(sourceText);
    node.siyuan = this.makeSiyuanBinding(snapshot, "mirror", previous);
    node.siyuan.appliedText = sourceText;
    node.siyuan.appliedHash = hashText(sourceText);
    node.siyuan.localHash = node.siyuan.appliedHash;
    node.siyuan.syncStatus = "synced";
    node.siyuan.conflict = null;
    node.updatedAt = now();
  }

  async importSiyuanIds(ids, parentId = null, mode = "card") {
    const unique = [...new Set(ids)].filter((id) => SIYUAN_ID_RE.test(id));
    if (!unique.length) return;
    const snapshots = [];
    for (const id of unique.slice(0, 30)) {
      try { snapshots.push(await fetchSiyuanBlockSnapshot(id, this.settings.siyuanCardPreviewLength)); }
      catch (error) { showMessage(`读取思源内容失败：${error.message}`); }
    }
    if (!snapshots.length) return;
    this.mutate("导入思源文档或块", () => {
      let lastId = null;
      for (const snapshot of snapshots) {
        const node = createNode(snapshot.title || "思源内容", parentId, this.settings);
        node.siyuan = this.makeSiyuanBinding(snapshot, mode);
        node.links.push({ id: uid("link"), url: `siyuan://blocks/${snapshot.id}`, title: snapshot.title || snapshot.id, icon: snapshot.kind === "doc" ? "📄" : "▣" });
        if (mode === "mirror") this.applyMirrorSource(node, snapshot, node.siyuan);
        this.map.nodes[node.id] = node;
        if (parentId && this.map.nodes[parentId]) {
          this.map.nodes[parentId].children.push(node.id);
          this.map.nodes[parentId].collapsed = false;
        } else this.map.rootIds.push(node.id);
        lastId = node.id;
      }
      if (lastId) this.selectedIds = new Set([lastId]);
    });
    showMessage(`已导入 ${snapshots.length} 个思源${mode === "mirror" ? "镜像" : "卡片"}`);
  }

  async bindSiyuanToNode(nodeId, blockId, mode = "card") {
    const node = this.map.nodes[nodeId];
    if (!node) return;
    try {
      const snapshot = await fetchSiyuanBlockSnapshot(blockId, this.settings.siyuanCardPreviewLength);
      this.mutate("绑定思源内容", () => {
        node.siyuan = this.makeSiyuanBinding(snapshot, mode);
        if (!node.links.some((link) => link.url === `siyuan://blocks/${snapshot.id}`)) node.links.push({ id: uid("link"), url: `siyuan://blocks/${snapshot.id}`, title: snapshot.title || snapshot.id, icon: snapshot.kind === "doc" ? "📄" : "▣" });
        if (mode === "mirror") this.applyMirrorSource(node, snapshot, node.siyuan);
      });
    } catch (error) { showMessage(`绑定失败：${error.message}`); }
  }

  async refreshSiyuanNode(nodeId, options = {}) {
    const node = this.map.nodes[nodeId];
    if (!node?.siyuan?.id) return false;
    const previous = node.siyuan;
    try {
      const snapshot = await fetchSiyuanBlockSnapshot(previous.id, this.settings.siyuanCardPreviewLength);
      if (previous.mode !== "mirror") {
        node.siyuan = this.makeSiyuanBinding(snapshot, "card", previous);
        node.siyuan.syncStatus = "synced";
        node.siyuan.conflict = null;
        node.updatedAt = now();
        return true;
      }
      const localText = nodePlainText(node);
      const localHash = hashText(localText);
      const oldSourceHash = previous.sourceHash || hashText(previous.sourceText || previous.preview || "");
      const sourceChanged = snapshot.sourceHash !== oldSourceHash;
      const localChanged = localHash !== (previous.appliedHash || hashText(previous.appliedText || ""));
      if (sourceChanged && localChanged) {
        const policy = this.settings.mirrorConflictPolicy || "ask";
        if (policy === "source") this.applyMirrorSource(node, snapshot, previous);
        else if (policy === "local") {
          node.siyuan = this.makeSiyuanBinding(snapshot, "mirror", previous);
          node.siyuan.appliedText = localText;
          node.siyuan.appliedHash = localHash;
          node.siyuan.localHash = localHash;
          node.siyuan.syncStatus = "local";
          node.siyuan.conflict = null;
        } else {
          node.siyuan = this.makeSiyuanBinding(snapshot, "mirror", previous);
          node.siyuan.syncStatus = "conflict";
          node.siyuan.localHash = localHash;
          node.siyuan.conflict = {
            detectedAt: now(),
            localText,
            sourceText: mirrorSourceText(snapshot),
            snapshot,
          };
        }
      } else if (sourceChanged) this.applyMirrorSource(node, snapshot, previous);
      else {
        node.siyuan = this.makeSiyuanBinding(snapshot, "mirror", previous);
        node.siyuan.localHash = localHash;
        node.siyuan.syncStatus = localChanged ? "local" : "synced";
        node.siyuan.conflict = null;
      }
      node.updatedAt = now();
      return true;
    } catch (error) {
      node.siyuan.error = error.message;
      node.siyuan.syncStatus = "error";
      node.siyuan.lastSyncedAt = now();
      if (!options.silent) showMessage(`同步失败：${error.message}`);
      return false;
    }
  }

  async refreshAllSiyuanNodes(options = {}) {
    if (this.siyuanRefreshing || this.destroyed) return;
    const nodes = Object.values(this.map.nodes).filter((node) => node.siyuan?.id);
    if (!nodes.length) { if (!options.silent) showMessage("当前导图没有思源卡片"); return; }
    this.siyuanRefreshing = true;
    let success = 0;
    try {
      for (const node of nodes) if (await this.refreshSiyuanNode(node.id, { silent: true })) success += 1;
      this.map.updatedAt = now();
      this.renderAll();
      await this.save("同步思源内容");
      const conflicts = nodes.filter((node) => node.siyuan?.syncStatus === "conflict").length;
      if (!options.silent) showMessage(`已刷新 ${success}/${nodes.length}${conflicts ? `，发现 ${conflicts} 个冲突` : ""}`);
    } finally { this.siyuanRefreshing = false; }
  }

  resolveMirrorConflict(id, choice) {
    const node = this.map.nodes[id];
    const conflict = node?.siyuan?.conflict;
    if (!node || !conflict) return;
    this.mutate("处理镜像冲突", () => {
      if (choice === "source") this.applyMirrorSource(node, conflict.snapshot, node.siyuan);
      else if (choice === "card") {
        node.siyuan = this.makeSiyuanBinding(conflict.snapshot, "card", node.siyuan);
        node.siyuan.conflict = null;
        node.siyuan.syncStatus = "synced";
      } else {
        const localText = nodePlainText(node);
        node.siyuan = this.makeSiyuanBinding(conflict.snapshot, "mirror", node.siyuan);
        node.siyuan.appliedText = localText;
        node.siyuan.appliedHash = hashText(localText);
        node.siyuan.localHash = node.siyuan.appliedHash;
        node.siyuan.syncStatus = "local";
        node.siyuan.conflict = null;
      }
    });
  }

  openSiyuanSyncCenter() {
    const nodes = Object.values(this.map.nodes).filter((node) => node.siyuan?.id);
    const render = () => nodes.map((node) => {
      const card = node.siyuan;
      const status = card.syncStatus || (card.error ? "error" : "synced");
      const label = status === "conflict" ? "冲突" : status === "local" ? "本地改动" : status === "error" ? "失败" : status === "missing" ? "源已移除" : "已同步";
      return `<div class="kmzs-card kmzs-sync-item"><div class="kmzs-card-head"><span class="kmzs-siyuan-kind">${card.mode === "mirror" ? "镜" : card.kind === "doc" ? "文" : "块"}</span><b>${esc(stripHtml(node.html) || card.title || card.id)}</b><span class="kmzs-spacer"></span><span class="kmzs-sync-state is-${status}">${label}</span></div><div class="kmzs-muted">${esc(card.hpath || card.id)} · ${esc(dateLabel(card.lastSyncedAt))}</div><div class="kmzs-row" style="justify-content:flex-end;margin-top:8px"><button class="kmzs-btn" data-sync-open="${node.id}">打开</button><button class="kmzs-btn" data-sync-refresh="${node.id}">刷新</button>${status === "conflict" ? `<button class="kmzs-btn kmzs-btn--primary" data-sync-resolve="${node.id}">处理冲突</button>` : ""}</div></div>`;
    }).join("") || `<div class="kmzs-empty">当前导图没有思源卡片或镜像</div>`;
    const d = this.dialog("思源同步中心", `<div class="kmzs-row" style="justify-content:flex-end;margin-bottom:10px"><button class="b3-button b3-button--outline" data-sync-all>刷新全部</button></div><div data-sync-list class="kmzs-list">${render()}</div>`, "680px");
    const rerender = () => { d.element.querySelector("[data-sync-list]").innerHTML = render(); bind(); };
    const bind = () => {
      d.element.querySelectorAll("[data-sync-open]").forEach((btn) => btn.onclick = () => this.openSiyuanBlock(this.map.nodes[btn.dataset.syncOpen]?.siyuan?.id));
      d.element.querySelectorAll("[data-sync-refresh]").forEach((btn) => btn.onclick = async () => { await this.refreshSiyuanNode(btn.dataset.syncRefresh); await this.save("刷新思源卡片"); this.renderAll(); rerender(); });
      d.element.querySelectorAll("[data-sync-resolve]").forEach((btn) => btn.onclick = () => { d.destroy(); this.openSiyuanCard(btn.dataset.syncResolve); });
    };
    d.element.querySelector("[data-sync-all]").onclick = async () => { await this.refreshAllSiyuanNodes({ silent: true }); rerender(); };
    bind();
  }

  openSiyuanCard(id) {
    const node = this.map.nodes[id];
    if (!node) return;
    const card = node.siyuan;
    const conflict = card?.conflict;
    const conflictBody = conflict ? `<div class="kmzs-conflict"><div><b>本地节点</b><pre>${esc(conflict.localText || nodePlainText(node))}</pre></div><div><b>思源内容</b><pre>${esc(conflict.sourceText || "")}</pre></div></div><div class="kmzs-row" style="justify-content:flex-end;margin:10px 0"><button class="b3-button b3-button--outline" data-role="keep-local">保留本地</button><button class="b3-button b3-button--outline" data-role="switch-card">转为卡片</button><button class="b3-button b3-button--text" data-role="use-source">使用思源内容</button></div>` : "";
    const body = card ? `${conflictBody}<div class="kmzs-card kmzs-siyuan-detail"><div class="kmzs-card-head"><span class="kmzs-siyuan-kind">${card.mode === "mirror" ? "镜" : (card.kind === "doc" ? "文" : "块")}</span><b>${esc(card.title || card.id)}</b></div><div class="kmzs-card-body kmzs-siyuan-html">${card.previewHtml || esc(card.preview || "")}</div><div class="kmzs-muted">${esc(card.hpath || card.id)}</div><div class="kmzs-muted">上次同步：${esc(dateLabel(card.lastSyncedAt))}</div></div><div class="kmzs-setting-row"><div><div class="kmzs-setting-title">显示方式</div><div class="kmzs-setting-desc">卡片显示摘要；镜像同步节点正文</div></div><select class="kmzs-select" data-role="siyuan-mode"><option value="card">卡片</option><option value="mirror">镜像</option></select></div><div class="kmzs-setting-row"><div><div class="kmzs-setting-title">卡片样式</div><div class="kmzs-setting-desc">紧凑或富预览</div></div><select class="kmzs-select" data-role="card-view"><option value="compact">紧凑</option><option value="rich">富预览</option></select></div>` : `<div class="kmzs-field"><label>思源文档或块 ID / siyuan:// 链接</label><input class="kmzs-input" data-role="siyuan-id" placeholder="20260101010101-abcdefg"></div>`;
    const d = this.dialog("思源卡片与镜像", `${body}<div class="kmzs-row" style="justify-content:flex-end;margin-top:12px">${card ? `<button class="b3-button b3-button--outline" data-role="open-siyuan">打开</button><button class="b3-button b3-button--outline" data-role="refresh-siyuan">刷新</button><button class="b3-button b3-button--cancel" data-role="detach-siyuan">解除绑定</button>` : `<button class="b3-button b3-button--text" data-role="bind-siyuan">绑定</button>`}<button class="b3-button b3-button--outline" data-role="create-subdoc">创建子文档</button></div>`, "620px");
    if (card) {
      const select = d.element.querySelector('[data-role="siyuan-mode"]'); select.value = card.mode || "card";
      const cardView = d.element.querySelector('[data-role="card-view"]'); cardView.value = card.cardView || this.settings.siyuanCardView || "rich";
      select.onchange = () => { this.mutate("切换思源显示方式", () => { card.mode = select.value; if (card.mode === "mirror") this.applyMirrorSource(node, card, card); else { card.syncStatus = "synced"; card.conflict = null; } }); d.destroy(); };
      cardView.onchange = () => { this.mutate("切换卡片样式", () => card.cardView = cardView.value); d.destroy(); };
      d.element.querySelector('[data-role="open-siyuan"]').onclick = () => this.openSiyuanBlock(card.id);
      d.element.querySelector('[data-role="refresh-siyuan"]').onclick = async () => { await this.refreshSiyuanNode(id); this.renderAll(); await this.save("刷新思源卡片"); d.destroy(); if (node.siyuan?.syncStatus === "conflict") this.openSiyuanCard(id); };
      d.element.querySelector('[data-role="detach-siyuan"]').onclick = () => { this.mutate("解除思源绑定", () => node.siyuan = null); d.destroy(); };
      d.element.querySelector('[data-role="keep-local"]')?.addEventListener("click", () => { this.resolveMirrorConflict(id, "local"); d.destroy(); });
      d.element.querySelector('[data-role="switch-card"]')?.addEventListener("click", () => { this.resolveMirrorConflict(id, "card"); d.destroy(); });
      d.element.querySelector('[data-role="use-source"]')?.addEventListener("click", () => { this.resolveMirrorConflict(id, "source"); d.destroy(); });
    } else {
      d.element.querySelector('[data-role="bind-siyuan"]').onclick = async () => { const raw = d.element.querySelector('[data-role="siyuan-id"]').value; const match = raw.match(SIYUAN_ID_GLOBAL_RE); if (!match?.[0]) { showMessage("请输入有效的思源块 ID"); return; } await this.bindSiyuanToNode(id, match[0], "card"); d.destroy(); };
    }
    d.element.querySelector('[data-role="create-subdoc"]').onclick = () => { d.destroy(); this.createNodeSubdoc(id); };
  }

  async openNodeSubdocs(id) {
    const node = this.map.nodes[id];
    if (!node) return;
    const render = () => `<div class="kmzs-list">${(node.subdocs || []).map((doc) => `<div class="kmzs-card"><div class="kmzs-card-head"><span>📄</span><b>${esc(doc.title || doc.id)}</b><span class="kmzs-spacer"></span><button class="kmzs-btn" data-open-subdoc="${doc.id}">打开</button><button class="kmzs-btn kmzs-btn--danger" data-delete-subdoc="${doc.id}">移除</button></div><div class="kmzs-muted">${esc(doc.path || doc.id)}</div></div>`).join("") || `<div class="kmzs-empty">暂无节点子文档</div>`}</div><div class="kmzs-row" style="justify-content:flex-end;margin-top:10px"><button class="b3-button b3-button--text" data-create-subdoc>创建子文档</button></div>`;
    const d = this.dialog("节点子文档", `<div data-role="subdocs-root">${render()}</div>`, "540px");
    const bind = () => {
      d.element.querySelector('[data-create-subdoc]').onclick = () => { d.destroy(); this.createNodeSubdoc(id); };
      d.element.querySelectorAll('[data-open-subdoc]').forEach((btn) => btn.onclick = () => this.openSiyuanBlock(btn.dataset.openSubdoc));
      d.element.querySelectorAll('[data-delete-subdoc]').forEach((btn) => btn.onclick = () => { this.mutate("移除节点子文档", () => node.subdocs = node.subdocs.filter((doc) => doc.id !== btn.dataset.deleteSubdoc)); d.element.querySelector('[data-role="subdocs-root"]').innerHTML = render(); bind(); });
    };
    bind();
  }

  async createNodeSubdoc(id) {
    const node = this.map.nodes[id];
    if (!node) return;
    let notebooks = [];
    try { notebooks = await listSiyuanNotebooks(); } catch (error) { showMessage(`读取笔记本失败：${error.message}`); return; }
    if (!notebooks.length) { showMessage("没有可用的思源笔记本"); return; }
    const title = stripHtml(node.html) || "YeMind 节点";
    const base = String(this.settings.siyuanSubdocBasePath || "/YeMind").replace(/\/+$/, "");
    const path = `${base}/${title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60)}`;
    const d = this.dialog("创建节点子文档", `<div class="kmzs-field"><label>笔记本</label><select class="kmzs-select" data-role="notebook">${notebooks.map((book) => `<option value="${book.id}">${esc(book.name || book.id)}</option>`).join("")}</select></div><div class="kmzs-field"><label>文档路径</label><input class="kmzs-input" data-role="path" value="${esc(path)}"></div><div class="kmzs-field"><label>初始内容</label><textarea class="kmzs-textarea" data-role="markdown"># ${esc(title)}\n\n${esc(node.notes || "")}</textarea></div><div class="kmzs-row" style="justify-content:flex-end"><button class="b3-button b3-button--cancel" data-role="cancel">取消</button><button class="b3-button b3-button--text" data-role="create">创建</button></div>`, "560px");
    const select = d.element.querySelector('[data-role="notebook"]');
    if (this.settings.siyuanDefaultNotebook && notebooks.some((book) => book.id === this.settings.siyuanDefaultNotebook)) select.value = this.settings.siyuanDefaultNotebook;
    d.element.querySelector('[data-role="cancel"]').onclick = () => d.destroy();
    d.element.querySelector('[data-role="create"]').onclick = async () => {
      try {
        const notebook = select.value; const docPath = d.element.querySelector('[data-role="path"]').value.trim(); const markdown = d.element.querySelector('[data-role="markdown"]').value;
        const docId = await createSiyuanDocument(notebook, docPath, markdown);
        this.settings.siyuanDefaultNotebook = notebook;
        this.mutate("创建节点子文档", () => {
          node.subdocs ||= [];
          node.subdocs.push({ id: docId, title, path: docPath, notebook, createdAt: now() });
          if (!node.links.some((link) => link.url === `siyuan://blocks/${docId}`)) node.links.push({ id: uid("link"), url: `siyuan://blocks/${docId}`, title, icon: "📄" });
        });
        d.destroy(); showMessage("节点子文档已创建");
      } catch (error) { showMessage(`创建失败：${error.message}`); }
    };
  }

  async fetchSiyuanDocTree(rootId, maxDepth = 8, maxDocs = 300) {
    if (!SIYUAN_ID_RE.test(rootId)) throw new Error("文档 ID 格式不正确");
    const root = await fetchSiyuanBlockSnapshot(rootId, this.settings.siyuanCardPreviewLength);
    if (root.kind !== "doc") throw new Error("请选择思源文档，不是普通内容块");
    const pathData = await kernelPost("/api/filetree/getPathByID", { id: rootId });
    const notebook = pathData?.notebook || root.box;
    const rootPath = pathData?.path || root.path;
    const count = { value: 1 };
    const walk = async (item, depth) => {
      const result = { ...item, children: [] };
      if (depth >= maxDepth || count.value >= maxDocs) return result;
      let children = [];
      try { children = await listSiyuanDocChildren(notebook, item.path); } catch { return result; }
      for (const child of children) {
        if (count.value >= maxDocs || !SIYUAN_ID_RE.test(String(child.id || ""))) break;
        count.value += 1;
        result.children.push(await walk({ id: child.id, title: child.name || "思源文档", path: child.path, notebook, subFileCount: Number(child.subFileCount || 0) }, depth + 1));
      }
      return result;
    };
    return walk({ id: rootId, title: root.title, path: rootPath, notebook, hpath: root.hpath, preview: root.preview }, 0);
  }

  async createMapFromSiyuanDoc(rootId) {
    try {
      showMessage("正在读取思源文档树…", 3000);
      const tree = await this.fetchSiyuanDocTree(rootId);
      const defaults = this.plugin.getCreationDefaults("docTree");
      const template = (this.state.templates || []).find((item) => item.id === defaults.templateId);
      const seed = template ? this.plugin.createMapFromTemplate(template, tree.title || "思源文档树") : createMap(tree.title || "思源文档树", this.settings, { themePreset: defaults.theme, themeColors: THEME_PRESETS[defaults.theme] || THEME_PRESETS.blue });
      const map = { ...seed, nodes: {}, rootIds: [], relations: [], summaries: [], sourceDocId: rootId, docTreeLastSyncedAt: now(), theme: defaults.theme, themeColors: clone(THEME_PRESETS[defaults.theme] || THEME_PRESETS.blue) };
      const add = (item, parentId = null) => {
        const node = createNode(item.title || "思源文档", parentId, this.settings);
        node.siyuan = this.makeSiyuanBinding({ id: item.id, kind: "doc", type: "d", subtype: "", title: item.title || "思源文档", preview: item.preview || item.hpath || item.title || "", previewHtml: markdownPreviewHtml(item.preview || item.title || "", 600), sourceText: item.preview || item.title || "", sourceHash: hashText(item.preview || item.title || ""), hpath: item.hpath || "", path: item.path || "", box: item.notebook || "", rootId: item.id, parentId: "", updated: "", lastSyncedAt: now(), error: "", treeManaged: true }, "card");
        node.links.push({ id: uid("link"), url: `siyuan://blocks/${item.id}`, title: item.title || item.id, icon: "📄" });
        map.nodes[node.id] = node;
        if (parentId) map.nodes[parentId].children.push(node.id); else map.rootIds.push(node.id);
        for (const child of item.children || []) add(child, node.id);
      };
      add(tree);
      map.id = uid("map"); map.createdAt = now(); map.updatedAt = now();
      this.state.maps.push(map); this.switchMap(map.id); await this.save("生成文档树导图");
      showMessage("文档树导图已生成");
    } catch (error) { showMessage(`生成失败：${error.message}`); }
  }

  flattenSiyuanDocTree(tree, parentId = null, list = []) {
    if (!tree) return list;
    list.push({ ...tree, parentSiyuanId: parentId });
    for (const child of tree.children || []) this.flattenSiyuanDocTree(child, tree.id, list);
    return list;
  }

  analyzeDocumentTree(tree) {
    const remote = this.flattenSiyuanDocTree(tree);
    const localBySource = new Map(Object.values(this.map.nodes).filter((node) => node.siyuan?.kind === "doc" && node.siyuan.treeManaged).map((node) => [node.siyuan.id, node]));
    const remoteIds = new Set(remote.map((item) => item.id));
    const added = remote.filter((item) => !localBySource.has(item.id));
    const renamed = remote.filter((item) => { const node = localBySource.get(item.id); return node && stripHtml(node.html) !== String(item.title || "").trim(); });
    const missing = [...localBySource.values()].filter((node) => !remoteIds.has(node.siyuan.id));
    return { remote, localBySource, added, renamed, missing };
  }

  applyDocumentTreeRefresh(tree, options = {}) {
    const analysis = this.analyzeDocumentTree(tree);
    const bySource = analysis.localBySource;
    this.mutate("刷新思源文档树", () => {
      for (const item of analysis.remote) {
        let node = bySource.get(item.id);
        if (!node) {
          node = createNode(item.title || "思源文档", null, this.settings);
          node.siyuan = this.makeSiyuanBinding({ id: item.id, kind: "doc", type: "d", subtype: "", title: item.title || "思源文档", preview: item.preview || item.hpath || item.title || "", previewHtml: markdownPreviewHtml(item.preview || item.title || "", 600), sourceText: item.preview || item.title || "", sourceHash: hashText(item.preview || item.title || ""), hpath: item.hpath || "", path: item.path || "", box: item.notebook || "", rootId: item.id, parentId: "", updated: "", lastSyncedAt: now(), error: "", treeManaged: true }, "card");
          node.links.push({ id: uid("link"), url: `siyuan://blocks/${item.id}`, title: item.title || item.id, icon: "📄" });
          this.map.nodes[node.id] = node;
          bySource.set(item.id, node);
        } else {
          const previousSourceTitle = node.siyuan.sourceTitle || node.siyuan.title || "";
          const localTitle = stripHtml(node.html);
          node.siyuan = this.makeSiyuanBinding({ ...node.siyuan, title: item.title || node.siyuan.title, sourceTitle: item.title || node.siyuan.sourceTitle, path: item.path || node.siyuan.path, hpath: item.hpath || node.siyuan.hpath, box: item.notebook || node.siyuan.box, lastSyncedAt: now(), error: "" }, "card", node.siyuan);
          node.siyuan.treeManaged = true;
          node.siyuan.missing = false;
          node.siyuan.syncStatus = "synced";
          if (options.overwriteTitles || !localTitle || localTitle === previousSourceTitle) node.html = esc(item.title || localTitle || "思源文档");
        }
      }
      for (const item of analysis.remote) {
        const node = bySource.get(item.id);
        const parent = item.parentSiyuanId ? bySource.get(item.parentSiyuanId) : null;
        if (node.parentId && this.map.nodes[node.parentId]) this.map.nodes[node.parentId].children = this.map.nodes[node.parentId].children.filter((childId) => childId !== node.id);
        else this.map.rootIds = this.map.rootIds.filter((rootId) => rootId !== node.id);
        node.parentId = parent?.id || null;
        if (parent) { if (!parent.children.includes(node.id)) parent.children.push(node.id); }
        else if (!this.map.rootIds.includes(node.id)) this.map.rootIds.push(node.id);
      }
      for (const node of analysis.missing) { node.siyuan.missing = true; node.siyuan.syncStatus = "missing"; }
      this.map.sourceDocId = tree.id;
      this.map.docTreeLastSyncedAt = now();
    });
    return analysis;
  }

  async openDocumentTreeSync() {
    if (!this.map.sourceDocId) { showMessage("当前导图不是思源文档树"); return; }
    try {
      showMessage("正在检查文档树变化…", 2500);
      const tree = await this.fetchSiyuanDocTree(this.map.sourceDocId);
      const analysis = this.analyzeDocumentTree(tree);
      const d = this.dialog("刷新思源文档树", `<div class="kmzs-sync-summary"><span>新增 <b>${analysis.added.length}</b></span><span>标题差异 <b>${analysis.renamed.length}</b></span><span>源中已移除 <b>${analysis.missing.length}</b></span></div><label class="kmzs-check"><input type="checkbox" data-role="overwrite-titles" ${this.settings.docTreeUpdateLocalTitles ? "checked" : ""}> 使用思源标题覆盖本地标题</label><div class="kmzs-muted" style="margin-top:8px">默认保留本地新增节点；源中已移除的文档只标记，不自动删除。</div><div class="kmzs-row" style="justify-content:flex-end;margin-top:14px"><button class="b3-button b3-button--cancel" data-role="cancel">取消</button><button class="b3-button b3-button--text" data-role="apply">应用刷新</button></div>`, "560px");
      d.element.querySelector('[data-role="cancel"]').onclick = () => d.destroy();
      d.element.querySelector('[data-role="apply"]').onclick = async () => { const overwriteTitles = d.element.querySelector('[data-role="overwrite-titles"]').checked; this.settings.docTreeUpdateLocalTitles = overwriteTitles; this.applyDocumentTreeRefresh(tree, { overwriteTitles }); await this.save("刷新思源文档树"); d.destroy(); showMessage("文档树已刷新"); };
    } catch (error) { showMessage(`刷新失败：${error.message}`); }
  }

  async writeBackSingleDocumentTitle(nodeId) {
    const node = this.map.nodes[nodeId];
    if (!node?.siyuan?.id || node.siyuan.kind !== "doc") return;
    const title = stripHtml(node.html).trim();
    if (!title) { showMessage("节点标题不能为空"); return; }
    if (!window.confirm(`将思源文档重命名为“${title}”？`)) return;
    try {
      await renameSiyuanDocumentById(node.siyuan.id, title);
      node.siyuan.title = title; node.siyuan.sourceTitle = title; node.siyuan.lastSyncedAt = now(); node.siyuan.syncStatus = "synced";
      await this.save("写回文档标题"); this.renderAll(); showMessage("文档标题已写回");
    } catch (error) { showMessage(`写回失败：${error.message}`); }
  }

  async writeBackDocumentTreeTitles() {
    const candidates = Object.values(this.map.nodes).filter((node) => node.siyuan?.kind === "doc" && !node.siyuan.missing && stripHtml(node.html).trim() && stripHtml(node.html).trim() !== (node.siyuan.sourceTitle || node.siyuan.title || "").trim());
    if (!candidates.length) { showMessage("没有需要写回的文档标题"); return; }
    if (!window.confirm(`将 ${candidates.length} 个节点标题写回思源文档？只修改标题，不移动或删除文档。`)) return;
    let success = 0;
    for (const node of candidates) {
      try {
        const title = stripHtml(node.html).trim();
        await renameSiyuanDocumentById(node.siyuan.id, title);
        node.siyuan.title = title; node.siyuan.sourceTitle = title; node.siyuan.lastSyncedAt = now(); node.siyuan.syncStatus = "synced"; success += 1;
      } catch (error) { node.siyuan.error = error.message; node.siyuan.syncStatus = "error"; }
    }
    await this.save("写回文档标题"); this.renderAll(); showMessage(`已写回 ${success}/${candidates.length} 个文档标题`);
  }

  openDocumentTreeImport() {
    const selectedDoc = this.selectedNode?.siyuan?.kind === "doc" ? this.selectedNode.siyuan.id : "";
    const d = this.dialog("从思源文档生成导图", `<div class="kmzs-field"><label>思源文档 ID 或 siyuan:// 链接</label><input class="kmzs-input" data-role="doc-id" value="${esc(selectedDoc)}" placeholder="20260101010101-abcdefg"></div><div class="kmzs-muted">生成新的导图，不修改原思源文档。</div><div class="kmzs-row" style="justify-content:flex-end;margin-top:12px"><button class="b3-button b3-button--cancel" data-role="cancel">取消</button><button class="b3-button b3-button--text" data-role="create">生成</button></div>`, "520px");
    d.element.querySelector('[data-role="cancel"]').onclick = () => d.destroy();
    d.element.querySelector('[data-role="create"]').onclick = () => { const match = d.element.querySelector('[data-role="doc-id"]').value.match(SIYUAN_ID_GLOBAL_RE); if (!match?.[0]) { showMessage("请输入有效的思源文档 ID"); return; } d.destroy(); this.createMapFromSiyuanDoc(match[0]); };
  }

  async exportToSiyuanDocument() {
    let notebooks = [];
    try { notebooks = await listSiyuanNotebooks(); } catch (error) { showMessage(`读取笔记本失败：${error.message}`); return; }
    if (!notebooks.length) { showMessage("没有可用的思源笔记本"); return; }
    const safeTitle = this.map.title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
    const defaultPath = `${String(this.settings.siyuanSubdocBasePath || "/YeMind").replace(/\/+$/, "")}/${safeTitle}`;
    const d = this.dialog("写入为新思源文档", `<div class="kmzs-field"><label>笔记本</label><select class="kmzs-select" data-role="notebook">${notebooks.map((book) => `<option value="${book.id}">${esc(book.name || book.id)}</option>`).join("")}</select></div><div class="kmzs-field"><label>文档路径</label><input class="kmzs-input" data-role="path" value="${esc(defaultPath)}"></div><div class="kmzs-muted">将当前导图按 Markdown 层级写入一个新的思源文档。</div><div class="kmzs-row" style="justify-content:flex-end;margin-top:12px"><button class="b3-button b3-button--cancel" data-role="cancel">取消</button><button class="b3-button b3-button--text" data-role="create">写入</button></div>`, "540px");
    const select = d.element.querySelector('[data-role="notebook"]');
    if (this.settings.siyuanDefaultNotebook && notebooks.some((book) => book.id === this.settings.siyuanDefaultNotebook)) select.value = this.settings.siyuanDefaultNotebook;
    d.element.querySelector('[data-role="cancel"]').onclick = () => d.destroy();
    d.element.querySelector('[data-role="create"]').onclick = async () => {
      try {
        const notebook = select.value; const path = d.element.querySelector('[data-role="path"]').value.trim(); const markdown = `# ${this.map.title}\n\n${this.map.rootIds.map((id) => this.nodeToMarkdown(id)).join("\n")}`;
        const docId = await createSiyuanDocument(notebook, path, markdown);
        this.settings.siyuanDefaultNotebook = notebook; this.map.exportedDocId = docId; this.map.exportedDocAt = now(); await this.save("写入思源文档");
        d.destroy(); showMessage("已写入新的思源文档"); this.openSiyuanBlock(docId);
      } catch (error) { showMessage(`写入失败：${error.message}`); }
    };
  }

  openImages(id) {
    const node = this.map.nodes[id]; const d = this.dialog("节点图片", `<div class="kmzs-field"><label>图片 URL，或选择本地图片</label><input class="kmzs-input" data-role="image-url" placeholder="https://..."><input type="file" accept="image/*" data-role="image-file"></div><div class="kmzs-list">${(node.images || []).map((img) => `<div class="kmzs-card"><img src="${esc(img.src)}" style="max-width:100%;max-height:180px"><button class="kmzs-btn kmzs-btn--danger" data-delete-image="${img.id}">删除</button></div>`).join("")}</div><div class="kmzs-row" style="justify-content:flex-end"><button class="b3-button b3-button--text" data-role="add-image">添加 URL</button></div>`, "520px");
    d.element.querySelector('[data-role="add-image"]').onclick = () => { const url = d.element.querySelector('[data-role="image-url"]').value.trim(); if (!url) return; this.mutate("添加图片", () => node.images.push({ id: uid("image"), src: url })); d.destroy(); this.openImages(id); };
    d.element.querySelector('[data-role="image-file"]').onchange = async (e) => { const file = e.target.files?.[0]; if (!file) return; try { const src = await imageFileToDataUrl(file, this.settings.compressInsertedImages); this.mutate("添加图片", () => node.images.push({ id: uid("image"), src, originalName: file.name, compressed: Boolean(this.settings.compressInsertedImages && !/svg|gif/i.test(file.type)) })); d.destroy(); this.openImages(id); } catch (error) { showMessage(`图片处理失败：${error.message}`); } };
    d.element.querySelectorAll("[data-delete-image]").forEach((btn) => btn.onclick = () => { this.mutate("删除图片", () => node.images = node.images.filter((img) => img.id !== btn.dataset.deleteImage)); d.destroy(); this.openImages(id); });
  }

  openNodeStyle(id) {
    const node = this.map.nodes[id]; const style = node.style || {}; const d = this.dialog("节点样式", `<div class="kmzs-setting-row"><div><div class="kmzs-setting-title">背景色</div></div><input type="color" data-role="node-bg" value="${style.background || this.settings.nodeColor}"></div><div class="kmzs-setting-row"><div><div class="kmzs-setting-title">边框色</div></div><input type="color" data-role="node-border" value="${style.border || this.settings.nodeBorder}"></div><div class="kmzs-setting-row"><div><div class="kmzs-setting-title">字号</div></div><input class="kmzs-input" type="number" min="10" max="32" data-role="node-font" value="${style.fontSize || this.settings.defaultFontSize}"></div><div class="kmzs-row" style="justify-content:flex-end;margin-top:12px"><button class="b3-button b3-button--cancel">重置</button><button class="b3-button b3-button--text">应用</button></div>`, "440px");
    const buttons = d.element.querySelectorAll("button"); buttons[0].onclick = () => { this.mutate("重置节点样式", () => node.style = {}); d.destroy(); }; buttons[1].onclick = () => { this.mutate("节点样式", () => node.style = { background: d.element.querySelector('[data-role="node-bg"]').value, border: d.element.querySelector('[data-role="node-border"]').value, fontSize: Number(d.element.querySelector('[data-role="node-font"]').value) }); d.destroy(); };
  }

  openImport() {
    const input = document.createElement("input"); input.type = "file"; input.accept = ".json,.md,.markdown,.opml,.txt";
    input.onchange = async () => { const file = input.files?.[0]; if (!file) return; const text = await file.text(); try { if (/\.json$/i.test(file.name)) this.importJson(text); else if (/\.opml$/i.test(file.name)) this.importOpml(text); else this.importMarkdown(text, file.name); } catch (error) { showMessage(`导入失败：${error.message}`); } };
    input.click();
  }

  exportJson() { downloadBlob(new Blob([JSON.stringify(this.map, null, 2)], { type: "application/json" }), `${this.safeName(this.map.title)}.kmind-mindmap.json`); }
  importJson(text) {
    const data = JSON.parse(text);
    const map = data.nodes && data.rootIds ? data : data.maps?.[0];
    if (!map) throw new Error("不是可识别的导图 JSON");
    const copy = clone(map); copy.id = uid("map"); copy.title = `${copy.title || "导入导图"}`; copy.createdAt = now(); copy.updatedAt = now();
    this.state.maps.push(copy); this.switchMap(copy.id); this.save("导入 JSON");
  }

  nodeToMarkdown(id, depth = 0) {
    const node = this.map.nodes[id]; if (!node) return "";
    const line = `${"  ".repeat(depth)}- ${stripHtml(node.html) || "空节点"}`;
    return [line, ...node.children.map((child) => this.nodeToMarkdown(child, depth + 1))].join("\n");
  }
  exportMarkdown() { downloadBlob(new Blob([this.map.rootIds.map((id) => this.nodeToMarkdown(id)).join("\n")], { type: "text/markdown" }), `${this.safeName(this.map.title)}.md`); }
  importMarkdown(text, filename = "导入导图") {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    const map = { ...createMap(filename.replace(/\.[^.]+$/, ""), this.settings), nodes: {}, rootIds: [] };
    const stack = [];
    for (const line of lines) {
      const heading = line.match(/^(#{1,6})\s+(.*)$/); const bullet = line.match(/^(\s*)[-*+]\s+(.*)$/);
      let depth, content;
      if (heading) { depth = heading[1].length - 1; content = heading[2]; }
      else if (bullet) { depth = Math.floor(bullet[1].replace(/\t/g, "  ").length / 2); content = bullet[2]; }
      else { depth = 0; content = line.trim(); }
      const parent = depth > 0 ? stack[depth - 1] : null;
      const node = createNode(content, parent?.id || null, this.settings); map.nodes[node.id] = node;
      if (parent) parent.children.push(node.id); else map.rootIds.push(node.id);
      stack[depth] = node; stack.length = depth + 1;
    }
    if (!map.rootIds.length) throw new Error("没有可导入内容");
    map.id = uid("map"); map.createdAt = now(); map.updatedAt = now(); this.state.maps.push(map); this.switchMap(map.id); this.save("导入 Markdown");
  }

  exportOpml() {
    const outline = (id) => { const node = this.map.nodes[id]; return `<outline text="${esc(stripHtml(node.html))}">${node.children.map(outline).join("")}</outline>`; };
    const xml = `<?xml version="1.0" encoding="UTF-8"?><opml version="2.0"><head><title>${esc(this.map.title)}</title></head><body>${this.map.rootIds.map(outline).join("")}</body></opml>`;
    downloadBlob(new Blob([xml], { type: "text/xml" }), `${this.safeName(this.map.title)}.opml`);
  }
  importOpml(text) {
    const doc = new DOMParser().parseFromString(text, "text/xml"); const title = doc.querySelector("head title")?.textContent || "导入 OPML";
    const map = { ...createMap(title, this.settings), nodes: {}, rootIds: [] };
    const walk = (el, parentId = null) => { const node = createNode(el.getAttribute("text") || el.getAttribute("title") || "节点", parentId, this.settings); map.nodes[node.id] = node; if (parentId) map.nodes[parentId].children.push(node.id); else map.rootIds.push(node.id); [...el.children].filter((child) => child.tagName.toLowerCase() === "outline").forEach((child) => walk(child, node.id)); };
    [...doc.querySelectorAll("body > outline")].forEach((el) => walk(el)); if (!map.rootIds.length) throw new Error("OPML 没有节点"); map.id = uid("map"); this.state.maps.push(map); this.switchMap(map.id); this.save("导入 OPML");
  }

  exportSvg() {
    const cloneSvg = this.canvas.cloneNode(true); cloneSvg.querySelector(".kmzs-grid")?.remove(); cloneSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const values = [...this.positions.values()]; const minX = Math.min(...values.map((p) => p.x)) - 50, minY = Math.min(...values.map((p) => p.y)) - 50, maxX = Math.max(...values.map((p) => p.x + p.width)) + 50, maxY = Math.max(...values.map((p) => p.y + p.height)) + 50;
    const viewport = cloneSvg.querySelector(".kmzs-viewport"); viewport.setAttribute("transform", `translate(${-minX} ${-minY})`); cloneSvg.setAttribute("width", maxX - minX); cloneSvg.setAttribute("height", maxY - minY); cloneSvg.setAttribute("viewBox", `0 0 ${maxX - minX} ${maxY - minY}`);
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style"); style.textContent = this.exportCss(); cloneSvg.insertBefore(style, cloneSvg.firstChild);
    if (this.settings.exportBackground) { const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect"); bg.setAttribute("width", "100%"); bg.setAttribute("height", "100%"); bg.setAttribute("fill", this.settings.background); cloneSvg.insertBefore(bg, style.nextSibling); }
    const xml = new XMLSerializer().serializeToString(cloneSvg); downloadBlob(new Blob([xml], { type: "image/svg+xml" }), `${this.safeName(this.map.title)}.svg`); return xml;
  }

  async exportPng() {
    const values = [...this.positions.values()]; const minX = Math.min(...values.map((p) => p.x)) - 50, minY = Math.min(...values.map((p) => p.y)) - 50, maxX = Math.max(...values.map((p) => p.x + p.width)) + 50, maxY = Math.max(...values.map((p) => p.y + p.height)) + 50;
    const width = maxX - minX, height = maxY - minY; const cloneSvg = this.canvas.cloneNode(true); cloneSvg.querySelector(".kmzs-grid")?.remove(); cloneSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg"); cloneSvg.setAttribute("width", width); cloneSvg.setAttribute("height", height); cloneSvg.setAttribute("viewBox", `0 0 ${width} ${height}`); cloneSvg.querySelector(".kmzs-viewport").setAttribute("transform", `translate(${-minX} ${-minY})`); const style = document.createElementNS("http://www.w3.org/2000/svg", "style"); style.textContent = this.exportCss(); cloneSvg.insertBefore(style, cloneSvg.firstChild); if (this.settings.exportBackground) { const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect"); bg.setAttribute("width", "100%"); bg.setAttribute("height", "100%"); bg.setAttribute("fill", this.settings.background); cloneSvg.insertBefore(bg, style.nextSibling); }
    const blob = new Blob([new XMLSerializer().serializeToString(cloneSvg)], { type: "image/svg+xml" }); const url = URL.createObjectURL(blob); const img = new Image(); img.onload = () => { const scale = Number(this.settings.exportScale) || 2; const canvas = document.createElement("canvas"); canvas.width = width * scale; canvas.height = height * scale; const ctx = canvas.getContext("2d"); ctx.scale(scale, scale); ctx.drawImage(img, 0, 0); canvas.toBlob((png) => downloadBlob(png, `${this.safeName(this.map.title)}.png`), "image/png"); URL.revokeObjectURL(url); }; img.src = url;
  }

  exportCss() { return `.kmzs-edge{fill:none;stroke:${this.settings.edgeColor};stroke-width:2}.kmzs-relation{fill:none;stroke:#a46bcb;stroke-width:2}.kmzs-node-shape{fill:${this.settings.nodeColor};stroke:${this.settings.nodeBorder};stroke-width:1.5}.kmzs-node-content{font-family:Arial,sans-serif;font-size:${this.settings.defaultFontSize}px;color:#1f2937;display:flex;align-items:center;padding:8px 11px;box-sizing:border-box}.kmzs-cloze{filter:blur(5px)}.kmzs-formula{font-family:serif}.kmzs-badge-bg{fill:${this.settings.accent}}.kmzs-badge{fill:#fff;font-size:10px}`; }
  safeName(name) { return String(name || "mindmap").replace(/[\\/:*?"<>|]/g, "_").slice(0, 80); }

  createCheckpoint() {
    const name = window.prompt("检查点名称", `检查点 ${new Date().toLocaleString()}`); if (!name) return;
    const list = this.state.checkpoints[this.map.id] ||= []; list.unshift({ id: uid("checkpoint"), name, createdAt: now(), map: this.snapshot() }); if (list.length > 30) list.length = 30; this.save("创建检查点"); showMessage("检查点已创建");
  }

  openCheckpoints() {
    const list = this.state.checkpoints[this.map.id] || []; const d = this.dialog("检查点与固定历史", `<div class="kmzs-list">${list.map((cp) => `<div class="kmzs-card"><div class="kmzs-card-head"><b>${esc(cp.name)}</b><span class="kmzs-spacer"></span><button class="kmzs-btn" data-restore-cp="${cp.id}">恢复</button><button class="kmzs-btn kmzs-btn--danger" data-delete-cp="${cp.id}">删除</button></div><div class="kmzs-muted">${esc(dateLabel(cp.createdAt))}</div></div>`).join("") || `<div class="kmzs-empty">暂无检查点</div>`}</div>`, "520px");
    d.element.querySelectorAll("[data-restore-cp]").forEach((btn) => btn.onclick = () => { const cp = list.find((item) => item.id === btn.dataset.restoreCp); if (!cp) return; this.pushHistory(this.snapshot()); const index = this.state.maps.findIndex((m) => m.id === this.map.id); this.state.maps[index] = clone(cp.map); this.mapId = cp.map.id; this.renderAll(); this.save("恢复检查点"); d.destroy(); });
    d.element.querySelectorAll("[data-delete-cp]").forEach((btn) => btn.onclick = () => { this.state.checkpoints[this.map.id] = list.filter((item) => item.id !== btn.dataset.deleteCp); this.save(); d.destroy(); this.openCheckpoints(); });
  }

  openTrash() {
    const render = () => `<div class="kmzs-list">${this.state.trash.map((map) => `<div class="kmzs-card"><div class="kmzs-card-head"><b>${esc(map.title)}</b><span class="kmzs-spacer"></span><button class="kmzs-btn" data-restore-map="${map.id}">恢复</button><button class="kmzs-btn kmzs-btn--danger" data-purge-map="${map.id}">彻底删除</button></div><div class="kmzs-muted">${esc(dateLabel(map.deletedAt))}</div></div>`).join("") || `<div class="kmzs-empty">回收站为空</div>`}</div>`;
    const d = this.dialog("回收站", `<div data-role="trash-root">${render()}</div>`, "560px");
    const bind = () => {
      d.element.querySelectorAll("[data-restore-map]").forEach((btn) => btn.onclick = () => { const index = this.state.trash.findIndex((m) => m.id === btn.dataset.restoreMap); const [map] = this.state.trash.splice(index, 1); delete map.deletedAt; this.state.maps.push(map); this.mapId = map.id; this.renderAll(); this.save("恢复导图"); d.element.querySelector('[data-role="trash-root"]').innerHTML = render(); bind(); });
      d.element.querySelectorAll("[data-purge-map]").forEach((btn) => btn.onclick = () => { this.state.trash = this.state.trash.filter((m) => m.id !== btn.dataset.purgeMap); this.save(); d.element.querySelector('[data-role="trash-root"]').innerHTML = render(); bind(); });
    }; bind();
  }

  openThemeDesigner() {
    const s = this.settings; const d = this.dialog("主题设计", `<div class="kmzs-field"><label>预设主题</label><select class="kmzs-select" data-role="preset">${Object.keys(THEME_PRESETS).map((key) => `<option value="${key}">${key}</option>`).join("")}</select></div>${[["background","画布背景"],["nodeColor","节点背景"],["nodeBorder","节点边框"],["edgeColor","连线颜色"],["accent","强调色"]].map(([key,label]) => `<div class="kmzs-setting-row"><div><div class="kmzs-setting-title">${label}</div></div><input type="color" data-role="theme-${key}" value="${s[key]}"></div>`).join("")}<div class="kmzs-row" style="justify-content:flex-end;margin-top:12px"><button class="b3-button b3-button--outline" data-role="export-theme">导出主题</button><button class="b3-button b3-button--text" data-role="apply-theme">应用</button></div>`, "500px");
    d.element.querySelector('[data-role="preset"]').onchange = (e) => { const p = THEME_PRESETS[e.target.value]; Object.entries(p).forEach(([key,value]) => { const input = d.element.querySelector(`[data-role="theme-${key}"]`); if (input) input.value = value; }); };
    d.element.querySelector('[data-role="apply-theme"]').onclick = () => { this.mutate("应用主题", () => { for (const key of ["background","nodeColor","nodeBorder","edgeColor","accent"]) s[key] = d.element.querySelector(`[data-role="theme-${key}"]`).value; s.theme = d.element.querySelector('[data-role="preset"]').value === "dark" ? "dark" : "light"; }, { history:false, render:false }); this.applySettingsTheme(); this.renderAll(); this.save("应用主题"); d.destroy(); };
    d.element.querySelector('[data-role="export-theme"]').onclick = () => { const theme = {}; for (const key of ["background","nodeColor","nodeBorder","edgeColor","accent"]) theme[key] = d.element.querySelector(`[data-role="theme-${key}"]`).value; downloadBlob(new Blob([JSON.stringify(theme,null,2)],{type:"application/json"}),"kmind-mindmap-theme.json"); };
  }

  openSettings() {
    this.plugin.openSettingsDialog(this);
  }

  restoreAllData() {
    const input=document.createElement("input"); input.type="file"; input.accept=".json"; input.onchange=async()=>{ const file=input.files?.[0]; if(!file)return; try{ const data=JSON.parse(await file.text()); if(!Array.isArray(data.maps))throw new Error("备份格式不正确"); this.plugin.state={...defaultState(),...data,settings:{...DEFAULT_SETTINGS,...data.settings}}; this.mapId=this.plugin.state.activeMapId||this.plugin.state.maps[0].id; this.applySettingsTheme(); this.renderAll(); this.save("恢复数据"); }catch(e){showMessage(`恢复失败：${e.message}`);} }; input.click();
  }

  openAbout() {
    this.dialog("关于", `<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">${BRAND_ICON}<div><h2 style="margin:0">YeMind Zen 思维导图</h2><div class="kmzs-muted">v${APP_VERSION}</div></div></div><p>独立、本地优先的思源思维导图插件。</p><p>导图、大纲和分屏共用同一份数据模型。</p>`, "500px");
  }
}

class YeMindZenPlugin extends Plugin {
  async onload() {
    this.addIcons(`<symbol id="${ICON_ID}" viewBox="0 0 32 32"><rect x="1" y="1" width="30" height="30" rx="7" fill="#176b50"/><path d="M8.5 6h4.5v8.1L21.2 6h5.7l-10.4 10 11 10h-6l-8.5-8.2V26H8.5z" fill="#fff"/></symbol>`);
    const loaded = await this.loadData(STORAGE_NAME).catch(() => null);
    this.state = this.normalizeState(loaded);
    await this.saveData(STORAGE_NAME, this.state).catch(() => {});
    this.apps = new Set();
    this.dockElement = null;
    this.officialMaps = [];
    this.officialMapsLoaded = false;
    this.officialMapsLoading = null;
    this.activeDockRef = this.state.activeMapId ? { kind: "mindmap", id: this.state.activeMapId } : null;
    this.pendingEdit = null;
    this.onDocumentTabPointer = (event) => this.syncDockFromTabPointer(event);
    document.addEventListener("pointerdown", this.onDocumentTabPointer, true);
    this.onProtocolOpen = (event) => {
      const parsed = parseYeMindMapLink(event?.detail?.url);
      if (parsed) this.openMap(parsed.mapId);
    };
    this.eventBus?.on?.("open-siyuan-url-plugin", this.onProtocolOpen);
    const plugin = this;
    this.addTab({
      type: TAB_TYPE,
      init() {
        this.element.classList.add("fn__flex", "fn__flex-1", "fn__flex-column");
        Object.assign(this.element.style, { width: "100%", height: "100%", minWidth: "0", minHeight: "0", overflow: "hidden" });
        const app = new YeMindZenApp(plugin, this.element, this.data || {});
        this.__yeMindZenApp = app;
        plugin.apps.add(app);
        try {
          app.mount();
        } catch (error) {
          console.error("[yemind-zen] tab mount failed", error);
          this.element.innerHTML = `<div class="kmzs-load-error"><h3>导图加载失败</h3><p>${esc(error?.message || String(error))}</p><button class="b3-button b3-button--text" data-retry>重新加载</button></div>`;
          this.element.querySelector("[data-retry]")?.addEventListener("click", () => { this.element.innerHTML = ""; app.mount(); });
        }
        plugin.refreshDock();
      },
      beforeDestroy() { this.__yeMindZenApp?.save(); },
      destroy() { if (this.__yeMindZenApp) { this.__yeMindZenApp.destroy(); plugin.apps.delete(this.__yeMindZenApp); } },
    });
    this.addDock({
      type: DOCK_TYPE,
      config: { position: "LeftBottom", size: { width: 250, height: 0 }, icon: ICON_ID, title: "YeMind Zen" },
      data: null,
      init() { plugin.dockElement = this.element; plugin.renderDock(); },
      destroy() { if (plugin.dockElement === this.element) plugin.dockElement = null; this.element.innerHTML = ""; },
    });
    this.addCommand({ langKey: "openYeMindZen", hotkey: "⌥⌘M", callback: () => this.openMap(this.state.activeMapId) });
    this.addCommand({ langKey: "newYeMindZen", callback: () => this.createAndOpenMap() });
    this.refreshOfficialMaps().catch((error) => console.warn("[yemind-zen] scan official maps failed", error));
  }

  onLayoutReady() {
    const top = this.addTopBar({ icon: ICON_ID, title: "YeMind Zen 思维导图", position: "right", callback: () => this.openTopMenu(top) });
    this.refreshDock();
  }

  getActiveApp() {
    const apps = [...(this.apps || [])];
    return apps.find((app) => app.mapId === this.state.activeMapId && !app.destroyed) || apps.find((app) => !app.destroyed) || null;
  }

  dialog(title, body, width = "560px") {
    const dialog = new Dialog({ title, content: `<div class="b3-dialog__content kmzs-plugin-dialog">${body}</div>`, width });
    const settings = this.state.settings;
    dialog.element.style.setProperty("--kmzs-bg", settings.background);
    dialog.element.style.setProperty("--kmzs-panel", settings.nodeColor);
    dialog.element.style.setProperty("--kmzs-text", settings.theme === "dark" ? "#e6edf3" : "#1f2937");
    dialog.element.style.setProperty("--kmzs-muted", settings.theme === "dark" ? "#9aa7b5" : "#667085");
    dialog.element.style.setProperty("--kmzs-border", settings.nodeBorder);
    dialog.element.style.setProperty("--kmzs-accent", settings.accent);
    return dialog;
  }

  applySettingsToApps() {
    for (const app of this.apps || []) {
      if (app.destroyed) continue;
      app.applySettingsTheme();
      app.applyDefaultViewModes();
      app.renderAll();
    }
    this.refreshDock();
  }

  async createAndOpenMap() {
    this.openCreateMapDialog(this.getActiveApp());
  }

  getCreationDefaults(entry = "general") {
    const settings = this.state.settings;
    const keys = {
      general: ["generalTheme", "generalTemplate"],
      dock: ["dockTheme", "dockTemplate"],
      document: ["docMapTheme", "generalTemplate"],
      docTree: ["docTreeTheme", "docTreeTemplate"],
      block: ["blockTheme", "blockTemplate"],
    };
    const [themeKey, templateKey] = keys[entry] || keys.general;
    let theme = settings[themeKey] || settings.generalTheme || "blue";
    if (theme === "inherit") theme = settings.generalTheme || "blue";
    let templateId = settings[templateKey] || "blank";
    if (templateId === "inherit") templateId = settings.generalTemplate || "blank";
    if (templateId !== "blank" && !(this.state.templates || []).some((item) => item.id === templateId)) templateId = "blank";
    return { theme, templateId };
  }

  openCreateMapDialog(sourceApp = null, entry = "general") {
    const presets = [
      ["light", "YeMind Default", "亮色"],
      ["blue", "YeMind Slate", "沉稳蓝"],
      ["paper", "Paper", "纸张"],
      ["green", "Forest", "绿色"],
      ["dark", "Midnight", "暗色"],
    ];
    const creationDefaults = this.getCreationDefaults(entry);
    const defaultTheme = creationDefaults.theme;
    let selected = THEME_PRESETS[defaultTheme] ? defaultTheme : (this.state.settings.theme === "dark" ? "dark" : "blue");
    const cards = presets.map(([id, name, label]) => {
      const p = THEME_PRESETS[id];
      return `<button type="button" class="kmzs-theme-card ${id === selected ? "is-selected" : ""}" data-create-theme="${id}"><span class="kmzs-theme-card__preview" style="--p-bg:${p.background};--p-node:${p.nodeColor};--p-border:${p.nodeBorder};--p-edge:${p.edgeColor};--p-accent:${p.accent}"><i></i><i></i><i></i><b></b></span><strong>${esc(name)}</strong><small>${esc(label)}</small></button>`;
    }).join("");
    const d = this.dialog("新建导图", `<div class="kmzs-create-map"><div class="kmzs-muted" style="margin-bottom:12px">创建一张独立可编辑的导图。</div><div class="kmzs-field"><label>名称</label><input class="kmzs-input" data-create-name value="YeMind" maxlength="80"><div class="kmzs-muted"><span data-create-count>5</span>/80</div></div><div class="kmzs-field"><label>主题</label><div class="kmzs-theme-grid">${cards}</div></div><div class="kmzs-field"><label>模板</label><select class="kmzs-select" data-create-template><option value="blank">空白导图</option>${(this.state.templates || []).map((template) => `<option value="${template.id}">${esc(template.name)}</option>`).join("")}</select></div><div class="kmzs-field"><label>布局</label><select class="kmzs-select" data-create-layout>${LAYOUTS.map(([value,label]) => `<option value="${value}">${label}</option>`).join("")}</select></div><div class="kmzs-row" style="justify-content:flex-end;margin-top:16px"><button class="b3-button b3-button--cancel" data-create-cancel>取消</button><button class="b3-button b3-button--text" data-create-submit>创建</button></div></div>`, "760px");
    const input = d.element.querySelector("[data-create-name]");
    const count = d.element.querySelector("[data-create-count]");
    const layout = d.element.querySelector("[data-create-layout]");
    const templateSelect = d.element.querySelector("[data-create-template]");
    layout.value = entry === "document" ? (this.state.settings.docMapLayout || this.state.settings.defaultLayout) : this.state.settings.defaultLayout;
    if (templateSelect) templateSelect.value = creationDefaults.templateId || "blank";
    input.addEventListener("input", () => { count.textContent = String(input.value.length); });
    d.element.querySelectorAll("[data-create-theme]").forEach((card) => card.addEventListener("click", () => {
      selected = card.dataset.createTheme;
      d.element.querySelectorAll("[data-create-theme]").forEach((item) => item.classList.toggle("is-selected", item === card));
    }));
    d.element.querySelector("[data-create-cancel]").onclick = () => d.destroy();
    const create = async () => {
      const title = input.value.trim();
      if (!title) { showMessage("请输入导图名称"); input.focus(); return; }
      const colors = THEME_PRESETS[selected] || THEME_PRESETS.light;
      const templateId = d.element.querySelector("[data-create-template]")?.value || "blank";
      const template = (this.state.templates || []).find((item) => item.id === templateId);
      const map = template ? this.createMapFromTemplate(template, title) : createMap(title, this.state.settings, { themePreset: selected, themeColors: colors });
      if (!template) { map.theme = selected; map.themeColors = clone(colors); }
      map.layout = layout.value || this.state.settings.defaultLayout;
      this.state.maps.push(map);
      this.state.activeMapId = map.id;
      this.pendingEdit = { mapId: map.id, nodeId: map.rootIds[0] };
      this.setActiveDock("mindmap", map.id);
      await this.persist();
      d.destroy();
      this.openMap(map.id);
    };
    d.element.querySelector("[data-create-submit]").onclick = create;
    input.addEventListener("keydown", (event) => { if (event.key === "Enter") create(); });
    setTimeout(() => { input.focus(); input.select(); }, 50);
  }

  createMapFromTemplate(template, title) {
    const source = clone(template.map);
    const ids = new Map();
    for (const id of Object.keys(source.nodes || {})) ids.set(id, uid("node"));
    const nodes = {};
    for (const [oldId, node] of Object.entries(source.nodes || {})) {
      const id = ids.get(oldId);
      nodes[id] = { ...node, id, parentId: node.parentId ? ids.get(node.parentId) : null, children: (node.children || []).map((child) => ids.get(child)).filter(Boolean), createdAt: now(), updatedAt: now() };
    }
    return { ...source, id: uid("map"), title, nodes, rootIds: (source.rootIds || []).map((id) => ids.get(id)).filter(Boolean), relations: [], summaries: [], createdAt: now(), updatedAt: now(), zenMode: null, readOnlyMode: null };
  }

  async saveCurrentMapAsTemplate(sourceApp = null) {
    const app = sourceApp || this.getActiveApp();
    if (!app?.map) { showMessage("请先打开一张自用导图"); return; }
    const name = window.prompt("模板名称", app.map.title);
    if (!name?.trim()) return;
    this.state.templates ||= [];
    this.state.templates.push({ id: uid("template"), name: name.trim(), map: clone(app.map), createdAt: now() });
    await this.persist();
    showMessage("模板已保存");
  }

  async refreshOfficialMaps(options = {}) {
    if (this.officialMapsLoading && !options.force) return this.officialMapsLoading;
    this.officialMapsLoading = (async () => {
      const maps = [];
      const seen = new Set();
      for (const root of OFFICIAL_KMIND_ROOTS) {
        let entries = [];
        try { entries = await readSiyuanDir(root); } catch { continue; }
        for (const entry of entries) {
          if (!entry?.isDir || !entry?.name) continue;
          const filePath = `${root}/${entry.name}/${OFFICIAL_PROJECT_FILE}`;
          try {
            const svg = await readSiyuanTextFile(filePath);
            const pkg = parseOfficialPackage(svg);
            if (!pkg?.header?.rootDocId || seen.has(pkg.header.rootDocId)) continue;
            const meta = pkg.header.documentsMeta?.[pkg.header.rootDocId] || {};
            const title = String(meta.title || entry.name || "YeMind").trim() || "YeMind";
            maps.push({ rootDocId: pkg.header.rootDocId, title, filePath, packageVersion: pkg.header.version, updatedAt: Number(pkg.header.updatedAt || entry.updated || 0) });
            seen.add(pkg.header.rootDocId);
          } catch (error) {
            console.warn("[yemind-zen] skip official map", filePath, error);
          }
        }
      }
      let visibleMaps = maps.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0) || a.title.localeCompare(b.title));
      const officialDockRows = [...document.querySelectorAll(".kmind-zen-dock__itemTitle")]
        .map((item) => String(item.title || item.textContent || "").trim())
        .filter(Boolean);
      if (officialDockRows.length) {
        const remaining = new Map();
        for (const title of officialDockRows) remaining.set(title, (remaining.get(title) || 0) + 1);
        visibleMaps = visibleMaps.filter((item) => {
          const count = remaining.get(item.title) || 0;
          if (!count) return false;
          remaining.set(item.title, count - 1);
          return true;
        });
      }
      this.officialMaps = visibleMaps;
      this.officialMapsLoaded = true;
      this.renderDock();
      return this.officialMaps;
    })().finally(() => { this.officialMapsLoading = null; });
    return this.officialMapsLoading;
  }

  async openOfficialMap(info) {
    if (!info?.rootDocId) return;
    try { await readSiyuanTextFile(info.filePath); }
    catch {
      this.officialMaps = this.officialMaps.filter((item) => item.rootDocId !== info.rootDocId);
      if (this.activeDockRef?.kind === "official" && this.activeDockRef.id === info.rootDocId) this.activeDockRef = null;
      this.renderDock();
      showMessage("该导图已在原版 YeMind Zen 中删除，列表已刷新", 2400, "error");
      return;
    }
    this.setActiveDock("official", info.rootDocId);
    openTab({
      app: this.app,
      custom: {
        id: OFFICIAL_TAB_ID,
        title: info.title || "YeMind",
        icon: "iconGraph",
        data: { rootDocId: info.rootDocId, createIfMissing: false },
      },
    });
  }

  setActiveDock(kind, id) {
    if (!id) return;
    if (kind === "mindmap" && !this.state.maps.some((map) => map.id === id)) return;
    if (kind === "official" && !this.officialMaps.some((map) => map.rootDocId === id)) return;
    this.activeDockRef = { kind, id };
    if (kind === "mindmap") this.state.activeMapId = id;
    this.renderDock();
  }

  syncDockFromTabPointer(event) {
    const tab = event.target?.closest?.('[data-type="tab-header"], .layout-tab-bar .item');
    if (!tab) return;
    const title = String(tab.querySelector?.('.item__text')?.textContent || tab.getAttribute?.("aria-label") || tab.title || "").trim();
    const iconRefs = [...tab.querySelectorAll?.("use") || []].map((use) => use.getAttribute("href") || use.getAttribute("xlink:href") || "").join(" ");
    if (iconRefs.includes(ICON_ID)) {
      const map = this.state.maps.find((item) => item.title === title) || this.state.maps.find((item) => item.id === this.state.activeMapId);
      if (map) this.setActiveDock("mindmap", map.id);
      return;
    }
    if (iconRefs.includes("iconGraph") || iconRefs.includes("iconKmindZen")) {
      const map = this.officialMaps.find((item) => item.title === title);
      if (map) this.setActiveDock("official", map.rootDocId);
    }
  }

  consumePendingEdit(app) {
    const pending = this.pendingEdit;
    if (!pending || !app || app.mapId !== pending.mapId) return;
    this.pendingEdit = null;
    setTimeout(() => app.beginEditNode(pending.nodeId, true), 30);
  }

  async copyMapLink(mapId) {
    const map = this.state.maps.find((item) => item.id === mapId);
    if (!map) return;
    const link = buildYeMindMapLink(map.id);
    try {
      await navigator.clipboard.writeText(link);
      showMessage("导图链接已复制", 1500, "info");
    } catch {
      const input = document.createElement("textarea");
      input.value = link; document.body.appendChild(input); input.select();
      const ok = document.execCommand("copy"); input.remove();
      showMessage(ok ? "导图链接已复制" : "复制失败", 1800, ok ? "info" : "error");
    }
  }

  async copyOfficialMapLink(rootDocId) {
    const map = this.officialMaps.find((item) => item.rootDocId === rootDocId);
    if (!map) return;
    const link = `siyuan://plugins/siyuan-kmind-zen?data=${encodeURIComponent(JSON.stringify({ schemaVersion: 1, rootDocId }))}`;
    try { await navigator.clipboard.writeText(link); showMessage("导图链接已复制", 1500, "info"); }
    catch { showMessage("复制失败", 1800, "error"); }
  }

  invokeOfficialDockAction(rootDocId, action) {
    const map = this.officialMaps.find((item) => item.rootDocId === rootDocId);
    if (!map) return;
    const rows = [...document.querySelectorAll(".kmind-zen-dock__item")];
    const row = rows.find((item) => {
      const titleButton = item.querySelector(".kmind-zen-dock__itemTitle");
      return String(titleButton?.title || titleButton?.textContent || "").trim() === map.title;
    });
    const labels = { rename: ["重命名", "Rename"], delete: ["删除", "Delete"] };
    const wanted = labels[action] || [];
    const button = row ? [...row.querySelectorAll("button")].find((item) => wanted.includes(item.getAttribute("aria-label")) || wanted.includes(item.title)) : null;
    if (!button) {
      showMessage("未找到官方 Dock 操作，请先启用并打开官方 YeMind Zen Dock", 2600, "error");
      return;
    }
    button.click();
    [500, 1200, 2500, 4500, 7000].forEach((delay) => setTimeout(() => this.refreshOfficialMaps({ force: true }), delay));
  }

  openRenameMapDialog(mapId) {
    const map = this.state.maps.find((item) => item.id === mapId);
    if (!map) return;
    const d = this.dialog("重命名导图", `<div class="kmzs-field"><label>名称</label><input class="kmzs-input" data-rename-map value="${esc(map.title)}" maxlength="80"></div><div class="kmzs-row" style="justify-content:flex-end;margin-top:16px"><button class="b3-button b3-button--cancel" data-rename-cancel>取消</button><button class="b3-button b3-button--text" data-rename-submit>保存</button></div>`, "460px");
    const input = d.element.querySelector("[data-rename-map]");
    const submit = async () => {
      const title = input.value.trim();
      if (!title) { showMessage("请输入导图名称"); input.focus(); return; }
      map.title = title; map.updatedAt = now();
      await this.persist();
      this.applySettingsToApps();
      this.updateYeMindTabTitle(title, map.id);
      d.destroy();
    };
    d.element.querySelector("[data-rename-cancel]").onclick = () => d.destroy();
    d.element.querySelector("[data-rename-submit]").onclick = submit;
    input.addEventListener("keydown", (event) => { if (event.key === "Enter") submit(); });
    setTimeout(() => { input.focus(); input.select(); }, 30);
  }

  updateYeMindTabTitle(title, mapId) {
    if (mapId !== this.state.activeMapId) return;
    setTimeout(() => {
      document.querySelectorAll('[data-type="tab-header"], .layout-tab-bar .item').forEach((tab) => {
        const refs = [...tab.querySelectorAll("use")].map((use) => use.getAttribute("href") || use.getAttribute("xlink:href") || "").join(" ");
        if (!refs.includes(ICON_ID)) return;
        const text = tab.querySelector(".item__text");
        if (text) { text.textContent = title; text.title = title; }
      });
    }, 30);
  }

  confirmDeleteMap(mapId) {
    const map = this.state.maps.find((item) => item.id === mapId);
    if (!map) return;
    const d = this.dialog("删除导图", `<p style="margin:0 0 8px">确认删除“${esc(map.title)}”？</p><p class="kmzs-muted" style="margin:0">删除后可从回收站恢复；允许删除最后一张自用导图。</p><div class="kmzs-row" style="justify-content:flex-end;margin-top:18px"><button class="b3-button b3-button--cancel" data-delete-cancel>取消</button><button class="b3-button b3-button--text kmzs-delete-confirm" data-delete-submit>删除</button></div>`, "460px");
    d.element.querySelector("[data-delete-cancel]").onclick = () => d.destroy();
    d.element.querySelector("[data-delete-submit]").onclick = async () => { d.destroy(); await this.deleteMapById(mapId, { confirmed: true }); };
  }

  async deleteMapById(mapId, options = {}) {
    const map = this.state.maps.find((item) => item.id === mapId);
    if (!map) return;
    if (!options.confirmed) { this.confirmDeleteMap(mapId); return; }
    const index = this.state.maps.findIndex((item) => item.id === mapId);
    const [removed] = this.state.maps.splice(index, 1);
    this.state.trash.unshift({ ...removed, deletedAt: now() });
    if (this.state.activeMapId === mapId) this.state.activeMapId = this.state.maps[Math.max(0, index - 1)]?.id || this.state.maps[0]?.id || null;
    this.activeDockRef = this.state.activeMapId ? { kind: "mindmap", id: this.state.activeMapId } : null;
    await this.persist();
    const app = this.getActiveApp();
    if (app && app.mapId === mapId) {
      if (this.state.activeMapId) this.openMap(this.state.activeMapId);
      else {
        app.destroy();
        this.apps.delete(app);
        app.host.innerHTML = `<div class="kmzs-load-error"><h3>暂无自用导图</h3><p>可以从左侧 Dock 新建导图，原版 YeMind Zen 导图仍可直接打开。</p><button class="b3-button b3-button--text" data-empty-new>新建导图</button></div>`;
        app.host.querySelector("[data-empty-new]")?.addEventListener("click", () => this.openCreateMapDialog(null, "dock"));
        this.closeYeMindTabs();
      }
    } else this.applySettingsToApps();
  }

  closeYeMindTabs() {
    document.querySelectorAll('[data-type="tab-header"], .layout-tab-bar .item').forEach((tab) => {
      const refs = [...tab.querySelectorAll("use")].map((use) => use.getAttribute("href") || use.getAttribute("xlink:href") || "").join(" ");
      if (!refs.includes(ICON_ID)) return;
      const close = tab.querySelector('.item__close, [data-type="close"]');
      close?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  }

  renderDock() {
    if (!this.dockElement) return;
    const ownMaps = (this.state.maps || []).map((map) => ({ kind: "mindmap", id: map.id, title: map.title, updatedAt: Number(map.updatedAt || 0), map }));
    const officialMaps = (this.officialMaps || []).map((map) => ({ kind: "official", id: map.rootDocId, title: map.title, updatedAt: Number(map.updatedAt || 0), map }));
    const rows = [...officialMaps, ...ownMaps]
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0) || a.title.localeCompare(b.title))
      .map((item) => {
        const active = this.activeDockRef?.kind === item.kind && this.activeDockRef?.id === item.id;
        const openAttr = item.kind === "official" ? `data-kmzs-official-map="${esc(item.id)}"` : `data-kmzs-dock-map="${esc(item.id)}"`;
        const copyAttr = item.kind === "official" ? `data-kmzs-official-copy="${esc(item.id)}"` : `data-kmzs-dock-copy="${esc(item.id)}"`;
        const editAttr = item.kind === "mindmap" ? `data-kmzs-dock-rename="${esc(item.id)}"` : `data-kmzs-official-rename="${esc(item.id)}"`;
        const deleteAttr = item.kind === "mindmap" ? `data-kmzs-dock-delete="${esc(item.id)}"` : `data-kmzs-official-delete="${esc(item.id)}"`;
        const rowActions = `<button type="button" class="b3-list-item__action b3-tooltips b3-tooltips__w kmzs-dock__row-action" aria-label="重命名" title="重命名" ${editAttr}><svg><use xlink:href="#iconEdit"></use></svg></button><button type="button" class="b3-list-item__action b3-tooltips b3-tooltips__w kmzs-dock__row-action kmzs-dock__row-action--danger" aria-label="删除" title="删除" ${deleteAttr}><svg><use xlink:href="#iconTrashcan"></use></svg></button>`;
        return `<li class="b3-list-item b3-list-item--narrow b3-list-item--hide-action kmzs-dock__item ${active ? "kmzs-dock__item--active" : ""}" ${openAttr}><button aria-label="打开导图" class="b3-list-item__text fn__ellipsis kmzs-dock__item-title" title="${esc(item.title)}" type="button">${esc(item.title)}</button><span class="fn__space"></span><button type="button" class="b3-list-item__action b3-tooltips b3-tooltips__w kmzs-dock__row-action" aria-label="复制链接" title="复制链接" ${copyAttr}><svg><use xlink:href="#iconCopy"></use></svg></button>${rowActions}</li>`;
      }).join("");
    const status = !this.officialMapsLoaded ? `<div class="kmzs-dock__loading">正在读取导图…</div>` : (!rows ? `<div class="kmzs-dock__empty">暂无导图</div>` : "");
    this.dockElement.innerHTML = `<div class="kmzs-dock"><div class="kmzs-dock__head block__icons"><div class="block__logo fn__flex-1"><span class="fn__ellipsis">YeMind Zen</span></div><button class="block__icon b3-tooltips__sw" aria-label="收起" data-type="min" data-kmzs-dock-action="collapse"><svg><use xlink:href="#iconMin"></use></svg></button><button class="block__icon b3-tooltips__sw" aria-label="新建导图" data-kmzs-dock-action="new"><svg><use xlink:href="#iconAdd"></use></svg></button><button class="block__icon b3-tooltips__sw" aria-label="刷新" data-kmzs-dock-action="refresh"><svg><use xlink:href="#iconRefresh"></use></svg></button></div><div class="kmzs-dock__body">${rows ? `<ul class="b3-list b3-list--background kmzs-dock__list">${rows}</ul>` : status}</div></div>`;
    this.dockElement.onclick = (event) => {
      const target = event.target.closest("button, [data-kmzs-dock-map], [data-kmzs-official-map]");
      if (!target) return;
      const action = target.closest("[data-kmzs-dock-action]")?.dataset.kmzsDockAction;
      if (action === "new") { this.openCreateMapDialog(this.getActiveApp(), "dock"); return; }
      if (action === "refresh") { this.refreshOfficialMaps({ force: true }); return; }
      const copy = target.closest("[data-kmzs-dock-copy]")?.dataset.kmzsDockCopy;
      if (copy) { event.stopPropagation(); this.copyMapLink(copy); return; }
      const officialCopy = target.closest("[data-kmzs-official-copy]")?.dataset.kmzsOfficialCopy;
      if (officialCopy) { event.stopPropagation(); this.copyOfficialMapLink(officialCopy); return; }
      const rename = target.closest("[data-kmzs-dock-rename]")?.dataset.kmzsDockRename;
      if (rename) { event.stopPropagation(); this.openRenameMapDialog(rename); return; }
      const officialRename = target.closest("[data-kmzs-official-rename]")?.dataset.kmzsOfficialRename;
      if (officialRename) { event.stopPropagation(); this.invokeOfficialDockAction(officialRename, "rename"); return; }
      const remove = target.closest("[data-kmzs-dock-delete]")?.dataset.kmzsDockDelete;
      if (remove) { event.stopPropagation(); this.confirmDeleteMap(remove); return; }
      const officialDelete = target.closest("[data-kmzs-official-delete]")?.dataset.kmzsOfficialDelete;
      if (officialDelete) { event.stopPropagation(); this.invokeOfficialDockAction(officialDelete, "delete"); return; }
      const mindmapRow = target.closest("[data-kmzs-dock-map]");
      if (mindmapRow) { this.openMap(mindmapRow.dataset.kmzsDockMap); return; }
      const officialRow = target.closest("[data-kmzs-official-map]");
      if (officialRow) { const info = this.officialMaps.find((map) => map.rootDocId === officialRow.dataset.kmzsOfficialMap); if (info) this.openOfficialMap(info); }
    };
  }

  refreshDock() { this.renderDock(); }

  openQuickStart() {
    const d = this.dialog("快速开始", `<div class="kmzs-guide">
      <div class="kmzs-guide__brand">${BRAND_ICON}<div><h2>YeMind Zen</h2><div class="kmzs-muted">三步开始整理思路</div></div></div>
      <ol class="kmzs-guide__steps"><li><b>新建或打开导图</b><span>从顶栏 K 菜单或左侧 Dock 进入。</span></li><li><b>编辑结构</b><span>双击编辑；Tab 添加子节点；Enter 添加同级节点。</span></li><li><b>切换视图</b><span>导图、大纲和分屏使用同一份数据。</span></li></ol>
      <div class="kmzs-row" style="justify-content:flex-end"><button class="b3-button b3-button--outline" data-guide="open">打开当前导图</button><button class="b3-button b3-button--text" data-guide="new">新建导图</button></div>
    </div>`, "580px");
    d.element.querySelector('[data-guide="open"]').onclick = () => { d.destroy(); this.openMap(this.state.activeMapId); };
    d.element.querySelector('[data-guide="new"]').onclick = () => { d.destroy(); this.createAndOpenMap(); };
  }

  openUpdates() {
    this.dialog("查看更新", `<div class="kmzs-update-list"><h3>v${APP_VERSION}</h3><ul><li>允许删除最后一张自用导图，并自动清理原版已删除导图的 Dock 残留。</li><li>节点右键菜单改用思源原生 Menu，修复菜单越界和样式问题。</li><li>修复富文本格式、颜色、链接、挖空与公式的选区写回。</li><li>新增可靠的禅模式退出入口和浮动状态栏。</li></ul><h3>v0.3.5</h3><ul><li>修复 Dock 当前项同步、复制链接、重命名和删除确认。</li><li>简化导图编辑界面并修复双击编辑、创建后立即编辑。</li></ul><h3>v0.3.4</h3><ul><li>重构常规设置，加入视图模式、画布习惯、节点入口、图片压缩、预览清晰度与创建默认值。</li><li>新增完整快捷键管理：查看、录制、禁用、恢复默认和冲突提示。</li><li>新增框选、Space 平移、节点轻量入口、子导图和模板库基础能力。</li></ul><h3>v0.3.3</h3><ul><li>修复重复标签页并直接调用原版编辑器打开官方导图。</li></ul><h3>v0.3.1</h3><ul><li>文档卡富预览、镜像冲突处理和文档树同步。</li></ul><h3>v0.3.0</h3><ul><li>新增思源文档卡、块卡、镜像、节点子文档与文档树导图。</li></ul><h3>v0.2.0</h3><ul><li>加入左侧 Dock、顶部 K 菜单和完整设置入口。</li></ul><h3>v0.1.0</h3><ul><li>建立独立导图、大纲、富文本、导入导出和本地数据基础。</li></ul></div>`, "620px");
  }

  async openInteractiveGuide() {
    let map = this.state.maps.find((item) => item.guideVersion === 1);
    if (!map) {
      map = createMap("YeMind Zen 交互式引导", this.state.settings);
      map.guideVersion = 1;
      const root = map.nodes[map.rootIds[0]];
      root.html = "YeMind Zen 交互式引导";
      const topics = [
        ["双击节点编辑文字", ["选中文字可使用富文本工具栏", "支持挖空与公式"]],
        ["使用快捷键整理结构", ["Tab 添加子节点", "Enter 添加同级节点", "Delete 删除节点"]],
        ["拖动节点调整层级", ["拖到其他节点上改变父子关系", "拖动节点右侧调整宽度"]],
        ["切换导图、大纲与分屏", ["三种视图共用同一份数据", "可在大纲中继续编辑"]],
      ];
      root.children = [];
      for (const [title, children] of topics) {
        const parent = createNode(title, root.id, this.state.settings);
        map.nodes[parent.id] = parent; root.children.push(parent.id);
        for (const text of children) { const child = createNode(text, parent.id, this.state.settings); map.nodes[child.id] = child; parent.children.push(child.id); }
      }
      this.state.maps.push(map);
      await this.persist();
    }
    this.openMap(map.id);
    showMessage("已打开交互式引导，按提示尝试编辑和拖动节点");
  }

  openThemeDesignerDialog() {
    const s = this.state.settings;
    const d = this.dialog("主题设计器", `<div class="kmzs-field"><label>主题预设</label><select class="kmzs-select" data-role="preset">${Object.keys(THEME_PRESETS).map((key) => `<option value="${key}">${key}</option>`).join("")}</select></div>${[["background","画布背景"],["nodeColor","节点背景"],["nodeBorder","节点边框"],["edgeColor","连线颜色"],["accent","强调色"]].map(([key,label]) => `<div class="kmzs-setting-row"><div class="kmzs-setting-title">${label}</div><input type="color" data-role="theme-${key}" value="${s[key]}"></div>`).join("")}<div class="kmzs-row" style="justify-content:flex-end;margin-top:12px"><button class="b3-button b3-button--outline" data-role="export-theme">导出主题</button><button class="b3-button b3-button--text" data-role="apply-theme">应用</button></div>`, "520px");
    const select = d.element.querySelector('[data-role="preset"]');
    select.value = s.theme === "dark" ? "dark" : "green";
    select.onchange = () => { const preset = THEME_PRESETS[select.value]; for (const key of ["background","nodeColor","nodeBorder","edgeColor","accent"]) d.element.querySelector(`[data-role="theme-${key}"]`).value = preset[key]; };
    d.element.querySelector('[data-role="apply-theme"]').onclick = async () => { for (const key of ["background","nodeColor","nodeBorder","edgeColor","accent"]) s[key] = d.element.querySelector(`[data-role="theme-${key}"]`).value; s.theme = select.value === "dark" ? "dark" : "light"; this.applySettingsToApps(); await this.persist(); d.destroy(); };
    d.element.querySelector('[data-role="export-theme"]').onclick = () => { const theme = {}; for (const key of ["background","nodeColor","nodeBorder","edgeColor","accent"]) theme[key] = d.element.querySelector(`[data-role="theme-${key}"]`).value; downloadBlob(new Blob([JSON.stringify(theme, null, 2)], { type: "application/json" }), "kmind-mindmap-theme.json"); };
  }

  openSettingsDialog(sourceApp = null) {
    const s = clone(this.state.settings);
    s.shortcuts = { ...DEFAULT_SHORTCUTS, ...(this.state.settings.shortcuts || {}) };
    const d = this.dialog("YeMind Zen 设置", `<div class="kmzs-settings kmzs-settings--full"><nav class="kmzs-settings-nav"><div class="kmzs-settings-nav__label">设置</div><button data-settings-tab="general" class="is-active">常规</button><button data-settings-tab="shortcuts">快捷键</button></nav><section class="kmzs-settings-panel" data-settings-panel></section></div>`, "980px");
    const panel = d.element.querySelector("[data-settings-panel]");
    const apply = async (reason = "设置") => { this.state.settings = clone(s); this.applySettingsToApps(); for (const app of this.apps || []) app.startSiyuanRefreshTimer?.(); await this.persist(); sourceApp?.save(reason); };
    const check = (key, label, desc) => `<label class="kmzs-setting-check"><span><b>${label}</b><small>${desc}</small></span><input type="checkbox" data-setting="${key}" ${s[key] ? "checked" : ""}></label>`;
    const select = (key, options) => `<select class="kmzs-select" data-setting="${key}">${options.map(([value,label]) => `<option value="${value}">${label}</option>`).join("")}</select>`;
    const card = (title, body, desc = "") => `<section class="kmzs-setting-card"><div class="kmzs-setting-card__head"><h3>${title}</h3>${desc ? `<p>${desc}</p>` : ""}</div>${body}</section>`;
    const themeOptions = [["inherit","跟随通用默认值"],["light","YeMind Default"],["blue","YeMind Slate"],["paper","Paper"],["green","Forest"],["dark","Midnight"]];
    const templateOptions = () => [["blank","空白导图"], ...(this.state.templates || []).map((item) => [item.id,item.name])];
    const renderGeneral = () => {
      panel.innerHTML = [
        card("默认视图模式", `${check("defaultZenMode","默认禅模式","隐藏顶部、左侧和底部工具栏；项目显式设置优先生效。")}${check("defaultReadOnlyMode","默认只读模式","禁止编辑，仍允许平移、缩放和展开折叠；项目显式设置优先。")}`, "当项目没有单独设置禅模式或只读模式时使用。"),
        card("画布操作习惯", `<div class="kmzs-setting-line"><div><b>画布拖拽习惯</b><small>应用到所有 YeMind Zen 标签页。</small></div>${select("canvasDrag", [["pan","平移优先"],["select","选择优先（推荐）"]])}</div><div class="kmzs-setting-help"><b>${s.canvasDrag === "select" ? "选择优先" : "平移优先"}：</b>${s.canvasDrag === "select" ? "空白处左键拖拽框选；按 Space + 左键拖拽平移。" : "空白处左键拖拽平移；按 Ctrl/Cmd 拖拽框选。"}</div><div class="kmzs-setting-line"><div><b>滚轮行为</b><small>作用于空白画布上的鼠标滚轮和触控板。</small></div>${select("wheelBehavior", [["directZoom","直接缩放"],["panZoom","滚轮平移，按 Ctrl/Cmd 缩放"],["disabled","关闭滚轮缩放"]])}</div><div class="kmzs-setting-help"><b>说明：</b>直接缩放以光标位置为锚点；平移模式支持 Shift 横向平移；关闭后仍可使用按钮、快捷键与捏合手势。</div>`),
        card("节点入口控件", `${check("showAddChildButton","显示添加子节点按钮","节点激活后显示轻量 + 按钮。")}${check("showNodeMenuButton","显示节点菜单按钮","节点激活后显示轻量菜单按钮。")}`),
        card("图片压缩", `${check("compressInsertedImages","自动压缩插入图片","新增 PNG/JPEG/WebP/AVIF 保存前转换为 WebP；SVG 和 GIF 保留原格式。")}`),
        card("块导图预览", `<div class="kmzs-setting-line"><div><b>预览图清晰度</b><small>下次块导图保存并刷新预览时生效。</small></div>${select("blockPreviewScale", [["1x","小图 (1x)"],["2x","清晰 (2x)"],["3x","高清 (3x)"]])}</div>`),
        card("新建导图默认值", `<div class="kmzs-default-grid"><div class="kmzs-default-box"><h4>通用默认值</h4><p>没有单独设置的创建入口会跟随这里。</p><label>通用主题${select("generalTheme", themeOptions.filter(([v]) => v !== "inherit"))}</label><label>通用模板${select("generalTemplate", templateOptions())}</label></div><div class="kmzs-default-box"><h4>文档转导图</h4><p>控制思源文档打开为导图时的结构和排版。</p><label>主题${select("docMapTheme", themeOptions)}</label><label>结构${select("docMapStructure", [["heading-outline","标题大纲"],["block-tree","块层级"],["flat","扁平列表"]])}</label><label>布局${select("docMapLayout", LAYOUTS)}</label>${check("docMapCompact","紧凑模式","大文档使用更紧凑的节点间距。")}</div></div><div class="kmzs-default-grid kmzs-default-grid--three"><div class="kmzs-default-box"><h4>文档树导图 <span>文档树</span></h4><label>主题${select("docTreeTheme", themeOptions)}</label><label>模板${select("docTreeTemplate", templateOptions())}</label></div><div class="kmzs-default-box"><h4>Dock 导图 <span>Dock</span></h4><label>主题${select("dockTheme", themeOptions)}</label><label>模板${select("dockTemplate", templateOptions())}</label></div><div class="kmzs-default-box"><h4>块导图 <span>块</span></h4><label>主题${select("blockTheme", themeOptions)}</label><label>模板${select("blockTemplate", templateOptions())}</label></div></div>`),
        card("模板库", `<div class="kmzs-template-list">${(this.state.templates || []).map((item) => `<div class="kmzs-template-row"><span>${esc(item.name)}</span><button class="b3-button b3-button--cancel" data-delete-template="${item.id}">删除</button></div>`).join("") || `<div class="kmzs-muted">还没有模板。可以先把当前自用导图保存为模板。</div>`}</div><button class="b3-button b3-button--outline" data-save-template>将当前导图保存为模板</button>`, "已有导图保存为私有模板；新导图会克隆模板，不会修改模板本身。"),
        card("思源与导出", `<div class="kmzs-default-grid"><div class="kmzs-default-box"><h4>思源内容</h4>${check("liveSiyuanPreview","实时预览","自动刷新文档卡和块卡摘要。")}${check("mirrorRefreshOnOpen","打开时刷新镜像","打开导图后同步镜像内容。")}${check("docTreeUpdateLocalTitles","刷新文档树时更新本地标题","思源标题覆盖本地标题。")}</div><div class="kmzs-default-box"><h4>导出与外观</h4><label>PNG 倍率<input class="kmzs-input" type="number" min="1" max="4" data-setting="exportScale" value="${s.exportScale}"></label>${check("exportBackground","导出背景","SVG 和 PNG 包含画布背景。")}</div></div>`),
        card("交互式引导", `<button class="b3-button b3-button--text" data-open-guide>开始交互式引导</button>`, "打开专用练习导图，学习编辑、快捷键、节点菜单和画布手势。"),
        card("数据", `<div class="kmzs-row kmzs-data-actions"><button class="b3-button b3-button--outline" data-data-action="backup">导出全部数据</button><button class="b3-button b3-button--outline" data-data-action="restore">导入全部数据</button><button class="b3-button b3-button--cancel" data-data-action="reset-settings">恢复默认设置</button></div>`),
        `<div class="kmzs-settings-footer"><button class="b3-button b3-button--cancel" data-settings-cancel>取消</button><button class="b3-button b3-button--text" data-settings-save>保存</button></div>`,
      ].join("");
      panel.querySelectorAll("[data-setting]").forEach((el) => { const key = el.dataset.setting; if (el.type !== "checkbox" && el.type !== "color") el.value = s[key] ?? el.value; el.onchange = () => { s[key] = el.type === "checkbox" ? el.checked : (el.type === "number" ? Number(el.value) : el.value); renderGeneral(); }; });
      panel.querySelector("[data-save-template]")?.addEventListener("click", async () => { await this.saveCurrentMapAsTemplate(sourceApp); renderGeneral(); });
      panel.querySelectorAll("[data-delete-template]").forEach((button) => button.onclick = async () => { this.state.templates = (this.state.templates || []).filter((item) => item.id !== button.dataset.deleteTemplate); await this.persist(); renderGeneral(); });
      panel.querySelector("[data-open-guide]")?.addEventListener("click", () => { d.destroy(); this.openInteractiveGuide(); });
      panel.querySelector('[data-data-action="backup"]')?.addEventListener("click", () => downloadBlob(new Blob([JSON.stringify(this.state, null, 2)], { type: "application/json" }), "kmind-mindmap-backup.json"));
      panel.querySelector('[data-data-action="restore"]')?.addEventListener("click", () => this.restoreAllDataFromFile(d));
      panel.querySelector('[data-data-action="reset-settings"]')?.addEventListener("click", () => { const defaults = clone(DEFAULT_SETTINGS); for (const key of Object.keys(s)) delete s[key]; Object.assign(s, defaults, { shortcuts: cloneShortcutDefaults() }); renderGeneral(); });
      panel.querySelector("[data-settings-cancel]")?.addEventListener("click", () => d.destroy());
      panel.querySelector("[data-settings-save]")?.addEventListener("click", async () => { await apply("常规设置"); d.destroy(); });
    };
    const renderShortcuts = () => {
      let editing = false;
      let draft = { ...DEFAULT_SHORTCUTS, ...(s.shortcuts || {}) };
      let capturing = null;
      const draw = () => {
        const conflicts = shortcutConflicts(draft);
        panel.innerHTML = `<section class="kmzs-shortcuts-card"><div class="kmzs-shortcuts-head"><div><h3>快捷键</h3><p>全局配置 YeMind Zen 快捷键，保存后对所有自用导图标签页生效。</p></div><div>${editing ? `<button class="b3-button b3-button--cancel" data-shortcut-cancel>取消</button><button class="b3-button b3-button--text" data-shortcut-save>保存</button>` : `<button class="b3-button b3-button--outline" data-shortcut-edit>编辑</button>`}</div></div><div class="kmzs-shortcut-list">${SHORTCUT_SECTIONS.map(([section,items]) => `<h4>${section}</h4>${items.map(([id,label,hint]) => `<div class="kmzs-shortcut-row ${conflicts.has(id) ? "has-conflict" : ""}"><div><b>${label}</b>${hint ? `<small>${hint}</small>` : ""}<code>${esc(draft[id] || "已禁用")}</code></div>${editing ? `<div class="kmzs-shortcut-actions"><button data-record-shortcut="${id}">${capturing === id ? "请按快捷键…" : "录制"}</button><button data-disable-shortcut="${id}">禁用</button><button data-reset-shortcut="${id}">恢复默认</button></div>` : ""}</div>`).join("")}`).join("")}</div>${editing ? `<div class="kmzs-shortcuts-foot"><button class="b3-button b3-button--cancel" data-shortcut-cancel>取消</button><button class="b3-button b3-button--text" data-shortcut-save>保存</button></div>` : ""}</section>`;
        panel.querySelector("[data-shortcut-edit]")?.addEventListener("click", () => { editing = true; draft = { ...DEFAULT_SHORTCUTS, ...(s.shortcuts || {}) }; draw(); });
        panel.querySelectorAll("[data-shortcut-cancel]").forEach((button) => button.onclick = () => { editing = false; capturing = null; draw(); });
        panel.querySelectorAll("[data-shortcut-save]").forEach((button) => button.onclick = async () => { s.shortcuts = { ...draft }; editing = false; capturing = null; await apply("快捷键"); draw(); });
        panel.querySelectorAll("[data-record-shortcut]").forEach((button) => button.onclick = () => { capturing = button.dataset.recordShortcut; draw(); panel.focus(); });
        panel.querySelectorAll("[data-disable-shortcut]").forEach((button) => button.onclick = () => { draft[button.dataset.disableShortcut] = ""; draw(); });
        panel.querySelectorAll("[data-reset-shortcut]").forEach((button) => button.onclick = () => { draft[button.dataset.resetShortcut] = DEFAULT_SHORTCUTS[button.dataset.resetShortcut] || ""; draw(); });
      };
      const capture = (event) => { if (!capturing) return; event.preventDefault(); event.stopPropagation(); const value = shortcutFromEvent(event); if (!value) return; draft[capturing] = value; capturing = null; draw(); };
      panel.tabIndex = -1;
      panel.onkeydown = capture;
      draw();
    };
    const activate = (tab) => { d.element.querySelectorAll("[data-settings-tab]").forEach((button) => button.classList.toggle("is-active", button.dataset.settingsTab === tab)); if (tab === "shortcuts") renderShortcuts(); else renderGeneral(); };
    d.element.querySelectorAll("[data-settings-tab]").forEach((button) => button.onclick = () => activate(button.dataset.settingsTab));
    activate("general");
  }

  restoreAllDataFromFile(dialog = null) {
    const input = document.createElement("input"); input.type = "file"; input.accept = ".json";
    input.onchange = async () => { const file = input.files?.[0]; if (!file) return; try { const data = JSON.parse(await file.text()); if (!Array.isArray(data.maps)) throw new Error("备份格式不正确"); this.state = { ...defaultState(), ...data, templates: Array.isArray(data.templates) ? data.templates : [], settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}), shortcuts: { ...DEFAULT_SHORTCUTS, ...(data.settings?.shortcuts || {}) } } }; this.applySettingsToApps(); await this.persist(); this.refreshDock(); dialog?.destroy(); } catch (error) { showMessage(`恢复失败：${error.message}`); } };
    input.click();
  }

  openAboutDialog() {
    this.dialog("关于", `<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">${BRAND_ICON}<div><h2 style="margin:0">YeMind Zen 思维导图</h2><div class="kmzs-muted">v${APP_VERSION}</div></div></div><p>独立、本地优先的思源思维导图插件。</p><p>导图、大纲和分屏共用同一份数据模型。</p>`, "500px");
  }

  normalizeState(data) {
    const base = defaultState();
    if (!data || typeof data !== "object") return base;
    const state = { ...base, ...data, templates: Array.isArray(data.templates) ? data.templates : [], settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}), shortcuts: { ...DEFAULT_SHORTCUTS, ...(data.settings?.shortcuts || {}) } } };
    if (!Array.isArray(state.maps)) state.maps = base.maps;
    state.trash ||= []; state.pinned ||= []; state.checkpoints ||= {}; state.templates ||= []; state.migrations ||= {};
    if (state.settings.wheelBehavior === "zoom") state.settings.wheelBehavior = "directZoom";
    if (state.settings.wheelBehavior === "pan") state.settings.wheelBehavior = "panZoom";
    state.settings.shortcuts = { ...DEFAULT_SHORTCUTS, ...(state.settings.shortcuts || {}) };
    if (!state.migrations.directOfficialOpenV033) {
      const importedCopies = state.maps.filter((map) => map?.officialSource?.rootDocId);
      if (importedCopies.length) {
        const importedIds = new Set(importedCopies.map((map) => map.id));
        state.maps = state.maps.filter((map) => !importedIds.has(map.id));
        state.trash.unshift(...importedCopies.map((map) => ({ ...map, deletedAt: now(), migrationReason: "v0.3.2 原版导图副本已停用" })));
      }
      state.migrations.directOfficialOpenV033 = true;
    }
    for (const map of state.maps) {
      map.layout ||= state.settings.defaultLayout; map.view ||= state.settings.defaultView; map.relations ||= []; map.summaries ||= []; map.rootIds ||= []; map.theme ||= "inherit"; map.themeColors ||= null; if (!("zenMode" in map)) map.zenMode = null; if (!("readOnlyMode" in map)) map.readOnlyMode = null;
      for (const node of Object.values(map.nodes || {})) {
        node.children ||= []; node.comments ||= []; node.todos ||= []; node.links ||= []; node.tags ||= []; node.icons ||= []; node.images ||= []; node.style ||= {}; node.subdocs ||= []; node.siyuan ||= null; node.width ||= state.settings.defaultNodeWidth;
        if (node.siyuan) {
          if (map.sourceDocId && node.siyuan.kind === "doc") node.siyuan.treeManaged = true;
          node.siyuan.cardView ||= state.settings.siyuanCardView || "rich";
          node.siyuan.sourceTitle ||= node.siyuan.title || "";
          node.siyuan.sourceText ||= node.siyuan.preview || node.siyuan.title || "";
          node.siyuan.sourceHash ||= hashText(node.siyuan.sourceText);
          if (node.siyuan.mode === "mirror") { node.siyuan.appliedText ||= nodePlainText(node); node.siyuan.appliedHash ||= hashText(node.siyuan.appliedText); node.siyuan.localHash ||= hashText(nodePlainText(node)); }
          node.siyuan.syncStatus ||= node.siyuan.error ? "error" : "synced";
          node.siyuan.conflict ||= null;
        }
      }
    }
    state.activeMapId = state.maps.some((m) => m.id === state.activeMapId) ? state.activeMapId : (state.maps[0]?.id || null);
    return state;
  }

  async persist() { await this.saveData(STORAGE_NAME, this.state); this.refreshDock(); }

  openMap(mapId) {
    const map = this.state.maps.find((item) => item.id === mapId) || this.state.maps[0];
    if (!map) { this.openCreateMapDialog(this.getActiveApp(), "dock"); return; }
    this.state.activeMapId = map.id;
    this.setActiveDock("mindmap", map.id);
    const liveApp = [...(this.apps || [])].find((app) => !app.destroyed);
    if (liveApp) {
      liveApp.mapId = map.id;
      liveApp.selectedIds.clear();
      liveApp.editingId = null;
      liveApp.history = [];
      liveApp.redoStack = [];
      liveApp.applySettingsTheme();
      liveApp.applyDefaultViewModes();
      liveApp.renderAll();
      setTimeout(() => { liveApp.fitView(); this.consumePendingEdit(liveApp); }, 40);
    }
    openTab({ app: this.app, custom: { icon: ICON_ID, title: map.title, data: { mapId: map.id }, id: `${this.name}${TAB_TYPE}` } });
    this.updateYeMindTabTitle(map.title, map.id);
  }

  openTopMenu(anchor) {
    const menu = new Menu("yeMindZenTopbar");
    menu.addItem({ icon: ICON_ID, label: this.state.activeMapId ? "打开当前导图" : "新建第一张导图", click: () => this.openMap(this.state.activeMapId) });
    menu.addItem({ icon: "iconAdd", label: "新建导图", click: () => this.createAndOpenMap() });
    menu.addSeparator();
    for (const map of (this.officialMaps || []).slice(0, 10)) menu.addItem({ icon: "iconGraph", label: map.title, click: () => this.openOfficialMap(map) });
    for (const map of this.state.maps.slice(0, 10)) menu.addItem({ icon: ICON_ID, label: map.title, click: () => this.openMap(map.id) });
    menu.addSeparator();
    menu.addItem({ icon: "iconSettings", label: "设置", click: () => this.openSettingsDialog(this.getActiveApp()) });
    menu.addItem({ icon: ICON_ID, label: "快速开始", click: () => this.openQuickStart() });
    menu.addItem({ icon: "iconRefresh", label: "查看更新", click: () => this.openUpdates() });
    menu.addItem({ icon: ICON_ID, label: "交互式引导", click: () => this.openInteractiveGuide() });
    menu.addItem({ icon: ICON_ID, label: "主题设计器", click: () => this.openThemeDesignerDialog() });
    menu.addSeparator();
    menu.addItem({ icon: ICON_ID, label: "关于", click: () => this.openAboutDialog() });
    const rect = anchor.getBoundingClientRect();
    menu.open({ x: rect.left, y: rect.bottom, isLeft: false });
  }

  async onunload() {
    document.removeEventListener("pointerdown", this.onDocumentTabPointer, true);
    if (this.onProtocolOpen) this.eventBus?.off?.("open-siyuan-url-plugin", this.onProtocolOpen);
    for (const app of this.apps || []) { await app.save(); app.destroy(); }
    this.apps?.clear();
  }
}

module.exports = YeMindZenPlugin;
