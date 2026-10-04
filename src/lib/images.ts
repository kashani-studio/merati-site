import assets from "../content/image-assets.json";

type Asset = { src: string; width?: number; height?: number };
const optimized = assets as Record<string, Asset>;

export function imageAsset(src: string): Asset {
  return optimized[src] || { src };
}
