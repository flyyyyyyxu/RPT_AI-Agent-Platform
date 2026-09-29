/** 新建 Agent：场景模板与自然语言生成的预设结果。 */
import type { AgentConfig, ProfileId } from '../../types/domain';
import { afterSaleConfig, blankConfig, generalConfig, guardConfig, outfitConfig, snap } from './configs';

/* ------------------------------------------------------------------ */
/* 模板与自然语言生成                                                   */
/* ------------------------------------------------------------------ */

export const templateConfigs: Record<string, AgentConfig> = {
  blank: blankConfig,
  recommendation: outfitConfig,
  classification: guardConfig,
  conversation: generalConfig,
};

export const templateProfile: Record<string, ProfileId> = { blank: 'blank', recommendation: 'a', classification: 'b', conversation: 'general' };
export const templateMode: Record<string, string> = { blank: '在线', recommendation: '在线 · 推荐生成', classification: '批量 · 分类判定', conversation: '在线 · 多轮问答' };

export const generationStages = ['理解需求：识别场景、输入和输出', '生成 Prompt 与变量', '匹配模型、知识库和工具', '编排执行步骤'];

/** 模拟「自然语言 → 初始配置」：按关键词挑一个最接近的场景，再把名称和需求写进 Prompt。 */
export function generateFromDescription(name: string, description: string) {
  const text = `${name}${description}`;
  const template = /售后|退货|退款|物流|客服/.test(text) ? 'afterSale' : /审核|违规|判定|分类/.test(text) ? 'classification' : /推荐|穿搭|灵感/.test(text) ? 'recommendation' : 'conversation';
  const base = template === 'afterSale' ? afterSaleConfig : templateConfigs[template];
  const profile: ProfileId = template === 'afterSale' ? 'c' : templateProfile[template];
  const firstLine = base.prompt.split('\n')[0].replace(/^你是[^。]*。/, '');
  const config = snap(base, {
    prompt: `你是「${name}」。${description.replace(/[。.]$/, '')}。\n${firstLine}\n\n要求：\n1. 只依据知识库中的有效内容作答\n2. 给出依据来源\n3. 信息不足时明确说明，不编造`,
  });
  const mode = template === 'afterSale' ? '在线 · 多轮会话' : templateMode[template];
  return { config, profile, mode, matched: template === 'afterSale' ? '多轮问答（售后）' : ({ conversation: '多轮问答', classification: '分类判定', recommendation: '推荐生成' } as Record<string, string>)[template] };
}

export function applyTemplate(template: string, name: string) {
  const base = snap(templateConfigs[template]);
  if (template !== 'blank') base.prompt = base.prompt.replace(/^你是[^。]*。/, `你是「${name}」。`);
  return base;
}
