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
  check('调优：门槛阻断时评测页提供「发起优化」', await page.locator('[data-demo=optimize-gate] button').count() === 1);
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
  check('B：锁定 v7 的调用方提示线上已是 v8', (await page.locator('.callers-table').innerText()).includes('线上已是 v8'));
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
  // 基础数据里社区穿搭灵感 Agent v13 正在灰度 10%：灰度期间版本历史不能回退
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
  await page.getByRole('button', { name: /保存为候选版本/ }).click(); await page.waitForTimeout(300);
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
  check('导航：工作台 / 资产中心 / 监控与成本 / 治理 / 模板广场（二期）', ['工作台', '资产中心', '监控与成本', '治理', '模板广场'].every(label => navText.includes(label)) && !navText.includes('评测中心') && !navText.includes('平台共享'), navText);
  check('导航：资产中心下常驻六个二级目录', (await page.locator('.nav-subgroup .nav-sub-item').allInnerTexts()).join('|') === '知识库|数据库|工具|评测集|模型|Prompt 模板');
  check('导航：模板广场置灰不可点', await page.locator('.nav-item-phase2[aria-disabled=true]').count() === 1);
  await go(page, '/library', 400);
  check('旧入口：能力组件库跳到资产中心 · 知识库', page.url().endsWith('#/assets/knowledge'), page.url());
  check('知识库：目录按团队 → 知识库 → 版本展开', await page.locator('.kb-tree .tree-team').count() === 4 && await page.locator('.kb-tree .tree-version').count() >= 2);
  await page.locator('.kb-tree .tree-kb', { hasText: '售后知识' }).click(); await page.waitForTimeout(200);
  await page.locator('.kb-tree .tree-version', { hasText: 'v34' }).click(); await page.waitForTimeout(200);
  check('知识库：点目录里的版本切换右侧内容', (await page.locator('.kb-main .capability h3').first().innerText()).startsWith('v34') && (await page.locator('.tree-version.selected').innerText()).includes('线上在用'));
  await page.locator('.kb-search input').fill('制度'); await page.waitForTimeout(200);
  check('知识库：目录搜索', await page.locator('.kb-tree .tree-kb').count() === 1);
  await go(page, '/evaluation', 400);
  check('旧入口：评测中心跳到资产中心 · 评测集', page.url().endsWith('#/assets/evalsets') && await page.locator('.evalset-table tbody tr').count() >= 8, page.url());
  await go(page, '/assets?tab=models', 300);
  check('旧入口：?tab= 地址跳到对应二级目录', page.url().endsWith('#/assets/models'), page.url());
  for (const [tab, rows] of [['tools', 7], ['models', 4], ['prompts', 8], ['databases', 4]]) {
    await go(page, `/assets/${tab}`, 300);
    check(`资产中心：${tab} 列表 ${rows} 行`, await page.locator('.asset-table tbody tr').count() === rows);
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
  await go(page, '/', 400);
  check('工作台：目录表格列为 Agent / 线上版本 / 进行中 / 运行健康 / 业务核心指标 / 本月成本', (await page.locator('.agent-table thead th').allInnerTexts()).slice(0, 6).join('|') === 'Agent|线上版本|进行中|运行健康|业务核心指标 · 近 7 日|本月成本');
  check('工作台：三个剧本 Agent 使用完整名称', (await page.locator('.agent-name-link strong').allInnerTexts()).join('|').includes('社区穿搭灵感 Agent|生态守护 Agent|电商售后答疑 Agent'));
  check('平台页：无页面错误', errors.length === 0, errors.join('; '));
  await context.close();
}

