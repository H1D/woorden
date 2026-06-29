import type { Band, DataBand } from "./types";

// Column order, left to right (most common -> least / not found).
export const COLUMN_ORDER: Band[] = ["A1", "A2", "B1", "B2", "C", "NF"];

export const BAND_LABEL: Record<Band, string> = {
  A1: "A1",
  A2: "A2",
  B1: "B1",
  B2: "B2",
  C: "C1/C2",
  NF: "Not found",
};

export const BAND_HINT: Record<Band, string> = {
  A1: "Most common — core beginner words",
  A2: "Very common — high beginner",
  B1: "Common — intermediate",
  B2: "Less common — upper intermediate",
  C: "Advanced (C1/C2) — rare in everyday Dutch",
  NF: "Not in the data — likely a typo, a name, or non-Dutch",
};

// Frequency-RANK cutoffs -> CEFR band (rank 1 = most common lemma). These give
// round, teacher-friendly "top N words" bands and match the classic CEFR
// vocabulary-size convention (A2≈1k, B1≈2k, B2≈4k). Keep in sync with
// scripts/build_data.py.
export const RANK_THRESHOLDS = { A1: 750, A2: 1500, B1: 3000, B2: 6000 } as const;

export function rankToBand(rank: number): DataBand {
  if (rank <= RANK_THRESHOLDS.A1) return "A1";
  if (rank <= RANK_THRESHOLDS.A2) return "A2";
  if (rank <= RANK_THRESHOLDS.B1) return "B1";
  if (rank <= RANK_THRESHOLDS.B2) return "B2";
  return "C";
}

// The frequency bar fills across the *meaningful* window (~Zipf 3–7). Below 3
// is effectively "rare" regardless, so anchoring the bar at 3 keeps it
// informative instead of every teachable word looking nearly full.
const BAR_MIN = 3;
const BAR_MAX = 7;

export function zipfToFill(z: number | null): number {
  if (z == null) return 0;
  return Math.max(0, Math.min(1, (z - BAR_MIN) / (BAR_MAX - BAR_MIN)));
}
