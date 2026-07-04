# Harleys in Hawaii — Interactive Lyric Sync Prank

A single-page, mobile-first interactive lyric video with a prank twist.

Land on the page, tap **Start the Ride**, then scroll to try to keep the
lyrics perfectly in sync with the song. It's genuinely hard to nail by hand —
after a bit of struggling, the page calls it out and offers to take over:

> "Hey — you can't really enjoy the song if you keep trying to figure out
> the perfect sync. Lemme just do that for you."
>
> **Can you "sync" for me? ☺️** · **I want to do it myself 😎**

## How it actually works (the math)

- The entire lyrics section is one long scroll — no inner scroll boxes, no
  fake "auto-scroll to element" jumps.
- Every lyric block's height is proportional to how long it lasts in the
  song (`(end - start) * PX_PER_SEC`), so a constant scroll speed maps to a
  constant playback speed. That's the whole "soul" of the sync.
- **Manual mode:** your scroll position is converted into a fraction of the
  lyrics section, multiplied by the song's total duration, and written
  straight to `audio.currentTime`. Scroll steadily at the right pace and it
  sounds perfect; scroll unevenly and the song stutters — that's the joke.
- **Auto mode:** it's the exact inverse. A `requestAnimationFrame` loop
  reads `audio.currentTime` every frame and eases `window.scrollTo` toward
  the matching scroll position, so playback drives the scroll instead of
  the other way around.
- The struggle prompt triggers on either a flat timer or on detecting
  repeated large corrections between where you scrolled and where the audio
  actually was — i.e. it notices when you're actually struggling, not just
  when a clock runs out.

## Add your own song

1. Drop your MP3 at `audio/harleys-in-hawaii.mp3` (see `audio/README.md`).
   The `<audio>` tag already points there — nothing else to wire up.
2. Open `index.html` and edit the `LYRICS` array near the top of the
   `<script>` block. Each entry is:
   ```js
   { start: 28.0, end: 33.8, section: "CHORUS", text: "your lyric line", fx: "sky" }
   ```
   `start`/`end` are seconds into the track. `fx` can be `default`, `vroom`,
   `hula`, `sky`, or `finale` — small pre-built typography animations you
   can assign per line (add your own by following the same pattern in the
   `<style>` block).
3. **Getting real timestamps fast:** open the page with `?tag=1` in the URL
   (e.g. `index.html?tag=1`). Play the song and tap the on-screen panel (or
   press `T`) in time with each new line — it logs `audio.currentTime` to a
   little overlay and the console so you can copy the numbers straight into
   `LYRICS`.

## Run locally

No build step — it's one HTML file.

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

(Audio autoplay requires a user gesture, which is why there's a Start
button — this also works identically once deployed.)

## Deploy

**Vercel:** import this GitHub repo at vercel.com/new — it's a static site,
zero config needed. Just make sure your MP3 makes it into the deployment
(the repo's `.gitignore` keeps audio files out of git by default; either
remove that line for a private repo, or upload the file directly wherever
you host it).

**GitHub Pages:** Settings → Pages → deploy from the branch root. Works the
same way.

## Song reference

- **Track:** Harleys in Hawaii — Katy Perry
- **BPM:** 140
- The lyric snippets baked into `index.html` are intentionally partial
  (verse 2 / bridge / outro are placeholders) — drop in the rest of the
  words and their real timings once you're working with your own copy of
  the song.

## Credits

Designed & built by Naveen (the-entertrainer). Full original design spec in
`DESIGN-DOC.md`.
