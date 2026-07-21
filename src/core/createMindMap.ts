import MindMap from "simple-mind-map";

export interface CreateMindMapOptions {
  el: HTMLElement;
  data: Record<string, unknown>;
  theme?: string;
  layout?: string;
}

export function createMindMap(options: CreateMindMapOptions): MindMap {
  return new MindMap({
    el: options.el,
    data: options.data,
    theme: options.theme ?? "default",
    layout: options.layout ?? "logicalStructure",
    enableFreeDrag: true,
    enableNodeRichText: true,
    mousewheelAction: "move",
  });
}
