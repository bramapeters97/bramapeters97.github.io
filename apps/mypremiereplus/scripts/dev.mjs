import { spawn } from "node:child_process";
const processes = [
  spawn(
    process.execPath,
    ["--env-file-if-exists=.env", "--import", "tsx", "server/index.ts"],
    {
      stdio: "inherit",
    },
  ),
  spawn(process.execPath, ["node_modules/vite/bin/vite.js"], {
    stdio: "inherit",
  }),
];
function stop() {
  for (const child of processes) child.kill();
}
for (const child of processes)
  child.on("exit", (code) => {
    stop();
    process.exitCode = code ?? 0;
  });
process.on("SIGINT", () => {
  stop();
  process.exit();
});
process.on("SIGTERM", () => {
  stop();
  process.exit();
});
