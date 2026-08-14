#!/usr/bin/env python3
"""Split the hero plate into a water layer and a koi layer.

`koi-single.webp` is a single flat raster: fish, wake, lily pads and paper all
in one image. That is fine for a still, but it blocks anything that needs the
fish to move independently of the surface — and it is why `Water.tsx` carries
that `waterness()` saturation key, which exists only to stop the shader
rippling the koi like jelly.

This produces:

    pond.webp   the plate with the koi removed, wake left intact
    koi.webp    the koi alone, tight-cropped, with alpha
    koi.json    where the cutout seats in the plate, as fractions

Compositing `koi.webp` back into its seat reproduces the original to within
0.5/255 mean absolute error, so the two-layer resting state is visually the
artwork itself.

## Why the wake stays

The wake is drawn as nested contour lines wrapping the fish's silhouette, so
it *is* fish-shaped. Asking any inpainter to remove the fish and leave calm
water is asking it to fight the strongest cue in the frame — LaMa reads the
wake, infers a fish belongs there, and paints one back. It is also the wrong
thing to want: the wake is the disturbance the koi made, and when the koi
leaves the frame the disturbance should stay behind. Only the silhouette is
filled.

## How the silhouette is filled

1. **Reflection.** Each interior pixel samples the plate at the mirror of
   itself across its nearest boundary point. Shallow pixels pick up the dense
   wake immediately outside; deep ones reach into calmer water. Every stroke
   in the result is a real stroke from this drawing, at the right weight and
   spacing — nothing is hallucinated.
2. **A calm core.** Reflection is meaningless far from any boundary, so the
   middle cross-fades into a real patch of the open water on the left of the
   plate. Correct paper tone, correct pencil grain.
3. **A gradient-domain seat.** The boundary residual is held fixed and Laplace
   is solved across the interior, so the fill inherits whatever the local water
   is doing. A single global tone offset cannot work here: the silhouette
   borders dark churned wake at the head and pale open water at the tail.

An earlier pass used LaMa (`simple-lama-inpainting`) for the fill. It is left
out: at any blur strong enough to dissolve the fish it invented, what remained
was a flat grey plateau with no line structure, which in a drawing made
entirely of contour lines is more conspicuous than the fish was.

## Running it

    uv venv ~/.cache/koi-art --python 3.12
    uv pip install --python ~/.cache/koi-art/bin/python \
        --no-deps rembg
    uv pip install --python ~/.cache/koi-art/bin/python \
        onnxruntime pillow scipy scikit-image opencv-python-headless \
        pooch tqdm jsonschema pymatting "numpy>=2.1,<2.5"
    ~/.cache/koi-art/bin/python scripts/split-koi.py

Two dependency traps, both hit:

- rembg's published pins drag in a numba that refuses to build on Python 3.12,
  hence `--no-deps` plus an explicit list.
- The numpy range is narrow and both ends bite. rembg imports pymatting at
  module scope even when alpha matting is off; pymatting needs numba, numba
  refuses numpy > 2.4, and the scipy that ships for 3.12 refuses numpy < 2.0.

Matting uses **BiRefNet**. u2net and isnet were both tried and both failed on
this subject in the same way: they find the saturated orange patches and drop
the entire cream body, both pectoral fins and the tail, because those sit at
almost exactly the value of the paper behind them.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
HERO = ROOT / "public" / "hero"
SRC = HERO / "koi-single.webp"

# Generous box around the koi. Matting models run at roughly 1024px internally,
# so handing them the whole plate spends most of that budget on empty water and
# leaves the fins under-resolved.
BOX = (1020, 60, 1560, 900)
UPSCALE = 2

# Open water on the left of the plate, used as the calm core of the fill.
CALM = (250, 60, 680, 900)


def blur(a: np.ndarray, r: float) -> np.ndarray:
    img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    return np.asarray(img.filter(ImageFilter.GaussianBlur(r)), dtype=np.float32)


def matte(plate: Image.Image) -> Image.Image:
    """Cut the koi out, returned on a full-plate canvas so later compositing is
    a straight paste with no offset bookkeeping."""
    from rembg import new_session, remove

    crop = plate.crop(BOX)
    big = crop.resize((crop.width * UPSCALE, crop.height * UPSCALE), Image.LANCZOS)
    cut = remove(big, session=new_session("birefnet-general"), post_process_mask=True)
    cut = cut.resize(crop.size, Image.LANCZOS)

    canvas = Image.new("RGBA", plate.size, (0, 0, 0, 0))
    canvas.paste(cut, (BOX[0], BOX[1]))
    return canvas


def silhouette(koi: Image.Image) -> Image.Image:
    """The fill region: the alpha, dilated so the fill is never asked to
    reconstruct right up against the koi's own pencil outline — that outline is
    what leaves a ghost if it survives even faintly."""
    a = np.asarray(koi)[:, :, 3]
    m = Image.fromarray(((a > 8) * 255).astype(np.uint8))
    m = m.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MaxFilter(9))
    return m.filter(ImageFilter.GaussianBlur(2)).point(lambda p: 255 if p > 60 else 0)


def seat(fill: np.ndarray, src: np.ndarray, m: np.ndarray, iters: int = 900) -> np.ndarray:
    """Solve Laplace over the interior with the boundary residual held fixed.

    The correction is smooth by construction, so the fill picks up the local
    water rather than a global average and the join disappears.
    """
    resid = src - fill
    out = np.where(m[:, :, None], 0.0, resid).astype(np.float32)
    known = (~m)[:, :, None]
    for _ in range(iters):
        s = np.zeros_like(out)
        s[1:] += out[:-1]
        s[:-1] += out[1:]
        s[:, 1:] += out[:, :-1]
        s[:, :-1] += out[:, 1:]
        out = np.where(known, resid, s * 0.25)
    return fill + out


def fill_water(plate: Image.Image, mask: Image.Image) -> Image.Image:
    src = np.asarray(plate, dtype=np.float32)
    m = np.asarray(mask) > 0
    h, w = m.shape

    # Reflection — carry the wake's nested contours inward.
    dist, (iy, ix) = ndi.distance_transform_edt(m, return_indices=True)
    yy, xx = np.mgrid[0:h, 0:w]
    mirrored = src[np.clip(2 * iy - yy, 0, h - 1), np.clip(2 * ix - xx, 0, w - 1)]

    # Calm core — real open water, flipped so it does not read as a duplicate
    # of a recognisable passage.
    calm = np.asarray(
        plate.crop(CALM).transpose(Image.FLIP_LEFT_RIGHT), dtype=np.float32
    )
    ch, cw = calm.shape[:2]
    core = np.zeros_like(src)
    for y in range(0, h, ch):
        for x in range(0, w, cw):
            th, tw = min(ch, h - y), min(cw, w - x)
            core[y : y + th, x : x + tw] = calm[:th, :tw]

    d = dist / max(dist.max(), 1.0)
    weight = np.clip(1.0 - d * 2.3, 0.0, 1.0)[:, :, None] ** 1.3
    fill = seat(mirrored * weight + core * (1 - weight), src, m)

    feather = np.asarray(mask.filter(ImageFilter.GaussianBlur(5)), np.float32)[:, :, None] / 255.0
    out = np.clip(fill, 0, 255) * feather + src * (1 - feather)
    return Image.fromarray(out.astype(np.uint8))


def bleed(rgba: Image.Image, passes: int = 12) -> Image.Image:
    """Push the koi's colour outward under its transparent margin.

    Lossy WebP compresses colour and alpha separately, so whatever sits in the
    fully-transparent pixels still bleeds across the edge when the colour plane
    is quantised. Left as saved, those pixels are black, and the koi picks up a
    dark fringe once it is composited over pale water. Flood the colour outward
    first and the fringe has nothing to pull in but more koi.
    """
    a = np.asarray(rgba)[:, :, 3]
    rgb = np.asarray(rgba)[:, :, :3].astype(np.float32).copy()
    known = a > 0
    for _ in range(passes):
        if known.all():
            break
        w = known.astype(np.float32)
        num = np.zeros_like(rgb)
        den = np.zeros_like(w)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            num += np.roll(rgb * w[:, :, None], (dy, dx), (0, 1))
            den += np.roll(w, (dy, dx), (0, 1))
        fill = den > 0
        new = ~known & fill
        rgb[new] = (num[new] / den[new][:, None])
        known = known | new
    return Image.fromarray(
        np.dstack([rgb.astype(np.uint8), a]).astype(np.uint8), "RGBA"
    )


def main() -> None:
    plate = Image.open(SRC).convert("RGB")
    koi = matte(plate)
    mask = silhouette(koi)
    pond = fill_water(plate, mask)

    a = np.asarray(koi)[:, :, 3]
    ys, xs = np.where(a > 4)
    pad = 6
    x0, y0 = max(int(xs.min()) - pad, 0), max(int(ys.min()) - pad, 0)
    x1 = min(int(xs.max()) + pad + 1, plate.width)
    y1 = min(int(ys.max()) + pad + 1, plate.height)
    tight = bleed(koi.crop((x0, y0, x1, y1)))

    pond.save(HERO / "pond.webp", quality=92, method=6)
    tight.save(HERO / "koi.webp", quality=92, method=6, exact=True)

    # Placement as fractions of the plate, so CSS can seat the cutout back into
    # its own hole at any rendered size without hard-coded pixels.
    meta = {
        "plate": {"w": plate.width, "h": plate.height},
        "koi": {"w": tight.width, "h": tight.height},
        "seat": {
            "left": round(x0 / plate.width, 6),
            "top": round(y0 / plate.height, 6),
            "width": round(tight.width / plate.width, 6),
            "height": round(tight.height / plate.height, 6),
        },
    }
    (HERO / "koi.json").write_text(json.dumps(meta, indent=2) + "\n")

    recomp = pond.copy()
    recomp.paste(tight, (x0, y0), tight)
    err = np.abs(
        np.asarray(recomp, np.int16) - np.asarray(plate, np.int16)
    ).mean()
    print(json.dumps(meta, indent=2))
    print(f"recomposite error vs original: {err:.2f}/255")


if __name__ == "__main__":
    main()
