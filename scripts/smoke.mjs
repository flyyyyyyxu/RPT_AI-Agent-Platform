// 冒烟检查：三条演示剧本从头走到尾 + 已修复问题的回归检查。
//   node scripts/smoke.mjs        全部失败项会列出来，退出码为 1
import { agentState, go, launch, newPage, startPlaybook } from './lib.mjs';

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: Boolean(ok), detail }); console.log(`${ok ? '✓' : '✗'} ${name}${!ok && detail ? ` —— ${detail}` : ''}`); };
// 浮层只在当前步骤所在页面展开；其它页面是胶囊，胶囊文字里带步骤标题
const panelTitle = async page => (await page.locator('.playbook-panel h3').allInnerTexts())[0] ?? (await page.locator('.playbook-panel .pb-finish').allInnerTexts())[0] ?? (await page.locator('.playbook-pill .pill-text').allInnerTexts())[0] ?? '';
const next = async page => { await page.locator('.playbook-panel .pb-nav button', { hasText: /下一步|完成剧本/ }).click(); await page.waitForTimeout(700); };
const gotoStep = async page => { const pill = page.locator('.playbook-pill', { hasText: '前往' }); if (await pill.count()) { await pill.click(); await page.waitForTimeout(700); } };
const confirmIn = async (page, scope) => { await page.locator(`${scope} button.button-primary`).first().click(); await page.locator(`${scope} .confirmation button.button-primary`).click(); };
const expectStep = async (page, title) => { const actual = await panelTitle(page); check(`剧本步骤：${title}`, actual.includes(title), `实际为「${actual}」`); };

const browser = await launch();

/* ---------------- 剧本 A ---------------- */
{
  const { page, context, errors } = await newPage(browser);
  await startPlaybook(page, 'A');
  await expectStep(page, 'v13 正在灰度 10%');
  await next(page); await expectStep(page, 'AB 报告');
  await next(page); await expectStep(page, '监控告警已触发');
  await next(page); await expectStep(page, '一键回退到 v12');
  await page.getByRole('button', { name: '回退到 v12' }).first().click();
  await page.getByRole('button', { name: '确认回退到 v12' }).click();
  await page.waitForTimeout(3600);
  await expectStep(page, '1 分 48 秒完成回退');
  check('A：回退结果显示耗时', (await page.locator('.switch-result').innerText()).includes('1 分 48 秒'));
  await next(page); await expectStep(page, 'Trace 定位');
  check('A：Trace 高亮新增步骤', await page.locator('[data-demo="trace-issue"]').count() === 1);
  await next(page); await expectStep(page, '剧本 A 完成');
  check('A：无页面错误', errors.length === 0, errors.join('; '));
  await context.close();
}

/* ---------------- 剧本 B ---------------- */
{
  const { page, context, errors } = await newPage(browser);
  await startPlaybook(page, 'B');
  await expectStep(page, '政策库发布 2026-10 版');
  check('B：普通「新建草稿」在剧本中被锁定', await page.getByRole('button', { name: '基于 v7 新建草稿 v8' }).isDisabled());
  await page.locator('[data-demo=dep-upgrade] button').click(); await page.waitForTimeout(1800);
  await expectStep(page, '不发布，直接跑评测');
  await gotoStep(page); await page.locator('[data-demo=eval-run] button').click(); await page.waitForTimeout(3000);
  await expectStep(page, '红线漏判 2 条');
  await next(page); await expectStep(page, '发布按钮被禁用');
  check('B：发布被门槛阻断', (await page.locator('.publish-bar .button-reason').allInnerTexts()).join('').includes('上线门槛已通过'));
  await next(page); await expectStep(page, 'Trace：引用了旧条款');
  await next(page); await expectStep(page, '修正 Prompt 示例');
  await page.locator('.playbook-panel button', { hasText: '代我修正' }).click(); await page.waitForTimeout(600);
  const prompt = await page.locator('.prompt-editor').inputValue();
  check('B：代我修正后表单显示新配置、且没有未保存提示', prompt.includes('社区规范 4.5') && !prompt.includes('社区规范 4.3') && await page.locator('.form-status .warning-text').count() === 0);
  await page.waitForTimeout(1200); await expectStep(page, '重新评测：通过');
  await gotoStep(page); await page.locator('[data-demo=eval-run] button').click(); await page.waitForTimeout(3000);
  await expectStep(page, '影子运行 v8');
  await gotoStep(page); await confirmIn(page, '.publish-bar'); await page.waitForTimeout(2600);
  await expectStep(page, '影子 AB');
  await next(page); await expectStep(page, '生产就绪检查 + 审批');
  await page.getByRole('button', { name: '提交审批' }).click(); await page.waitForTimeout(300);
  await page.getByRole('button', { name: '模拟审批通过' }).click(); await page.waitForTimeout(2400);
  await expectStep(page, '全量发布 v8');
  await confirmIn(page, '.publish-bar'); await page.waitForTimeout(2600);
  await expectStep(page, '剧本 B 完成');
  check('B：线上指向 v8', (await agentState(page, 'b')).production === 'v8');
  check('B：无页面错误', errors.length === 0, errors.join('; '));
  await context.close();
}

