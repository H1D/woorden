import { useEffect, useState } from "react";
import { loadData, type LoadedData } from "./lib/data";
import { Board } from "./components/Board";
import { AboutDialog } from "./components/AboutDialog";

export default function App() {
  const [data, setData] = useState<LoadedData | null>(null);
  const [error, setError] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    loadData()
      .then((d) => alive && setData(d))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <h1>Dutch Word Sorter</h1>
          <p className="app-tagline">
            Group vocabulary by how common it is — so students learn the top words
            first.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost about-btn"
          onClick={() => setAboutOpen(true)}
        >
          ⓘ About
        </button>
      </header>

      {error && (
        <div className="notice notice-error">
          Could not load the word data. If you&rsquo;re offline and haven&rsquo;t
          opened the app online yet, reconnect once so it can cache.
        </div>
      )}
      {!data && !error && <div className="notice">Loading word data…</div>}
      {data && (
        <Board lemmas={data.lemmas} forms={data.forms} articles={data.articles} />
      )}

      <AboutDialog
        meta={data?.meta ?? null}
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
      />
    </div>
  );
}
