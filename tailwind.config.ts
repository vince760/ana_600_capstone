import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0D1B2A',
        navyMid: '#162032',
        navyMid2: '#1E3A5F',
        cream: '#F5F0E8',
        teal: '#028090',
        tealLight: '#02A896',
        mint: '#02C39A',
        gold: '#C8A84B',
        risk: {
          low: '#2ECC71',
          medium: '#C8A84B',
          high: '#E05252',
        },
        text: {
          primary: '#334155',
          secondary: '#64748B',
          muted: '#94A3B8',
        },
        border: '#D1C9B8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