/* ---------------- 资产中心：详情、新建、修改（发布新版本 / 修改当前版本） ---------------- */
{
  const { page, context, errors } = await newPage(browser);
  const drawer = page.locator('.side-drawer');
  const inDrawer = name => drawer.getByRole('button', { name, exact: true });
  const crumbs = async () => (await page.locator('.breadcrumbs .crumb').allInnerTexts()).map(item => item.trim()).join(' > ');
  // 面包屑
  await go(page, '/agents/c/build', 400);
  check('面包屑：Agent 页面从 Agent 目录开始', (await crumbs()).startsWith('Agent 目录 > 电商售后答疑 Agent'), await crumbs());
  await go(page, '/operations', 300);
  check('面包屑：监控与成本只显示页面名', await crumbs() === '监控与成本', await crumbs());

  // 工具：被引用的版本只能改基本信息；发布新版本要审核
  await go(page, '/assets/tools', 400);
  await page.locator('.asset-name', { hasText: '订单查询' }).click(); await page.waitForTimeout(300);
  check('工具：点名称打开详情抽屉', await page.locator('[data-demo=tool-detail]').count() === 1);
  await inDrawer('修改').click(); await page.waitForTimeout(200);
  check('工具：修改前先选修改方式', await page.locator('.edit-option').count() === 2 && (await page.locator('.edit-option', { hasText: '修改当前版本' }).innerText()).includes('已被引用'));
  await page.locator('.edit-option', { hasText: '修改当前版本' }).click(); await inDrawer('继续').click(); await page.waitForTimeout(300);
  check('工具：被引用时原地修改会锁定接口字段', await page.getByLabel('接口标识').isDisabled() && !(await page.getByLabel('负责人').isDisabled()));
  await inDrawer('取消').click(); await page.waitForTimeout(300);
  await inDrawer('修改').click(); await inDrawer('继续').click(); await page.waitForTimeout(300);
  check('工具：发布新版本表单标题为 v5', (await drawer.locator('h2').innerText()).includes('v5'));
  await page.getByLabel('版本说明').fill('新增退款原因字段');
  check('工具：未测试调用不能提交', await drawer.getByRole('button', { name: '提交审核' }).isDisabled());
  await inDrawer('测试调用').click(); await drawer.getByRole('button', { name: '提交审核' }).click(); await page.waitForTimeout(400);
  check('工具：提交后详情显示 v5 审核中', (await page.locator('.pending-banner').innerText()).includes('v5 审核中'));
  await inDrawer('模拟审核通过').click(); await page.waitForTimeout(300);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  const orderRow = page.locator('.tools-table tbody tr', { hasText: '订单查询' });
  check('工具：审核通过后最新版本 v5，在用版本仍是 v4', (await orderRow.innerText()).includes('v5 已发布') && (await orderRow.innerText()).includes('v4'));
  await go(page, '/agents/c/build', 500);
  check('联动：工具发布 v5 后，构建页提示依赖已变化', (await page.locator('[data-demo=dep-banner]').innerText()).includes('订单查询 v5'));
  check('联动：构建页工具版本选项出现 v5', (await page.locator('.tool-card', { hasText: '订单查询' }).locator('select').innerText()).includes('v5'));
  await go(page, '/assets/tools', 400);
  // 未被引用的工具可以原地修改全部内容
  await page.locator('.asset-name', { hasText: 'OA 休假余额查询' }).click(); await inDrawer('修改').click();
  await page.locator('.edit-option', { hasText: '修改当前版本' }).click(); await inDrawer('继续').click(); await page.waitForTimeout(300);
  check('工具：未被引用时可原地修改全部内容', !(await page.getByLabel('接口标识').isDisabled()));
  await inDrawer('取消').click(); await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  // 新建工具
  await page.locator('[data-demo=tool-create] button').click(); await page.waitForTimeout(300);
  await page.getByLabel('工具名称').fill('退款进度查询'); await page.getByLabel('接口标识').fill('refund.progress.get');
  await page.getByLabel('调用说明').fill('用户询问退款进度时调用'); await page.getByLabel('负责人').fill('王宁');
  await inDrawer('测试调用').click(); await drawer.getByRole('button', { name: '提交审核' }).click(); await page.waitForTimeout(400);
  check('工具：新建后列表多一行，状态审核中', await page.locator('.tools-table tbody tr').count() === 8 && (await page.locator('.tools-table tbody tr', { hasText: '退款进度查询' }).innerText()).includes('v1 审核中'));
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);

  // 评测集：新建后出现在 Agent 评测页
  await go(page, '/assets/evalsets', 400);
  await page.locator('[data-demo=evalset-create] button').click(); await page.waitForTimeout(300);
  await page.getByLabel('评测集名称').fill('大促售后样本集'); await page.getByLabel('归属 Agent').selectOption({ label: '内部制度问答助手' });
  await inDrawer('使用示例文件').click(); await drawer.getByRole('button', { name: '保存为 v1' }).click(); await page.waitForTimeout(400);
  check('评测集：新建后列表多一行', await page.locator('.evalset-table tbody tr', { hasText: '大促售后样本集' }).count() === 1);
  check('评测集：列名为「进入 Agent 配置」', (await page.locator('.evalset-table thead th').last().innerText()).trim() === '进入 Agent 配置');
  await page.keyboard.press('Escape');
  await go(page, '/agents/general/evaluation', 500);
  check('评测集：Agent 评测页可以选到新建的评测集', (await page.locator('body').innerText()).includes('大促售后样本集'));

  // 模型：外部模型的数据等级固定
  await go(page, '/assets/models', 400);
  await page.locator('[data-demo=model-create] button').click(); await page.waitForTimeout(300);
  await drawer.locator('.asset-chips button', { hasText: '公司网关' }).click();
  check('模型：外部模型的数据等级固定为仅内部数据', await page.getByLabel('数据等级').isDisabled() && (await page.getByLabel('数据等级').inputValue()).startsWith('仅内部数据'));
  await page.getByLabel('模型名称').fill('GPT-5 mini'); await page.getByLabel('权重版本').fill('网关路由 2026-10');
  await page.getByLabel('负责人').fill('韩叙'); await page.getByLabel('输入单价').fill('2'); await page.getByLabel('输出单价').fill('8');
  await inDrawer('连通性测试').click(); await drawer.getByRole('button', { name: '提交接入审批' }).click(); await page.waitForTimeout(400);
  check('模型：接入后列表多一行，状态审核中', await page.locator('.models-table tbody tr').count() === 5 && (await page.locator('.models-table tbody tr', { hasText: 'GPT-5 mini' }).innerText()).includes('审核中'));
  await page.keyboard.press('Escape');

  // Prompt 模板：变量自动识别
  await go(page, '/assets/prompts', 400);
  await page.locator('[data-demo=prompt-create] button').click(); await page.waitForTimeout(300);
  await page.getByLabel('模板名称').fill('售后安抚话术'); await page.getByLabel('负责人').fill('王宁');
  await page.getByLabel('模板正文').fill('先安抚情绪，再回答 {{question}}，引用 {{context}}。');
  check('Prompt：正文里的变量自动出现在变量说明里', await drawer.locator('.var-row').count() === 2);
  await drawer.getByRole('button', { name: '保存为 v1' }).click(); await page.waitForTimeout(400);
  check('Prompt：新建后列表 9 行', await page.locator('.prompts-table tbody tr').count() === 9);
  await page.keyboard.press('Escape');

  // 知识库：新建后出现在目录里
  await go(page, '/assets/knowledge', 400);
  await page.locator('[data-demo=kb-create] button').click(); await page.waitForTimeout(300);
  await page.getByLabel('知识库名称').fill('售后知识 · 海外站'); await page.getByLabel('所属团队').selectOption({ label: '客户服务' }); await page.getByLabel('负责人').fill('王宁');
  await inDrawer('使用示例文档').click(); await drawer.getByRole('button', { name: '创建并发布 v1' }).click(); await page.waitForTimeout(400);
  check('知识库：新建后在目录里选中，显示 v1', (await page.locator('.tree-kb.current').innerText()).includes('售后知识 · 海外站') && (await page.locator('.kb-main .capability h3').first().innerText()).startsWith('v1'));
  check('资产中心：无页面错误', errors.length === 0, errors.join('; '));
  await context.close();
}

