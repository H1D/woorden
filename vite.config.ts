import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const MIME: Record<string, string> = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};

// `vite preview` doesn't negotiate precompressed assets, so serve the .br/.gz
// siblings emitted by scripts/compress_dist.mjs — mirroring a production host
// with brotli_static/gzip_static enabled.
function servePrecompressed(): Plugin {
  const encodings = [
    { enc: "br", ext: ".br" },
    { enc: "gzip", ext: ".gz" },
  ];
  return {
    name: "serve-precompressed",
    apply: "serve",
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const accept = String(req.headers["accept-encoding"] || "");
        const urlPath = (req.url || "/").split("?")[0];
        const filePath = path.join("dist", decodeURIComponent(urlPath));
        for (const { enc, ext } of encodings) {
          if (!accept.includes(enc)) continue;
          const candidate = filePath + ext;
          if (fs.existsSync(candidate)) {
            const type = MIME[path.extname(filePath)];
            if (type) res.setHeader("Content-Type", type);
            res.setHeader("Content-Encoding", enc);
            res.setHeader("Vary", "Accept-Encoding");
            fs.createReadStream(candidate).pipe(res);
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    servePrecompressed(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Dutch Word Sorter",
        short_name: "WordSorter",
        description: "Sort Dutch vocabulary by frequency into CEFR levels.",
        lang: "en",
        theme_color: "#1f2937",
        background_color: "#f6f7f9",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icons/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Re-add `json`+`txt` (overriding globPatterns drops the defaults) so
        // the bundled frequency data is precached for offline use.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2,json,txt}"],
        // Limit counts UNCOMPRESSED bytes; default 2 MiB hard-errors. lemmas.txt
        // is ~1.9 MB raw, so give headroom (transfer is Brotli-compressed).
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
});
