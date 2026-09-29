import { Component, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { Feedback } from './Feedback';

interface Props { children: ReactNode; resetKey: string; onReset: () => void }
interface State { error: Error | null }

/** 页面级兜底：某个页面渲染出错时，只替换内容区，导航和「重置演示」仍然可用。 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidUpdate(previous: Props) {
    if (previous.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <Feedback kind="error" title="页面加载失败" description="演示数据可能与当前版本不兼容。重置演示后即可恢复初始数据。"
      action={<button className="button button-secondary feedback-action" onClick={() => { this.setState({ error: null }); this.props.onReset(); }}><RotateCcw size={16} />重置演示</button>} />;
  }
}
