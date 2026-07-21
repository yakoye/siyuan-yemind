import type { CodeBlockSnapshot } from './codeBlock';

/**
 * The formatting surface shared by the canvas Quill editor and the outline
 * Quill editor. Keeping this interface independent from the mind-map command
 * adapter prevents the outline from owning a second tree implementation.
 */
export interface RichTextFormattingTarget {
  restoreSelection?(): void;
  getSelectedText(): string;
  getSelectedInlineLink(): string;
  setInlineLink(link: string | null): void;
  toggleInlineCode(): void;
  getCodeBlock(): CodeBlockSnapshot | null;
  saveCodeBlock(code: string, language?: string): void;
  removeCodeBlockFormat(): void;
  deleteCodeBlock(): void;
  insertFormula(formula: string, mode?: 'inline' | 'block'): void;
  formatText(config: Record<string, unknown>): void;
  clearTextFormat(): void;
  setCloze(enabled: boolean): void;
}
