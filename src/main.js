import { LYRICS, PLATES, CAPTION, TOTAL_DURATION, assetPath } from './lyrics-data.mjs';
import './style.css';

const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;

const audio = document.getElementById('track');
const edition = document.getElementById('edition');
const colophon = document.getElementById('colophon');
const tcNow = document.getElementById('tc-now');
const tcTotal = document.getElementById('tc-total');
const ruleFill = document.getElementById('rule-fill');
const folio = document.getElementById('folio');

// ---------------------------------------------------------------------
// Timed cues. Every word span registers one cue {t, el}; the render loop
// walks a sorted pointer forward and adds .sung as each timestamp is
// crossed. Seeking backwards resets every cue from scratch — O(n) only
// on a backward seek, and idempotent in both directions.
// ---------------------------------------------------------------------
const cues = [];
function cue(el, t){ cues.push({ t, el }); }

const SWASH = '<svg class="swash" viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M4 15 C 70 5, 170 21, 296 9" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>';

function buildWordSpan(cls, word){
  const s = document.createElement('span');
  s.className = cls;
  s.textContent = word.w;
  cue(s, word.s);
  return s;
}

function buildSpokenLine(spec){
  const line = LYRICS[spec.line];
  const div = document.createElement('div');
  div.className = 'spoken';
  line.words.forEach((word, i) => {
    if (i) div.append(' ');
    div.append(buildWordSpan('sw', word));
  });
  return div;
}

function buildKw(word){
  const kw = document.createElement('span');
  kw.className = 'kw';
  const dur = Math.min(Math.max(word.e - word.s, 0.45), 1.1);
  kw.style.setProperty('--kwdur', dur.toFixed(2) + 's');
  const inner = document.createElement('span');
  inner.className = 'kw-in';
  inner.textContent = word.w;
  kw.append(inner);
  kw.insertAdjacentHTML('beforeend', SWASH);
  cue(kw, word.s);
  return kw;
}

function buildPlate(plate, index){
  const sec = document.createElement('section');
  sec.className = 'plate spread';
  sec.id = `plate-${index}`;

  const txt = document.createElement('div');
  txt.className = 'txt';

  const kick = document.createElement('div');
  kick.className = 'kick';
  kick.innerHTML = `<span class="no">PLATE Nº ${plate.roman}</span><span class="sec">${plate.section}</span>`;
  txt.append(kick);

  if (plate.headline){
    const line = LYRICS[plate.headline.line];
    const hl = document.createElement('div');
    hl.className = 'hl';
    for (let i = plate.headline.from; i <= plate.headline.to; i++){
      if (i > plate.headline.from) hl.append(' ');
      const slot = document.createElement('span');
      slot.className = 'slot';
      slot.append(buildWordSpan('w', line.words[i]));
      hl.append(slot);
    }
    if (plate.kw && plate.kw.kwAfter){
      const kw = buildKw(LYRICS[plate.kw.line].words[plate.kw.at]);
      kw.classList.add('inline');
      hl.append(' ', kw);
    }
    txt.append(hl);
  }
  if (plate.kw && !plate.kw.kwAfter){
    txt.append(buildKw(LYRICS[plate.kw.line].words[plate.kw.at]));
  }
  if (plate.deck){
    const deck = document.createElement('div');
    deck.className = 'deck';
    plate.deck.forEach((range, di) => {
      if (di) deck.append(document.createElement('br'));
      const line = LYRICS[range.line];
      for (let i = range.from; i <= range.to; i++){
        if (i > range.from) deck.append(' ');
        deck.append(buildWordSpan('dw', line.words[i]));
      }
    });
    txt.append(deck);
  }
  (plate.spoken || []).forEach(spec => txt.append(buildSpokenLine(spec)));
  sec.append(txt);

  if (plate.fig){
    const par = document.createElement('div');
    par.className = 'figpar';
    const fig = document.createElement('figure');
    fig.className = `figwrap ${plate.fig.size}${plate.fig.tone ? ' ' + plate.fig.tone : ''}`;
    const img = document.createElement('img');
    img.src = assetPath(plate.fig.img);
    img.alt = plate.fig.caption;
    img.decoding = 'async';
    const cap = document.createElement('figcaption');
    cap.className = 'figcap';
    cap.textContent = `FIG. ${plate.roman} — ${plate.fig.caption}`;
    fig.append(img, cap);
    par.append(fig);
    sec.append(par);
  }
  return sec;
}

// ---------------------------------------------------------------------
// Build the edition. Plate I (the cover) is static HTML; its banter
// lines, the standfirst, and plates II..X are filled in here.
// ---------------------------------------------------------------------
document.getElementById('cover-stand').textContent = CAPTION.text;
document.getElementById('meta-caption').textContent = CAPTION.text;
tcTotal.textContent = fmt(TOTAL_DURATION);

