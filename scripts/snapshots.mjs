// 截图比对：重构前后页面应当逐像素一致。
//   node scripts/snapshots.mjs baseline   记录基准截图
//   node scripts/snapshots.mjs compare    重新截图并与基准比对，有差异时退出码为 1
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { go, launch, newPage, root, startPlaybook } from './lib.mjs';

const mode = process.argv[2] === 'compare' ? 'compare' : 'baseline';
const outDir = resolve(root, 'scripts/.snapshots', mode === 'compare' ? 'current' : 'baseline');
const baseDir = resolve(root, 'scripts/.snapshots/baseline');

const pages = [
  '/', '/agents/new', '/assets/knowledge', '/assets/tools', '/assets/evalsets', '/assets/models', '/assets/prompts', '/operations', '/governance', '/design-system',
  '/agents/general/build', '/agents/general/evaluation', '/agents/general/release', '/agents/general/monitor', '/agents/general/trace', '/agents/general/settings',
  '/agents/a/build', '/agents/a/release', '/agents/a/trace',
  '/agents/b/build', '/agents/b/evaluation', '/agents/b/release',
  '/agents/c/build', '/agents/c/release', '/agents/c/trace', '/agents/c/settings',
];
/** 交互后的状态：弹出确认、跑完评测、剧本中途等，覆盖只在操作后出现的样式。 */
const collapse = async page => { const button = page.getByRole('button', { name: '收起演示步骤' }); if (await button.count()) await button.click(); };
const flows = {
  'start-confirm': async page => { await go(page, '/'); await page.locator('.playbook-card').first().locator('.confirm-action button').first().click(); },
  'build-debugged': async page => { await go(page, '/agents/general/build'); await page.getByRole('button', { name: '保存配置' }).click(); if (page.viewportSize().width < 1280) { await page.locator('.aside-toggle').click(); await page.waitForTimeout(300); } await page.getByRole('button', { name: '运行调试' }).click(); await page.waitForTimeout(1400); await page.locator('.debug-step button').first().click(); },
  'eval-batch': async page => { await go(page, '/agents/b/evaluation'); await page.getByRole('button', { name: '使用示例数据集' }).click(); await page.getByRole('button', { name: '开始跑批' }).click(); await page.waitForTimeout(1800); },
  'release-rollback-confirm': async page => { await go(page, '/agents/general/release'); await page.getByRole('button', { name: '回退到 v2' }).first().click(); },
  // 基础数据里社区穿搭灵感 Agent v13 正在灰度，直接演示回退结果
  'a-gray-rolled-back': async page => { await go(page, '/agents/a/release'); await page.getByRole('button', { name: '回退到 v12' }).first().click(); await page.getByRole('button', { name: '确认回退到 v12' }).click(); await page.waitForTimeout(2600); },
  'playbook-b-blocked': async page => { await startPlaybook(page, 'B'); await collapse(page); await page.locator('[data-demo=dep-upgrade] button').click(); await page.waitForTimeout(600); if (page.viewportSize().width < 1280) { await page.locator('.aside-toggle').click(); await page.waitForTimeout(300); } await page.locator('[data-demo=debug-run] button').click(); await page.waitForTimeout(1400); await go(page, '/agents/b/evaluation'); await page.locator('[data-demo=eval-run] button').click(); await page.waitForTimeout(1800); },
  'playbook-c-kb-draft': async page => { await startPlaybook(page, 'C'); await collapse(page); await go(page, '/assets/knowledge'); await page.locator('[data-demo=kb-new-version] button').click(); await page.waitForTimeout(300); await page.getByRole('button', { name: '加入本版本' }).click(); },
  'playbook-c-badcase': async page => { await startPlaybook(page, 'C'); await collapse(page); await page.locator('[data-demo="stage-bc-4431"] button', { hasText: '知识' }).click(); await page.locator('[data-demo="add-eval-bc-4431"] button').click(); await page.waitForTimeout(300); },
  'playbook-exit-confirm': async page => { await startPlaybook(page, 'A'); await page.getByRole('button', { name: '退出剧本' }).click(); },
};

const name = (route, width) => `${width}-${route.replace(/^\//, '').replace(/[/?=]/g, '_') || 'home'}.png`;

const cases = [];
for (const width of [1440, 390]) {
  for (const route of pages) cases.push({ route, width });
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const browser = await launch();
const allErrors = [];
for (const width of [1440, 390]) {
  // 同一宽度下每个用例都用新上下文，保证初始数据一致
  for (const item of cases.filter(c => c.width === width)) {
    const { page, context, errors } = await newPage(browser, width);
    await go(page, item.route);
    writeFileSync(resolve(outDir, name(item.route, width)), await page.screenshot({ fullPage: true }));
    allErrors.push(...errors.map(error => `${item.route}: ${error}`));
    await context.close();
  }
  for (const [flow, run] of Object.entries(flows)) {
    const { page, context, errors } = await newPage(browser, width);
    await run(page);
    await page.waitForTimeout(400);
    writeFileSync(resolve(outDir, `${width}-flow-${flow}.png`), await page.screenshot({ fullPage: true }));
    allErrors.push(...errors.map(error => `flow ${flow}: ${error}`));
    await context.close();
  }
  if (width === 390) {
    const { page, context } = await newPage(browser, width);
    await go(page, '/agents/general/build'); await page.getByRole('button', { name: '打开菜单' }).click(); await page.waitForTimeout(300);
    writeFileSync(resolve(outDir, `${width}-flow-mobile-menu.png`), await page.screenshot({ fullPage: false }));
    await context.close();
  }
  // 剧本浮层
  for (const letter of ['A', 'B', 'C']) {
    const { page, context, errors } = await newPage(browser, width);
    await startPlaybook(page, letter);
    writeFileSync(resolve(outDir, `${width}-playbook-${letter}.png`), await page.screenshot({ fullPage: false }));
    allErrors.push(...errors.map(error => `playbook ${letter}: ${error}`));
    await context.close();
  }
}
await browser.close();

const files = readdirSync(outDir).sort();
console.log(`已截图 ${files.length} 张 → ${outDir}`);
if (allErrors.length) { console.log('页面错误：', allErrors); process.exitCode = 1; }
if (mode === 'compare') {
  if (!existsSync(baseDir)) { console.log('没有基准截图，请先运行 baseline'); process.exit(1); }
  const baseline = readdirSync(baseDir).sort();
  const missing = baseline.filter(file => !files.includes(file));
  const changed = files.filter(file => baseline.includes(file) && !readFileSync(resolve(baseDir, file)).equals(readFileSync(resolve(outDir, file))));
  const added = files.filter(file => !baseline.includes(file));
  console.log(`一致 ${files.length - changed.length - added.length} 张，有差异 ${changed.length} 张，缺少 ${missing.length} 张，新增 ${added.length} 张`);
  for (const file of changed) console.log('  有差异：', file);
  for (const file of missing) console.log('  缺少：', file);
  if (changed.length || missing.length) process.exitCode = 1;
}
