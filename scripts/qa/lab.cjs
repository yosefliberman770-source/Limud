// Usage: node scripts/qa/lab.cjs "<query>" out.png   (needs `npm run dev` on :5173)
const { chromium } = require('playwright');
(async () => {
  const [query, out] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 2000, height: 1000 }, deviceScaleFactor: 1 });
  const logs = []; p.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); }); p.on('pageerror', (e) => logs.push(e.message));
  await p.goto('http://localhost:5173/art-lab.html?' + query);
  await p.waitForFunction(() => document.title === 'ready' || document.title === 'error', null, { timeout: 60000 });
  await p.waitForTimeout(500);
  await p.screenshot({ path: out, fullPage: true });
  if (logs.length) console.log(logs.slice(0, 5).join('\n'));
  await b.close();
})();
