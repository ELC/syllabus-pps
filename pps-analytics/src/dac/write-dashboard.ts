import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createGeneratedFileMeta,
  renderGeneratedCommentFile,
} from "../generated";
import { ROOT_README_DAC } from "../paths";

export function writeGeneratedDashboardFile(
  dir: string,
  fileName: string,
  generatedAt: string,
  content: string,
): void {
  writeFileSync(
    join(dir, fileName),
    renderGeneratedCommentFile(
      createGeneratedFileMeta({
        generator: `dac/project.ts:${fileName}`,
        kind: "dashboard",
        generatedAt,
        docs: ROOT_README_DAC,
      }),
      content,
      "//",
    ),
  );
}
