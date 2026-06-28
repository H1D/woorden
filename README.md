# woorden

A small, offline-first PWA that helps a Dutch teacher sort vocabulary by how
common it is, so students learn the most-used words first. Paste messy Dutch
text → words are lemma-resolved, scored by frequency, and grouped into a
drag-and-drop board of CEFR columns (**A1 · A2 · B1 · B2 · C1/C2 · Not found**).
Nouns show their **de/het** article, and each column has a one-click copy.

**Live: https://woorden.artems.net**

## How it works

- **Frequency** comes from [wordfreq](https://github.com/rspeer/wordfreq) — a
  word's Zipf score is `log10(occurrences per billion words)`, blending five
  Dutch corpora (Wikipedia, subtitles, news, web, Twitter). CEFR bands are
  derived from Zipf and live in `src/lib/banding.ts`.
- **Lemmatization** (e.g. `gelopen → lopen`, `huizen → huis`) via
  [simplemma](https://github.com/adbar/simplemma).
- **de/het articles** for nouns via
  [Wiktionary / kaikki.org](https://kaikki.org/dictionary/Dutch/).
- Data is built offline into compact `public/data/*.txt`, precached by a service
  worker for full offline use, and served Brotli-compressed.

## Tech

Vite + React 19 + TypeScript, [@dnd-kit](https://dndkit.com/), and
vite-plugin-pwa. Leans on the native web platform where possible: `<dialog>`,
the Popover API, View Transitions, exclusive `<details>` accordions, and
`color-mix()` for the CEFR colour system.

## Develop

```sh
bun install
bun run dev          # http://localhost:5173
bun run build        # production build → dist/ (also pre-compresses .br/.gz)
bun run preview      # serve the built PWA (with Brotli)
```

### Regenerate the Dutch data

```sh
python3 -m venv .venv
.venv/bin/pip install wordfreq simplemma
bun run build:data   # writes public/data/{lemmas,forms,articles}.txt + meta.json
```

`build:data` downloads the kaikki Wiktionary extract (~28 MB) into `build-cache/`
(gitignored) the first time, to derive noun genders.

## Data licenses

Bundled language data is reused under its original licenses — please keep the
attribution shown in the app's **About** dialog:

- **wordfreq** — CC BY-SA 4.0
- **simplemma** — ODbL
- **Wiktionary** (via kaikki.org) — CC BY-SA 4.0
