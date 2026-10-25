// Usage: node scripts/qa/cpuprofile.cjs  — CPU profile of opening the library (self time by function)
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  await page.goto((process.env.BASE || 'http://localhost:4173/') + '?qa#/today'); await page.waitForSelector('.page.today');
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start');
  await page.evaluate(() => { location.hash = '#/library'; });
  await page.waitForFunction(() => window.__seder_stats && window.__seder_stats().frame > 0, null, { timeout: 90000 });
  await page.waitForTimeout(6000);
  const { profile } = await cdp.send('Profiler.stop');
  const self = new Map(); const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const dt = profile.timeDeltas; let total = 0;
  profile.samples.forEach((id, i) => { const n = byId.get(id); const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber}`; self.set(k, (self.get(k) || 0) + dt[i]); total += dt[i]; });
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18);
  console.log('total sampled ms', Math.round(total / 1000));
  for (const [k, v] of top) console.log(String(Math.round(v / 1000)).padStart(6), 'ms', k);
  await browser.close();
})();
