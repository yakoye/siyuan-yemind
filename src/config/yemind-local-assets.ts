/**
 * YeMind fixed local assets / YeMind 固定本地资源
 *
 * Catalog paths are relative to the plugin's `assets` directory.
 * 目录表中的路径均相对于插件 `assets` 目录。
 */

export const YEMIND_ASSET_ROOT = "assets" as const;

export const YEMIND_FIXED_ASSETS = {
  markerSprite: "icons/marker-sprite.png",
  clipartRoot: "clipart",
  layoutRoot: "layout-thumbnails",
  layoutCatalog: "layout-thumbnails/layout-catalog.json",
} as const;

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function joinUrl(...parts: string[]): string {
  const first = parts.shift() ?? "";
  const prefix = first.replace(/\/+$/g, "");
  const rest = parts.map(trimSlashes).filter(Boolean).join("/");
  return prefix ? `${prefix}/${rest}` : rest;
}

/**
 * Pass the real YeMind plugin base URL from the SiYuan runtime.
 * 必须传入思源运行时提供的真实插件基础 URL。
 */
export function createYemindAssetResolver(pluginBaseUrl: string) {
  const assetBaseUrl = joinUrl(pluginBaseUrl, YEMIND_ASSET_ROOT);

  return {
    assetBaseUrl,

    url(relativePath: string): string {
      return joinUrl(assetBaseUrl, relativePath);
    },

    markerSpriteUrl(): string {
      return joinUrl(assetBaseUrl, YEMIND_FIXED_ASSETS.markerSprite);
    },

    clipartUrl(relativePath: string): string {
      return joinUrl(assetBaseUrl, relativePath);
    },

    layoutUrl(relativePath: string): string {
      return joinUrl(assetBaseUrl, relativePath);
    },
  };
}

export interface MarkerCatalogItem {
  id: string;
  backgroundPosition: string;
}

export function getYemindMarkerStyle(
  spriteUrl: string,
  marker: MarkerCatalogItem,
): Record<string, string> {
  return {
    width: "28px",
    height: "28px",
    display: "inline-block",
    flex: "0 0 28px",
    backgroundImage: `url("${spriteUrl}")`,
    backgroundRepeat: "no-repeat",
    backgroundSize: "380px 488px",
    backgroundPosition: marker.backgroundPosition,
  };
}

export const YEMIND_OVERLAY_EXCLUDES = [
  "assets/clipart/**",
  "assets/icons/marker-sprite.png",
  "assets/layout-thumbnails/**/*.svg",
  "assets/layout-thumbnails/layout-thumbnails-contact-sheet.png",
  "yemind-icon-32.png",
  "yemind-icon-64.png",
  "yemind-icon-128.png",
] as const;
