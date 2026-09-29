import { chromium } from 'playwright';
import { URL } from './lib.mjs';
const b = await chromium.launch();
for (const block of [false, true]) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const fonts = { ok: 0, fail: 0 };
  page.on('requestfinished', r => { if (r.url().includes('gstatic')) fonts.ok++; });
  page.on('requestfailed', r => { if (r.url().includes('gstatic')) fonts.fail++; });
  if (block) await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const t = Date.now();
  let res = 'ok';
  for (const r of ['/', '/agents/general/build', '/agents/a/release']) {
    await page.goto(`${URL}#${r}`); await page.waitForTimeout(600);
    try { await page.screenshot({ fullPage: true, timeout: 20000 }); } catch { res = `timeout at ${r}`; break; }
  }
  console.log(block ? '拦截字体' : '正常加载', res, `${Date.now() - t}ms`, fonts);
  await ctx.close();
}
await b.close();
