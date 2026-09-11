import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const shellDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const stylesDir = join(shellDir, "src/styles");
const outDir = join(shellDir, "dist");
const outFile = join(outDir, "pps-shell.css");

const parts = ["tokens.css", "chrome.css", "scrollbars.css", "concept-panel.css", "spa.css"].map((file) =>
  readFileSync(join(stylesDir, file), "utf8"),
);

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, `${parts.join("\n\n")}\n`, "utf8");
console.log(`Wrote ${outFile}`);
