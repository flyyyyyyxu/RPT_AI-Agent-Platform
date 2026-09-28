import { CheckCircle2 } from 'lucide-react';
import { evaluationCases } from '../../data/mock';
import { Card } from '../content/Content';
import { VersionBadge } from '../badges/Badges';

export function VersionComparison({ oldVersion, newVersion }: { oldVersion: string; newVersion: string }) {
  return <div className="version-report"><div className="score-comparison"><Card><span className="meta">旧版本 <VersionBadge version={oldVersion} /></span><strong>82.7</strong><p>平均得分</p></Card><span className="score-arrow">→</span><Card className="score-new"><span className="meta">候选版本 <VersionBadge version={newVersion} /></span><strong>94.0</strong><p><CheckCircle2 size={16} />较旧版本 +11.3</p></Card></div>
    <div className="case-comparison">{evaluationCases.map(item => <Card key={item.name}><div className="case-heading"><div><strong>{item.name}</strong><p>{item.input}</p></div><span className="case-score">{item.oldScore} → <b>{item.newScore}</b></span></div><div className="answer-compare"><div><span className="meta">{oldVersion} 回答</span><p className="diff-deleted">{item.oldAnswer}</p></div><div><span className="meta">{newVersion} 回答</span><p className="diff-added">{item.newAnswer}</p></div></div><p className="case-expected">预期：{item.expected}</p></Card>)}</div>
  </div>;
}
