/**
 * Generates public/assets/theatre-state.json — the pre-authored Theatre.js
 * sequence that src/main.js loads into a plain `@theatre/core` project at
 * runtime (no `@theatre/studio` ships to visitors).
 *
 * Theatre.js's own visual Studio (the mouse-driven keyframe editor) has no
 * display to run against in this environment, and — as of 0.7.2 — there is
 * no supported public API for creating sequenced keyframes from code either
 * (`studio.transaction()`'s `set()` only writes *static* overrides unless a
 * prop has already been flagged "sequenced" by Studio's UI; see the
 * still-open https://github.com/theatre-js/theatre/issues/411). So instead
 * of driving a real browser, this writes the on-disk project-state format
 * directly — Theatre.js exports and documents that exact shape as
 * `__UNSTABLE_Project_OnDiskState` for precisely this kind of tooling
 * (its own doc comment on `BasicKeyframedTrack` even says the format
 * "could also be useful for users who manually edit the project state").
 * `@theatre/core` reads it at runtime completely normally — the animation
 * math, easing and interpolation are all real Theatre.js, only the
 * authoring step is code instead of mouse drags.
 *
 * What's sequenced here (each a genuine keyframed track, not per-frame
 * math in the page):
 *  - `line-${i}`   per-line entrance/hold/exit motion + a variable-font
 *                  weight breathe
 *  - `mood`        background hue/warmth crossfade between song sections
 *  - `camera`      a slow, subtle breathing dolly across the whole song
 *  - `photo-${i}`  one per PHOTO_LAYERS entry: a real photo cutout drifting
 *                  across its depth tier's lane (see DEPTH_TIERS) —
 *                  continuous lateral motion for its whole visible window,
 *                  not just an enter/hold/exit pose
 *  - `doodle-${i}` one per DOODLE_LAYERS entry: a thin line-art icon's
 *                  fade/scale/rotate
 *
 * Run with: node tools/build-theatre-state.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LYRICS, PHOTO_LAYERS, DOODLE_LAYERS, DEPTH_TIERS, MOODS, TOTAL_DURATION,
  buildTimeline, VARIANTS,
} from '../src/lyrics-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let uidCounter = 0;
const uid = () => 'kf' + (uidCounter++).toString(36);

/** Builds one BasicKeyframedTrack from [{position, value}, ...], sorted ascending. */
function makeTrack(points){
  const sorted = [...points].sort((a, b) => a.position - b.position);
  return {
    type: 'BasicKeyframedTrack',
    keyframes: sorted.map((p, i) => ({
      id: uid(),
      position: Math.round(Math.max(0, p.position) * 1000) / 1000,
      value: p.value,
      handles: [0.5, 1, 0.5, 0],
      connectedRight: i < sorted.length - 1,
      type: 'bezier',
    })),
  };
}

const tracksByObject = {};

/** propPoints: { propName: [{position, value}, ...] } */
function addObject(objectKey, propPoints){
  const trackIdByPropPath = {};
  const trackData = {};
  for (const propName of Object.keys(propPoints)){
    const tid = uid();
    trackIdByPropPath[JSON.stringify([propName])] = tid;
    trackData[tid] = makeTrack(propPoints[propName]);
  }
  tracksByObject[objectKey] = { trackIdByPropPath, trackData };
}

function pushKf(bucket, t, values){
  for (const k in values){
    (bucket[k] || (bucket[k] = [])).push({ position: Math.max(0, t), value: values[k] });
  }
}

/**
 * Six distinct motion recipes for the lyric lines themselves — a slower,
 * more considered "editorial" feel: bigger depth cues (blur + scale),
 * longer holds, gentler overshoot.
 */
function lineRecipe(variant){
  const R = {
    rise:   { enter:{x:0,y:130,opacity:0,scale:0.94,rotate:0,blur:9},     exit:{x:0,y:-120,opacity:0,scale:1.04,rotate:0,blur:9} },
    zoom:   { enter:{x:0,y:0,opacity:0,scale:0.62,rotate:0,blur:11},      exit:{x:0,y:0,opacity:0,scale:1.28,rotate:0,blur:11} },
    skew:   { enter:{x:0,y:70,opacity:0,scale:0.93,rotate:-9,blur:6},     exit:{x:0,y:-70,opacity:0,scale:0.98,rotate:7,blur:6} },
    blur:   { enter:{x:0,y:26,opacity:0,scale:1,rotate:0,blur:20},        exit:{x:0,y:-26,opacity:0,scale:1,rotate:0,blur:20} },
    drift:  { enter:{x:-150,y:10,opacity:0,scale:0.97,rotate:-4,blur:4},  exit:{x:150,y:-10,opacity:0,scale:0.97,rotate:4,blur:4} },
    bounce: { enter:{x:0,y:190,opacity:0,scale:0.74,rotate:-3,blur:0},    exit:{x:0,y:-130,opacity:0,scale:1.14,rotate:3,blur:0}, overshoot:{scale:1.06} },
  };
  return R[variant];
}
const ARRIVED = { x:0, y:0, opacity:1, scale:1, rotate:0, blur:0 };
const LEAD = 1.7, FADE = 2.1;

const TIMELINE = buildTimeline(LYRICS, TOTAL_DURATION);
let lineIndex = 0;

