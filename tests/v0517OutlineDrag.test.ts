import { describe, expect, it, vi } from "vitest";
import { resolveOutlineDropIntent } from "../src/editor/outlineDrag";
import { createCommandAdapter } from "../src/core/commands";
import { renderOutlineHtml } from "../src/editor/outline";
import fs from "node:fs";
import path from "node:path";

const tree = {
  data: { text: "Root", uid: "root" },
  children: [{ data: { text: "A", uid: "a" }, children: [] }],
};

describe("official-style outline row drag", () => {
  it("marks movable rows without exposing a dedicated six-dot handle", () => {
    const html = renderOutlineHtml(tree, false);
    expect(html).not.toContain("data-outline-drag-handle");
    expect(html).not.toContain('draggable="true"');
    expect((html.match(/data-outline-drag-source=/g) ?? []).length).toBe(2);
  });

  it("resolves before, inside and after drop zones", () => {
    const rect = { top: 100, height: 40 };
    expect(
      resolveOutlineDropIntent({
        sourceUid: "a",
        targetUid: "b",
        clientY: 103,
        rect,
      }),
    ).toEqual({ targetUid: "b", position: "before" });
    expect(
      resolveOutlineDropIntent({
        sourceUid: "a",
        targetUid: "b",
        clientY: 120,
        rect,
      }),
    ).toEqual({ targetUid: "b", position: "inside" });
    expect(
      resolveOutlineDropIntent({
        sourceUid: "a",
        targetUid: "b",
        clientY: 138,
        rect,
      }),
    ).toEqual({ targetUid: "b", position: "after" });
    expect(
      resolveOutlineDropIntent({
        sourceUid: "a",
        targetUid: "a",
        clientY: 120,
        rect,
      }),
    ).toBeNull();
  });

  it("commits and detaches the active editor before a pointer structure move", () => {
    const source = fs.readFileSync(
      path.resolve("src/editor/YeMindEditor.ts"),
      "utf8",
    );
    const dragBlock = source.slice(
      source.indexOf("private readonly onOutlinePointerMove"),
      source.indexOf("private readonly onOutlinePointerUp"),
    );
    expect(
      dragBlock.search(/commitAndDetach\(["']pointer-drag-start["']\)/),
    ).toBeGreaterThan(-1);
    const dropBlock = source.slice(
      source.indexOf("private readonly onOutlinePointerUp"),
      source.indexOf("private readonly onOutlinePointerCancel"),
    );
    expect(dropBlock.indexOf("this.commands.moveNodeByUid")).toBeGreaterThan(
      -1,
    );
  });

  it("maps drop intent to upstream structure commands and rejects descendants", () => {
    const root: any = {
      isRoot: true,
      isGeneralization: false,
      parent: null,
      children: [],
    };
    const a: any = {
      isRoot: false,
      isGeneralization: false,
      parent: root,
      children: [],
    };
    const b: any = {
      isRoot: false,
      isGeneralization: false,
      parent: root,
      children: [],
    };
    const child: any = {
      isRoot: false,
      isGeneralization: false,
      parent: a,
      children: [],
    };
    root.children = [a, b];
    a.children = [child];
    const nodes: Record<string, any> = { root, a, b, child };
    const map: any = {
      opt: { readonly: false },
      renderer: {
        activeNodeList: [a],
        findNodeByUid: (uid: string) => nodes[uid] ?? null,
      },
      execCommand: vi.fn(),
      view: { fit: vi.fn(), reset: vi.fn(), enlarge: vi.fn(), narrow: vi.fn() },
    };
    const commands = createCommandAdapter(map);

    expect(commands.moveNodeByUid("a", "b", "before")).toBe(true);
    expect(commands.moveNodeByUid("a", "b", "inside")).toBe(true);
    expect(commands.moveNodeByUid("a", "b", "after")).toBe(true);
    expect(commands.moveNodeByUid("a", "child", "inside")).toBe(false);
    expect(map.execCommand.mock.calls).toContainEqual([
      "INSERT_BEFORE",
      [a],
      b,
    ]);
    expect(map.execCommand.mock.calls).toContainEqual(["MOVE_NODE_TO", [a], b]);
    expect(map.execCommand.mock.calls).toContainEqual(["INSERT_AFTER", [a], b]);
  });
});
