// Pre-compress built text assets to Brotli (.br) and gzip (.gz) so a static
// host can serve `Content-Encoding: br` (with gzip fallback). Runs AFTER the
// Workbox manifest is generated, so precache revisions are unaffected.
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const DIST = "dist";
const EXT = new Set([".js", ".css", ".html", ".json", ".txt", ".svg", ".webmanifest"]);
const MIN_BYTES = 1024; // don't bother with tiny files

const kb = (n) => (n / 1024).toFixed(0).padStart(5);
let saved = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (EXT.has(extname(p)) && st.size >= MIN_BYTES) compress(p, st.size);
  }
}

function compress(p, size) {
  const buf = readFileSync(p);
  const gz = gzipSync(buf, { level: 9 });
  const br = brotliCompressSync(buf, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
  });
  writeFileSync(p + ".gz", gz);
  writeFileSync(p + ".br", br);
  saved += size - br.length;
  console.log(`${p.replace(DIST + "/", "")}  raw ${kb(size)}KB → gz ${kb(gz.length)}KB · br ${kb(br.length)}KB`);
}

walk(DIST);
console.log(`pre-compressed assets · ~${kb(saved)}KB saved over raw at the Brotli layer`);
