import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Band, WordEntry } from "../lib/types";
import { BAND_HINT, BAND_LABEL } from "../lib/banding";
import { SortableCard } from "./WordCard";

interface Props {
  band: Band;
  ids: string[];
  entries: Record<string, WordEntry>;
  onCopy: (band: Band) => void;
  justCopied: boolean;
}

export function Column({ band, ids, entries, onCopy, justCopied }: Props) {
  // Whole column is a droppable so words can be dropped into an empty column.
  const { setNodeRef, isOver } = useDroppable({ id: band });

  return (
    <section className="column" data-band={band} data-over={isOver || undefined}>
      <header className="column-header">
        <span className="column-title">
          <span className="column-dot" />
          {BAND_LABEL[band]}
        </span>
        <span className="column-count">{ids.length}</span>
        <button
          type="button"
          className="btn btn-copy"
          onClick={() => onCopy(band)}
          disabled={ids.length === 0}
          title={`Copy the ${BAND_LABEL[band]} list`}
        >
          {justCopied ? "Copied ✓" : "Copy"}
        </button>
      </header>
      <div className="column-hint">{BAND_HINT[band]}</div>

      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="column-list">
          {ids.map((id) => {
            const entry = entries[id];
            return entry ? (
              <SortableCard key={id} entry={entry} band={band} />
            ) : null;
          })}
          {ids.length === 0 && <div className="column-empty">drop words here</div>}
        </div>
      </SortableContext>
    </section>
  );
}
