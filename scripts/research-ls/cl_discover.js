// Load chabadlibrary.org/books/ in Playwright and log all network requests (to find the JSON API).
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' });
  const seen = [];
  page.on('response', async (r) => {
    const u = r.url(); const ct = r.headers()['content-type'] || '';
    if (/json|javascript/.test(ct) || /api|json/.test(u)) {
      let body = '';
      try { if (/json/.test(ct)) body = (await r.text()).slice(0, 400); } catch (e) {}
      seen.push([r.status(), u, ct, body]);
    }
  });
  await page.goto(process.argv[2] || 'https://chabadlibrary.org/books/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(4000);
  for (const s of seen) console.log(s[0], s[1], s[2], '\n   ', s[3].replace(/\s+/g, ' '));
  console.log('--- TEXT ---');
  console.log((await page.innerText('body')).slice(0, 3000));
  await browser.close();
})();
