// Usage: node scripts/qa/shot.cjs <url-hash> <out.png> [--wait ms] [--w 412 --h 892] [--click x,y] [--scale 2] [--eval "js"]
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const arg = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
(async () => {
  const hash = args[0] || '#/library';
  const out = args[1] || 'docs/screenshots/shot.png';
  const w = Number(arg('--w', 412)), h = Number(arg('--h', 892));
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: Number(arg('--scale', 2)), isMobile: true, hasTouch: true, locale: 'he-IL', timezoneId: 'America/New_York', colorScheme: arg('--scheme', 'dark') });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  const base = process.env.BASE || 'http://localhost:4173/';
  await page.goto(base + hash, { waitUntil: 'networkidle' });
  const pre = arg('--eval', null);
  await page.waitForTimeout(Number(arg('--wait', 2500)));
  if (pre) { await page.evaluate(pre); await page.waitForTimeout(Number(arg('--wait2', 1500))); }
  const click = arg('--click', null);
  if (click) { const [x, y] = click.split(',').map(Number); await page.touchscreen.tap(x, y); await page.waitForTimeout(Number(arg('--wait2', 2500))); }
  await page.screenshot({ path: out });
  if (logs.length) console.log(logs.slice(0, 12).join('\n'));
  console.log('saved', out);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
