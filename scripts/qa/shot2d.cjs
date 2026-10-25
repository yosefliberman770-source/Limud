// Usage: node scripts/qa/shot2d.cjs out.png — renders the library with WebGL disabled (the CSS fallback shelf).
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--disable-gpu', '--disable-webgl', '--disable-3d-apis'] });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'he-IL', timezoneId: 'America/New_York' });
  const page = await ctx.newPage();
  const logs = []; page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
  await page.goto((process.env.BASE || 'http://localhost:4173/') + '#/library', { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: process.argv[2] || 'docs/screenshots/05-shelf-2d.png' });
  console.log('2d shelf present:', await page.evaluate(() => !!document.querySelector('.lib2d')), '| spine imgs:', await page.evaluate(() => [...document.querySelectorAll('.lib2d-book')].filter((b) => b.style.backgroundImage.includes('blob:')).length));
  if (logs.length) console.log(logs.slice(0, 5).join('\n'));
  await browser.close();
})();
