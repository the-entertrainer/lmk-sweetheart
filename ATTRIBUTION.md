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

## Clip art (vintage botanical flowers)

`assets/clipart/` holds CC0-licensed vintage botanical illustrations —
roses, lilac, poppy, hydrangea, carnation, daisy, and wildflower sprays —
sourced via the [Openverse](https://openverse.org) aggregator (mostly
rawpixel.com's public-domain vintage-illustration collection, several of
which are themselves digitized from 19th/early-20th-century engravings on
openclipart.org). The as-served files had a checkerboard baked into the
raster as a "this is transparent" preview indicator rather than real
alpha; a local script (luminance-threshold + border-connected flood fill)
reconstructed genuine transparency before these were saved into the repo.
No illustration here was hand-drawn or AI-generated — all are sourced,
public-domain source material, only background-matted programmatically.

**A note on what was deliberately *not* used:** an earlier direction for
this project referenced a Dreamstime stock-photo composite of vintage
flower illustrations. It was not used as an asset source — the preview
carries a visible "dreamstime" watermark, meaning it's a paid-license
image, not public domain. The flowers actually shipped here were
independently sourced to match that same species mix (rose, pansy, lilac,
lily, carnation, wildflower) from genuinely CC0/public-domain material
instead.

## Texture

`assets/tex/grain.png` is a procedurally generated noise tile (random
per-pixel luminance + alpha), not sourced or hand-drawn — standard
film-grain-overlay technique, not illustrative content.

## Fonts

Bodoni Moda and Cormorant Garamond — via Google Fonts (Open Font
License).
