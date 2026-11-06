import { appPathname, appUrl } from "./paths";

const generated = new Set(["lake", "mountains", "garden", "cinema", "coast"]);
export function artworkUrl(value?: string): string {
  if (!value) return appUrl("/artwork/lake.png");
  const m = appPathname(value).match(/^\/artwork\/([^/]+)\.svg$/);
  if (m && generated.has(m[1])) return appUrl(`/artwork/${m[1]}.png`);
  if (m?.[1] === "winter") return appUrl("/artwork/cinema.png");
  return appUrl(value);
}
