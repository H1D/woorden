#!/usr/bin/env python3
"""Generate PWA icons: a small frequency-bar-chart mark in the band colours.

    .venv/bin/pip install pillow
    .venv/bin/python scripts/make_icons.py
"""
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "public", "icons"))
os.makedirs(OUT, exist_ok=True)

BG = (31, 41, 55)  # slate-800
BARS = ["#15a34a", "#0d9488", "#ca8a04", "#ea580c"]  # A1..B2
HEIGHTS = [0.95, 0.74, 0.55, 0.38]  # descending = decreasing frequency


def make(size: int, full_bleed: bool) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if full_bleed:
        d.rectangle([0, 0, size, size], fill=BG)
    else:
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=BG)

    n = len(BARS)
    margin = size * 0.22
    gap = size * 0.045
    avail = size - 2 * margin
    bw = (avail - (n - 1) * gap) / n
    base = size - margin
    for i, color in enumerate(BARS):
        x0 = margin + i * (bw + gap)
        h = avail * HEIGHTS[i]
        d.rounded_rectangle(
            [x0, base - h, x0 + bw, base], radius=int(bw * 0.32), fill=color
        )
    return img


def main() -> None:
    for s in (192, 512):
        make(s, full_bleed=False).save(os.path.join(OUT, f"pwa-{s}.png"))
    make(180, full_bleed=True).save(os.path.join(OUT, "apple-touch-icon.png"))
    print("icons written to", OUT)


if __name__ == "__main__":
    main()
