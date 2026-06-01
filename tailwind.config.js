/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent:  { DEFAULT: 'var(--accent)',    2: 'var(--accent-2)', bright: 'var(--accent-bright)', muted: 'var(--accent-muted)' },
        bg:      'var(--bg)',
        surface: { DEFAULT: 'var(--surface)',   2: 'var(--surface-2)' },
        bdr:     { DEFAULT: 'var(--border)',    sub: 'var(--border-sub)' },
        tx:      { DEFAULT: 'var(--tx)',        2: 'var(--tx-2)',     3: 'var(--tx-3)' },
        sb: {
          bg:    'var(--sb-bg)',
          2:     'var(--sb-2)',
          bdr:   'var(--sb-bdr)',
          tx:    'var(--sb-tx)',
          tx2:   'var(--sb-tx2)',
          hover: 'var(--sb-hover)',
        },
        hdr: {
          bg:  'var(--hdr-bg)',
          bdr: 'var(--hdr-bdr)',
        },
        gold: {
          DEFAULT: '#DC5F2B',
          dark:    '#A03F1A',
          bright:  '#F1A682',
          muted:   'rgba(220,95,43,0.10)',
        },
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'Playfair Display', 'Georgia', 'serif'],
        sans:    ['var(--font-jakarta)',  'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'gold-sm': '0 0 0 1px rgba(220,95,43,0.25)',
        'gold':    '0 0 0 1px rgba(220,95,43,0.30), 0 4px 20px rgba(220,95,43,0.14)',
        'card':    '0 1px 2px rgba(0,0,0,0.05), 0 3px 10px rgba(0,0,0,0.05)',
        'card-md': '0 4px 24px rgba(0,0,0,0.10)',
        'card-lg': '0 8px 40px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
};