/* ---------------- 剧本 C ---------------- */
{
  const { page, context, errors } = await newPage(browser);
  await startPlaybook(page, 'C');
  await expectStep(page, '投诉进入 bad case 工作台');
  await page.locator('[data-demo="badcase-trace-bc-4431"]').click(); await next(page);
  await expectStep(page, 'Trace：命中过期知识');
  await next(page); await expectStep(page, '人工标注');
  await page.locator('[data-demo="stage-bc-4431"] button', { hasText: '知识' }).click(); await page.waitForTimeout(1800);
  await expectStep(page, '加入评测集');
  await page.locator('[data-demo="add-eval-bc-4431"] button').click(); await page.waitForTimeout(1800);
  await expectStep(page, '新建知识版本');
  await gotoStep(page); await page.locator('[data-demo=kb-new-version] button').click(); await page.waitForTimeout(1800);
  await expectStep(page, '设置生效 / 失效时间');
  await page.locator('.playbook-panel button', { hasText: '代我填写' }).click(); await page.waitForTimeout(500);
  await page.locator('[data-demo=kb-publish] button').click(); await page.waitForTimeout(1800);
  await expectStep(page, '创建候选版本 v22');
  await gotoStep(page); await page.locator('[data-demo=dep-upgrade] button').click(); await page.waitForTimeout(1800);
  await expectStep(page, '回归评测');
  await gotoStep(page);
  check('C：bad case 回归集排在第一位', (await page.locator('.dataset-list button strong').allInnerTexts())[0] === 'bad case 回归集');
  await page.locator('[data-demo=eval-run] button').click(); await page.waitForTimeout(3000);
  await expectStep(page, '提交审批');
  await gotoStep(page);
  await page.getByRole('button', { name: '提交审批' }).click(); await page.waitForTimeout(300);
  await page.getByRole('button', { name: '模拟审批通过' }).click(); await page.waitForTimeout(2400);
  await expectStep(page, '按会话灰度发布');
  await confirmIn(page, '.publish-bar'); await page.waitForTimeout(2600);
  await expectStep(page, '转人工率下降');
  const c = await agentState(page, 'c');
  check('C：v22 灰度中且使用售后知识 v35', c.versions.some(v => v.id === 'v22' && v.status === '灰度中' && v.knowledge === '售后知识 v35'));
  check('C：无页面错误', errors.length === 0, errors.join('; '));
  await context.close();
}

/* ---------------- 回归检查 ---------------- */
{
  const { page, context, errors } = await newPage(browser);
  // 回退中途离开页面，回退仍然生效
  await startPlaybook(page, 'A');
  await page.getByRole('button', { name: '回退到 v12' }).first().click();
  await page.getByRole('button', { name: '确认回退到 v12' }).click();
  await page.waitForTimeout(300); await go(page, '/agents/a/trace', 2500);
  const a = await agentState(page, 'a');
  check('回归：回退中途离开页面仍生效', a.versions.find(v => v.id === 'v13').status === '待发布');
  check('回归：操作时间使用演示时钟', a.ops.approvals[0].time.startsWith('2026-09-29 12:0'), a.ops.approvals[0].time);
  check('回归：生命周期显示监控 / Trace 可查看', (await page.locator('.lifecycle-item small').allInnerTexts()).join('|') === '已完成|已完成|未开始|可查看|当前 · 可查看');

  // 灰度期间版本历史不能回退
  await startPlaybook(page, 'A'); await go(page, '/agents/a/release', 500);
  check('回归：灰度期间版本历史不能回退', await page.getByRole('button', { name: '回退到 v11' }).count() === 0);

  // 退出剧本并恢复原始数据
  await page.getByRole('button', { name: '退出剧本' }).click();
  await page.getByRole('button', { name: '恢复原始数据' }).click(); await page.waitForTimeout(400);
  const restored = await agentState(page, 'a');
  check('回归：退出剧本可恢复原始数据', restored.profile === 'a' && restored.playbook === null);

  // 灰度期间不能发布新版本
  await go(page, '/agents/a/build', 400);
  await page.getByRole('button', { name: '基于 v12 新建草稿 v14' }).click(); await page.waitForTimeout(400);
  await page.getByRole('button', { name: '保存配置' }).click(); await page.waitForTimeout(300);
  await page.getByRole('button', { name: '运行调试' }).click(); await page.waitForTimeout(1300);
  await go(page, '/agents/a/evaluation', 400);
  await page.getByRole('button', { name: '运行评测', exact: true }).click(); await page.waitForTimeout(1600);
  await go(page, '/agents/a/release', 400);
  const publishV14 = page.locator('[data-demo=publish] .confirm-action button', { hasText: 'v14' });
  check('回归：灰度期间不能发布新版本', await publishV14.isDisabled() && (await page.locator('[data-demo=publish] .button-reason').innerText()).includes('正在灰度'));
  // 剧本浮层：✕ 只收起不退出，刷新后仍是胶囊
  await startPlaybook(page, 'A');
  await page.getByRole('button', { name: '收起演示步骤' }).click(); await page.waitForTimeout(300);
  await page.reload(); await page.waitForTimeout(500);
  const collapsed = await agentState(page, 'a');
  check('回归：收起剧本浮层不退出剧本，刷新后保持收起', collapsed.playbook?.id === 'a' && collapsed.playbook.collapsed === true && await page.locator('.playbook-panel').count() === 0 && await page.locator('.playbook-pill').count() === 1);
  check('回归：无页面错误', errors.length === 0, errors.join('; '));
  await context.close();
}

await browser.close();
const failed = results.filter(item => !item.ok);
console.log(`\n共 ${results.length} 项，通过 ${results.length - failed.length} 项，失败 ${failed.length} 项`);
if (failed.length) process.exitCode = 1;
