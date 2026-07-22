import { describe, expect, it } from "vitest";
import { resolveOutlinePointerDropIntent } from "../../../src/editor/outlineDrag";
import fs from "node:fs";
import path from "node:path";

describe("v0.9.5 structured outline pointer drag", () => {
  it("starts structural dragging only from the invisible gutter", () => {
    const source = fs.readFileSync(path.resolve("src/editor/YeMindEditor.ts"), "utf8");
    const block = source.slice(
      source.indexOf("private readonly onOutlinePointerDown"),
      source.indexOf("private readonly onOutlinePointerMove"),
    );
    expect(block).toContain('closest<HTMLElement>("[data-outline-drag-handle]")');
    expect(block).toContain('row.dataset.outlineDragSource !== "true"');
    expect(block).toContain("setPointerCapture");
    expect(block).toContain("stopImmediatePropagation");
  });

  it("keeps the unified text surface free of native HTML dragging", () => {
    const source = fs.readFileSync(path.resolve("src/editor/StructuredOutlineEditorController.ts"), "utf8");
    expect(source).toContain("data-outline-drag-handle");
    expect(source).toContain("ymz-outline-row__drop-indicator");
    expect(source).not.toContain('draggable="true"');
    expect(source).toContain("target.closest('[data-outline-drag-handle]')");
  });

  it("uses stable full-row slots and deliberate child indentation", () => {
    const base = {
      sourceUid: "source",
      targetUid: "target",
      clientY: 120,
      clientX: 120,
      rect: { top: 100, height: 40 },
      targetTextLeft: 120,
      targetDepth: 2,
      indentWidth: 22,
      targetAncestors: [
        { uid: "root", depth: 0 },
        { uid: "parent", depth: 1 },
        { uid: "target", depth: 2 },
      ],
    };

    expect(resolveOutlinePointerDropIntent({ ...base, clientX: 154 })).toEqual({
      targetUid: "target",
      position: "inside",
      desiredDepth: 3,
      kind: "child",
    });
    expect(resolveOutlinePointerDropIntent({ ...base, clientX: 120, clientY: 103 })).toEqual({
      targetUid: "target",
      position: "before",
      desiredDepth: 2,
      kind: "before",
    });
    expect(resolveOutlinePointerDropIntent({ ...base, clientX: 120, clientY: 120 })).toEqual({
      targetUid: "target", position: "after", desiredDepth: 2, kind: "after",
    });
    expect(resolveOutlinePointerDropIntent({ ...base, clientX: 96, clientY: 138 })).toEqual({
      targetUid: "parent",
      position: "after",
      desiredDepth: 1,
      kind: "after",
    });
    expect(resolveOutlinePointerDropIntent({ ...base, sourceUid: "target" })).toBeNull();
  });

  it("renders a green two-pixel insertion line with a square start marker", () => {
    const css = fs.readFileSync(path.resolve("src/styles/index.css"), "utf8");
    expect(css).toContain(".ymz-outline-row__drop-indicator");
    expect(css).toMatch(/height:\s*2px/);
    expect(css).toContain("background:var(--ymz-accent)");
    expect(css).toContain(".ymz-outline-row__drop-indicator::before");
    expect(css).toContain("width:6px");
    expect(css).toContain("height:6px");
  });

  it("keeps a full 22px indent-cell move gutter and a 5px leaf square", () => {
    const css = fs.readFileSync(path.resolve("src/styles/index.css"), "utf8");
    expect(css).toMatch(/\.ymz-outline-row__drag\{[\s\S]*?width:22px;[\s\S]*?cursor:move/);
    expect(css).toMatch(/\.ymz-outline-row__leaf-square\{width:5px;height:5px/);
    expect(css).toMatch(/\.ymz-outline-row__triangle\{width:7px;height:7px/);
  });
});