TIMELINE.forEach((entry) => {
  if (entry.type === 'gap') return; // no per-gap imagery anymore — see PHOTO_LAYERS

  const i = lineIndex++;
  const variant = VARIANTS[i % VARIANTS.length];
  const rec = lineRecipe(variant);
  const bucket = {};

  pushKf(bucket, entry.start - LEAD, rec.enter);
  if (rec.overshoot){
    pushKf(bucket, entry.start + 0.05, Object.assign({}, ARRIVED, rec.overshoot));
    pushKf(bucket, entry.start + 0.4, ARRIVED);
  } else {
    pushKf(bucket, entry.start, ARRIVED);
  }
  pushKf(bucket, entry.end, ARRIVED);
  pushKf(bucket, entry.end + FADE, rec.exit);

  // A gentle variable-font weight breathe on every line's hold — the
  // emphasis lives in the type itself rather than piling on decoration.
  const midpoint = entry.start + (entry.end - entry.start) / 2;
  pushKf(bucket, entry.start, { weight: 550 });
  pushKf(bucket, midpoint, { weight: 680 });
  pushKf(bucket, entry.end, { weight: 550 });

  addObject(`line-${i}`, bucket);
});

// Background mood — hue/warmth crossfade at each section boundary instead
// of a hard cut, so the whole room's color temperature breathes with the
// lyric instead of looping the same gradient under every line.
{
  const hueBucket = {}, warmthBucket = {};
  MOODS.forEach((mood, idx) => {
    const next = MOODS[idx + 1];
    pushKf(hueBucket, mood.start, { hue: mood.hue });
    pushKf(warmthBucket, mood.start, { warmth: mood.warmth });
    if (next){
      const crossStart = Math.max(mood.start, next.start - 3.2);
      pushKf(hueBucket, crossStart, { hue: mood.hue });
      pushKf(warmthBucket, crossStart, { warmth: mood.warmth });
    }
  });
  pushKf(hueBucket, TOTAL_DURATION, { hue: MOODS[MOODS.length - 1].hue });
  pushKf(warmthBucket, TOTAL_DURATION, { warmth: MOODS[MOODS.length - 1].warmth });
  addObject('mood', Object.assign({}, hueBucket, warmthBucket));
}

// Camera — a slow, subtle breathing dolly across the whole song. Kept
// deliberately gentle: the parallax feel now comes from the photo layers'
// own depth-tiered drift, so the camera doesn't need to do much work and
// constant dramatic movement combined with many drifting layers would
// read as seasick rather than cinematic.
{
  const bucket = {};
  for (let t = 0; t <= TOTAL_DURATION; t += 18){
    const phase = (t / 18) % 2;
    pushKf(bucket, t, { z: phase < 1 ? 8.3 : 7.7, fov: 45, yaw: phase < 1 ? 0.035 : -0.035 });
  }
  addObject('camera', bucket);
}

// Photo layers — real cutouts drifting laterally across their whole
// visible window (not just a static hold), each confined to one lane (left
// or right of the text column, never crossing through the middle) so a
// large, fast-moving cutout can never end up sitting on top of the type —
// see DEPTH_TIERS' laneInner/laneOuter in src/lyrics-data.mjs.
PHOTO_LAYERS.forEach((layer, idx) => {
  const tier = DEPTH_TIERS[layer.depth];
  const lane = idx % 2 === 0 ? -1 : 1;
  const outer = lane * (tier.laneOuter + 0.15); // fully offscreen-ish entrance/exit
  const edge = lane * tier.laneOuter;           // its widest sweep, near the screen edge
  const near = lane * tier.laneInner;           // its closest approach to the text column
  const yBase = ((idx % 3) - 1) * 0.24;
  const bucket = {};

  pushKf(bucket, layer.start - 0.6, { opacity:0, scaleMul:0.55, x:outer, y:yBase, rotate: lane * -6 });
  pushKf(bucket, layer.start + 0.5, { opacity:tier.opacity, scaleMul:1, x:edge, y:yBase, rotate: lane * -3 });
  pushKf(bucket, (layer.start + layer.end) / 2, { opacity:tier.opacity, scaleMul:1, x:near, y:yBase + 0.14, rotate:0 });
  pushKf(bucket, layer.end - 0.5, { opacity:tier.opacity, scaleMul:1, x:edge, y:yBase, rotate: lane * 3 });
  pushKf(bucket, layer.end, { opacity:0, scaleMul:0.6, x:outer, y:yBase, rotate: lane * 6 });

  addObject(`photo-${idx}`, bucket);
});

// Doodle line-art accents — thin, cream, decorative punctuation (see
// src/doodles/) fading in and out near (but never under) the text column.
DOODLE_LAYERS.forEach((d, idx) => {
  const bucket = {};
  const side = idx % 2 === 0 ? -1 : 1;
  pushKf(bucket, d.start - 0.5, { opacity:0, scale:0.6, rotate: side * -12 });
  pushKf(bucket, d.start + 0.6, { opacity:0.8, scale:1, rotate: side * -8 });
  pushKf(bucket, d.end - 0.6, { opacity:0.8, scale:1, rotate: side * 8 });
  pushKf(bucket, d.end, { opacity:0, scale:0.7, rotate: side * 12 });
  addObject(`doodle-${idx}`, bucket);
});

const state = {
  sheetsById: {
    Lyrics: {
      staticOverrides: { byObject: {} },
      sequence: {
        type: 'PositionalSequence',
        length: Math.ceil(TOTAL_DURATION) + 5,
        subUnitsPerUnit: 30,
        tracksByObject,
      },
    },
  },
  definitionVersion: '0.4.0',
  revisionHistory: [],
};

const outPath = path.join(ROOT, 'public', 'assets', 'theatre-state.json');
fs.writeFileSync(outPath, JSON.stringify(state));
console.log('wrote', outPath, fs.statSync(outPath).size, 'bytes,', Object.keys(tracksByObject).length, 'objects');
