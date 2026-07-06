// Drives the real page (served by `npm run dev`, default http://127.0.0.1:5183)
// through headless Chromium, seeking through the song and screenshotting a
// few points to sanity-check the edition's plates end to end.
// Not part of the shipped site.
import { chromium } from 'playwright';

const BASE_URL = process.env.SMOKE_URL || 'http://127.0.0.1:5183';
const VIEWPORT = process.env.SMOKE_MOBILE
  ? { width: 390, height: 660 }
  : { width: 1400, height: 900 };

// Timestamps chosen to hit each plate mid-composition: cover banter,
// chorus mid-word, chorus complete, each verse plate, reprise, finale.
const SHOTS = [
  [5, 'cover-banter'],
  [17.4, 'chorus-typing'],
  [30, 'chorus-full'],
  [39, 'love-light'],
  [49, 'chorus-b'],
  [67, 'dreaming'],
  [87, 'moonlight'],
  [103, 'land-of-love'],
  [124, 'reprise'],
  [139, 'love-light-2'],
  [156, 'finale-hold'],
];

async function settle(page, ms){
  await page.waitForTimeout(ms);
}

async function main(){
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: process.env.SMOKE_MOBILE ? 3 : 2 });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => { errors.push(String(err)); console.error('[pageerror]', err); });

  await page.goto(BASE_URL, { waitUntil: 'load' });
  // Wait for fonts + the edition to be built (window.__editionReady set by
  // src/main.js), plus a beat for the cover's entrance sequence to finish.
  await page.waitForFunction(() => window.__editionReady === true, { timeout: 15000 });
  await settle(page, 1800);
  await page.screenshot({ path: 'tools/.shot-initial.png' });

  // Click play once to start the render loop, then immediately pause:
  // paused, currentTime only moves when we explicitly set it, so each
  // screenshot lands exactly on its intended timestamp.
  await page.evaluate(() => {
    const audio = document.getElementById('track');
    audio.muted = true;
    document.getElementById('seal-cover').click();
    return audio.play().then(() => audio.pause());
  });

  for (const [t, name] of SHOTS){
    await page.evaluate((time) => { document.getElementById('track').currentTime = time; }, t);
    await settle(page, 1100); // let plate turn + word transitions finish
    const actual = await page.evaluate(() => document.getElementById('track').currentTime);
    console.log(`shot ${name}: target=${t} actual=${actual.toFixed(2)}`);
    await page.screenshot({ path: `tools/.shot-t${t}-${name}.png` });
  }

  await page.evaluate(() => {
    const audio = document.getElementById('track');
    audio.currentTime = audio.duration - 0.05;
    audio.dispatchEvent(new Event('ended'));
  });
  await settle(page, 1600);
  await page.screenshot({ path: 'tools/.shot-colophon.png' });

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
}
main().catch(e => { console.error(e); process.exit(1); });
