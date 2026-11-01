/** The same mount path Vite uses for generated scripts, styles, and public assets. */
export const APP_BASE_URL = import.meta.env.BASE_URL;

function mountPath(base: string): string {
  return `/${base.replace(/^\/+|\/+$/g, "")}`.replace(/^\/$/, "");
}

/** Resolve an application URL without changing external URLs or fragment links. */
export function appUrl(path: string, base = APP_BASE_URL): string {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(path)) return path;
  const mount = mountPath(base);
  if (
    mount &&
    (path === mount ||
      path.startsWith(`${mount}/`) ||
      path.startsWith(`${mount}?`) ||
      path.startsWith(`${mount}#`))
  )
    return path;
  return `${mount}/${path.replace(/^\/+/, "")}`;
}

/** Match routes against the app's own pathname rather than the host website. */
export function appPathname(path: string, base = APP_BASE_URL): string {
  const mount = mountPath(base);
  if (mount && path === mount) return "/";
  if (mount && path.startsWith(`${mount}/`)) return path.slice(mount.length);
  return path;
}

export function apiUrl(path: string, base = APP_BASE_URL): string {
  const local = appPathname(path, base);
  return appUrl(
    /^\/api(?:\/|$|\?)/.test(local)
      ? local
      : `/api/${local.replace(/^\/+/, "")}`,
    base,
  );
}

/**
 * The API also supports standalone hosting and stores canonical root-relative
 * media URLs. Resolve those known URLs when JSON crosses into the browser.
 * Ordinary text, relative filenames, and external provider URLs stay intact.
 */
export function normalizeApiUrls<T>(value: T, base = APP_BASE_URL): T {
  return mapApiUrls(value, (url) => appUrl(url, base), base);
}

/** Keep browser mount paths out of persisted artwork and asset records. */
export function canonicalApiUrls<T>(value: T, base = APP_BASE_URL): T {
  return mapApiUrls(value, (url) => appPathname(url, base), base);
}

function mapApiUrls<T>(
  value: T,
  resolve: (url: string) => string,
  base = APP_BASE_URL,
): T {
  if (typeof value === "string") {
    const local = appPathname(value, base);
    return (
      /^\/(?:api|artwork|fonts|invite|contribute|activate)(?:\/|$|[?#])/.test(
        local,
      ) || /^\/icon\.svg(?:$|[?#])/.test(local)
        ? resolve(value)
        : value
    ) as T;
  }
  if (Array.isArray(value))
    return value.map((item) => mapApiUrls(item, resolve, base)) as T;
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        mapApiUrls(item, resolve, base),
      ]),
    ) as T;
  return value;
}
