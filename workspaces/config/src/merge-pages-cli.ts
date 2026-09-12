import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { mergePagesDist } from "./merge-pages.js";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
const combinedDist = mergePagesDist(repoRoot);
console.log(`Combined GitHub Pages artifact at ${combinedDist}`);
