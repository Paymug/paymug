import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { resolvePaymugBuildInfo } from "./paymug-build-info.utils.mjs";

const outputPath = resolve("src/generated/paymug-build-info.ts");
const buildInfo = await resolvePaymugBuildInfo(
  process.argv.slice(2),
  outputPath,
);
const output = `export const paymugBuildInfo = ${JSON.stringify(
  buildInfo,
  null,
  2,
)} as const;\n`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, output, "utf8");
