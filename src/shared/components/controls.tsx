/** 通用表单控件：开关、分段选择。 */


/** 开关：选中状态同时用底色、边框和文字表达。 */
export function Switch({ checked, onChange, label, disabled, hideLabel }: { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean; hideLabel?: boolean }) {
  return <label className={`switch ${checked ? 'on' : ''} ${disabled ? 'disabled' : ''}`}><input type="checkbox" role="switch" aria-label={label} checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} /><span className="switch-track" aria-hidden="true"><span /></span>{hideLabel ? <span className="switch-label state-only">{checked ? '已开启' : '已关闭'}</span> : <span className="switch-label">{label}<small>{checked ? '已开启' : '已关闭'}</small></span>}</label>;
}

/** 分段选择。 */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; label: string }) {
  return <div className="chart-tabs segmented" role="radiogroup" aria-label={label}>{options.map(option => <button type="button" key={option.value} role="radio" aria-checked={value === option.value} className={value === option.value ? 'active' : ''} onClick={() => onChange(option.value)}>{option.label}</button>)}</div>;
}
