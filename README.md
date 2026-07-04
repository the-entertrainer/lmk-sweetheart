# Let Me Call You Sweetheart — An Ink-Doodle Lyric Page

A single-page lyric experience for a genuinely public-domain 1910 love
song. There is exactly one control: a liquid ink-blob play button. Press
it. The page scrolls itself, in time with the music, all the way through
— huge bold handwritten lyric type surfacing over hand-drawn botanical ink
doodles on a plain paper background. No intro screen, no instructions, no
mode toggle, no progress bar. Nothing to configure or get right.

## What's actually in this build

- **Real audio, real timing.** `audio/let-me-call-you-sweetheart.mp3` is a
  1924 Jubileers vocal-quartet recording of the fully public-domain 1910
  song "Let Me Call You Sweetheart" (Leo Friedman / Beth Slater Whitson),
  digitized and hosted by the Internet Archive. Every lyric timestamp in
  `index.html`'s `LYRICS` array came from running
  [faster-whisper](https://github.com/SYSTRAN/faster-whisper) directly on
  that recording — it's transcription-grounded to the actual waveform,
  not guessed.
- **Every flower doodle is procedurally generated, not sourced.** There
  are no image assets at all beyond the audio and a tiny paper-grain
  texture. `assets/clipart/` and third-party stock/clip-art are gone
  entirely. Instead, `index.html` embeds ~18 hand-crafted SVG line-doodle
  symbols (daisy, rose, fern, tulip, wildflower, berry branch, tendril…),
  built from parametric bezier curves with organic per-point jitter so
  they read as sketched, not vector-perfect. Real, native transparency;
  zero licensing question; a few KB total instead of megabytes of PNGs.
  See `ATTRIBUTION.md` for the full method and for why an earlier
  stock-photo reference handed to this project was deliberately *not*
  used (visible Dreamstime watermark = not rights-clear).
- **One control, designed with intent.** The play/pause button is an
  organic ink-blob shape (its own generated bezier path, not a plain
  circle) with a gentle idle "breathing" animation, a squash-and-twist
  press response, an ink-ripple burst on tap, and a rotating icon
  cross-fade between play and pause. Everything else — hero copy, mode
  switches, progress UI, timestamps — was deliberately removed.
- **Doodles draw themselves in.** Each doodle is cloned into the page as
  real `<path>`/`<circle>` elements (not `<use>`, so each stroke's actual
  length is measurable), given a `stroke-dasharray` equal to its own
  length, and revealed via `stroke-dashoffset` as it scrolls into view —
  so it looks like it's being drawn in ink, stroke by stroke, line by
  line, rather than just fading in.

## The math (still the soul of it)

- The whole lyrics section is one continuous scroll — no inner scroll
  boxes, no fake "jump to element" auto-scroll.
- A `buildTimeline()` pass walks the real lyric timestamps and
  auto-inserts filler blocks for every instrumental gap greater than
  0.6s, so the DOM's total height always maps to the *exact* song
  duration with zero unaccounted time — including the ~15s orchestral
  coda near the end, which becomes a dedicated doodle moment instead of
  dead scroll space.
- Each block's height is `(end − start) × 80px/sec`, so a constant
  playback speed maps to a constant scroll speed.
- There is only one direction now: `audio.currentTime` drives scroll
  position (`requestAnimationFrame` reads playback time every frame and
  eases `window.scrollTo` toward the matching position). The earlier
  manual scroll-to-seek "prank" mode has been removed entirely — this
  build has no mode to choose, so there's nothing for it to conflict
  with.

## A note on the design process

Part of this design was informed by Google Stitch (a real, authenticated
`stitch.googleapis.com` MCP endpoint) as a design-reference tool — a
generated mockup and its accompanying design-system spec directly
informed the final ink-blob button technique (an SVG mask/shape rather
than a plain circle), the "doodles sit behind text, faint, textural"
layering rule, and the paper/ink monochrome palette. Nothing from Stitch
was copied verbatim into the shipped code; it was used the way a mood
board or reference render is used, then hand-implemented here.

## Run locally

No build step — it's one HTML file. You do need a server that honors
HTTP Range requests (audio seeking depends on it) — Python's
`http.server` does **not** support these, so seeking silently breaks
against it. Use something that does:

```bash
npx http-server -p 8080 -c-1
# then open http://localhost:8080
```

## Swap in a different song

1. Drop your MP3 at `audio/<name>.mp3` and update the `<audio src>` in
   `index.html`.
2. Get real timestamps fast: run `faster-whisper` on it, or open the page
   with `?tag=1` in the URL and tap along to the track — it logs
   `audio.currentTime` to an on-screen panel you can copy straight into
   the `LYRICS` array.
3. The doodle symbols are plain inline SVG in the `<defs>` block at the
   top of `<body>` — swap `LYRICS`/`GAP_DOODLES` entries to reference
   different `doodle-*` ids, or add new symbols following the same
   pattern (see `gen_doodles.py`-style parametric generation notes in
   `ATTRIBUTION.md`).

## Deploy

**Vercel:** import this GitHub repo at vercel.com/new — zero config,
static site, done.

**GitHub Pages:** Settings → Pages → deploy from the branch root.

## Credits

Song and recording sourcing documented in `ATTRIBUTION.md`. Built by
Naveen (the-entertrainer). Earlier design directions (a Katy Perry
concept, then a maximalist floral rebuild) are kept in `DESIGN-DOC.md`
for reference; this ink-doodle build superseded both.
