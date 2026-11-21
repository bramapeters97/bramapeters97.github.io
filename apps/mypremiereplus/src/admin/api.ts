import { artworkUrl as resolveArtworkUrl } from "../artwork";
import { apiUrl, appUrl, canonicalApiUrls, normalizeApiUrls } from "../paths";

export type Item = { id: string; [key: string]: any };
export type Data = { tenant: Item; [key: string]: any };

export async function api<T = any>(
  path: string,
  body?: unknown,
  method?: string,
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: method || (body === undefined ? "GET" : "POST"),
    credentials: "same-origin",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body:
      body === undefined ? undefined : JSON.stringify(canonicalApiUrls(body)),
  });
  const text = await response.text();
  let result: any;
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("The service returned an unreadable response. Try again.");
  }
  if (!response.ok)
    throw new Error(
      result.error?.message ||
        result.error ||
        result.message ||
        `Request failed (${response.status}).`,
    );
  return normalizeApiUrls(result) as T;
}

export async function upload(
  file: File | Blob,
  name?: string,
  purpose?: string,
): Promise<Item> {
  const response = await fetch(apiUrl("uploads"), {
    method: "POST",
    credentials: "same-origin",
    body: file,
    headers: {
      "x-file-name": encodeURIComponent(
        name || (file as File).name || "recording.webm",
      ),
      "x-file-type": file.type,
      "x-upload-purpose":
        purpose ||
        (file.type.startsWith("image/")
          ? "artwork"
          : file.type.startsWith("audio/")
            ? "voice"
            : "video"),
      "Content-Type": file.type || "application/octet-stream",
    },
  });
  const result = normalizeApiUrls(await response.json());
  if (!response.ok)
    throw new Error(result.error?.message || result.error || "Upload failed.");
  if (
    result.video?.id &&
    (!result.video.duration || result.video.processingStatus !== "ready")
  ) {
    const length = await localDuration(file);
    if (length)
      result.video = await api(`/uploads/${result.video.id}/metadata`, {
        duration: length,
      });
  }
  return result;
}

async function localDuration(file: Blob): Promise<number | undefined> {
  const url = URL.createObjectURL(file);
  const media = document.createElement("video");
  media.preload = "metadata";
  return new Promise((resolve) => {
    let done = false;
    const finish = (value?: number) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      media.removeAttribute("src");
      media.load();
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(), 10000);
    media.onloadedmetadata = () => {
      if (Number.isFinite(media.duration) && media.duration > 0)
        finish(media.duration);
      else finish();
    };
    media.onerror = () => finish();
    media.src = url;
  });
}

export function assetUrl(item: any): string {
  return appUrl(
    item.url ||
      item.asset?.url ||
      item.assetUrl ||
      `/api/assets/${item.asset?.id || item.assetId || item.id}`,
  );
}
export function artworkUrl(
  value?: string,
  fallback = "/artwork/cinema.png",
): string {
  return resolveArtworkUrl(value || fallback);
}
export function duration(seconds = 0): string {
  const value = Math.max(0, Math.round(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}
export function pretty(value: string): string {
  return (
    (
      {
        ready: "Ready to publish",
        published: "Published",
        processing: "Processing",
        draft: "Draft",
        failed: "Needs attention",
        pending: "Awaiting review",
        approved: "Approved",
        rejected: "Rejected",
      } as Record<string, string>
    )[value] || value
  );
}
