declare module 'jszip' {
  export default class JSZip {
    file(path: string, data: unknown): this;
    generateAsync(options: Record<string, unknown>): Promise<Uint8Array>;
  }
}

declare module 'quill' {
  export default class Quill {
    static readonly sources: { USER: string; SILENT: string; API: string };
    static import(name: string): any;
    static register(target: any, overwrite?: boolean): void;
    readonly root: HTMLElement;
    readonly scroll: any;
    readonly clipboard: any;
    constructor(container: Element | string, options?: Record<string, unknown>);
    [key: string]: any;
    on(event: string, handler: (...args: any[]) => void): void;
    off(event: string, handler?: (...args: any[]) => void): void;
    getLength(): number;
    getText(index?: number, length?: number): string;
    getSelection(focus?: boolean): { index: number; length: number } | null;
    setSelection(index: number, lengthOrSource?: number | string, source?: string): void;
    getBounds(index: number, length?: number): { left: number; top: number; right: number; bottom: number; width: number; height: number };
    getFormat(index?: number, length?: number): Record<string, unknown>;
    getLines(index?: number, length?: number): any[];
    formatLine(index: number, length: number, name: string | Record<string, unknown>, valueOrSource?: unknown, source?: string): void;
    format(name: string, value: unknown, source?: string): void;
    formatText(index: number, length: number, name: string | Record<string, unknown>, valueOrSource?: unknown, source?: string): void;
    removeFormat(index: number, length: number, source?: string): void;
    insertText(index: number, text: string, formatsOrSource?: Record<string, unknown> | string, source?: string): void;
    insertEmbed(index: number, type: string, value: unknown, source?: string): void;
    deleteText(index: number, length: number, source?: string): void;
    updateContents(delta: unknown, source?: string): void;
    enable(enabled?: boolean): void;
    focus(): void;
  }
}

declare module 'quill-delta' {
  export default class Delta {
    constructor(ops?: unknown[]);
    retain(length: number, attributes?: Record<string, unknown>): this;
    delete(length: number): this;
    insert(value: unknown, attributes?: Record<string, unknown>): this;
  }
}

declare module 'parchment' {
  export const Scope: any;
}

declare module 'vite' {
  export function defineConfig<T>(config: T): T;
}

declare module '@svgdotjs/svg.js' {
  export const SVG: any;
  export class Rect { [key: string]: any; constructor(...args: any[]); }
  export class G { [key: string]: any; constructor(...args: any[]); }
  export class Text { [key: string]: any; constructor(...args: any[]); }
  export class Image { [key: string]: any; constructor(...args: any[]); }
  export class A { [key: string]: any; constructor(...args: any[]); }
}
