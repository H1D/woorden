import { useEffect, useRef } from "react";
import type { Meta } from "../lib/types";

interface Props {
  meta: Meta | null;
  open: boolean;
  onClose: () => void;
}

// Frequency bands shown in the explainer table, by "top N most common words".
const BAND_ROWS: { band: string; label: string; rank: string }[] = [
  { band: "A1", label: "A1", rank: "the 750 most common" },
  { band: "A2", label: "A2", rank: "≈ 750 – 1,500" },
  { band: "B1", label: "B1", rank: "≈ 1,500 – 3,000" },
  { band: "B2", label: "B2", rank: "≈ 3,000 – 6,000" },
  { band: "C", label: "C1/C2 — advanced / rare", rank: "rarer than 6,000" },
];

export function AboutDialog({ meta, open, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  // Drive the native dialog imperatively from `open` (the reflected `open`
  // attribute would render a *non-modal* dialog with no backdrop/focus-trap).
  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    else if (!open && dlg.open) dlg.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="about"
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        // Clicks on the backdrop report the <dialog> itself as the target.
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="about-inner">
        <div className="about-head">
          <h2>About this tool</h2>
          <form method="dialog">
            <button className="btn btn-ghost" aria-label="Close">
              ✕
            </button>
          </form>
        </div>

        <details name="about" open>
          <summary>What this does</summary>
          <p>
            Paste a batch of Dutch words and this tool groups them by how common
            they are in everyday Dutch — which roughly tracks CEFR level
            (A1–B2). Words are placed automatically; drag any card to a
            different level to fine-tune, then copy each level&rsquo;s list for
            your lesson. Nouns are shown with their <b>de</b>/<b>het</b> article
            — paste &ldquo;hond&rdquo; or &ldquo;de hond&rdquo;, either works.
          </p>
        </details>

        <details name="about">
          <summary>How it decides the level</summary>
          <p>
            Every word is ranked by how common it is in everyday Dutch — rank #1
            is the single most common word. A word&rsquo;s level is simply the
            band its rank falls into:
          </p>
          <table className="band-table">
            <tbody>
              {BAND_ROWS.map((r) => (
                <tr key={r.band}>
                  <td>
                    <span
                      className="band-swatch"
                      style={{ background: `var(--band-${r.band})` }}
                    />
                    {r.label}
                  </td>
                  <td>{r.rank}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            It&rsquo;s a smart starting guess, not an official CEFR ruling — so
            you can drag words around. A word lands in <b>Not found</b> only when
            it&rsquo;s missing from the data entirely (usually a typo, a name, or
            a non-Dutch word), and some words look off because forms like{" "}
            <i>was</i> can mean both <i>zijn</i> and <i>wassen</i>. Roughly 1 in
            10 words may need a manual nudge.
          </p>
        </details>

        <details name="about">
          <summary>Where the data comes from</summary>
          <p>
            Word frequency is computed with <b>wordfreq</b>, which blends five
            independent Dutch corpora — Wikipedia, film &amp; TV subtitles
            (OpenSubtitles / SUBTLEX), news, web text (OSCAR) and Twitter — and
            drops the highest and lowest outlier source per word so no single
            corpus dominates (see the{" "}
            <a
              href="https://github.com/rspeer/wordfreq#sources-and-supported-languages"
              target="_blank"
              rel="noreferrer noopener"
            >
              wordfreq docs
            </a>
            ).
          </p>
          {meta ? (
            meta.sources.map((s) => (
              <div className="src" key={s.name}>
                <div className="src-name">
                  <a href={s.url} target="_blank" rel="noreferrer noopener">
                    {s.name}
                  </a>
                </div>
                <div>{s.what}</div>
              </div>
            ))
          ) : (
            <p>Loading…</p>
          )}
        </details>

        <details name="about">
          <summary>Legal &amp; licenses</summary>
          <p>
            This is a personal teaching aid, not an official CEFR authority. It
            reuses open language data under the terms below — credit to their
            authors:
          </p>
          {meta?.sources.map((s) => (
            <div className="src" key={s.name}>
              <span className="src-name">{s.name}</span>
              <span className="lic">
                {" "}
                —{" "}
                <a href={s.url} target="_blank" rel="noreferrer noopener">
                  {s.license}
                </a>
              </span>
            </div>
          ))}
        </details>

        {meta && (
          <p className="about-meta">
            Data v{meta.version} · built {meta.builtAt} ·{" "}
            {meta.lemmaCount.toLocaleString()} words ·{" "}
            {meta.formCount.toLocaleString()} inflected forms
          </p>
        )}
        <p className="about-meta">
          <a
            href="https://github.com/H1D/woorden"
            target="_blank"
            rel="noreferrer noopener"
          >
            Source code on GitHub ↗
          </a>
        </p>
      </div>
    </dialog>
  );
}
