import type { MindMapTree } from '../model/types';

export interface EditorStats {
  roots: number;
  nodes: number;
  words: number;
}

function plainText(value: unknown): string {
  return String(value ?? '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(value: string): number {
  return value ? value.split(/\s+/).filter(Boolean).length : 0;
}

export function calculateEditorStats(tree: MindMapTree): EditorStats {
  let nodes = 0;
  let words = 0;
  const walk = (node: MindMapTree): void => {
    nodes += 1;
    words += countWords(plainText(node.data.text));
    node.children.forEach(walk);
  };
  walk(tree);
  return { roots: 1, nodes, words };
}
