import type { BoardState } from "./types";

const KEY = "wfs.board.v1";

export function saveBoard(state: BoardState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private-mode errors — persistence is best-effort
  }
}

export function loadBoard(): BoardState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BoardState) : null;
  } catch {
    return null;
  }
}
