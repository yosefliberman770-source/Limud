// One-shot attempt to read Chabadpedia (Cloudflare-protected) with a real browser.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', locale: 'he-IL' });
  const page = await ctx.newPage();
  const targets = [
    ['tm', 'https://chabadpedia.co.il/index.php/תורת_מנחם_-_התוועדויות'],
    ['bati', 'https://chabadpedia.co.il/index.php/באתי_לגני_תשי"א'],
  ];
  for (const [name, url] of targets) {
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(6000);
      const html = await page.content();
      fs.writeFileSync(process.argv[2] + '/chabadpedia-' + name + '.html', html);
      console.log(name, resp && resp.status(), html.length, (await page.title()));
    } catch (e) { console.log(name, 'ERR', e.message.slice(0, 200)); }
  }
  await browser.close();
})();