/* ---------------- 剧本与自由浏览：从 Agent 目录进入不打开剧本 ---------------- */
{
  const { page, context, errors } = await newPage(browser);
  await startPlaybook(page, 'A');
  check('剧本：开始后显示浮层', await page.locator('.playbook-panel, .playbook-pill').count() === 1);
  check('剧本：浮层里有退出提示', (await page.locator('.playbook-panel .pb-hint').innerText()).includes('重置演示'));
  await go(page, '/', 400);
  await page.locator('.agent-name-link', { hasText: '社区穿搭灵感 Agent' }).click(); await page.waitForTimeout(600);
  check('剧本：从 Agent 目录进入后暂停，不显示浮层', await page.locator('.playbook-panel, .playbook-pill').count() === 0 && (await agentState(page, 'a')).playbook?.paused === true);
  check('剧本：暂停时不锁定发布策略', await (async () => { await go(page, '/agents/a/release', 500); return !(await page.locator('body').innerText()).includes('剧本 A 进行中，此操作已锁定'); })());
  await go(page, '/', 400);
  check('剧本：工作台卡片显示已暂停', (await page.locator('.playbook-card.active').innerText()).includes('已暂停'));
  await page.getByRole('button', { name: '继续剧本 A' }).click(); await page.waitForTimeout(600);
  check('剧本：继续剧本后浮层恢复', await page.locator('.playbook-panel').count() === 1 && !(await agentState(page, 'a')).playbook?.paused);
  check('剧本：无页面错误', errors.length === 0, errors.join('; '));
  await context.close();
}

