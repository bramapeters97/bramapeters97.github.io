// Download redistributable Latin subsets from the official Google Fonts service.
// Font licenses are retained alongside each WOFF2. No external font requests are
// needed by the application at runtime.
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const root = fileURLToPath(new URL("../", import.meta.url));
const destination = resolve(root, "public", "fonts");
await mkdir(destination, { recursive: true });
const fonts = [
  ["inter", "Inter", "inter", "400..800"],
  ["manrope", "Manrope", "manrope", "400..800"],
  ["dm-sans", "DM Sans", "dmsans", "400..800"],
  ["jakarta", "Plus Jakarta Sans", "plusjakartasans", "400..800"],
  ["outfit", "Outfit", "outfit", "400..800"],
  ["sora", "Sora", "sora", "400..800"],
  ["lora", "Lora", "lora", "400..700"],
  ["playfair", "Playfair Display", "playfairdisplay", "400..800"],
  ["cormorant", "Cormorant Garamond", "cormorantgaramond", "400..700"],
  ["baskerville", "Libre Baskerville", "librebaskerville", "400..700"],
];
const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
};
const fetchChecked = async (url, options) => {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(45000),
    ...options,
  });
  if (!r.ok) throw new Error(`${r.status}: ${url}`);
  return r;
};
const fontsource = process.argv.includes("--fontsource");
const sourceFolders = {
  inter: "inter",
  manrope: "manrope",
  "dm-sans": "dm-sans",
  jakarta: "plus-jakarta-sans",
  outfit: "outfit",
  sora: "sora",
  lora: "lora",
  playfair: "playfair-display",
  cormorant: "cormorant-garamond",
  baskerville: "libre-baskerville",
};
const sources = await Promise.all(
  fonts.map(async ([slug, family, folder, weights]) => {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replaceAll("%20", "+")}:wght@${weights}&display=swap`;
    let url;
    if (fontsource) {
      const source = sourceFolders[slug];
      url = `https://raw.githubusercontent.com/fontsource/font-files/main/fonts/variable/${source}/files/${source}-latin-wght-normal.woff2`;
    } else {
      const css = await (await fetchChecked(cssUrl, { headers })).text();
      const blocks = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(
        (m) => m[1],
      );
      const latin = blocks.find((block) => block.includes("U+0000-00FF"));
      url = latin?.match(
        /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/,
      )?.[1];
    }
    if (!url) throw new Error(`No official Latin WOFF2 found for ${family}`);
    const bytes = Buffer.from(await (await fetchChecked(url)).arrayBuffer());
    if (bytes.toString("ascii", 0, 4) !== "wOF2")
      throw new Error(`Invalid WOFF2 for ${family}`);
    const licenseUrl = `https://raw.githubusercontent.com/google/fonts/main/ofl/${folder}/OFL.txt`;
    let license = await (await fetchChecked(licenseUrl)).text();
    if (!license.includes("SIL OPEN FONT LICENSE"))
      throw new Error(`Unexpected license for ${family}`);
    if (fontsource) {
      const accompanying = await (
        await fetchChecked(
          `https://raw.githubusercontent.com/fontsource/font-files/main/fonts/variable/${sourceFolders[slug]}/LICENSE`,
        )
      ).text();
      if (!accompanying.includes("SIL OPEN FONT LICENSE"))
        throw new Error(`Unexpected distribution license for ${family}`);
      license = `License accompanying the distributed Fontsource subset:\n\n${accompanying}\n\nUpstream Google Fonts license:\n\n${license}`;
    }
    await writeFile(resolve(destination, `${slug}-latin.woff2`), bytes);
    await writeFile(
      resolve(destination, `license-${slug}.txt`),
      license.replace(/[\t ]+$/gm, ""),
    );
    console.log(`${family}: ${bytes.length} bytes; OFL license retained.`);
    return {
      slug,
      family,
      file: `${slug}-latin.woff2`,
      source: url,
      upstreamLicense: licenseUrl,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
    };
  }),
);
await writeFile(
  resolve(destination, "sources.json"),
  JSON.stringify(
    {
      notice: fontsource
        ? "Redistributable Google Fonts Latin variable subsets from the Fontsource font-files archive. Used because the official Google Fonts CSS host refused TLS connections in the development environment. Upstream and accompanying OFL licenses are retained."
        : "Official Google Fonts Latin variable subsets with accompanying OFL licenses.",
      fonts: sources,
    },
    null,
    2,
  ) + "\n",
);
