// Acceptance flow: open Sefer HaMaamarim → ואלה המשפטים → check an item → reload → still checked → Today shows it.
const { chromium } = require('playwright');
const assert = require('node:assert');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true, locale: 'he-IL', timezoneId: 'America/New_York' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const base = process.env.BASE || 'http://localhost:4173/';
  await page.goto(base + '#/library', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  // tap a real book on the 3D shelf (Toras Menachem vol. 2 is due today)
  await page.touchscreen.tap(320, 300);
  await page.waitForSelector('.sheet.ready', { timeout: 20000 });
  console.log('1. sheet open for:', await page.textContent('.sheet-title'));
  await page.screenshot({ path: 'docs/screenshots/e2e-1-book-open.png' });
  // go to the maamarim book via search → deep link (route is the source of truth)
  await page.evaluate(() => { location.hash = '#/library'; });
  await page.waitForSelector('.sheet:not(.ready)', { timeout: 20000, state: 'attached' }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.evaluate(() => { location.hash = '#/book/pv-tm-maamarim-5711'; });
  await page.waitForSelector('.sheet.ready', { timeout: 25000 });
  console.log('2. sheet:', await page.textContent('.sheet-title'));
  await page.getByText('ד״ה ואלה המשפטים').first().click();
  await page.waitForSelector('.log .check-row', { timeout: 5000 });
  const rows = await page.locator('.log .check-row').count();
  const first = page.locator('.log .check-row').first();
  const label = await first.textContent();
  await first.click();
  assert.equal(await first.getAttribute('aria-checked'), 'true');
  console.log(`3. ${rows} units; checked "${label.trim()}" → aria-checked=true`);
  await page.screenshot({ path: 'docs/screenshots/e2e-2-checked.png' });
  await page.waitForTimeout(900); // debounce flush to IndexedDB
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  await page.evaluate(() => { location.hash = '#/log/tm_maamarim/maamar-03-veeleh-hamishpatim'; });
  await page.waitForSelector('.log .check-row', { timeout: 8000 });
  const again = await page.locator('.log .check-row').first().getAttribute('aria-checked');
  assert.equal(again, 'true');
  console.log('4. after reload the checkmark persisted:', again);
  // Today shows the maamar progress
  await page.evaluate(() => { location.hash = '#/today'; });
  await page.waitForTimeout(1500);
  const todayText = await page.textContent('.today');
  assert.ok(todayText.includes('ואלה המשפטים'));
  await page.screenshot({ path: 'docs/screenshots/e2e-3-today.png' });
  console.log('5. Today lists the maamar; daily rows:', await page.locator('.daily-row').count());
  // check a daily item, undo from history
  await page.locator('.daily-row .check-row').first().click();
  await page.waitForTimeout(500);
  await page.evaluate(() => { location.hash = '#/history'; });
  await page.waitForTimeout(1200);
  console.log('6. history items:', await page.locator('.hist-item').count());
  await page.screenshot({ path: 'docs/screenshots/e2e-4-history.png' });
  console.log(errors.length ? 'ERRORS:\n' + errors.slice(0, 6).join('\n') : 'no console errors');
  await browser.close();
})().catch((e) => { console.error('E2E FAILED', e); process.exit(1); });
