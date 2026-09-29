import type { DemoState } from '../../types/domain';
import { DEMO_NOW } from '../../data';

/* ---------------- 演示时钟 ----------------
 * 所有操作时间都用演示时钟，和 mock 数据处在同一天：从 DEMO_NOW 开始，每次操作前进 1 分钟。
 * 读取存档时对齐到存档里最晚的操作时间，保证时间不倒流。 */
const STAMP = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/;
const parseStamp = (stamp: string) => { const m = STAMP.exec(stamp); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : NaN; };
const formatStamp = (ms: number) => { const d = new Date(ms); const pad = (v: number) => String(v).padStart(2, '0'); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
let clock = parseStamp(DEMO_NOW);

/** 当前演示时间（不前进）。知识条目的生效 / 失效状态按它计算。 */
export const demoNow = () => formatStamp(clock);
/** 记录一次操作的时间：演示时钟前进 1 分钟。 */
export function nowStamp() { clock += 60_000; return formatStamp(clock); }
/** 读取存档或重置时对齐时钟：只看操作类时间（发布、审批、版本更新），不看知识条目的未来生效时间。 */
export function syncClock(state: DemoState) {
  const stamps = [
    ...state.agents.flatMap(agent => [agent.lastReleaseAt ?? '', ...agent.versions.map(version => version.updatedAt)]),
    ...Object.values(state.ops).flatMap(ops => ops.approvals.map(item => item.time)),
    ...Object.values(state.knowledge).flatMap(kb => kb.versions.map(version => version.publishedAt)),
  ].map(parseStamp).filter(value => !Number.isNaN(value));
  clock = Math.max(parseStamp(DEMO_NOW), ...stamps);
}
