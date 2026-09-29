/**
 * 资产中心：新建、发布新版本、原地修改、审核通过 / 撤回，都归结为「保存整条记录」。
 * 知识库另有自己的版本草稿流程（knowledgeActions），这里只负责新建知识库。
 */
import type { AssetKind, AssetRecord, AssetState, KnowledgeBase } from '../../../types/domain';
import type { StoreKit } from '../kit';

type RecordOf<K extends AssetKind> = AssetState[K][number];

export function assetActions({ setState }: StoreKit) {
  /** 按 key 覆盖；新记录插到最前面 */
  const saveAsset = <K extends AssetKind>(kind: K, record: RecordOf<K>) => setState(previous => {
    const list = previous.assets[kind] as AssetRecord<unknown>[];
    const exists = list.some(item => item.key === record.key);
    const next = exists ? list.map(item => item.key === record.key ? record : item) : [record, ...list];
    return { ...previous, assets: { ...previous.assets, [kind]: next } };
  });

  const createKnowledgeBase = (kb: KnowledgeBase) => setState(previous => ({ ...previous, knowledge: { ...previous.knowledge, [kb.id]: kb } }));

  return { saveAsset, createKnowledgeBase };
}
