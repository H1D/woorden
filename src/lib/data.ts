import { zipfToBand } from "./banding";
import type { Article, ArticlesData, FormsData, LemmasData, Meta } from "./types";

const base = import.meta.env.BASE_URL;

export interface LoadedData {
  lemmas: LemmasData;
  forms: FormsData;
  articles: ArticlesData;
  meta: Meta;
}

// lemmas.txt is "<lemma>\t<zipf>" per line, sorted by Zipf descending — so the
// line index is the rank and the band is derived from the Zipf at load time.
function parseLemmas(text: string): LemmasData {
  const map: LemmasData = new Map();
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const tab = line.indexOf("\t");
    if (tab < 0) continue;
    const word = line.slice(0, tab);
    const z = parseFloat(line.slice(tab + 1));
    map.set(word, { z, r: i + 1, b: zipfToBand(z) });
  }
  return map;
}

// forms.txt is "<inflected form>\t<lemma>" per line.
function parseForms(text: string): FormsData {
  const map: FormsData = new Map();
  for (const line of text.split("\n")) {
    const tab = line.indexOf("\t");
    if (tab < 0) continue;
    map.set(line.slice(0, tab), line.slice(tab + 1));
  }
  return map;
}

// articles.txt is "<noun lemma>\t<de|het|both>" per line.
function parseArticles(text: string): ArticlesData {
  const map: ArticlesData = new Map();
  for (const line of text.split("\n")) {
    const tab = line.indexOf("\t");
    if (tab < 0) continue;
    map.set(line.slice(0, tab), line.slice(tab + 1) as Article);
  }
  return map;
}

export async function loadData(): Promise<LoadedData> {
  const [lemmasTxt, formsTxt, articlesTxt, meta] = await Promise.all([
    fetch(`${base}data/lemmas.txt`).then((r) => r.text()),
    fetch(`${base}data/forms.txt`).then((r) => r.text()),
    fetch(`${base}data/articles.txt`).then((r) => r.text()),
    fetch(`${base}data/meta.json`).then((r) => r.json()),
  ]);
  return {
    lemmas: parseLemmas(lemmasTxt),
    forms: parseForms(formsTxt),
    articles: parseArticles(articlesTxt),
    meta,
  };
}
