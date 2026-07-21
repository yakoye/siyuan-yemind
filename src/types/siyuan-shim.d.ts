declare module 'siyuan' {
  export interface Tab {
    headElement: HTMLElement;
    updateTitle(title: string): void;
    close(): void;
  }

  export interface Custom {
    element: Element;
    data: any;
    tab: Tab;
  }

  export interface MobileCustom {
    element: Element;
    data: any;
    type: string;
  }

  export interface ICommand {
    langKey: string;
    langText?: string;
    hotkey?: string;
    callback?: () => void;
  }

  export class Setting {
    addItem(options: {
      title: string;
      description?: string;
      actionElement?: HTMLElement;
      createActionElement?: () => HTMLElement;
      direction?: 'column' | 'row';
    }): void;
  }

  export abstract class Plugin {
    readonly name: string;
    app: any;
    setting: Setting;
    eventBus: {
      on(event: string, callback: (event: CustomEvent<any>) => void): void;
      off(event: string, callback: (event: CustomEvent<any>) => void): void;
    };
    onload(): void;
    onLayoutReady?(): void;
    onunload?(): void;
    addIcons(svg: string): void;
    addTab(options: {
      type: string;
      init(this: Custom): void;
      resize?(this: Custom): void;
      destroy?(this: Custom): void;
      update?(this: Custom): void;
      beforeDestroy?(this: Custom): void;
    }): () => Custom;
    addDock(options: {
      config: { position: string; size: { width: number; height: number }; icon: string; title: string; show?: boolean };
      data: any;
      type: string;
      init(this: Custom | MobileCustom, dock?: Custom | MobileCustom): void;
      destroy?(this: Custom | MobileCustom): void;
      resize?(this: Custom | MobileCustom): void;
      update?(this: Custom | MobileCustom): void;
    }): any;
    addTopBar(options: { icon: string; title: string; callback: (event: MouseEvent) => void; position?: 'right' | 'left' }): HTMLElement;
    addCommand(options: ICommand): void;
    getOpenedTab(): Record<string, Custom[]>;
    loadData(storageName: string): Promise<any>;
    saveData(storageName: string, content: any): Promise<any>;
    removeData(storageName: string): Promise<any>;
    openSetting(): void;
  }

  export class Menu {
    element: HTMLElement;
    constructor(id?: string, closeCB?: () => void);
    addItem(option: any): HTMLElement;
    addSeparator(options?: any): HTMLElement;
    open(options: { x: number; y: number }): void;
    close(): void;
  }

  export class Dialog {
    element: HTMLElement;
    constructor(options: {
      title?: string;
      content: string;
      width?: string;
      height?: string;
      destroyCallback?: () => void;
      disableClose?: boolean;
    });
    destroy(options?: any): void;
  }

  export function openTab(options: {
    app: any;
    custom: { id: string; icon: string; title: string; data?: any };
    openNewTab?: boolean;
    keepCursor?: boolean;
  }): Promise<Tab>;

  export function confirm(title: string, text: string, callback: () => void, cancelCallback?: () => void): void;
  export function showMessage(text: string, timeout?: number, type?: 'info' | 'error', id?: string): void;
}
