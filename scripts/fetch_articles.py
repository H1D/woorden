#!/usr/bin/env python3
"""Build a Dutch noun -> article (de/het/both) map for the word sorter.

Source: kaikki.org machine-readable extract of *Dutch* words, parsed from the
English Wiktionary by wiktextract.
  - Page:     https://kaikki.org/dictionary/Dutch/index.html
  - Download: https://kaikki.org/dictionary/Dutch/kaikki.org-dictionary-Dutch.jsonl.gz
              (~28 MB gzipped; one JSON object per line)
  - License:  CC BY-SA 4.0 (Wiktionary content).

Every Dutch noun carries explicit grammatical gender in its `nl-noun` head
template, so de/het is a deterministic lookup, not a guess. Diminutives are
neuter by rule. One download, then fully offline + deterministic.

Run AFTER build_data.py (it reads public/data/lemmas.txt to restrict output):
    .venv/bin/python scripts/fetch_articles.py
Output:
    public/data/articles.txt : "<lemma>\t<article>" lines, article in {de,het,both}
"""
import gzip
import json
import os
import re
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, "..", "public", "data"))
CACHE = os.path.normpath(os.path.join(HERE, "..", "build-cache"))
KAIKKI_URL = "https://kaikki.org/dictionary/Dutch/kaikki.org-dictionary-Dutch.jsonl.gz"
GZ_PATH = os.path.join(CACHE, "kaikki-Dutch.jsonl.gz")

DE_TOKENS = {"m", "f", "c", "mf", "mfbysense"}
HET_TOKENS = {"n"}
PLURAL_TOKENS = {"p"}  # Dutch plurals always take "de"
_GENDER_LETTER = re.compile(r"(?<![a-z])([mfnc])(?![a-z])")


def download(url: str = KAIKKI_URL, dst: str = GZ_PATH) -> str:
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.exists(dst) and os.path.getsize(dst) > 1_000_000:
        return dst
    print(f"Downloading {url} ...", file=sys.stderr)
    urllib.request.urlretrieve(url, dst)
    print(f"  saved {os.path.getsize(dst) / 1e6:.1f} MB", file=sys.stderr)
    return dst


def _ordered_tokens(args: dict) -> list[str]:
    """Gender tokens in order (Wiktionary lists the dominant gender first)."""
    out: list[str] = []
    for key in ("1", "g2", "g3"):
        val = args.get(key)
        if not val:
            continue
        for tok in re.split(r"[;,]", val):
            tok = tok.strip()
            if tok:
                out.append(tok)
    return out


def _bucket(tok: str) -> str | None:
    if tok in HET_TOKENS:
        return "het"
    if tok in DE_TOKENS or tok in PLURAL_TOKENS:
        return "de"
    return None


def noun_article(entry: dict) -> str | None:
    """Return 'de' | 'het' | 'both' | None for one kaikki noun entry."""
    if entry.get("pos") != "noun":
        return None
    word = entry.get("word", "")
    for h in entry.get("head_templates") or []:
        name = h.get("name")
        args = h.get("args") or {}
        if name in ("nl-noun-dim", "nl-noun-dim-tant"):
            return "het"  # Dutch diminutives are always neuter
        if name in ("nl-noun", "nl-noun-adj"):
            buckets = [b for b in (_bucket(t) for t in _ordered_tokens(args)) if b]
            if not buckets:
                seg = h.get("expansion", "")
                if word and seg.startswith(word + " "):
                    seg = seg[len(word) + 1:]
                seg = seg.split("(")[0]
                buckets = [b for b in (_bucket(t) for t in _GENDER_LETTER.findall(seg)) if b]
            if not buckets:
                continue
            has_de = "de" in buckets
            has_het = "het" in buckets
            if has_de and has_het:
                # Clean de+neuter pair = genuine both; 3+ genders -> dominant (first).
                return "both" if len(buckets) == 2 else buckets[0]
            return "de" if has_de else "het"
    return None  # only a "head" template -> inflected form -> skip


def build_article_map(gz_path: str) -> dict[str, str]:
    """lemma -> article. Keep the FIRST (primary etymology) article per lemma."""
    out: dict[str, str] = {}
    with gzip.open(gz_path, "rt", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            entry = json.loads(line)
            art = noun_article(entry)
            if art is None:
                continue
            lemma = (entry.get("word") or "").strip().lower()
            if lemma and lemma not in out:
                out[lemma] = art
    return out


def kept_lemmas() -> set[str]:
    path = os.path.join(DATA, "lemmas.txt")
    out: set[str] = set()
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            tab = line.find("\t")
            if tab > 0:
                out.add(line[:tab])
    return out


def main() -> None:
    gz = download()
    amap = build_article_map(gz)
    keep = kept_lemmas()
    restricted = {l: a for l, a in amap.items() if l in keep}

    os.makedirs(DATA, exist_ok=True)
    out_path = os.path.join(DATA, "articles.txt")
    lines = [f"{l}\t{a}" for l, a in sorted(restricted.items())]
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))

    counts = {"de": 0, "het": 0, "both": 0}
    for a in restricted.values():
        counts[a] += 1
    size_kb = os.path.getsize(out_path) / 1024
    print(
        f"wrote articles.txt: {len(restricted)} nouns "
        f"(de {counts['de']} / het {counts['het']} / both {counts['both']}) "
        f"· {size_kb:.0f} KB",
        file=sys.stderr,
    )
    for probe in ["huis", "hond", "boek", "fiets", "kind", "meisje", "raam", "tafel"]:
        print(f"  {probe} -> {restricted.get(probe)}", file=sys.stderr)


if __name__ == "__main__":
    main()
