// Bands present in the bundled data (frequency-derived).
export type DataBand = "A1" | "A2" | "B1" | "B2" | "C";
// All board columns, including the runtime-only "Not found".
export type Band = DataBand | "NF";

export interface LemmaInfo {
  z: number; // Zipf score (~1–7)
  r: number; // frequency rank among kept lemmas
  b: DataBand; // computed CEFR band
}

export type LemmasData = Map<string, LemmaInfo>;
export type FormsData = Map<string, string>; // inflected form -> lemma

export type Article = "de" | "het" | "both";
export type ArticlesData = Map<string, Article>; // noun lemma -> article

export interface Source {
  name: string;
  what: string;
  license: string;
  url: string;
}

export interface Meta {
  version: number;
  builtAt: string;
  zipfFloor?: number;
  lemmaCount: number;
  formCount: number;
  rankThresholds?: Record<"A1" | "A2" | "B1" | "B2", number>;
  sources: Source[];
}

// One word on the board.
export interface WordEntry {
  id: string;
  original: string; // token as the user pasted it (normalized)
  lemma: string; // resolved dictionary form (or original if not found)
  zipf: number | null;
  rank: number | null;
  autoBand: Band; // band computed from frequency ("NF" when not found)
  resolved: "exact" | "form" | "none";
  article?: Article; // de/het/both, for nouns
}

// Persisted board: card ids per column + the cards themselves.
export interface BoardState {
  columns: Record<Band, string[]>;
  entries: Record<string, WordEntry>;
}
