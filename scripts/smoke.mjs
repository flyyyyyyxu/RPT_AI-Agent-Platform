// 冒烟检查：三条演示剧本从新建候选版本走到上线后 + 已修复问题的回归检查。
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

const debug = async page => { await gotoStep(page); await page.locator('[data-demo=debug-run] button').click(); await page.waitForTimeout(2600); };
const evaluate = async page => { await gotoStep(page); await page.locator('[data-demo=eval-run] button').click(); await page.waitForTimeout(3000); };
const approve = async page => { await gotoStep(page); await page.getByRole('button', { name: '提交审批' }).click(); await page.waitForTimeout(300); await page.getByRole('button', { name: '模拟审批通过' }).click(); await page.waitForTimeout(2400); };

/* ---------------- 剧本 A：新建 v13 → 调试 → 评测 → 审批 → 灰度 → AB → 告警 → 回退 → Trace ---------------- */
{
  const { page, context, errors } = await newPage(browser);
  await startPlaybook(page, 'A');
  await expectStep(page, '新建候选版本 v13');
  check('A：开始时没有 v13', !(await agentState(page, 'a')).versions.some(v => v.id === 'v13'));
  check('A：发布页开始时没有告警', await (async () => { await go(page, '/agents/a/release', 500); const n = await page.locator('[data-demo=alert]').count(); await gotoStep(page); return n === 0; })());
  await page.locator('[data-demo=new-draft] button').click(); await page.waitForTimeout(1800);
  await expectStep(page, '加入图文笔记检索');
  await page.locator('.playbook-panel button', { hasText: '代我修改' }).click(); await page.waitForTimeout(1800);
  await expectStep(page, '调试 v13');
  await debug(page);
  await expectStep(page, '隔离环境评测');
  await evaluate(page);
  await expectStep(page, '生产就绪检查 + 审批');
  await approve(page);
  await expectStep(page, '比例灰度 10%');
  await confirmIn(page, '.publish-bar'); await page.waitForTimeout(2600);
  await expectStep(page, 'AB 报告');
  const alertTime = (await page.locator('[data-demo=alert]').innerText()).match(/触发于 (\S+ \S+)/)?.[1] ?? '';
  const released = (await agentState(page, 'a')).versions.find(v => v.id === 'v13');
  check('A：灰度后出现告警，时间晚于发布', alertTime > '2026-09-29 12:00', alertTime);
  check('A：v13 灰度 10%', released.status === '灰度中' && released.traffic === 10);
  await next(page); await expectStep(page, '监控告警已触发');
  await next(page); await expectStep(page, '一键回退到 v12');
  await page.getByRole('button', { name: '回退到 v12' }).first().click();
  await page.getByRole('button', { name: '确认回退到 v12' }).click();
  await page.waitForTimeout(3600);
  await expectStep(page, '1 分 48 秒完成回退');
  check('A：回退结果显示耗时', (await page.locator('.switch-result').innerText()).includes('1 分 48 秒'));
  check('A：回退后告警显示已恢复', (await page.locator('[data-demo=alert]').innerText()).includes('告警已恢复'));
  await next(page); await expectStep(page, 'Trace 定位');
  await gotoStep(page);
  check('A：Trace 高亮新增步骤', await page.locator('[data-demo="trace-issue"]').count() === 1);
  await next(page); await expectStep(page, '剧本 A 完成');
  check('A：无页面错误', errors.length === 0, errors.join('; '));
  await context.close();
}

