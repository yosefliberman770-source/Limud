// Tap a point, then capture frames at given delays. Usage: node scripts/qa/anim.cjs '#/library' x,y outPrefix 300,700,1200,...
const { chromium } = require('playwright');
(async () => {
  const [hash, xy, prefix, delays] = process.argv.slice(2);
  const [x, y] = xy.split(',').map(Number);
  const ds = (delays || '300,800,1400,2000,2800,3800').split(',').map(Number);
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true, locale: 'he-IL', timezoneId: 'America/New_York' });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
  page.on('pageerror', (e) => logs.push('pageerror ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:4173/') + hash, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  const t0 = Date.now();
  await page.touchscreen.tap(x, y);
  let i = 0;
  for (const d of ds) {
    const wait = d - (Date.now() - t0);
    if (wait > 0) await page.waitForTimeout(wait);
    await page.screenshot({ path: `${prefix}-${String(i++).padStart(2, '0')}.png` });
  }
  console.log('hash after:', await page.evaluate(() => location.hash));
  if (logs.length) console.log(logs.slice(0, 8).join('\n'));
  await browser.close();
})();
