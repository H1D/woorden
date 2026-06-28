#!/usr/bin/env python3
"""Build the bundled JSON data for the Dutch word-frequency sorter.

Run once on a dev machine (needs `wordfreq` and `simplemma` installed):

    python3 -m venv .venv
    .venv/bin/pip install wordfreq simplemma
    .venv/bin/python scripts/build_data.py

Outputs (committed) to public/data/:
  - lemmas.json : { lemma: {z: zipf, r: rank, b: band} }   (top TOP_LEMMAS by zipf)
  - forms.json  : { inflected_form: lemma }                 (restricted to kept lemmas)
  - meta.json   : version, build date, counts, thresholds, source attributions
"""
import datetime
import json
import os
import re

import simplemma
from wordfreq import get_frequency_dict, zipf_frequency

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "public", "data"))
os.makedirs(OUT, exist_ok=True)

# Keep every lemma at or above this Zipf score. ~1.5 ≈ 1 occurrence per ~30M
# words — near the corpus noise floor, so this captures essentially all real
# Dutch vocabulary. Words below it fall into the app's "Not found" area.
ZIPF_FLOOR = 1.5

# Zipf cutoffs -> CEFR band. Mirrored in src/lib/banding.ts (keep in sync).
THRESHOLDS = {"A1": 5.0, "A2": 4.5, "B1": 4.0, "B2": 3.5}


def zipf_to_band(z: float) -> str:
    if z >= THRESHOLDS["A1"]:
        return "A1"
    if z >= THRESHOLDS["A2"]:
        return "A2"
    if z >= THRESHOLDS["B1"]:
        return "B1"
    if z >= THRESHOLDS["B2"]:
        return "B2"
    return "C"  # too rare / advanced


# Letters (unicode), optionally joined by a single apostrophe or hyphen.
WORD_RE = re.compile(r"^[^\W\d_]+(?:['\-][^\W\d_]+)*$", re.UNICODE)


def acceptable(token: str) -> bool:
    return len(token) >= 2 and bool(WORD_RE.match(token))


def main() -> None:
    print("Loading Dutch frequency dict (large)...")
    freq = get_frequency_dict("nl", wordlist="large")
    print(f"  {len(freq)} surface forms")

    # Process most-frequent-first so the first lemma->form mapping we keep is the
    # one backed by the most frequent surface form (best default for ambiguity).
    items = sorted(freq.items(), key=lambda kv: kv[1], reverse=True)

    forms_map: dict[str, str] = {}   # inflected form -> lemma (form != lemma)
    lemma_zipf: dict[str, float] = {}  # lemma -> its own surface Zipf

    print("Lemmatizing...")
    for word, _ in items:
        w = word.strip().lower()
        if not acceptable(w):
            continue
        try:
            lemma = simplemma.lemmatize(w, lang="nl")
        except Exception:
            continue
        if not lemma:
            continue
        lemma = lemma.strip().lower()
        if not acceptable(lemma):
            continue

        if lemma not in lemma_zipf:
            lz = zipf_frequency(lemma, "nl")
            if lz <= 0:  # lemma itself unseen -> fall back to this form's score
                lz = zipf_frequency(w, "nl")
            lemma_zipf[lemma] = lz

        if w != lemma:
            forms_map.setdefault(w, lemma)

    print(f"  {len(lemma_zipf)} lemmas, {len(forms_map)} inflected forms")

    kept = sorted(
        ((l, z) for l, z in lemma_zipf.items() if z >= ZIPF_FLOOR),
        key=lambda kv: kv[1],
        reverse=True,
    )
    kept_set = {lemma for lemma, _ in kept}

    # Compact format: "<lemma>\t<zipf>" per line, sorted by Zipf descending.
    # Rank is implicit (line index) and the band is derived at load time, which
    # keeps the files small and fast to parse even at full coverage.
    lemmas_lines = [f"{lemma}\t{z:.2f}" for lemma, z in kept]
    forms_out = {f: l for f, l in forms_map.items() if l in kept_set}
    forms_lines = [f"{f}\t{l}" for f, l in forms_out.items()]

    meta = {
        "version": 2,
        "builtAt": datetime.date.today().isoformat(),
        "zipfFloor": ZIPF_FLOOR,
        "lemmaCount": len(kept),
        "formCount": len(forms_out),
        "thresholds": THRESHOLDS,
        "sources": [
            {
                "name": "wordfreq",
                "what": "Word-frequency data for Dutch (Zipf scores), built from "
                "subtitles, Wikipedia, news, books and more.",
                "license": "CC BY-SA 4.0",
                "url": "https://github.com/rspeer/wordfreq",
            },
            {
                "name": "simplemma",
                "what": "Dutch lemmatization dictionary, used to map inflected "
                "words back to their dictionary form.",
                "license": "ODbL",
                "url": "https://github.com/adbar/simplemma",
            },
            {
                "name": "Wiktionary (via kaikki.org)",
                "what": "Dutch noun genders — the de/het article shown with each "
                "noun — parsed from Wiktionary by wiktextract.",
                "license": "CC BY-SA 4.0",
                "url": "https://kaikki.org/dictionary/Dutch/",
            },
        ],
    }

    def write(name: str, text: str) -> None:
        path = os.path.join(OUT, name)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"  wrote {name}: {os.path.getsize(path) / 1024:.0f} KB")

    print("Writing artifacts...")
    write("lemmas.txt", "\n".join(lemmas_lines))
    write("forms.txt", "\n".join(forms_lines))
    write("meta.json", json.dumps(meta, ensure_ascii=False, separators=(",", ":")))

    # Drop stale files from the previous JSON format, if present.
    for old in ("lemmas.json", "forms.json"):
        p = os.path.join(OUT, old)
        if os.path.exists(p):
            os.remove(p)
            print(f"  removed stale {old}")

    # Spot-check a few known words for sanity.
    kept_dict = dict(kept)
    print("Spot-check:")
    for probe in ["de", "huis", "fiets", "lopen", "ingewikkeld", "raszuiver"]:
        z = kept_dict.get(probe)
        band = zipf_to_band(z) if z is not None else None
        print(f"  {probe!r}: z={z} band={band}")
    for form in ["huizen", "gelopen", "mooie", "raszuivere"]:
        print(f"  {form!r} -> {forms_out.get(form)!r}")
    print("Done.")


if __name__ == "__main__":
    main()
