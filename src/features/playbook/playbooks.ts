/**
 * 三条可点击的演示剧本。每一步指向一个现有页面和页面上的目标元素（data-demo），
 * done 条件满足时浮层自动进入下一步。所有数字均为演示数据。
 */
import { knowledgeBasesFor, nextKbVersion } from '../../core/data-access/scenarioData';
import { useDemo } from '../../core/store/DemoProvider';
import { evaluateGate } from '../../core/rules/gate';
import { pbNewClause, pbOldClause, pcOldEntry, pcOldEntryExpiry, pendingEntries } from '../../data';
import type { Agent, AgentOps, DemoState, PlaybookId } from '../../types/domain';
import type { HeroId } from '../../shared/components/Capability';

export interface PlaybookCtx { state: DemoState; agent: Agent; ops: AgentOps }
export interface PlaybookApi {
  applyFix: (agentId: string, versionId: string, config: Agent['versions'][number]['config']) => void;
  setKbDraft: (draft: DemoState['kbDraft']) => void;
}
export interface PlaybookStep {
  title: string; body: string; next: string;
  /** 'release' 这类 Agent 页面，或 '/library' 这类平台页面 */
  page: string; target?: string; hero?: HeroId;
  done?: (ctx: PlaybookCtx) => boolean;
  helper?: { label: string; run: (api: PlaybookApi, ctx: PlaybookCtx) => void };
}
/**
 * 剧本进行中锁定的入口，避免点错后剧情走偏：
 * plain-draft：构建页「新建草稿」（剧本要求通过依赖升级创建候选版本）
 * strategy：发布策略（剧本固定用影子运行 / 比例灰度）
 * kb-discard：知识库草稿的「放弃草稿」
 */
export type PlaybookLock = 'plain-draft' | 'strategy' | 'kb-discard';
export interface Playbook { id: PlaybookId; agentId: string; letter: string; theme: string; title: string; summary: string; outcome: string; flow: string[]; heroes: HeroId[]; locks: PlaybookLock[]; steps: PlaybookStep[] }

const version = (ctx: PlaybookCtx, id: string) => ctx.agent.versions.find(item => item.id === id) ?? null;
const gatePassed = (ctx: PlaybookCtx, id: string) => { const v = version(ctx, id); return Boolean(v && evaluateGate(ctx.agent, ctx.ops, v).passed); };
/** 候选版本存在且已切换到剧本要求的知识版本 */
const onKnowledge = (ctx: PlaybookCtx, id: string, pattern: RegExp) => Boolean(version(ctx, id) && pattern.test(version(ctx, id)!.config.knowledge));
const PB_KB = /政策库 2026-10 版/;
const PC_KB = /售后知识 v35/;

export const pageNames: Record<string, string> = { build: '构建页', evaluation: '评测页', release: '发布与实验页', monitor: '监控页', trace: 'Trace 与 bad case 页', settings: '设置页', '/library': '能力组件库' };
export const pagePath = (playbook: Playbook, page: string) => page.startsWith('/') ? page : `/agents/${playbook.agentId}/${page}`;

