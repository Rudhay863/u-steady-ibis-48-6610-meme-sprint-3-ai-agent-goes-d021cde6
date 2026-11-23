// Meme Sprint 3: AI Agent Goes Rogue — entry program.
//
// Contract: read `entry.png` from the bot directory (MAKEFUN_BOT_DIR,
// default /bot), validate it, then copy it to MAKEFUN_OUTPUT_DIR
// (default /output) as `entry.png`.
//
// The gate requires a whole PNG, at most 1 MiB (1,048,576 bytes) and at
// most 1024x1024 px. This program checks the PNG magic bytes, the file
// size, AND the IHDR width/height before writing anything, and exits 1
// with a clear error on any failure. Nothing is created (not even the
// output directory) until every check has passed, so a bad input leaves
// no partial output behind.
//
// Local check:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
// Run it twice and compare sha256 of out/entry.png across runs:
// the output must be byte-identical.

import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MAX_BYTES = 1_048_576;
const MAX_DIMENSION = 1024;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// A PNG's first chunk must be IHDR: 4-byte length, "IHDR", then width
// and height as 4-byte big-endian unsigned ints (offsets 16 and 20).
const IHDR_MIN_LENGTH = 8 + 4 + 4 + 8;

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

const botDir = process.env.MAKEFUN_BOT_DIR ?? "/bot";
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const src = join(botDir, "entry.png");

if (!existsSync(src)) fail(`entry.png not found in ${botDir}`);
const data = readFileSync(src);

// --- All validation happens here, before any output is created. ---
if (data.length > MAX_BYTES) {
  fail(`entry.png is ${data.length} bytes, over the 1,048,576-byte limit`);
}
if (data.length < IHDR_MIN_LENGTH || !data.subarray(0, 8).equals(PNG_MAGIC)) {
  fail("entry.png is not a PNG file (bad magic bytes)");
}
if (data.toString("ascii", 12, 16) !== "IHDR") {
  fail("entry.png is not a PNG file (first chunk is not IHDR)");
}
const width = data.readUInt32BE(16);
const height = data.readUInt32BE(20);
if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
  fail(`entry.png is ${width}x${height}, over the 1024x1024 limit`);
}
if (width === 0 || height === 0) {
  fail("entry.png has a zero width or height");
}

// --- Only now, with a valid input, do we touch the filesystem. ---
mkdirSync(outDir, { recursive: true });
copyFileSync(src, join(outDir, "entry.png"));
console.log(
  `wrote ${join(outDir, "entry.png")} (${width}x${height}, ${data.length} bytes)`,
);
