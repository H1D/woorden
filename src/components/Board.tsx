import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type {
  ArticlesData,
  Band,
  BoardState,
  FormsData,
  LemmasData,
  WordEntry,
} from "../lib/types";
import { COLUMN_ORDER } from "../lib/banding";
import { displayName, lookupAll } from "../lib/lookup";
import { loadBoard, saveBoard } from "../lib/storage";
import { useClipboard } from "../hooks/useClipboard";
import { InputBar } from "./InputBar";
import { Column } from "./Column";
import { CardShell } from "./WordCard";

type Columns = Record<Band, string[]>;

function emptyColumns(): Columns {
  return { A1: [], A2: [], B1: [], B2: [], C: [], NF: [] };
}

// Place every entry into its frequency-derived column, sorted most→least common.
function distribute(entries: Record<string, WordEntry>): Columns {
  const cols = emptyColumns();
  for (const e of Object.values(entries)) cols[e.autoBand].push(e.id);
  for (const band of COLUMN_ORDER) {
    cols[band].sort((a, b) => (entries[b].zipf ?? -1) - (entries[a].zipf ?? -1));
  }
  return cols;
}

function prefersMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
}

interface Props {
  lemmas: LemmasData;
  forms: FormsData;
  articles: ArticlesData;
}

export function Board({ lemmas, forms, articles }: Props) {
  // Restore synchronously via lazy initializers — avoids the effect-order race
  // where an early persist would clobber saved data before a restore lands.
  const [saved] = useState(() => loadBoard());
  const [entries, setEntries] = useState<Record<string, WordEntry>>(
    () => saved?.entries ?? {},
  );
  const [columns, setColumns] = useState<Columns>(() =>
    saved?.columns ? { ...emptyColumns(), ...saved.columns } : emptyColumns(),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const { copiedId, copy } = useClipboard();

  // Persist on every change (state is tiny — ≤50 cards).
  useEffect(() => {
    const state: BoardState = { entries, columns };
    saveBoard(state);
  }, [entries, columns]);

  const count = Object.keys(entries).length;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    // Press-and-hold to drag on touch, so a normal swipe still scrolls the board.
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const withTransition = useCallback((apply: () => void) => {
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => unknown;
    };
    if (doc.startViewTransition && prefersMotion()) {
      doc.startViewTransition(() => flushSync(apply));
    } else {
      apply();
    }
  }, []);

  const handleSort = useCallback(
    (text: string) => {
      const parsed = lookupAll(text, lemmas, forms, articles);
      if (parsed.length === 0) return;
      const map: Record<string, WordEntry> = {};
      for (const e of parsed) map[e.id] = e;
      withTransition(() => {
        setEntries(map);
        setColumns(distribute(map));
      });
    },
    [lemmas, forms, articles, withTransition],
  );

  const handleRegroup = useCallback(() => {
    withTransition(() => setColumns(distribute(entries)));
  }, [entries, withTransition]);

  const handleClear = useCallback(() => {
    setEntries({});
    setColumns(emptyColumns());
  }, []);

  const findColumn = useCallback(
    (id: string): Band | undefined => {
      if (id in columns) return id as Band;
      return COLUMN_ORDER.find((b) => columns[b].includes(id));
    },
    [columns],
  );

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  // Move the card between columns live as it's dragged over them.
  function onDragOver(e: DragOverEvent) {
    const dragId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;
    const from = findColumn(dragId);
    const to = findColumn(overId);
    if (!from || !to || from === to) return;

    setColumns((prev) => {
      const fromItems = prev[from];
      const toItems = prev[to];
      const overIsColumn = overId in prev;
      const overIndex = overIsColumn ? toItems.length : toItems.indexOf(overId);
      const insertAt = overIndex < 0 ? toItems.length : overIndex;
      return {
        ...prev,
        [from]: fromItems.filter((id) => id !== dragId),
        [to]: [...toItems.slice(0, insertAt), dragId, ...toItems.slice(insertAt)],
      };
    });
  }

  // Finalize ordering within the destination column.
  function onDragEnd(e: DragEndEvent) {
    const dragId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    setActiveId(null);
    if (!overId) return;
    const from = findColumn(dragId);
    const to = findColumn(overId);
    if (!from || !to || from !== to) return;

    const items = columns[from];
    const oldIndex = items.indexOf(dragId);
    const newIndex = overId in columns ? items.length - 1 : items.indexOf(overId);
    if (oldIndex !== newIndex && newIndex >= 0) {
      setColumns((prev) => ({ ...prev, [from]: arrayMove(prev[from], oldIndex, newIndex) }));
    }
  }

  const onCopy = useCallback(
    (band: Band) => {
      const words = columns[band]
        .map((id) => {
          const e = entries[id];
          return e ? displayName(e) : null;
        })
        .filter((w): w is string => Boolean(w));
      void copy(words.join("\n"), band);
    },
    [columns, entries, copy],
  );

  const activeEntry = activeId ? entries[activeId] : null;
  const activeBand = activeId ? findColumn(activeId) : undefined;

  return (
    <>
      <InputBar
        onSort={handleSort}
        onRegroup={handleRegroup}
        onClear={handleClear}
        hasCards={count > 0}
        count={count}
      />

      {count === 0 ? (
        <div className="empty-hint">
          Paste a batch of Dutch words above and press <b>Sort words</b>. They&rsquo;ll
          be grouped by how common they are — drag any card to a different level to
          override, then use a column&rsquo;s <b>Copy</b> button.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="board">
            {COLUMN_ORDER.map((band) => (
              <Column
                key={band}
                band={band}
                ids={columns[band]}
                entries={entries}
                onCopy={onCopy}
                justCopied={copiedId === band}
              />
            ))}
          </div>
          <DragOverlay>
            {activeEntry ? (
              <CardShell
                entry={activeEntry}
                band={activeBand ?? activeEntry.autoBand}
                overlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </>
  );
}
