// Freeze the choreography at several p values. Usage: node scripts/qa/poses.cjs <bookId> <outPrefix> p1,p2,... [x,y scroll-row-px]
const { chromium } = require('playwright');
(async () => {
  const [id, prefix, ps, scrollTop] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true, locale: 'he-IL', timezoneId: 'America/New_York' });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
  page.on('pageerror', (e) => logs.push('pageerror ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:4173/') + '?qa#/library', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  if (scrollTop) { await page.evaluate((t) => { document.querySelector('.lib3d-scroll').scrollTop = Number(t); }, scrollTop); await page.waitForTimeout(600); }
  await page.evaluate(() => window.__seder.hideSheet(true));
  let i = 0;
  for (const p of ps.split(',').map(Number)) {
    await page.evaluate(([id, p]) => window.__seder.freeze(id, p), [id, p]);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${prefix}-${String(i++).padStart(2, '0')}.png` });
  }
  if (logs.length) console.log(logs.slice(0, 8).join('\n'));
  await browser.close();
})();
