import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { diffWords } from '../../core/rules/diff';
import type { EvalDataset } from '../../types/domain';
import { Card } from '../../shared/components/Content';
import { VersionBadge } from '../../shared/components/Badges';
import { icon } from '../../shared/styles/tokens';

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

function Delta({ value }: { value: number }) {
  if (Math.abs(value) < 0.05) return <span className="score-delta neutral"><Minus size={icon.small} />持平</span>;
  return <span className={`score-delta ${value > 0 ? 'positive' : 'negative'}`}>{value > 0 ? <ArrowUp size={icon.small} /> : <ArrowDown size={icon.small} />}{Math.abs(value).toFixed(1)}</span>;
}

export function VersionComparison({ dataset, oldVersion, newVersion }: { dataset: EvalDataset; oldVersion: string | null; newVersion: string }) {
  const newScore = average(dataset.cases.map(item => item.newScore));
  const oldScore = oldVersion ? average(dataset.cases.map(item => item.oldScore)) : null;
  return <div className="version-report">
    <div className={`score-comparison ${oldVersion ? '' : 'single'}`}>
      {oldVersion && oldScore !== null && <><Card><span className="meta">线上版本 <VersionBadge version={oldVersion} /></span><strong>{oldScore.toFixed(1)}</strong><p>平均得分 · {dataset.cases.length} 条样本</p></Card><span className="score-arrow" aria-hidden="true">→</span></>}
      <Card className="score-new"><span className="meta">候选版本 <VersionBadge version={newVersion} /></span><strong>{newScore.toFixed(1)}</strong><p>{oldScore !== null ? <>较线上 <Delta value={newScore - oldScore} /></> : '首个版本，暂无线上版本可对比'}</p></Card>
    </div>
    <div className="diff-legend meta"><span><i className="legend-del" />旧版本删去的内容</span><span><i className="legend-add" />候选版本新增的内容</span></div>
    <div className="case-comparison">{dataset.cases.map(item => {
      const parts = oldVersion ? diffWords(item.oldAnswer, item.newAnswer) : [{ type: 'same' as const, text: item.newAnswer }];
      return <Card key={item.name}><div className="case-heading"><div><strong>{item.name}</strong><p>{item.input}</p></div><span className="case-score">{oldVersion ? <>{item.oldScore} → <b>{item.newScore}</b> <Delta value={item.newScore - item.oldScore} /></> : <b>{item.newScore}</b>}</span></div>
        <div className={`answer-compare ${oldVersion ? '' : 'single'}`}>
          {oldVersion && <div><span className="meta">{oldVersion} 回答</span><p className="diff-text">{parts.filter(part => part.type !== 'add').map((part, index) => part.type === 'del' ? <del key={index}>{part.text}</del> : <span key={index}>{part.text}</span>)}</p></div>}
          <div><span className="meta">{newVersion} 回答</span><p className="diff-text">{parts.filter(part => part.type !== 'del').map((part, index) => part.type === 'add' ? <ins key={index}>{part.text}</ins> : <span key={index}>{part.text}</span>)}</p></div>
        </div><p className="case-expected">预期：{item.expected}</p></Card>;
    })}</div>
  </div>;
}
