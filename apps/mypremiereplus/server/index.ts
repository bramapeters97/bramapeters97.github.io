import { createApplication } from "./app.js";
import { existsSync } from "node:fs";
const app = createApplication({
  databasePath: process.env.DB_PATH,
  basePath: process.env.BASE_PATH ?? "/mypremiereplus",
  frontendDirectory: existsSync("dist/index.html") ? "dist" : undefined,
});
if (process.argv.includes("--seed")) {
  console.log(
    process.env.DEMO_MODE === "false"
      ? "Local database migrations are ready. Demo seeding is disabled."
      : "Local database migrations and demo seed are ready.",
  );
  app.store.close();
} else {
  const port = Number(process.env.PORT ?? 8787);
  const host = process.env.HOST ?? "127.0.0.1";
  app.server.listen(port, host, () =>
    console.log(`MyPremierePlus local API: http://${host}:${port}`),
  );
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.on(signal, () =>
      app.server.close(() => {
        app.store.close();
        process.exit(0);
      }),
    );
}
