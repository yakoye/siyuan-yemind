declare module 'simple-mind-map' {
  export default class MindMap {
    static usePlugin(plugin: unknown): void;
    constructor(options: Record<string, unknown>);
    renderer: any;
    view: any;
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback?: (...args: any[]) => void): void;
    execCommand(command: string, ...args: any[]): any;
    getData(withConfig?: boolean): unknown;
    getLayout(): string;
    setLayout(layout: string): void;
    getTheme(): string;
    setTheme(theme: string): void;
    setMode(mode: string): void;
    resize(): void;
    destroy(): void;
  }
}