/* ---------------- 构建页三栏：草稿自动保存、免保存调试、优化 / 模板、记忆与备用模型、版本快照折叠 ---------------- */
{
  const { page, context, errors } = await newPage(browser);
  const v4 = async () => page.evaluate(() => JSON.parse(localStorage.getItem('agent-platform-demo-v9')).agents.find(a => a.id === 'general').versions.find(v => v.id === 'v4'));
  await go(page, '/agents/general/build', 600);
  const box = async selector => (await page.locator(selector).first().boundingBox())?.x ?? -1;
  check('构建：Prompt / 能力配置 / 调试三栏从左到右', await box('[data-demo=prompt]') < await box('[data-demo=config]') && await box('[data-demo=config]') < await box('.debug-chat'));
  check('构建：版本快照与对比默认折叠', await page.locator('.snapshot-body').count() === 0 && (await page.locator('.snapshot-toggle').innerText()).includes('版本快照与对比'));
  check('构建：主模型选项来自资产中心已发布模型', await page.locator('[data-group=model] select').first().locator('option').count() === 4);
  await page.locator('.prompt-editor').fill('你是公司的内部制度问答助手。请回答 {{question}}。'); await page.waitForTimeout(900);
  let v = await v4();
  check('构建：修改后自动保存为草稿，版本快照不变', Boolean(v.draft) && !v.config.prompt.startsWith('你是公司的内部制度问答助手。请回答') && !v.configured);
  await page.locator('[data-demo=debug-run] button').click(); await page.waitForTimeout(1300);
  v = await v4();
  check('构建：未保存也能调试，调试记在草稿上', v.draft?.debugged === true && !v.configured);
  check('构建：调试对话显示开场白和一轮问答', await page.locator('.bubble-opening').count() === 1 && await page.locator('.debug-turn .bubble-agent:not(.bubble-opening)').count() === 1);
  check('构建：开启追问时回答后给出追问建议', await page.locator('[data-demo=follow-ups] button').count() === 2);
  await page.getByRole('button', { name: '优化' }).click(); await page.waitForTimeout(300);
  check('构建：优化给出逐行 diff', await page.locator('[data-demo=prompt-optimize] .diff-line.add').count() >= 2);
  await page.getByRole('button', { name: '采纳建议' }).click(); await page.waitForTimeout(900);
  check('构建：采纳后 Prompt 更新，草稿需要重新调试', (await page.locator('.prompt-editor').inputValue()).includes('不透露') && (await v4()).draft?.debugged === false);
  await page.getByLabel('参考对话轮数数值').fill('10'); await page.waitForTimeout(100);
  await page.locator('[data-demo=debug-run] button').click(); await page.waitForTimeout(1300);
  await page.getByRole('button', { name: /保存为候选版本 v4/ }).click(); await page.waitForTimeout(600);
  v = await v4();
  check('构建：保存为候选版本后草稿清空，调试结果保留', !v.draft && v.configured && v.debugged && v.config.memory.turns === 10);
  check('构建：保存后出现「下一步：运行评测」', await page.getByRole('link', { name: '下一步：运行评测' }).count() === 1);
  await page.getByRole('button', { name: '套用模板' }).click(); await page.waitForTimeout(300);
  await page.locator('.side-drawer').getByRole('button', { name: '替换当前 Prompt' }).click();
  await page.locator('.side-drawer').getByRole('button', { name: '确认替换' }).click(); await page.waitForTimeout(900);
  check('构建：套用模板把正文复制进草稿', (await page.locator('.prompt-editor').inputValue()).includes('{{role}}') && Boolean((await v4()).draft));
  await go(page, '/agents/general/evaluation', 500);
  check('构建：有未保存草稿时，评测页提示评测的是已保存快照', (await page.locator('body').innerText()).includes('构建页有未保存的草稿'));
  await go(page, '/agents/general/build', 500);
  check('构建：离开再回来草稿还在', (await page.locator('.prompt-editor').inputValue()).includes('{{role}}'));
  await page.locator('.snapshot-toggle').click(); await page.waitForTimeout(200);
  check('构建：展开后显示依赖锁定和版本 diff（含备用模型与记忆）', await page.locator('.dep-list').count() === 1 && (await page.locator('.diff-sections').innerText()).includes('备用：') && (await page.locator('.diff-sections').innerText()).includes('参考 10 轮'));
  await go(page, '/agents/general/settings', 400);
  check('联动：设置页降级策略显示各版本的备用模型', (await page.locator('body').innerText()).includes('v3 → Qwen3-32B'));
  check('构建：无页面错误', errors.length === 0, errors.join('; '));
  await context.close();
}

