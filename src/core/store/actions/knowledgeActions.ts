/** 资产中心 · 知识库：知识库新版本草稿、发布新版本（覆盖 mock，保存在演示状态里）。 */
import type { KbDraft } from '../../../types/domain';
import { knowledgeBasesFor } from '../../data-access/scenarioData';
import { nowStamp } from '../../rules/clock';
import type { StoreKit } from '../kit';

export function knowledgeActions({ setState }: StoreKit) {
  const setKbDraft = (kbDraft: KbDraft | null) => setState(previous => ({ ...previous, kbDraft }));

  const publishKbDraft = () => setState(previous => {
    const draft = previous.kbDraft;
    const kb = draft ? knowledgeBasesFor(previous).find(item => item.id === draft.kbId) : null;
    if (!draft || !kb) return previous;
    const oldEntries = kb.entries.filter(entry => entry.versions.includes(draft.fromVersion));
    const changes = draft.entries.map(entry => {
      if (entry.isNew) return `新增「${entry.title}」（${entry.from} 生效）`;
      const old = oldEntries.find(item => item.title === entry.title);
      if (old && old.to !== entry.to) return `「${entry.title}」失效时间设为 ${entry.to ?? '长期有效'}`;
      if (old && old.from !== entry.from) return `「${entry.title}」生效时间设为 ${entry.from}`;
      return null;
    }).filter(Boolean);
    const next: typeof kb = {
      ...kb,
      versions: [{ id: draft.nextVersion, publishedAt: nowStamp(), usedBy: [], note: changes.length ? changes.join('；') : `基于 ${draft.fromVersion} 重新发布` }, ...kb.versions],
      entries: [...draft.entries.map(entry => ({ title: entry.title, versions: [draft.nextVersion], from: entry.from, to: entry.to })), ...kb.entries],
    };
    return { ...previous, kbDraft: null, knowledge: { ...previous.knowledge, [kb.id]: next } };
  });

  return { setKbDraft, publishKbDraft };
}
