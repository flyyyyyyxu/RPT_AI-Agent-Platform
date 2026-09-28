export type DiffPart = { type: 'same' | 'add' | 'del'; text: string };

function segment(text: string): string[] {
  const Segmenter = (Intl as unknown as { Segmenter?: new (locale: string, options: { granularity: 'word' }) => { segment: (input: string) => Iterable<{ segment: string }> } }).Segmenter;
  if (Segmenter) return Array.from(new Segmenter('zh', { granularity: 'word' }).segment(text), item => item.segment);
  return Array.from(text);
}

/** 词级 LCS diff：用于评测报告里新旧回答的差异高亮。 */
export function diffWords(before: string, after: string): DiffPart[] {
  const a = segment(before);
  const b = segment(after);
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) for (let j = b.length - 1; j >= 0; j -= 1) table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  const parts: DiffPart[] = [];
  const push = (type: DiffPart['type'], text: string) => { const last = parts[parts.length - 1]; if (last && last.type === type) last.text += text; else parts.push({ type, text }); };
  let i = 0; let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { push('same', a[i]); i += 1; j += 1; }
    else if (table[i + 1][j] >= table[i][j + 1]) { push('del', a[i]); i += 1; }
    else { push('add', b[j]); j += 1; }
  }
  while (i < a.length) { push('del', a[i]); i += 1; }
  while (j < b.length) { push('add', b[j]); j += 1; }
  return parts;
}