/* ---------------- 发布页 · 接入方式 ---------------- */
{
  const { page, context, errors } = await newPage(browser);
  await go(page, '/agents/b/release', 600);
  const access = page.locator('[data-demo=access]');
  check('接入：显示 app_id 和调用地址', (await access.innerText()).includes('app_b_') && (await access.innerText()).includes('/batch-jobs'));
  check('接入：默认按线上指向调用，示例不带 version', !(await access.locator('.code-sample pre').innerText()).includes('"version"'));
  await access.getByRole('radio', { name: '指定版本' }).click();
  check('接入：指定版本时示例带上锁定的版本号', (await access.locator('.code-sample pre').innerText()).includes('"version": "v7"'));
  check('接入：调用方登记 2 个', await page.locator('.callers-table tbody tr').count() === 2);
  await access.getByRole('button', { name: '登记调用方' }).click();
  await page.getByLabel('服务名').fill('risk-dashboard'); await page.getByLabel('负责人').fill('周可');
  await page.getByLabel('QPS 配额').fill('1000');
  check('接入：超出限流不能登记', await access.getByRole('button', { name: '登记', exact: true }).isDisabled());
  await page.getByLabel('QPS 配额').fill('10');
  await access.getByRole('button', { name: '登记', exact: true }).click(); await page.waitForTimeout(300);
  check('接入：登记后多一行', await page.locator('.callers-table tbody tr').count() === 3);
  await go(page, '/governance', 400);
  check('接入：登记写入治理 · 最近操作', (await page.locator('.audit-table').innerText()).includes('登记调用方 risk-dashboard'));
  check('接入：无页面错误', errors.length === 0, errors.join('; '));
  await context.close();
}

