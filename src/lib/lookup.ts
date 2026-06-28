import type { ArticlesData, FormsData, LemmasData, WordEntry } from "./types";

// Lowercase + NFC + strip leading/trailing non-letters.
export function normalizeToken(raw: string): string {
  return raw
    .normalize("NFC")
    .toLowerCase()
    .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
}

// Split messy pasted text into candidate words, in order (no dedup here — that
// happens in lookupAll, after articles are merged into their nouns).
export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/[^\p{L}'-]+/u)) {
    const t = normalizeToken(raw);
    if (t.length >= 2) out.push(t);
  }
  return out;
}

function entryFor(
  original: string,
  lemma: string,
  zipf: number | null,
  rank: number | null,
  autoBand: WordEntry["autoBand"],
  resolved: WordEntry["resolved"],
): WordEntry {
  return { id: crypto.randomUUID(), original, lemma, zipf, rank, autoBand, resolved };
}

// Resolve a token to its lemma (exact, then inflected form), or null.
function resolveLemma(
  token: string,
  lemmas: LemmasData,
  forms: FormsData,
): string | null {
  if (lemmas.has(token)) return token;
  const l = forms.get(token);
  return l && lemmas.has(l) ? l : null;
}

// Lookup order: exact lemma -> resolve inflected form -> not found.
export function lookupToken(
  token: string,
  lemmas: LemmasData,
  forms: FormsData,
  articles: ArticlesData,
): WordEntry {
  const exact = lemmas.get(token);
  if (exact) {
    const e = entryFor(token, token, exact.z, exact.r, exact.b, "exact");
    const a = articles.get(token);
    if (a) e.article = a;
    return e;
  }

  const lemma = forms.get(token);
  if (lemma) {
    const info = lemmas.get(lemma);
    if (info) {
      const e = entryFor(token, lemma, info.z, info.r, info.b, "form");
      const a = articles.get(lemma);
      if (a) e.article = a;
      return e;
    }
  }

  return entryFor(token, token, null, null, "NF", "none");
}

// Articles to drop when they immediately precede a known noun (we re-attach the
// noun's canonical article for display).
const LEADING_ARTICLES = new Set(["de", "het", "een"]);

export function lookupAll(
  text: string,
  lemmas: LemmasData,
  forms: FormsData,
  articles: ArticlesData,
): WordEntry[] {
  const tokens = tokenize(text);
  const out: WordEntry[] = [];
  const seen = new Set<string>(); // dedup by resolved lemma
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    // "de hond" / "het huis" / "een boek" -> drop the standalone article when
    // the next word is a noun; its canonical article is shown on the noun card.
    if (LEADING_ARTICLES.has(tok) && i + 1 < tokens.length) {
      const nextLemma = resolveLemma(tokens[i + 1], lemmas, forms);
      if (nextLemma && articles.has(nextLemma)) continue;
    }
    const entry = lookupToken(tok, lemmas, forms, articles);
    if (seen.has(entry.lemma)) continue;
    seen.add(entry.lemma);
    out.push(entry);
  }
  return out;
}

// The teachable form shown on a card and copied to lists: nouns carry their
// article ("de hond", "het huis", "de/het rooster").
export function displayName(e: WordEntry): string {
  if (!e.article) return e.lemma;
  const art = e.article === "both" ? "de/het" : e.article;
  return `${art} ${e.lemma}`;
}
