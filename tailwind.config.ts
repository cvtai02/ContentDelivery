import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page:    '#1f2023',
        surface: '#1a1d27',
        panel:   '#0f1117',
        divider: '#3d4270',
        primary: '#e8eaf6',
        muted:   '#8890b5',
        accent:  '#5c6ef8',
        rise:    '#38d9a9',
        fall:    '#ff5c5c',
        warn:    '#f5a623',
        hot:     '#e84393',
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
  plugins: [],
};

export default config;
