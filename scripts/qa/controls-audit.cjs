// Click every visible control on every screen and report the ones that do nothing observable (possible dead buttons).
// Skips destructive controls. Usage: node scripts/qa/controls-audit.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:4173/';
const ROUTES = ['#/today', '#/week', '#/calendar', '#/progress', '#/history', '#/search', '#/settings', '#/book/pv-tm-maamarim-5711', '#/book/pv-chitas', '#/book/pv-rambam-3', '#/book/pv-ramban-shemos', '#/book/pv-shas-arachin', '#/book/pv-ls-10', '#/book/pv-tm-5710-01', '#/log/chitas_chumash/chitas_chumash/2026-10-25'];
const SKIP = /איפוס|מחק|reset/i;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const dead = []; let clicked = 0;
  for (const route of ROUTES) {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 892 }, isMobile: true, hasTouch: true, locale: 'he-IL', timezoneId: 'America/New_York' });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(BASE + '?qa' + route); await page.waitForTimeout(route.includes('/book/') ? 5500 : 1500);
    const n = await page.locator('button:visible, a:visible, summary:visible, [role=checkbox]:visible').count();
    for (let i = 0; i < Math.min(n, 60); i++) {
      const el = page.locator('button:visible, a:visible, summary:visible, [role=checkbox]:visible').nth(i);
      let label = ''; try { label = ((await el.innerText({ timeout: 800 })) || (await el.getAttribute('aria-label')) || '').replace(/\s+/g, ' ').trim().slice(0, 40); } catch { continue; }
      if (SKIP.test(label)) continue;
      const before = await page.evaluate(() => location.hash + '|' + document.body.innerHTML.length + '|' + document.body.innerText.length + '|' + (document.querySelectorAll('[open]').length) + '|' + [...document.querySelectorAll('[aria-checked],[aria-expanded]')].map((e) => e.getAttribute('aria-checked') + e.getAttribute('aria-expanded')).join(''));
      try { await el.click({ timeout: 1500, force: true }); } catch { continue; }
      clicked++; await page.waitForTimeout(250);
      const after = await page.evaluate(() => location.hash + '|' + document.body.innerHTML.length + '|' + document.body.innerText.length + '|' + (document.querySelectorAll('[open]').length) + '|' + [...document.querySelectorAll('[aria-checked],[aria-expanded]')].map((e) => e.getAttribute('aria-checked') + e.getAttribute('aria-expanded')).join(''));
      if (before === after) dead.push(`${route}  «${label}»`);
      // return to a known state
      await page.goto(BASE + '?qa' + route); await page.waitForTimeout(route.includes('/book/') ? 3500 : 700);
    }
    if (errors.length) dead.push(`${route} PAGE ERRORS: ${errors.slice(0, 2).join(' | ')}`);
    await ctx.close();
  }
  console.log(`clicked ${clicked} controls`); console.log(dead.length ? 'NO-OP or error:\n' + dead.join('\n') : 'every clicked control had an observable effect');
  await browser.close();
})();