export const playbooks: Playbook[] = [
  {
    id: 'a', agentId: 'a', letter: 'A', theme: '快', title: '穿搭灵感', heroes: [2, 3, 4], locks: [],
    summary: '灰度中发现延迟超门槛，一键回退，再用 Trace 定位原因。',
    outcome: '从告警到全部流量回到 v12 用时 1 分 48 秒，Trace 直接定位到 v13 新增的步骤。',
    flow: ['v13 灰度 10%', 'AB 报告', '延迟告警', '回退到 v12', 'Trace 定位'],
    steps: [
      { title: 'v13 正在灰度 10%', page: 'release', target: 'traffic', hero: 2,
        body: 'v13 按用户分桶承接 10% 流量，会话粘性已开启：同一用户在灰度期间固定命中 v13。线上指向仍是 v12。',
        next: '看完流量指向后，点浮层里的「下一步」查看 AB 报告。' },
      { title: 'AB 报告：更好，但更慢', page: 'release', target: 'ab', hero: 2,
        body: '数据来自公司实验平台，按写入埋点的版本号归因：采纳率 +2.1pp（显著），但 P95 延迟 +380ms，超过 1,000ms 门槛。',
        next: '点「下一步」查看告警。' },
      { title: '监控告警已触发', page: 'release', target: 'alert', hero: 4,
        body: '公司监控平台发现 v13 分桶 P95 超门槛，已电话 + 群消息通知负责人和值班组。',
        next: '点「下一步」，准备回退。' },
      { title: '一键回退到 v12', page: 'release', target: 'rollback', hero: 3,
        body: '回退 = 把线上指向从 v13 切回 v12。v12 的快照（模型、Prompt、工具、知识版本）原样不动，不需要重新构建。',
        next: '点「回退到 v12」，在页面内确认区看清影响范围后点「确认回退到 v12」。',
        done: ctx => version(ctx, 'v13')?.status !== '灰度中' },
      { title: '1 分 48 秒完成回退', page: 'release', target: 'switch-result', hero: 3,
        body: '线上指向 v13 → v12，灰度流量全部回到 v12，延迟告警随之恢复。v13 退回「待发布」。',
        next: '点「下一步」去 Trace 定位原因。' },
      { title: 'Trace 定位：新增步骤变慢', page: 'trace', target: 'trace-issue',
        body: 'v13 请求多了一步「图文笔记检索 v4」，串行执行、单步 380ms；对照 v12 同类请求没有这一步。修复方向很明确：改为并行或加缓存。',
        next: '剧本结束，点「完成剧本」。' },
    ],
  },
  {
    id: 'b', agentId: 'b', letter: 'B', theme: '准', title: '生态守护', heroes: [1, 2, 3], locks: ['plain-draft', 'strategy'],
    summary: '政策库更新后先评测再上线：门槛拦下红线漏判，修正后影子验证、审批、发布。',
    outcome: '红线漏判在上线前被强制门槛拦下；修正后影子运行与抽检标注一致率 97.8%，全部检查通过后发布。',
    flow: ['政策库 10 月版', '创建 v8', '隔离评测', '门槛阻断', 'Trace 找旧条款', '修正重测', '影子 AB', '审批发布'],
    steps: [
      { title: '政策库发布 2026-10 版', page: 'build', target: 'dep-upgrade', hero: 3,
        body: '线上 v7 的快照锁定政策库 2026-09 版。政策库发布 10 月版后，平台提示依赖已变化，但不会悄悄改变线上 v7 的行为。',
        next: '点「基于 v7 创建候选版本 v8（升级依赖）」。',
        done: ctx => onKnowledge(ctx, 'v8', PB_KB) },
      { title: '不发布，直接跑评测', page: 'evaluation', target: 'eval-run', hero: 1,
        body: 'v8 只在隔离环境运行，不接生产流量。评测集已包含 10 月版新增的谐音、二维码导流红线样本。',
        next: '点「运行评测」。',
        done: ctx => onKnowledge(ctx, 'v8', PB_KB) && Boolean(version(ctx, 'v8')?.evaluatedDatasets.length) },
      { title: '红线漏判 2 条，门槛阻断', page: 'evaluation', target: 'gate-summary', hero: 1,
        body: '站外引流类召回率 91.8%（门槛 ≥ 95%），2 条红线样本漏判。强制阻断已开启，这一版不可能被发布出去。',
        next: '点「下一步」看发布页的反应。' },
      { title: '发布按钮被禁用', page: 'release', target: 'publish', hero: 1,
        body: '生产就绪检查里「评测门槛已通过」未完成，发布按钮禁用并写明原因——不是提醒，是拦截。',
        next: '点「下一步」去 Trace 找原因。' },
      { title: 'Trace：引用了旧条款', page: 'trace', target: 'trace-issue',
        body: '隔离评测的 Trace 显示：检索召回了 10 月版条款 4.5，但 Prompt 示例把条款写死成 9 月版的 4.3，模型沿用旧条款，把谐音导流判成「不违规」。',
        next: '点「下一步」去构建页修正 Prompt。' },
      { title: '修正 Prompt 示例', page: 'build', target: 'prompt',
        body: `把 Prompt 示例里的「${pbOldClause}」改成「${pbNewClause}」。修改后评测结果会失效，需要重新评测。`,
        next: '手动修改后点「保存配置」并运行调试；或点浮层里的「代我修正」，会保存配置并自动跑一次冒烟调试。',
        done: ctx => { const v = version(ctx, 'v8'); return Boolean(v && onKnowledge(ctx, 'v8', PB_KB) && !v.config.prompt.includes(pbOldClause) && v.configured && v.debugged); },
        helper: { label: '代我修正', run: (api, ctx) => { const v = version(ctx, 'v8'); if (v) api.applyFix(ctx.agent.id, v.id, { ...v.config, prompt: v.config.prompt.split(pbOldClause).join(pbNewClause) }); } } },
      { title: '重新评测：通过', page: 'evaluation', target: 'eval-run', hero: 1,
        body: '修正后重新在隔离环境评测：站外引流类召回率 96.4%，红线样本全部通过，门槛放行。',
        next: '点「运行评测」。',
        done: ctx => onKnowledge(ctx, 'v8', PB_KB) && gatePassed(ctx, 'v8') },
      { title: '影子运行 v8', page: 'release', target: 'publish', hero: 2,
        body: '发布策略是「影子运行」：v8 复制线上请求双跑，只对比不返回用户。影子运行不影响用户，审批放到全量之前。',
        next: '点「开始影子运行 v8」，再点确认。',
        done: ctx => version(ctx, 'v8')?.status === '影子运行' || ctx.agent.productionVersion === 'v8' },
      { title: '影子 AB：更准', page: 'release', target: 'ab', hero: 2,
        body: '对照标注平台抽检：与标注一致率 v7 96.1% → v8 97.8%，红线类别全部召回，误判率下降。',
        next: '点「下一步」完成审批。' },
      { title: '生产就绪检查 + 审批', page: 'release', target: 'check-approval', hero: 1,
        body: '门槛、护栏、负责人、告警都已通过，全量发布前只差负责人审批。',
        next: '点「提交审批」，再点「模拟审批通过」。',
        done: ctx => ctx.ops.approvedVersion === 'v8' || ctx.agent.productionVersion === 'v8' },
      { title: '全量发布 v8', page: 'release', target: 'publish', hero: 1,
        body: '五项检查全部通过，发布按钮可用。发布 = 线上指向 v7 → v8；有问题可以随时回退到 v7。',
        next: '点「全量发布 v8」，再点确认。',
        done: ctx => ctx.agent.productionVersion === 'v8' },
    ],
  },
  {
    id: 'c', agentId: 'c', letter: 'C', theme: '稳', title: '售后答疑', heroes: [1, 2, 3, 4], locks: ['plain-draft', 'strategy', 'kb-discard'],
    summary: '用户投诉答错退货规则：从 bad case 追到过期知识，更新知识版本后回归、按会话灰度。',
    outcome: '问题归因到知识条目缺少失效时间；更新知识版本并回归后按会话灰度，转人工率 12.1% → 9.6%。',
    flow: ['用户投诉', 'Trace 过期知识', '标注「知识」', '加入评测集', '知识 v35', '创建 v22', '回归评测', '会话灰度', '转人工率下降'],
    steps: [
      { title: '投诉进入 bad case 工作台', page: 'trace', target: 'badcase-bc-4431', hero: 4,
        body: '用户反馈「回答的是旧的退货规则」，经公司标注平台回流到 bad case 工作台，并关联了当次请求的 Trace。',
        next: '点这条 bad case 下的「查看 Trace tr_9f2b17」，再点浮层「下一步」。' },
      { title: 'Trace：命中过期知识', page: 'trace', target: 'trace-issue', hero: 3,
        body: `检索命中《退货政策》「七天无理由退货」（售后知识 v34）。9 月 1 日起已被十五天新规替代，但这条知识没设失效时间，仍被命中，护栏也无法识别。`,
        next: '点「下一步」标注问题环节。' },
      { title: '人工标注：知识问题', page: 'trace', target: 'stage-bc-4431', hero: 4,
        body: '问题不在 Prompt、模型或工具，而在知识。标注结果同步到公司标注平台。',
        next: '在这条 bad case 上点「知识」。',
        done: ctx => ctx.ops.badcases['bc-4431']?.stage === '知识' },
      { title: '加入评测集', page: 'trace', target: 'add-eval-bc-4431',
        body: '加入后生成「bad case 回归集」，之后每个候选版本上线前都会用它回归。',
        next: '点「加入评测集」。',
        done: ctx => Boolean(ctx.ops.badcases['bc-4431']?.inEvalSet) },
      { title: '新建知识版本', page: '/library', target: 'kb-new-version', hero: 3,
        body: '去能力组件库更新售后知识：基于 v34 新建 v35，而不是直接改线上正在用的 v34。',
        next: '确认选中「售后知识」，点「基于 v34 新建版本 v35」。',
        done: ctx => ctx.state.kbDraft?.kbId === 'aftersale' || knowledgeBasesFor(ctx.state).some(kb => kb.id === 'aftersale' && kb.versions.some(v => v.id === 'v35')) },
      { title: '设置生效 / 失效时间', page: '/library', target: 'kb-draft', hero: 3,
        body: `给旧条目「七天无理由退货」设置失效时间 ${pcOldEntryExpiry}；把知识运营提交的「十五天无理由退货」加入本版本，生效时间 2026-09-01 00:00。`,
        next: '按上面填写后点「发布 v35」，或点浮层里的「代我填写」再发布。',
        done: ctx => knowledgeBasesFor(ctx.state).some(kb => kb.id === 'aftersale' && kb.versions.some(v => v.id === 'v35')),
        helper: { label: '代我填写', run: (api, ctx) => {
          // 没有草稿（例如被放弃）时，先基于最新版本新建草稿再填写
          const kb = knowledgeBasesFor(ctx.state).find(item => item.id === 'aftersale');
          if (!kb) return;
          const latest = kb.versions[0];
          const draft = ctx.state.kbDraft?.kbId === 'aftersale' ? ctx.state.kbDraft
            : { kbId: 'aftersale', fromVersion: latest.id, nextVersion: nextKbVersion(latest.id), entries: kb.entries.filter(entry => entry.versions.includes(latest.id)).map(entry => ({ title: entry.title, from: entry.from, to: entry.to })) };
          const pending = pendingEntries.aftersale[0];
          const entries = draft.entries.map(entry => entry.title === pcOldEntry ? { ...entry, to: pcOldEntryExpiry } : entry);
          api.setKbDraft({ ...draft, entries: entries.some(entry => entry.title === pending.title) ? entries : [...entries, { title: pending.title, from: pending.from, to: null, isNew: true }] });
        } } },
      { title: '创建候选版本 v22', page: 'build', target: 'dep-upgrade', hero: 3,
        body: 'v21 锁定的是售后知识 v34，平台提示上游已有 v35。一键创建候选版本 v22 并升级依赖，线上 v21 不受影响。',
        next: '点「基于 v21 创建候选版本 v22（升级依赖）」。',
        done: ctx => onKnowledge(ctx, 'v22', PC_KB) },
      { title: '回归评测', page: 'evaluation', target: 'eval-run', hero: 1,
        body: '用「bad case 回归集」回归：投诉样本从 35 分到 95 分，过期知识命中 0 条，门槛通过。',
        next: '确认选中「bad case 回归集」，点「运行评测」。',
        done: ctx => onKnowledge(ctx, 'v22', PC_KB) && gatePassed(ctx, 'v22') },
      { title: '提交审批', page: 'release', target: 'check-approval', hero: 1,
        body: '门槛、护栏、负责人、告警都已就绪；上线真实用户需要负责人审批。',
        next: '点「提交审批」，再点「模拟审批通过」。',
        done: ctx => ctx.ops.approvedVersion === 'v22' },
      { title: '按会话灰度发布', page: 'release', target: 'publish', hero: 2,
        body: '策略为比例灰度 10%。售后答疑是会话模式：按会话 ID 分桶并开启会话粘性，多轮对话不会中途换版本。',
        next: '点「发布 v22（比例灰度 10%）」，再点确认。',
        done: ctx => { const v = version(ctx, 'v22'); return Boolean(v && (v.status === '灰度中' || v.status === '线上')); } },
      { title: '转人工率下降', page: 'release', target: 'ab', hero: 2,
        body: '按会话归因的 AB 结果：转人工率 12.1% → 9.6%，解决率 78.4% → 80.6%，过期知识命中清零。',
        next: '剧本结束，点「完成剧本」。' },
    ],
  },
];

export const playbookOf = (id: PlaybookId) => playbooks.find(item => item.id === id) ?? playbooks[0];

/** 剧本进行中时，某个入口是否被锁定；返回禁用原因。只锁剧本自己的 Agent（能力组件库这类平台页传 null）。 */
export function usePlaybookLock(lock: PlaybookLock, agentId: string | null): string | undefined {
  const { state } = useDemo();
  if (!state.playbook) return undefined;
  const playbook = playbookOf(state.playbook.id);
  if (!playbook.locks.includes(lock) || (agentId !== null && agentId !== playbook.agentId)) return undefined;
  return `剧本 ${playbook.letter} 进行中，此操作已锁定；请按「演示步骤」提示操作，退出剧本后可用`;
}
