import { readFileSync, writeFileSync } from "node:fs";
const root = new URL("../", import.meta.url);
const schema = ["0001_initial.sql", "0002_domain_tables.sql"]
  .map((name) => readFileSync(new URL(`migrations/${name}`, root), "utf8"))
  .join("\n\n");
writeFileSync(new URL("demo-data/schema.sql", root), schema);
console.log(
  "Exported the complete fresh-database schema without opening a database.",
);
