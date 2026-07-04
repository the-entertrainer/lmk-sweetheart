# CLAUDE.md — My Sweetheart

Project-specific knowledge for working in this repo. Also written as a
general skills reference — most of this applies to any Theatre.js /
Three.js / Vite project, not just this one.

## What this project is

A single-page, one-button lyric video for a public-domain 1910 song.
Everything is real: real word-level audio timestamps (faster-whisper), a
real Theatre.js keyframe sequence for all motion, real (procedurally
authored) Three.js glass geometry. See `README.md` for the architecture and
`ATTRIBUTION.md` for every asset's source. Read `src/lyrics-data.mjs` first
— it's the single source of truth that both the runtime page and the
Theatre-state build script import from.

## Theatre.js — advanced patterns learned this session

- **There is no public API for authoring sequenced (tweened) keyframes from
  code** as of `@theatre/core`/`@theatre/studio` 0.7.x —
  `studio.transaction().set()` only writes *static* overrides unless a prop
  has already been flagged "sequenced" via Studio's own right-click UI (see
  [theatre-js/theatre#411](https://github.com/theatre-js/theatre/issues/411),
  still open). If you need to generate a sequence programmatically (e.g.
  from real timing data instead of hand-drawn keyframes), **write the
  on-disk project-state JSON directly** — Theatre.js documents this shape
  as `__UNSTABLE_Project_OnDiskState` and its own source comments say it
  "could also be useful for users who manually edit the project state."
  `tools/build-theatre-state.mjs` in this repo is a complete working
  example: `BasicKeyframedTrack` with bezier keyframes, `trackIdByPropPath`
  keyed by `JSON.stringify([propName])`, one `sheet.object()` call per
  logical thing you want to animate. `@theatre/core` loads and interpolates
  a hand-built state file exactly like a Studio-authored one.
- **One RAF loop for everything.** Theatre.js's own advanced docs are
  explicit: when Theatre.js runs alongside other animation systems (Three.js
  render loop, GSAP, Lenis), put them all in a single `requestAnimationFrame`
  callback so they can't drift or double-schedule. This project sets
  `sheet.sequence.position = audio.currentTime` and calls the Three.js
  `renderer.render()` in the same `frame()` callback in `src/main.js` — do
  not give Three.js its own independent RAF loop.
- **Scrubbing vs. discrete state**: don't force everything through Theatre.
  Continuously-tweened values (position, opacity, camera, hue) belong in
  Theatre tracks. A value that's fundamentally a discrete state change at a
  known timestamp (this word is "sung" now, this word has "entered" now) is
  cheaper and just as accurate as a plain per-frame `t >= word.start`
  comparison toggling a CSS class — don't build hundreds of tiny Theatre
  objects for that; it's more code for no visual benefit. This project
  keeps ~40 Theatre objects (lines, camera, mood, hero objects, curated
  accents) and handles ~130 words' entrance/highlight with one small
  per-frame loop instead.
- **Variable fonts are a legitimate Theatre.js track.** A `weight` prop
  animated 560→720→560 and applied via
  `el.style.fontVariationSettings = "'wght' " + v.weight` gives you a real
  "breathing" emphasis effect for free if your font (Fraunces here) is a
  variable font. Cheap, and reads as far more considered than a bigger
  font-size.

## Three.js — what actually mattered for a "flawless" mobile-friendly scene

- **Free 3D model catalogs are a trap for anything stylized.** Poly Pizza,
  Quaternius, and Kenney (all CC0) were investigated for a heart/flower/
  ribbon model. Poly Pizza/Quaternius's actual download links only resolve
  from their JS-rendered SPA, not a plain HTTP fetch — not reliably
  scriptable. Kenney's zips **are** plain direct-download static files (no
  auth, confirmed working with a bare `curl`), but the content is uniformly
  flat-shaded low-poly game props, which will fight a painterly/glass
  aesthetic. **Lesson: for anything with a specific, considered visual
  target, authoring the geometry procedurally (`THREE.Shape` +
  `ExtrudeGeometry`, including `extrudePath` along a curve for
  ribbon/banner shapes) is often faster and more reliable than sourcing,
  and is fully license-free.** See `src/scene/heroObjects.js`.
