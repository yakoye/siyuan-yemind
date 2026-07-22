import { describe, expect, it } from "vitest";
import * as outlineDrag from "../../../src/editor/outlineDrag";
import fs from "node:fs";
import path from "node:path";

describe("v0.9.4 structured outline pointer drag", () => {
  it("starts structural dragging only from the dedicated gutter handle", () => {
    const source = fs.readFileSync(
      path.resolve("src/editor/YeMindEditor.ts"),
      "utf8",
    );
    const block = source.slice(
      source.indexOf("private readonly onOutlinePointerDown"),
      source.indexOf("private readonly onOutlinePointerMove"),
    );
    expect(block).toContain('closest<HTMLElement>("[data-outline-drag-handle]")');
    expect(block).toContain('row.dataset.outlineDragSource !== "true"');
    expect(block).not.toContain("fromEditor: true");
  });

  it("keeps the unified text surface free of native HTML dragging", () => {
    const source = fs.readFileSync(
      path.resolve("src/editor/StructuredOutlineEditorController.ts"),
      "utf8",
    );
    expect(source).toContain("data-outline-drag-handle");
    expect(source).not.toContain('draggable="true"');
    expect(source).toContain("target.closest('[data-outline-drag-handle]')");
  });

  it("uses horizontal movement to choose child or parent-aligned placement", () => {
    const resolve = (outlineDrag as any).resolveOutlinePointerDropIntent;
    expect(typeof resolve).toBe("function");
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

    expect(resolve({ ...base, clientX: 154 })).toEqual({
      targetUid: "target",
      position: "inside",
      desiredDepth: 3,
    });
    expect(resolve({ ...base, clientX: 120, clientY: 103 })).toEqual({
      targetUid: "target",
      position: "before",
      desiredDepth: 2,
    });
    expect(resolve({ ...base, clientX: 96, clientY: 138 })).toEqual({
      targetUid: "parent",
      position: "after",
      desiredDepth: 1,
    });
    expect(resolve({ ...base, clientX: 96, clientY: 120 })).toEqual({
      targetUid: "parent",
      position: "after",
      desiredDepth: 1,
    });
    expect(resolve({ ...base, sourceUid: "target" })).toBeNull();
  });

  it("publishes before, inside and after drag indicator states with desired depth", () => {
    const source = fs.readFileSync(
      path.resolve("src/editor/YeMindEditor.ts"),
      "utf8",
    );
    const block = source.slice(
      source.indexOf("private readonly onOutlinePointerMove"),
      source.indexOf("private readonly onOutlinePointerUp"),
    );
    expect(block).toContain("is-drop-${intent.position}");
    expect(block).toContain("--ymz-outline-drop-depth");
    expect(block).toContain("intent.desiredDepth");
  });
});
