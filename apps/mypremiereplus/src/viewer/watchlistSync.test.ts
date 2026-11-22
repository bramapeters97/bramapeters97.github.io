import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@mypremiere/types";
import { getStored, scopeStorage, setStored } from "@mypremiere/shared";
import { api } from "../api";
import { loadCatalogue, profiles } from "./catalogue";
import { readProfileWatchlist, toggleProfileWatchlist } from "./Discovery";

vi.mock("../api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api")>()),
  api: vi.fn(),
}));

const profile: Profile = {
  id: "family",
  name: "Everyone",
  initials: "EV",
  accent: "#e9c778",
  watchlist: ["seed"],
  recentlyDiscovered: [],
};
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

beforeEach(() => {
  vi.mocked(api).mockReset();
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("document", {
    title: "",
    documentElement: { style: { setProperty: vi.fn() }, dataset: {} },
  });
  scopeStorage("test-archive", "test-account");
});
afterEach(() => vi.unstubAllGlobals());

describe("watchlist server synchronisation", () => {
  it("updates the scoped local list immediately while persisting the selected IDs to the API", async () => {
    let complete!: (value: unknown) => void;
    vi.mocked(api).mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const result = toggleProfileWatchlist(profile, "new-film");
    expect(result).toEqual({ ids: ["seed", "new-film"], saved: true });
    expect(readProfileWatchlist(profile)).toEqual(["seed", "new-film"]);
    const [path, options] = vi.mocked(api).mock.calls[0];
    expect(path).toBe("watchlist");
    expect(options?.method).toBe("POST");
    expect(JSON.parse(options!.body as string)).toEqual({
      profileId: "family",
      videos: ["seed", "new-film"],
    });
    complete({ videos: result.ids });
    await flush();
  });

  it("keeps local edits and reports a failed write without an unhandled rejection", async () => {
    vi.mocked(api).mockRejectedValue(new Error("Temporarily offline"));
    const report = vi.fn();
    window.addEventListener("mpp:storage-error", report);
    toggleProfileWatchlist(profile, "seed");
    await flush();
    expect(readProfileWatchlist(profile)).toEqual([]);
    expect(report).toHaveBeenCalledTimes(1);
    expect((report.mock.calls[0][0] as CustomEvent).detail).toContain(
      "could not be synced",
    );
  });

  it("loads each profile from the server and clears only successfully replaced watchlist caches", async () => {
    setStored("watchlist:family", ["stale-local"]);
    setStored("watchlist-removed:family", ["server-film"]);
    setStored("watchlist:second", ["unsynced-local"]);
    setStored("watchlist-removed:second", ["second-seed"]);
    setStored("progress:family:server-film", { seconds: 42 });
    vi.mocked(api).mockImplementation(async (path) => {
      if (path === "bootstrap")
        return {
          tenant: {
            id: "test-archive",
            name: "Test Archive",
            accent: "#e9c778",
            theme: "classic",
          },
          profiles: [
            { id: "family", name: "Everyone", watchlist: ["seed"] },
            { id: "second", name: "Alex", watchlist: ["second-seed"] },
          ],
          videos: [],
          collections: [],
        };
      if (path === "watchlist?profileId=family")
        return { videos: ["server-film"] };
      if (path === "watchlist?profileId=second")
        throw new Error("Temporarily offline");
      throw new Error("Unexpected API request: " + path);
    });
    await loadCatalogue();
    expect(profiles[0].watchlist).toEqual(["server-film"]);
    expect(readProfileWatchlist(profiles[0])).toEqual(["server-film"]);
    expect(getStored("watchlist:family", null)).toEqual([]);
    expect(getStored("watchlist-removed:family", null)).toEqual([]);
    expect(readProfileWatchlist(profiles[1])).toEqual(["unsynced-local"]);
    expect(getStored("watchlist:second", null)).toEqual(["unsynced-local"]);
    expect(getStored("watchlist-removed:second", null)).toEqual([
      "second-seed",
    ]);
    expect(getStored("progress:family:server-film", null)).toEqual({
      seconds: 42,
    });
  });
});
