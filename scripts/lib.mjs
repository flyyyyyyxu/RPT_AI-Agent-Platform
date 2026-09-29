// 脚本公共部分：用 Playwright 打开打包后的 dist/index.html（不需要启动服务）。
// 首次使用前运行：npx playwright install chromium
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist/index.html');
export const URL = pathToFileURL(dist).href;

export async function launch() {
  if (!existsSync(dist)) throw new Error('找不到 dist/index.html，请先运行 npm run build');
  const browser = await chromium.launch();
  return browser;
}

/** 每个用例一个全新的浏览器上下文：本地存储为空，演示数据是初始状态；关闭动画，截图稳定。 */
export async function newPage(browser, width = 1440, height = 900) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', locale: 'zh-CN' });
  // 拦截 Google Fonts：网络不稳时截图会一直等字体加载；统一用回退字体，截图也更稳定
  await context.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(URL);
  await page.waitForTimeout(300);
  return { page, context, errors };
}

export async function go(page, route, wait = 600) {
  await page.goto(`${URL}#${route}`);
  await page.waitForTimeout(wait);
}

/** 从工作台开始剧本（含页内二次确认）。 */
export async function startPlaybook(page, letter) {
  await go(page, '/', 400);
  const card = page.locator('.playbook-card', { hasText: `剧本 ${letter} ·` });
  await card.locator('.confirm-action button').first().click();
  await card.locator('.confirmation button', { hasText: '确认' }).click();
  await page.waitForTimeout(900);
}

/** 读取演示存档里某个 Agent 的状态。 */
export async function agentState(page, id) {
  return page.evaluate(agentId => {
    const state = JSON.parse(localStorage.getItem('agent-platform-demo-v8') ?? 'null');
    if (!state) return null;
    const agent = state.agents.find(item => item.id === agentId);
    return { profile: agent.profile, production: agent.productionVersion, versions: agent.versions.map(v => ({ id: v.id, status: v.status, traffic: v.traffic ?? null, knowledge: v.config.knowledge, evaluated: v.evaluatedDatasets.length })), ops: state.ops[agentId] ?? null, playbook: state.playbook, knowledge: state.knowledge };
  }, id);
}
