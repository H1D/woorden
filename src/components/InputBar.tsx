import { useState } from "react";

interface Props {
  onSort: (text: string) => void;
  onRegroup: () => void;
  onClear: () => void;
  hasCards: boolean;
  count: number;
}

export function InputBar({ onSort, onRegroup, onClear, hasCards, count }: Props) {
  const [text, setText] = useState("");

  return (
    <section className="input-bar">
      <textarea
        className="input-text"
        placeholder="Paste Dutch words here — messy is fine: commas, line breaks, even whole sentences…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
      />
      <div className="input-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onSort(text)}
          disabled={!text.trim()}
        >
          Sort words
        </button>
        <button
          type="button"
          className="btn"
          onClick={onRegroup}
          disabled={!hasCards}
          title="Re-place every word into its frequency-based level"
        >
          Re-group by level
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setText("");
            onClear();
          }}
          disabled={!hasCards && !text}
        >
          Clear
        </button>
        {hasCards && <span className="count">{count} words</span>}
      </div>
    </section>
  );
}
