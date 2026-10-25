// Profiling harness. Usage: BASE=http://localhost:4173/ node scripts/qa/perf.cjs [cpuThrottle=1] [out.json]
// NOTE: headless Chromium + software GL (SwiftShader) on a server CPU. Absolute frame times are NOT representative of a phone GPU;
// counts (canvases, draw calls, textures, long tasks, idle renders, memory growth) are meaningful and comparable between builds.
const { chromium } = require('playwright');
const fs = require('fs');
const throttle = Number(process.argv[2] || 1);
const out = process.argv[3];
const BASE = process.env.BASE || 'http://localhost:4173/';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'he-IL', timezoneId: 'America/New_York' });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await page.addInitScript(() => {
    window.__perf = { canvases: 0, long: [], raf: 0, t0: performance.now() };
    const ce = document.createElement.bind(document);
    document.createElement = (t, o) => { if (String(t).toLowerCase() === 'canvas') window.__perf.canvases++; return ce(t, o); };
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => { window.__perf.raf++; return raf(cb); };
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ entryTypes: ['longtask'] }); } catch {}
  });
  const R = { throttle, base: BASE };
  const longSum = (from) => page.evaluate((f) => window.__perf.long.filter((l) => l[0] >= f).reduce((a, l) => a + l[1], 0), from);
  const now = () => page.evaluate(() => Math.round(performance.now()));
  const heap = () => page.evaluate(() => Math.round(performance.memory.usedJSHeapSize / 1048576));

  // 1. cold start straight into Today (the screen people use most)
  const t0 = Date.now();
  await page.goto(BASE + '?qa#/today', { waitUntil: 'commit' });
  await page.waitForSelector('.today-row, .check, [role=checkbox], .today', { timeout: 60000 });
  R.todayReadyMs = Date.now() - t0;
  R.todayLongTasksMs = await longSum(0);
  R.todayHeapMB = await heap();
  R.todayCanvases = await page.evaluate(() => window.__perf.canvases);

  // 2. open the library
  await page.waitForTimeout(500);
  const tl = await now(); const t1 = Date.now();
  await page.evaluate(() => { location.hash = '#/library'; });
  await page.waitForFunction(() => window.__seder_stats && window.__seder_stats().frame > 0, null, { timeout: 90000 });
  R.libraryFirstFrameMs = Date.now() - t1;
  await page.waitForTimeout(4000); // let queued textures finish
  R.libraryLongTasksMs = await longSum(tl);
  R.libraryHeapMB = await heap();
  R.libraryCanvasesCreated = await page.evaluate(() => window.__perf.canvases) - R.todayCanvases;
  R.stats = await page.evaluate(() => window.__seder_stats());

  // 3. idle: how many renders / rAF callbacks while nothing happens
  const s0 = await page.evaluate(() => ({ f: window.__seder_stats().frame, r: window.__perf.raf }));
  await page.waitForTimeout(3000);
  const s1 = await page.evaluate(() => ({ f: window.__seder_stats().frame, r: window.__perf.raf }));
  R.idleRendersPer3s = s1.f - s0.f; R.idleRafPer3s = s1.r - s0.r;

  // 4. scroll the shelf top→bottom→top and sample frame gaps
  const scroll = await page.evaluate(async () => {
    const el = document.querySelector('.lib3d-scroll'); const max = el.scrollHeight - el.clientHeight;
    const gaps = []; let last = performance.now(); let n = 0; const f0 = window.__seder_stats().frame;
    return await new Promise((res) => {
      const step = () => { const t = performance.now(); gaps.push(t - last); last = t; n++; el.scrollTop = Math.abs(((n * max) / 60) % (2 * max) - max); if (n < 150) requestAnimationFrame(step); else { gaps.sort((a, b) => a - b); res({ frames: window.__seder_stats().frame - f0, medianMs: Math.round(gaps[gaps.length >> 1]), p95Ms: Math.round(gaps[Math.floor(gaps.length * 0.95)]), maxMs: Math.round(gaps[gaps.length - 1]) }); } };
      requestAnimationFrame(step);
    });
  });
  R.scroll = scroll;
  await page.evaluate(() => { document.querySelector('.lib3d-scroll').scrollTop = 0; });
  await page.waitForTimeout(500);
  // jump to the Shas rows and time how long until their spine art has finished loading (texture count stops changing)
  { const t = Date.now(); const before = await page.evaluate(() => window.__seder_stats().textures);
    await page.evaluate(() => { document.querySelector('.lib3d-scroll').scrollTop = 4200; });
    let last = -1, same = 0; while (same < 3 && Date.now() - t < 60000) { await page.waitForTimeout(400); const n = await page.evaluate(() => window.__seder_stats().textures); same = n === last ? same + 1 : 0; last = n; }
    R.jumpToLowerRows = { texturesBefore: before, texturesAfter: last, settledMs: Date.now() - t - 1200 };
    await page.evaluate(() => { document.querySelector('.lib3d-scroll').scrollTop = 0; }); await page.waitForTimeout(800); }

  // 5. open / close books repeatedly; watch memory and GPU resource counts
  const ids = ['pv-tm-5710-01', 'pv-chitas', 'pv-rambam-3', 'pv-ramban-shemos', 'pv-ls-10', 'pv-tm-maamarim-5711'];
  const taps = [];
  const memory = [];
  for (let i = 0; i < 12; i++) {
    const id = ids[i % ids.length];
    const ta = Date.now();
    await page.evaluate((id) => { location.hash = '#/book/' + id; }, id);
    await page.waitForSelector('.sheet-paper', { timeout: 30000 }).catch(() => {});
    taps.push(Date.now() - ta);
    await page.waitForTimeout(900);
    await page.evaluate(() => { location.hash = '#/library'; });
    await page.waitForTimeout(900);
    if (i % 3 === 2) memory.push({ n: i + 1, heapMB: await heap(), ...(await page.evaluate(() => { const s = window.__seder_stats(); return { geometries: s.geometries, textures: s.textures }; })) });
  }
  R.openToSheetMs = taps; R.memoryAfterNOpens = memory;
  R.totalLongTasksMs = await longSum(0);
  const j = JSON.stringify(R, null, 1); console.log(j); if (out) fs.writeFileSync(out, j);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