const banter = document.getElementById('cover-banter');
(PLATES[0].spoken || []).forEach(spec => banter.append(buildSpokenLine(spec)));

const plateEls = [document.getElementById('plate-0')];
PLATES.slice(1).forEach((plate, i) => {
  const el = buildPlate(plate, i + 1);
  edition.insertBefore(el, colophon);
  plateEls.push(el);
});

cues.sort((a, b) => a.t - b.t);
let cueIdx = 0;
let lastT = -1;

function applyCues(t){
  if (t < lastT - 0.05){
    // backward seek: recompute every cue from scratch
    cueIdx = 0;
    for (const c of cues){
      c.el.classList.toggle('sung', t >= c.t);
      if (t >= c.t) cueIdx++;
    }
  } else {
    while (cueIdx < cues.length && t >= cues[cueIdx].t){
      cues[cueIdx].el.classList.add('sung');
      cueIdx++;
    }
  }
  lastT = t;
}

// ---------------------------------------------------------------------
// Plate turns + the colophon
// ---------------------------------------------------------------------
let shownPlate = 0;
let showingColophon = false;

function activePlateIndex(t){
  let idx = 0;
  for (let i = 1; i < PLATES.length; i++){
    if (t >= PLATES[i].enter) idx = i;
  }
  return idx;
}

function setPlate(i){
  plateEls.forEach((el, idx) => {
    el.classList.toggle('on', idx === i && !showingColophon);
    el.classList.toggle('done', idx < i || showingColophon);
  });
  colophon.classList.toggle('on', showingColophon);
  document.body.classList.toggle('inplates', i >= 1 && !showingColophon);
  folio.textContent = showingColophon
    ? 'COLOPHON'
    : (i === 0 ? `COVER · ${PLATES.length} PLATES` : `${PLATES[i].roman} / ${PLATES[PLATES.length - 1].roman}`);
  shownPlate = i;
}

// ---------------------------------------------------------------------
// Pointer parallax — two lerped CSS variables the figures multiply.
// ---------------------------------------------------------------------
let targetPX = 0, targetPY = 0, px = 0, py = 0;
if (!REDUCED_MOTION){
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    targetPX = (e.clientX / window.innerWidth) * 2 - 1;
    targetPY = (e.clientY / window.innerHeight) * 2 - 1;
  });
}

// ---------------------------------------------------------------------
// The render loop — one RAF for everything, scrubbed to audio time.
// ---------------------------------------------------------------------
function fmt(t){
  t = Math.max(0, Math.min(t, TOTAL_DURATION));
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

let rafId = null;
let lastNow = performance.now();
let lastTc = '';

function frame(now){
  const dt = Math.min((now - lastNow) / 1000, 0.1);
  lastNow = now;
  const t = audio.currentTime;

  applyCues(t);

  const idx = activePlateIndex(t);
  const wantColophon = audio.ended || t >= TOTAL_DURATION - 0.05;
  if (idx !== shownPlate || wantColophon !== showingColophon){
    showingColophon = wantColophon;
    setPlate(idx);
  }

  const tc = fmt(t);
  if (tc !== lastTc){ tcNow.textContent = tc; lastTc = tc; }
  ruleFill.style.width = (Math.min(t, TOTAL_DURATION) / TOTAL_DURATION * 100).toFixed(2) + '%';

  if (!REDUCED_MOTION){
    const k = Math.min(dt * 3.2, 1);
    px += (targetPX - px) * k;
    py += (targetPY - py) * k;
    edition.style.setProperty('--px', px.toFixed(3));
    edition.style.setProperty('--py', py.toFixed(3));
  }

  rafId = requestAnimationFrame(frame);
}

function startLoop(){
  if (!rafId){
    lastNow = performance.now();
    rafId = requestAnimationFrame(frame);
  }
}

function togglePlay(){
  if (audio.paused){
    if (audio.ended || audio.currentTime >= TOTAL_DURATION - 0.05){
      audio.currentTime = 0;
      showingColophon = false;
    }
    audio.play();
    document.body.classList.add('playing');
    startLoop();
  } else {
    audio.pause();
    document.body.classList.remove('playing');
  }
}

document.getElementById('seal-cover').addEventListener('click', togglePlay);
document.getElementById('seal-dock').addEventListener('click', togglePlay);
document.getElementById('seal-replay').addEventListener('click', togglePlay);

audio.addEventListener('ended', () => {
  document.body.classList.remove('playing');
});

// First paint: cover standing, apparatus zeroed. The loop only runs once
// playback starts (battery-conscious; the cover's entrance is pure CSS).
setPlate(0);
applyCues(0);

// Readiness flag for tools/smoke-test-page.mjs.
if (document.fonts && document.fonts.ready){
  document.fonts.ready.then(() => { window.__editionReady = true; });
} else {
  window.__editionReady = true;
}