/* ---------------- 观测 · 线上干预：由 bad case 生成、写审计、修复版本回归通过并全量后自动失效 ---------------- */
{
  const { page, context, errors } = await newPage(browser);
  await go(page, '/agents/c/trace', 600);
  await page.locator('[data-demo="stage-bc-4415"] button', { hasText: '知识' }).click();
  await page.locator('[data-demo="add-eval-bc-4415"] button').click(); await page.waitForTimeout(200);
  await page.locator('[data-demo=intervene-bc-4415] button').click(); await page.waitForTimeout(300);
  check('干预：表单预填命中条件和标准答案', (await page.getByLabel('命中条件').inputValue()).includes('价保'));
  await page.getByRole('button', { name: '立即生效' }).click(); await page.waitForTimeout(300);
  check('干预：列表显示生效中，bad case 上显示干预标记', (await page.locator('[data-demo=interventions]').innerText()).includes('生效中') && await page.locator('.intervention-chip').count() === 1);
  await go(page, '/agents/c/monitor', 400);
  check('干预：监控页提示有干预生效中', await page.locator('[data-demo=intervention-banner]').count() === 1);
  // 准备一个修复版本 v22：在 bad case 回归集上评测过、灰度 50%，下一次放量即全量
  await page.evaluate(() => {
    const key = 'agent-platform-demo-v9';
    const state = JSON.parse(localStorage.getItem(key));
    const agent = state.agents.find(a => a.id === 'c');
    const base = agent.versions.find(v => v.id === 'v21');
    agent.versions.unshift({ ...base, id: 'v22', status: '灰度中', traffic: 50, everOnline: false, note: '修复价保期', evaluatedDatasets: ['badcase'], experimentAt: '2026-09-29 12:05', updatedAt: '2026-09-29 12:04' });
    localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload(); await go(page, '/agents/c/release', 600);
  await page.getByRole('button', { name: '全量发布 v22' }).click(); await page.waitForTimeout(400);
  await go(page, '/agents/c/trace', 500);
  check('干预：修复版本回归通过并全量后自动失效', (await page.locator('[data-demo=interventions]').innerText()).includes('已失效') && await page.locator('.intervention-chip').count() === 0);
  await go(page, '/governance', 400);
  const audit = await page.locator('.audit-table').innerText();
  check('干预：创建和自动失效都写入操作记录', audit.includes('创建线上干预 iv-001') && audit.includes('iv-001 自动失效'));
  check('干预：无页面错误', errors.length === 0, errors.join('; '));
  await context.close();
}

/* ---------------- 构建页 · 能力配置：＋ 添加（资产中心搜索 / 上传入库）、同一工具只挂一个版本、数据库、批量模式 ---------------- */
{
  const { page, context, errors } = await newPage(browser);
  const draft = async () => page.evaluate(() => { const v = JSON.parse(localStorage.getItem('agent-platform-demo-v9')).agents.find(a => a.id === 'general').versions.find(x => x.id === 'v4'); return (v.draft ?? v).config; });
  await go(page, '/agents/general/build', 600);
  check('能力：工具只显示已添加的 1 个', await page.locator('[data-group=tools] .tool-card').count() === 1);
  await page.locator('[data-demo=add-tool] button').click(); await page.waitForTimeout(200);
  check('能力：添加弹窗列出资产中心的工具，已添加的标「已添加」', (await page.locator('.add-list li', { hasText: '员工身份查询' }).innerText()).includes('已添加') && !(await page.locator('.add-dialog').innerText()).includes('账号历史查询'));
  await page.locator('.add-list li', { hasText: 'OA 休假余额查询' }).getByRole('button', { name: '添加' }).click(); await page.waitForTimeout(900);
  check('能力：添加后挂最新版本', (await draft()).tools.includes('OA 休假余额查询 v1'));
  await page.locator('[data-demo=add-tool] button').click(); await page.waitForTimeout(200);
  await page.locator('.add-list li', { hasText: '笔记检索' }).getByRole('button', { name: '添加' }).click(); await page.waitForTimeout(200);
  await page.getByLabel('笔记检索 版本').selectOption('v3'); await page.waitForTimeout(900);
  const tools = (await draft()).tools;
  check('能力：同一个工具只挂一个版本，切版本是替换', tools.includes('笔记检索 v3') && !tools.includes('笔记检索 v4'));
  // 上传工具：本团队可见，保存即发布并挂到草稿
  await page.locator('[data-demo=add-tool] button').click(); await page.waitForTimeout(200);
  await page.getByRole('button', { name: '上传工具' }).click(); await page.waitForTimeout(300);
  await page.getByLabel('工具名称').fill('报销进度查询'); await page.getByLabel('接口标识').fill('oa.expense.status'); await page.getByLabel('调用说明').fill('员工询问报销进度时调用');
  await page.locator('.side-drawer').getByRole('button', { name: '测试调用' }).click();
  await page.locator('.side-drawer').getByRole('button', { name: '发布 v1' }).click(); await page.waitForTimeout(900);
  check('能力：上传的工具入库并挂到草稿', (await draft()).tools.includes('报销进度查询 v1') && (await page.locator('.cap-notice').innerText()).includes('入库'));
  // 数据库：最多 1 个；创建后入库
  await page.locator('[data-demo=add-database] button').click(); await page.waitForTimeout(200);
  check('能力：数据库弹窗写明只能添加 1 个', (await page.locator('.add-dialog-limit').innerText()).includes('1 个数据库'));
  await page.locator('.add-list li', { hasText: '差旅标准表' }).getByRole('button', { name: '选用' }).click(); await page.waitForTimeout(900);
  check('能力：选用数据库后写入草稿', (await draft()).database === '差旅标准表');
  await page.locator('[data-demo=add-database] button').click(); await page.waitForTimeout(200);
  await page.getByRole('button', { name: '创建数据库' }).first().click(); await page.waitForTimeout(300);
  await page.getByLabel('数据库名称').fill('休假额度表'); await page.locator('.side-drawer').getByRole('button', { name: '使用示例表格' }).click();
  await page.locator('.side-drawer').getByRole('button', { name: '创建并发布 v1' }).click(); await page.waitForTimeout(900);
  check('能力：新建的数据库替换当前数据库', (await draft()).database === '休假额度表');
  // 记忆、推荐问
  await page.locator('[data-group=tables] .cap-add').click(); await page.getByLabel('表名').fill('请假记录'); await page.waitForTimeout(900);
  check('能力：记忆表写入草稿', (await draft()).memory.tables.some(t => t.name === '请假记录'));
  await go(page, '/assets/tools', 400);
  check('联动：上传的工具出现在资产中心，本团队可见即已发布', (await page.locator('.tools-table tbody tr', { hasText: '报销进度查询' }).innerText()).includes('v1'));
  await go(page, '/assets/databases', 400);
  check('联动：新建的数据库出现在资产中心', await page.locator('.databases-table tbody tr').count() === 5);
  await go(page, '/agents/b/build', 500);
  check('能力：批量模式下记忆和对话整组停用并写明原因', (await page.locator('.cap-disabled').allInnerTexts()).length === 2);
  check('能力：无页面错误', errors.length === 0, errors.join('; '));
  await context.close();
}

/* ---------------- 调优闭环：构建与调优、下一轮、发起优化、本轮优化目标 ---------------- */
{
  const { page, context, errors } = await newPage(browser);
  const ops = async id => page.evaluate(agentId => JSON.parse(localStorage.getItem('agent-platform-demo-v9')).ops[agentId] ?? null, id);
  await go(page, '/agents/c/trace', 600);
  check('调优：发布过的 Agent 第一步叫「构建与调优」', (await page.locator('.lifecycle-item strong').first().innerText()) === '构建与调优');
  check('调优：观测后面有「下一轮」回环', (await page.locator('[data-demo=loop]').innerText()).includes('发起优化'));
  check('调优：未标注问题环节时不显示「发起优化」', await page.locator('[data-demo="optimize-bc-4415"]').count() === 0);
  await page.locator('[data-demo="stage-bc-4415"] button', { hasText: '知识' }).click();
  await page.locator('[data-demo="optimize-bc-4415"] button').click(); await page.waitForTimeout(300);
  check('调优：表单预填调优对象和目标指标', await page.locator('.goal-form .asset-chips button.on').innerText() === '知识' && (await page.getByLabel('目标指标 1').inputValue()).includes('bc-4415'));
  await page.getByRole('button', { name: '确认并去调优' }).click(); await page.waitForTimeout(800);
  check('调优：确认后进入构建与调优，面包屑同步', page.url().endsWith('#/agents/c/build') && (await page.locator('.breadcrumbs').innerText()).includes('构建与调优'));
  check('调优：没有候选版本时目标等待挂载', (await page.locator('[data-demo=goal-card]').innerText()).includes('待开始'));
  check('调优：发起优化时 bad case 自动加入回归集', (await ops('c')).badcases['bc-4415'].inEvalSet === true);
  check('调优：「下一轮」显示进行中的目标数', (await page.locator('[data-demo=loop] .loop-count').innerText()) === '1');
  await page.locator('[data-demo=dep-upgrade] button').click(); await page.waitForTimeout(900);
  check('调优：新建候选版本时目标挂到 v22', (await ops('c')).goals[0].version === 'v22' && (await page.locator('[data-demo=goal-card]').innerText()).includes('调优中'));
  check('调优：调优对象对应的模块高亮', await page.locator('[data-group=knowledge].is-focus').count() === 1);
  await page.locator('[data-demo=debug-run] button').click(); await page.waitForTimeout(1300);
  await go(page, '/agents/c/evaluation', 500);
  await page.locator('.dataset-list button', { hasText: 'bad case 回归集' }).click();
  await page.getByRole('button', { name: '运行评测', exact: true }).click(); await page.waitForTimeout(1600);
  check('调优：评测页核对目标', (await page.locator('[data-demo=goal-card]').innerText()).includes('优化目标核对'));
  const goalState = await page.locator('[data-demo=goal-card] .goal-state').innerText();
  await go(page, '/agents/c/release', 500);
  check('调优：发布页生产就绪检查有「本轮优化目标已验证」', (await page.locator('[data-demo=check-goals]').innerText()).includes('本轮优化目标'), goalState);
  await go(page, '/governance', 400);
  check('调优：发起优化写入操作记录', (await page.locator('.audit-table').innerText()).includes('发起优化 og-001'));
  await go(page, '/agents/a/release', 500);
  check('调优：AB 报告里变差的指标可以发起优化', await page.locator('[data-demo="optimize-ab-P95 延迟"] button').count() === 1);
  // 从没发布过的 Agent：第一步叫「构建」，没有「下一轮」
  await page.evaluate(() => { const key = 'agent-platform-demo-v9'; const state = JSON.parse(localStorage.getItem(key)); const agent = state.agents.find(a => a.id === 'general'); agent.productionVersion = null; agent.versions.forEach(v => { v.everOnline = false; if (v.status === '线上' || v.status === '历史') v.status = '待发布'; }); agent.versions = agent.versions.slice(0, 1); localStorage.setItem(key, JSON.stringify(state)); });
  await page.reload(); await go(page, '/agents/general/build', 500);
  check('调优：没发布过的 Agent 第一步叫「构建」', (await page.locator('.lifecycle-item strong').first().innerText()) === '构建' && await page.locator('[data-demo=loop]').count() === 0);
  check('调优：无页面错误', errors.length === 0, errors.join('; '));
  await context.close();
}

await browser.close();
const failed = results.filter(item => !item.ok);
console.log(`\n共 ${results.length} 项，通过 ${results.length - failed.length} 项，失败 ${failed.length} 项`);
if (failed.length) process.exitCode = 1;