/* ---------------- 剧本 B：升级依赖建 v8 → 调试 → 评测阻断 → 修正 → 调试 → 评测通过 → 影子 → 审批全量 → 监控 ---------------- */
{
  const { page, context, errors } = await newPage(browser);
  await startPlaybook(page, 'B');
  await expectStep(page, '政策库发布 2026-10 版');
  check('B：普通「新建草稿」在剧本中被锁定', await page.getByRole('button', { name: '基于 v7 新建草稿 v8' }).isDisabled());
  await page.locator('[data-demo=dep-upgrade] button').click(); await page.waitForTimeout(1800);
  await expectStep(page, '调试 v8');
  check('B：升级依赖后需要手动调试', !(await agentState(page, 'b')).versions.find(v => v.id === 'v8').evaluated && await page.locator('[data-demo=debug-run] button').isEnabled());
  await debug(page);
  await expectStep(page, '隔离评测：门槛阻断');
  await evaluate(page);
  await expectStep(page, '发布按钮被禁用');
  check('B：评测页显示门槛阻断', (await page.locator('[data-demo=gate-summary]').innerText()).includes('发布已阻断'));
  await gotoStep(page);
  check('B：发布被门槛阻断', (await page.locator('.publish-bar .button-reason').allInnerTexts()).join('').includes('上线门槛已通过'));
  await next(page); await expectStep(page, 'Trace：引用了旧条款');
  await next(page); await expectStep(page, '修正 Prompt 示例');
  await page.locator('.playbook-panel button', { hasText: '代我修正' }).click(); await page.waitForTimeout(600);
  const prompt = await page.locator('.prompt-editor').inputValue();
  check('B：代我修正后表单显示新配置、且没有未保存提示', prompt.includes('社区规范 4.5') && !prompt.includes('社区规范 4.3') && await page.locator('.form-status .warning-text').count() === 0);
  await page.waitForTimeout(1200); await expectStep(page, '重新调试');
  await debug(page);
  await expectStep(page, '重新评测：通过');
  await evaluate(page);
  await expectStep(page, '影子运行 v8');
  await gotoStep(page); await confirmIn(page, '.publish-bar'); await page.waitForTimeout(2600);
  await expectStep(page, '影子 AB');
  await next(page); await expectStep(page, '审批后全量发布');
  await approve(page);
  await confirmIn(page, '.publish-bar'); await page.waitForTimeout(2600);
  await expectStep(page, '监控线上 v8');
  check('B：线上指向 v8', (await agentState(page, 'b')).production === 'v8');
  await gotoStep(page);
  check('B：监控页显示线上指向已切换到 v8', (await page.locator('.feedback-success').allInnerTexts()).join('').includes('v8'));
  await next(page); await expectStep(page, '剧本 B 完成');
  check('B：无页面错误', errors.length === 0, errors.join('; '));
  await context.close();
}

/* ---------------- 剧本 C：bad case → 知识 v35 → 建 v22 → 调试 → 回归评测 → 审批 → 会话灰度 → AB ---------------- */
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
  await expectStep(page, '调试 v22');
  await debug(page);
  await expectStep(page, '回归评测');
  await gotoStep(page);
  check('C：bad case 回归集排在第一位', (await page.locator('.dataset-list button strong').allInnerTexts())[0] === 'bad case 回归集');
  await evaluate(page);
  await expectStep(page, '生产就绪检查 + 审批');
  await approve(page);
  await expectStep(page, '按会话灰度发布');
  await confirmIn(page, '.publish-bar'); await page.waitForTimeout(2600);
  await expectStep(page, '转人工率下降');
  const c = await agentState(page, 'c');
  check('C：v22 灰度中且使用售后知识 v35', c.versions.some(v => v.id === 'v22' && v.status === '灰度中' && v.knowledge === '售后知识 v35'));
  check('C：无页面错误', errors.length === 0, errors.join('; '));
  await context.close();
}

/* ---------------- 三条剧本结构一致 ---------------- */
{
  const { page, context } = await newPage(browser);
  for (const letter of ['A', 'B', 'C']) {
    await startPlaybook(page, letter);
    const phases = [];
    for (let i = 0; i < 20; i++) {
      const text = (await page.locator('.playbook-panel .pb-count, .playbook-pill .pill-text').allInnerTexts())[0] ?? '';
      const phase = text.match(/步 · (\S+) ·/)?.[1] ?? text.match(/\d+ \/ \d+ (\S+)：/)?.[1];
      if (!phase) break;
      if (phases.at(-1) !== phase) phases.push(phase);
      const nextButton = page.locator('.playbook-panel .pb-nav button', { hasText: /下一步|完成剧本/ });
      if (!(await nextButton.count()) || await nextButton.isDisabled()) break;
      await nextButton.click(); await page.waitForTimeout(300);
    }
    // 只看有「下一步」可点的前几步，确认都从构建或起因开始
    check(`剧本 ${letter}：第一阶段是构建或起因`, ['构建', '起因'].includes(phases[0]), phases.join(' → '));
  }
  await context.close();
}

