/**
 * Prompt 优化建议：按平台的 Prompt 检查项逐条比对，缺什么补什么，给出可逐行对比的建议稿。
 * 演示用确定性规则，不调用模型；真实环境由优化模型生成，同样以 diff 形式让用户确认后才采纳。
 */
import type { AgentConfig } from '../../types/domain';

export interface PromptCheck { id: string; label: string; passed: boolean; line: string }

const hasNumbered = (text: string) => /^\s*\d+\.\s/m.test(text);
const lastNumber = (text: string) => { const numbers = [...text.matchAll(/^\s*(\d+)\.\s/gm)].map(match => Number(match[1])); return numbers.length ? Math.max(...numbers) : 0; };

export function promptChecks(config: AgentConfig): PromptCheck[] {
  const prompt = config.prompt;
  const usesKnowledge = config.knowledge !== '暂不接入';
  return [
    { id: 'role', label: '说明角色和任务', passed: /你是|作为/.test(prompt), line: '你是负责这项任务的助手，只处理与任务相关的问题。' },
    { id: 'variable', label: '用变量接收输入', passed: /{{[^}]+}}/.test(prompt), line: '用户输入：{{input}}' },
    { id: 'grounding', label: '只依据有效知识', passed: !usesKnowledge || /有效|生效|当前/.test(prompt), line: '只依据当前生效的知识作答，已过期的条款不得引用' },
    { id: 'unknown', label: '无依据时明确说明', passed: /信息不足|没有依据|无依据|不要猜测|不确定/.test(prompt), line: '信息不足或没有依据时明确说明，不要猜测' },
    { id: 'format', label: '约束输出格式', passed: /输出|格式|JSON/.test(prompt), line: `按「${config.outputFormat}」的结构输出` },
    { id: 'privacy', label: '不泄露隐私', passed: /隐私|个人信息|脱敏/.test(prompt), line: '不透露用户或员工的个人隐私信息' },
  ];
}

/** 生成建议稿：角色、变量放在开头；要求类的补充接在已有编号列表后面，没有列表时新建「要求」。 */
export function optimizePrompt(config: AgentConfig): { suggestion: string; applied: PromptCheck[] } {
  const failed = promptChecks(config).filter(check => !check.passed);
  if (!failed.length) return { suggestion: config.prompt, applied: [] };
  let text = config.prompt.trimEnd();
  const head = failed.filter(check => check.id === 'role').map(check => check.line);
  const tail = failed.filter(check => check.id === 'variable').map(check => check.line);
  const rules = failed.filter(check => check.id !== 'role' && check.id !== 'variable').map(check => check.line);
  if (head.length) text = `${head.join('\n')}\n${text}`;
  if (tail.length) text = `${text}\n${tail.join('\n')}`;
  if (rules.length) {
    const start = lastNumber(text);
    const lines = rules.map((line, index) => `${start + index + 1}. ${line}`);
    text = hasNumbered(text) ? `${text}\n${lines.join('\n')}` : `${text}\n\n要求：\n${lines.join('\n')}`;
  }
  return { suggestion: text, applied: failed };
}
