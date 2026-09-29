export const tokens = {
  color: {
    page: '#F7F7F8', card: '#FFFFFF', border: '#E6E7EB', text: '#1F2329', secondary: '#4E5969', muted: '#646A73', disabled: '#A8ADB5',
    coral: '#F25C54', coralLight: '#FEEFEE', primary: '#D63B32', primaryHover: '#C2332B',
    orange: '#F59A23', orangeText: '#B25E00', orangeLight: '#FFF4E5',
    indigo: '#4F5BD5', indigoLight: '#EEF0FC', green: '#1AAE6F', greenText: '#0F7B4E', greenLight: '#E8F7F0',
    error: '#B42318', errorLight: '#FEF3F2',
  },
  font: {
    // Inter 在前：英文和数字用 Inter；Inter 没有中文字形，中文自动落到 Noto Sans SC，再回退到系统字体
    body: 'Inter, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
    latin: 'Inter, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
    mono: '"JetBrains Mono", "Noto Sans SC", monospace',
  },
  type: {
    pageSize: '24px', pageLine: '32px', pageWeight: '700', pageTracking: '-0.02em',
    sectionSize: '18px', sectionLine: '26px', sectionWeight: '600',
    bodySize: '14px', bodyLine: '22px', metaSize: '12px', metaLine: '18px',
  },
  weight: { regular: '400', medium: '500', semibold: '600', bold: '700' },
  border: { thin: '1px', thick: '2px' },
  opacity: { disabled: '0.55', scrim: '30%' },
  space: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 6: '24px', 8: '32px', 12: '48px' },
  radius: { card: '12px', control: '8px', badge: '6px' },
  shadow: { card: '0 1px 2px rgba(16,24,40,.06)', hover: '0 4px 12px rgba(16,24,40,.08)' },
  layout: { max: '1440px', sidebar: '224px', sidebarCollapsed: '64px', asideMin: '400px', asideMax: '480px', tableRow: '48px', featureBar: '3px' },
  breakpoint: { mobile: 768, wide: 1280 },
  motion: { fast: '150ms', slow: '200ms', ease: 'ease-out', distance: '4px' },
  icon: { small: '16px', large: '20px', stroke: '1.5' },
} as const;

export function installTokens() {
  const root = document.documentElement;
  for (const [group, values] of Object.entries(tokens)) {
    for (const [name, value] of Object.entries(values)) root.style.setProperty(`--${group}-${name}`, String(value));
  }
}
