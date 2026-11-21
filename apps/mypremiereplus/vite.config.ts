import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
const local = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const appBase = "/mypremiereplus/";
export default defineConfig({
  base: appBase,
  resolve: {
    alias: {
      "@mypremiere/types": local("./src/lib/types/index.ts"),
      "@mypremiere/shared": local("./src/lib/shared/index.ts"),
      "@mypremiere/navigation": local("./src/lib/navigation/index.ts"),
      "@mypremiere/catalog": local("./src/viewer/catalogue.ts"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    fs: {
      deny: [
        ".env",
        ".env.*",
        "*.{crt,pem}",
        "**/.git/**",
        "**/demo-data/**",
        "**/.local/**",
      ],
    },
    proxy: {
      "/mypremiereplus/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: false,
      },
    },
  },
  build: { target: "es2022", sourcemap: true },
  test: {
    include: ["src/**/*.test.ts"],
    env: { BASE_URL: appBase },
  },
});
