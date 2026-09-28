module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: { mobile: '768px', wide: '1280px' },
    spacing: { 1: 'var(--space-1)', 2: 'var(--space-2)', 3: 'var(--space-3)', 4: 'var(--space-4)', 6: 'var(--space-6)', 8: 'var(--space-8)', 12: 'var(--space-12)' },
    extend: {
      colors: {
        page: 'var(--color-page)', card: 'var(--color-card)', border: 'var(--color-border)', text: 'var(--color-text)',
        coral: 'var(--color-coral)', indigo: 'var(--color-indigo)', success: 'var(--color-greenText)', error: 'var(--color-error)',
      },
      borderRadius: { card: 'var(--radius-card)', control: 'var(--radius-control)', badge: 'var(--radius-badge)' },
      boxShadow: { card: 'var(--shadow-card)', hover: 'var(--shadow-hover)' },
      fontFamily: { body: ['var(--font-body)'], mono: ['var(--font-mono)'] },
    },
  },
  plugins: [],
};
