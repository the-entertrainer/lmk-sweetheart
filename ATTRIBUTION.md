# Attribution

## Song

**"Let Me Call You Sweetheart"** — words & music by Beth Slater Whitson and
Leo Friedman, published 1910. Both composition and lyrics are in the public
domain in the US.

**Recording used:** *The Jubileers* (vocal quartet & piano), from the series
"Let's All Howl," catalog 1801-A. Digitized 78rpm transfer, hosted on the
Internet Archive:
https://archive.org/details/78_let-me-call-you-sweetheart_the-jubileers-friedman-whitson_gbia0062289a

`audio/let-me-call-you-sweetheart.mp3` is that file, unmodified.

## Lyric timing

Every timestamp in the `LYRICS` array in `index.html` was produced by running
[faster-whisper](https://github.com/SYSTRAN/faster-whisper) (word-level
timestamps) directly on the recording above, then checked against the
printed 1910 lyric sheet. It's transcription-grounded to the actual
waveform, not hand-guessed.

## Ink-doodle flowers (current build)

Every flower/leaf/berry doodle inlined into `index.html`'s `<defs>` block
is **procedurally generated**, not sourced from any stock library —
there are no PNG/JPG image assets in this repo at all besides the paper
texture. Each doodle (daisy, rose, fern, tulip, wildflower, berry branch,
tendril, bud, dot-branch, star-flower…) is built from parametric cubic
bezier curves — petals as radially-arranged almond shapes, a rose as a
wobbled Archimedean spiral, a fern as alternating tick-marks off a central
stem — with small random jitter applied to control points per instance,
so repeated uses of "the same" doodle aren't pixel-identical and read as
sketched rather than computer-perfect. This was written as a one-off
Python generator producing raw SVG path data, visually verified via
headless-browser screenshots, then hand-tuned (three recipes — bell, bud,
tulip — were reworked after the first render didn't read clearly as their
intended shape) before being inlined as SVG `<symbol>` markup. Because
they're vector paths, transparency is native — nothing needed matting.

**A note on what was deliberately *not* used:** an earlier direction for
this project referenced a Dreamstime stock-photo composite of vintage
flower illustrations. It was never used as an asset source at any point
— the preview carried a visible "dreamstime" watermark, meaning it's a
paid-license image, not public domain. An earlier build (superseded by
this one) sourced CC0 rawpixel/Openverse botanical illustrations matching
that same species mix instead; this build replaced those raster images
entirely with the procedural vector doodles described above.

## Design-reference tool used

A Google Stitch MCP endpoint (`stitch.googleapis.com`) was used, at the
user's explicit direction and with a user-supplied API key, purely as a
design-reference generator — it produced a mockup screen and an
accompanying design-system spec ("Botanical Ink & Parchment": paper/ink
color tokens, an SVG-mask "liquid ink blob" button technique, layering
rules for background illustrations). That output informed this build's
button implementation and doodle-opacity/z-index rules; no code or asset
from Stitch's output was copied verbatim into the shipped page — it was
used as a mood board, then hand-implemented in `index.html`. The supplied
API key is not stored anywhere in this repository.

## Texture

`assets/tex/grain.png` is a procedurally generated noise tile (random
per-pixel luminance + alpha), not sourced or hand-drawn — a standard
paper-grain-overlay technique, not illustrative content.

## Fonts

Caveat — via Google Fonts (Open Font License).
