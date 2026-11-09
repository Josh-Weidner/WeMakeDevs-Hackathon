import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateSeed } from "./generate.js";

/** `pnpm --filter @confy/seed generate`: writes deterministic JSON to seed/out/. */
const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "out");
mkdirSync(outDir, { recursive: true });

const data = generateSeed();
for (const [name, docs] of Object.entries(data)) {
  writeFileSync(join(outDir, `${name}.json`), `${JSON.stringify(docs, null, 2)}\n`);
  process.stdout.write(`${String(docs.length).padStart(4)}  ${name}.json\n`);
}
