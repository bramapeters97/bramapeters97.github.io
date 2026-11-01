import { afterEach, describe, expect, it, vi } from "vitest";
import { api as viewerApi, json } from "./api";
import { api as adminApi } from "./admin/api";
import { artworkUrl } from "./artwork";
import { resolvePlaybackSource, resolvePosterUrl } from "./viewer/media";
import {
  apiUrl,
  appPathname,
  appUrl,
  canonicalApiUrls,
  normalizeApiUrls,
} from "./paths";

afterEach(() => vi.unstubAllGlobals());

describe("application mounted below the portfolio", () => {
  it("keeps navigation, queries, and APIs inside the mount without doubling it", () => {
    for (const base of ["/mypremiereplus", "/mypremiereplus/"]) {
      expect(appUrl("/", base)).toBe("/mypremiereplus/");
      expect(appUrl("/about#pricing", base)).toBe(
        "/mypremiereplus/about#pricing",
      );
      expect(appUrl("/?screen=home", base)).toBe(
        "/mypremiereplus/?screen=home",
      );
      expect(appUrl("/mypremiereplus/admin", base)).toBe(
        "/mypremiereplus/admin",
      );
      expect(appUrl("artwork/lake.png", base)).toBe(
        "/mypremiereplus/artwork/lake.png",
      );
      for (const path of [
        "session",
        "/session",
        "/api/session",
        "/mypremiereplus/api/session",
      ])
        expect(apiUrl(path, base)).toBe("/mypremiereplus/api/session");
    }
    expect(appUrl("/about", "/")).toBe("/about");
    expect(apiUrl("session", "/")).toBe("/api/session");
  });

  it("preserves provider URLs, temporary media URLs, and document fragments", () => {
    for (const url of [
      "https://media.example/video.mp4",
      "//cdn.example/poster.png",
      "blob:https://bram-peters.com/local-upload",
      "data:image/svg+xml;base64,PHN2Zz4=",
      "mailto:archive@example.test",
      "#stock-credits",
    ])
      expect(appUrl(url, "/mypremiereplus/")).toBe(url);
  });

  it("strips only the exact application mount for route recognition", () => {
    expect(appPathname("/mypremiereplus", "/mypremiereplus/")).toBe("/");
    expect(
      appPathname("/mypremiereplus/legal/privacy/", "/mypremiereplus/"),
    ).toBe("/legal/privacy/");
    expect(appPathname("/mypremiereplus-other/about", "/mypremiereplus/")).toBe(
      "/mypremiereplus-other/about",
    );
    expect(appPathname("/contact.html", "/mypremiereplus/")).toBe(
      "/contact.html",
    );
  });

  it("round-trips nested media payloads without changing persisted paths or ordinary content", () => {
    const source = {
      avatar: "/artwork/profile.svg",
      links: [
        { url: "/invite/example?code=1" },
        { url: "/contribute/example" },
      ],
      video: { url: "/api/assets/0123456789abcdef0123456789abcdef" },
      provider: "https://media.example/film.mp4",
      filename: "film.mp4",
      description: "/anything else is ordinary text",
      count: 3,
      disabled: false,
      optional: null,
    };
    const mounted = normalizeApiUrls(source, "/mypremiereplus/");
    expect(mounted.avatar).toBe("/mypremiereplus/artwork/profile.svg");
    expect(mounted.video.url).toBe(
      "/mypremiereplus/api/assets/0123456789abcdef0123456789abcdef",
    );
    expect(mounted.links[0]?.url).toBe("/mypremiereplus/invite/example?code=1");
    expect(normalizeApiUrls(mounted, "/mypremiereplus/")).toEqual(mounted);
    expect(canonicalApiUrls(mounted, "/mypremiereplus/")).toEqual(source);
    expect(source.avatar).toBe("/artwork/profile.svg");
    expect(normalizeApiUrls(source, "/")).toEqual(source);
  });

  it("resolves root and already mounted artwork and authorized local playback", () => {
    expect(artworkUrl("/artwork/lake.svg")).toBe(
      "/mypremiereplus/artwork/lake.png",
    );
    expect(artworkUrl("/mypremiereplus/artwork/winter.svg")).toBe(
      "/mypremiereplus/artwork/cinema.png",
    );
    expect(resolvePosterUrl("artwork/cinema.svg")).toBe(
      "/mypremiereplus/artwork/cinema.svg",
    );
    expect(resolvePosterUrl("data:image/png;base64,test")).toBe(
      "data:image/png;base64,test",
    );
    for (const path of [
      "/api/assets/0123456789abcdef0123456789abcdef",
      "/mypremiereplus/api/assets/0123456789abcdef0123456789abcdef",
    ]) {
      expect(resolvePlaybackSource(path)).toMatchObject({
        kind: "mp4",
        url: "/mypremiereplus/api/assets/0123456789abcdef0123456789abcdef",
        tvosCompatible: true,
      });
    }
  });

  it.each(["viewer", "admin"])(
    "mounts %s API calls while keeping outgoing records canonical",
    async (client) => {
      const payload = {
        poster: "/artwork/lake.png",
        asset: { url: "/api/assets/example" },
      };
      const fetch = vi.fn(
        async () =>
          new Response(JSON.stringify(payload), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      );
      vi.stubGlobal("fetch", fetch);
      const mounted = normalizeApiUrls(payload);
      const result =
        client === "viewer"
          ? await viewerApi("videos", json("PATCH", mounted))
          : await adminApi("/videos", mounted, "PATCH");
      expect(result).toEqual(mounted);
      expect(fetch).toHaveBeenCalledWith(
        "/mypremiereplus/api/videos",
        expect.objectContaining({
          method: "PATCH",
          credentials: "same-origin",
          body: JSON.stringify(payload),
        }),
      );
    },
  );
});