- **`MeshPhysicalMaterial` transmission + a `RoomEnvironment` PMREM map**
  (`three/addons/environments/RoomEnvironment.js`, generated once via
  `THREE.PMREMGenerator`) gives a convincing glass look with zero external
  HDRI download. But **tune `envMapIntensity`/`clearcoat`/`roughness`
  down** (this project shipped `envMapIntensity: 1.35, clearcoat: 1,
  roughness: 0.12` first and it blew out to a solid white highlight that
  made pale text sitting in front of it unreadable — dropped to
  `envMapIntensity: 0.8, clearcoat: 0.55, roughness: 0.22`). Glass objects
  sharing the screen with text need to be dimmer than they look "correct"
  in isolation.
- **A hero/decorative 3D object's on-screen size is about the *frustum*,
  not the geometry.** A geometry that looks reasonably sized on a 1400px
  desktop viewport can be either enormous (portrait phone: narrower
  horizontal frustum at the same world-space size reads bigger relative to
  the screen) or **entirely invisible** (if positioned via a fixed
  world-unit x-offset that's outside the frustum on a narrow aspect ratio).
  Fix: store position as a **fraction of the camera's live visible
  half-width** (`Math.tan(fov/2 * Math.PI/180) * distance * aspect`,
  recomputed every frame from the live `camera.aspect`/`fov`/`z`), not a
  raw world-space number. See the `hero-${type}` handling in `src/main.js`
  and the comment in `tools/build-theatre-state.mjs`.
- **Mobile perf checklist actually applied here**: cap
  `devicePixelRatio` (≤1.6 mobile / ≤2 desktop), disable `antialias` on
  small screens, halve the particle count via `matchMedia('(max-width:
  640px)')`, skip continuous rotation/drift updates entirely under
  `prefers-reduced-motion`, keep draw calls low (3 hero objects + 1 Points
  system, nothing per-word in WebGL).
- Canvas-generated soft circular sprite textures (`CanvasRenderingContext2D`
  radial gradient) are a fine, license-free way to get bokeh-style
  particles — no asset download needed at all.

## Vite gotcha that will silently break a production build

**Only files reachable via static analysis (import statements, or literal
`src`/`href` attributes in HTML) get copied into `dist/` by `vite build`.**
Anything referenced only through a runtime-constructed string (this
project's `` `assets/png/${name}` `` in `assetPath()`, or a bare `fetch()`
call to a JSON file) is invisible to the bundler and will work fine in `vite
dev` (which serves the whole project root as a static fallback) but then
silently 404 in `vite build` + `vite preview`/production. **Fix: put
anything referenced by a dynamic/runtime path in the `public/` directory**
(Vite's default `publicDir`) — it's copied to `dist/` root verbatim,
unprocessed, and referenced by the same root-absolute path in dev and prod.
This repo's `public/assets/` (png + `theatre-state.json`) and `public/audio/`
exist for exactly this reason — don't move them back under a
bundler-processed `src/`-adjacent `assets/` without re-checking this.

Also: if a `tools/*.html` file (or anything else with placeholder-syntax
JS like `/* __STATE_INLINE__ */`) sits anywhere under the project root,
Vite's dependency scanner will try to parse it as a real entry and fail the
whole dev server with a cryptic `PARSE_ERROR`. Fix: set
`optimizeDeps.entries: ['index.html']` in `vite.config.js` to scope the
scan.

## Environment-specific tooling notes (this sandbox)

- Chromium is pre-installed but Playwright's default `chromium.launch()`
  looks for a different bundled revision and fails with "Executable doesn't
  exist." Always launch with
  `chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })`.
- Long-running dev servers (`npm run dev`, `vite preview`) **must** be
  started via the Bash tool's `run_in_background: true` param, not a
  manually-backgrounded (`&`/`disown`/`nohup`) shell command — background
  shell jobs get torn down with the parent command in this sandbox even
  when disowned.
- This sandbox's outbound network (via the configured proxy) does not
  appear reachable from a Playwright-launched browser process specifically
  (works fine from `curl`/`WebFetch`/the main shell). Expect
  `ERR_CONNECTION_RESET` on `fonts.googleapis.com` (or any other live
  external host) in Playwright-driven smoke tests — that's a sandbox
  limitation, not a real bug, as long as every same-origin app asset
  responds 200/206.
- `WebFetch` on a client-rendered SPA (Poly Pizza, most model marketplaces)
  returns the markdown-ified static HTML shell, not what a real browser
  would show after JS runs — it will not surface download URLs that a
  React/Vue app fetches client-side. Don't conclude a resource "has no
  download link" from `WebFetch` alone; try a direct `curl` if the site
  might be a plain static host (Kenney is; Poly Pizza is not).

## Self-critique checklist for this kind of "typography + decorative motion"
page (apply after every visual change, not just once)

1. **Screenshot at several real timestamps** (not just t=0) via
   `tools/smoke-test-page.mjs` (`SMOKE_URL=... [SMOKE_MOBILE=1] node
   tools/smoke-test-page.mjs`) — most clutter/contrast bugs in this project
   only showed up once a hero window or specific line was active, never at
   the idle first frame.
2. **Any bright/light-colored 3D or image element sharing the screen with
   pale text**: check contrast at the exact overlap point, not just "does
   the object look good alone." A specular highlight or a light PNG behind
   near-white text is invisible contrast failure, not a subtle one.
3. **Decorative object position**: is it defined in a way that's actually
   responsive to aspect ratio (fraction of frustum/viewport), or a magic
   constant that only happens to work at the one viewport you tested?
4. **Mixed asset styles**: if imagery comes from more than one source
   (or even one flat-icon source next to painterly/3D elements), apply one
   shared color-grade filter (e.g. `sepia() saturate() hue-rotate()`) across
   all of it so it reads as one palette — don't rely on the source assets
   being pre-coordinated.
5. **Any procedurally-generated color** (hue math, gradient offsets):
   actually walk every value it will hit across the real data (every mood
   hue, every variant index), not just the first one — a `hue + 34` offset
   that looks fine at hue 280 silently produced sickly yellow-green at
   hue 38 in this project.
6. **Unused sourced assets**: if you downloaded more clipart/icons than you
   ended up using, decide explicitly (and note in ATTRIBUTION) whether each
   leftover fits the piece's tone — don't leave them referenced nowhere, and
   don't force them in just because they were downloaded.

## Update: pivoting a whole visual direction from a user-provided reference

The design above (plum/blush palette, abstract glass 3D objects, flat
OpenMoji icons) was later **fully replaced** after the user shared a Canva
animation showing the look they actually wanted: warm vintage sunset
gradient, real photographic objects, a rounded-display + brush-script type
pairing, thin line-art doodles. Lessons from that pivot, worth knowing
before starting a similar rebuild:

- **A short video is a far better design reference than a description.**
  When a user says "I designed this in Canva, here's the idea," don't
  settle for a text description or a single static frame — extract multiple
  frames across the clip's duration (`ffmpeg -i clip.mp4 -vf fps=2.5
  frame-%02d.png`, then view several) so you actually see the animation
  arc: what's static from frame 1, what builds in, what holds, what exits.
  A single frame (e.g. an auto-generated video thumbnail) will miss most of
  the intent. `ffmpeg`/`ffprobe` are not preinstalled in this sandbox but
  install cleanly via `apt-get install -y --no-install-recommends ffmpeg`
  (an `apt-get update` first fixes stale-mirror 404s on some packages).
- **The sandbox's Playwright-launched Chromium cannot reach *any* external
  HTTPS host through the configured proxy** — confirmed by testing
  `https://example.com` directly, not just the target site. Explicit
  `chromium.launch({ proxy: { server: 'http://127.0.0.1:<port>' },
  args:['--ignore-certificate-errors'] })` and various flag combinations
  (`--disable-quic`, `--proxy-bypass-list`) did not fix it. This is a
  browser-level limitation distinct from `curl`/`WebFetch`, which *do* work
  fine through the same proxy. Don't burn time debugging this further —
  fall back to `curl`/`WebFetch` for fetching reference content, and note
  the limitation rather than fighting it.
- **Adobe Stock (`asset_search` + `asset_license_and_download_stock` +
  `image_remove_background`) is a far more reliable source of real
  photographic cutouts than scraping small clip-art gallery sites.** Filter
  `pricing: "free"`, prefer `isGenTech: false` results (real photos, not
  AI-generated) if the user wants genuinely real photography, license with
  `asset_license_and_download_stock` (free-tier assets cost nothing),
  then `image_remove_background` gives a clean alpha cutout in one call.
  This licensed 14 real vintage-object photos (gramophone, rotary phone,
  pocket watch, rose, ring, etc.) in a handful of parallel tool-call
  batches — much faster and more reliable than hunting individual
  gallery/stock sites with `curl` (many small sites mislabel vector clip
  art as "photo," or the actual subject doesn't match the search term).
- **A hue offset applied to a CSS gradient stop needs re-checking every
  time the base hue range changes.** The exact "sickly yellow-green" bug
  from the first build (a fixed `+N` hue offset that only becomes a
  problem at certain base hues) recurred in the second build's rewritten
  gradient CSS, because the fix wasn't re-derived for the new palette's hue
  range — it was a *different* line of CSS with the *same* class of bug.
  When you change a palette's hue range, re-walk every value the range will
  hit through any hue-math, don't just carry over "a small offset is fine"
  as a memorized constant.
- **Parallax/decorative layers need a "lane," not a symmetric ± range,
  to reliably avoid a centered text column.** An initial design gave every
  depth tier a symmetric drift range (`-driftX` to `+driftX`), which means
  every layer's path *crosses the center* where the text lives — background
  ("far") tiers with a narrower range are paradoxically *more* likely to
  linger in the center than wide-sweeping foreground tiers. Fix: assign
  each layer to one lateral lane (left-of-center or right-of-center) via
  `laneInner`/`laneOuter` bounds that never cross into the text column's
  half-width, and let only the *outer* bound vary by depth tier (near =
  wide dramatic sweep near the edge, far = narrower band still outside the
  column). Screenshot-test at a timestamp when the relevant layer is
  mid-animation, not just at its start/end pose — the clutter/overlap only
  showed up mid-drift, not in the entrance or exit frames.
- **A sprite's photo shouldn't be forced into a fixed world-unit size.**
  Bake a target *fraction of the camera's on-screen frustum* per depth tier
  (`screenFrac`) and compute the actual world-space width/height from the
  live camera fov/aspect/distance at render time (same technique as the
  frustum-relative x/y positioning above) — this keeps every photo cutout
  correctly sized on any viewport, and keeps near/far depth tiers reading
  as "bigger/closer" vs "smaller/farther" regardless of screen size.
- **`THREE.Sprite` is the right primitive for 2D photo cutouts drifting in
  3D depth** (a classic multiplane-camera parallax technique) — it always
  faces the camera, needs no lighting/environment map (unlike the glass
  `MeshPhysicalMaterial` objects from the first build), and is much cheaper
  to render. If a redesign moves from lit 3D geometry to flat photo
  cutouts, also remove the now-unnecessary `RoomEnvironment`/PMREM/physical
  lights from the Three.js scene setup — don't leave lighting rigged for
  materials that no longer exist.
- **A variable font's actual registered axes matter for
  `font-variation-settings`.** Fraunces has real `opsz`/`wght`/`SOFT` axes;
  Baloo 2 and Caveat (the fonts used in the pivot) only expose `wght`.
  Setting an axis a font doesn't register is harmless (browsers ignore it),
  but don't carry over a multi-axis `font-variation-settings` string from
  one font to a different one without checking which axes the new font
  actually has — it's dead weight at best and confusing to read at worst.
