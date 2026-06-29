import type { CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Band, WordEntry } from "../lib/types";
import { BAND_LABEL, zipfToFill } from "../lib/banding";
import { displayName } from "../lib/lookup";

// Some very recent CSS props (anchor-name, position-anchor, view-transition-name)
// aren't in React's CSSProperties type yet — funnel them through this cast.
function css(vars: Record<string, string>): CSSProperties {
  return vars as CSSProperties;
}

// The inner card content, shared by the sortable card and the drag overlay.
// `interactive` is false in the overlay so we don't duplicate the popover id.
function CardContent({
  entry,
  band,
  interactive,
}: {
  entry: WordEntry;
  band: Band;
  interactive: boolean;
}) {
  const fill = Math.round(zipfToFill(entry.zipf) * 100);
  const showOriginal = entry.original !== entry.lemma;
  const popId = `pop-${entry.id}`;
  const anchor = `--anchor-${entry.id}`;

  return (
    <>
      <div className="card-top">
        <div className="card-words">
          <span className="card-lemma">{displayName(entry)}</span>
          {showOriginal && (
            <span className="card-from">from &ldquo;{entry.original}&rdquo;</span>
          )}
        </div>
        {interactive && (
          <button
            type="button"
            className="card-info"
            popoverTarget={popId}
            aria-label={`Details for ${entry.lemma}`}
            style={css({ anchorName: anchor })}
            onPointerDown={(e) => e.stopPropagation()}
          >
            i
          </button>
        )}
      </div>

      {entry.resolved === "none" ? (
        <span className="card-nf-tag">not in frequency data</span>
      ) : (
        <div className="bar" aria-label={`frequency ${fill}%`} role="img">
          <span className="bar-fill" style={{ width: `${fill}%` }} />
        </div>
      )}

      {interactive && (
        <div
          id={popId}
          popover="auto"
          className="popover"
          data-band={band}
          style={css({ positionAnchor: anchor })}
        >
          <strong className="popover-band">{BAND_LABEL[band]}</strong>
          {entry.rank != null ? (
            <ul className="popover-list">
              <li>#{entry.rank.toLocaleString()} most common word</li>
              {entry.resolved === "form" && <li>Counted as &ldquo;{entry.lemma}&rdquo;</li>}
            </ul>
          ) : (
            <p className="popover-note">
              This word isn&rsquo;t in the frequency data — likely a typo, a
              name, or a non-Dutch word.
            </p>
          )}
        </div>
      )}
    </>
  );
}

// Plain shell used by the DragOverlay (not draggable itself).
export function CardShell({
  entry,
  band,
  overlay,
}: {
  entry: WordEntry;
  band: Band;
  overlay?: boolean;
}) {
  return (
    <div className={overlay ? "card card-overlay" : "card"} data-band={band}>
      <CardContent entry={entry} band={band} interactive={false} />
    </div>
  );
}

// Draggable, sortable card living inside a column.
export function SortableCard({ entry, band }: { entry: WordEntry; band: Band }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entry.id });

  const style = css({
    transform: CSS.Translate.toString(transform) ?? "",
    transition: transition ?? "",
    viewTransitionName: `card-${entry.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      className="card"
      data-band={band}
      data-dragging={isDragging || undefined}
      style={style}
      {...attributes}
      {...listeners}
    >
      <CardContent entry={entry} band={band} interactive={!isDragging} />
    </div>
  );
}