/* ---------------- 回归检查 ---------------- */
{
  const { page, context, errors } = await newPage(browser);
  // 基础数据里穿搭灵感 v13 正在灰度 10%：灰度期间版本历史不能回退
  await go(page, '/agents/a/release', 500);
  check('回归：灰度期间版本历史不能回退', await page.getByRole('button', { name: '回退到 v11' }).count() === 0);
  // 回退中途离开页面，回退仍然生效
  await page.getByRole('button', { name: '回退到 v12' }).first().click();
  await page.getByRole('button', { name: '确认回退到 v12' }).click();
  await page.waitForTimeout(300); await go(page, '/agents/a/trace', 2500);
  const a = await agentState(page, 'a');
  check('回归：回退中途离开页面仍生效', a.versions.find(v => v.id === 'v13').status === '待发布');
  check('回归：操作时间使用演示时钟', a.ops.approvals[0].time.startsWith('2026-09-29 12:0'), a.ops.approvals[0].time);
  check('回归：生命周期显示观测可查看（监控、Trace 同属观测）', (await page.locator('.lifecycle-item small').allInnerTexts()).join('|') === '已完成|已完成|未开始|当前 · 可查看|运行策略 · 护栏 · 成本');
  check('回归：观测下有监控 / Trace 两个标签页', (await page.locator('.observe-tabs a').allInnerTexts()).join('|') === '监控|Trace 与 bad case');

  // 退出剧本并恢复原始数据
  await startPlaybook(page, 'A');
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

/* ---------------- 两轴信息架构：一级导航与平台页 ---------------- */
{
  const { page, context, errors } = await newPage(browser);
  const navText = (await page.locator('.sidebar-links').innerText()).replace(/\s+/g, ' ');
  check('导航：工作台 / 资产中心 / 监控与成本 / 治理 / 模板广场（二期）', ['工作台', '资产中心', '监控与成本', '治理', '模板广场'].every(label => navText.includes(label)) && !navText.includes('评测中心'), navText);
  check('导航：模板广场置灰不可点', await page.locator('.nav-item-phase2[aria-disabled=true]').count() === 1);
  await go(page, '/library', 400);
  check('旧入口：能力组件库跳到资产中心', page.url().endsWith('#/assets'), page.url());
  await go(page, '/evaluation', 400);
  check('旧入口：评测中心跳到资产中心 · 评测集', page.url().endsWith('#/assets?tab=evalsets') && await page.locator('.evalset-table tbody tr').count() >= 8, page.url());
  for (const [tab, label] of [['tools', '工具版本'], ['models', '模型目录'], ['prompts', '模板目录']]) {
    await go(page, `/assets?tab=${tab}`, 300);
    check(`资产中心：${label}`, await page.locator('.capability h3', { hasText: label }).count() === 1);
  }
  await go(page, '/operations', 400);
  check('监控与成本：每个 Agent 一行', await page.locator('.ops-table tbody tr').count() === 4);
  check('监控与成本：按团队显示预算', await page.locator('.team-budget').count() === 4);
  await go(page, '/governance', 400);
  check('治理：护栏覆盖和审计日志', await page.locator('.guard-table tbody tr').count() === 4 && await page.locator('.audit-table tbody tr').count() > 0);
  await go(page, '/settings', 300);
  check('旧入口：平台设置跳到治理', page.url().endsWith('#/governance'), page.url());
  await go(page, '/agents/a/observe', 400);
  check('Agent：观测默认进入监控', page.url().endsWith('#/agents/a/monitor') && await page.locator('.lifecycle-item.current strong').innerText() === '观测', page.url());
  check('平台页：无页面错误', errors.length === 0, errors.join('; '));
  await context.close();
}

await browser.close();
const failed = results.filter(item => !item.ok);
console.log(`\n共 ${results.length} 项，通过 ${results.length - failed.length} 项，失败 ${failed.length} 项`);
if (failed.length) process.exitCode = 1;
