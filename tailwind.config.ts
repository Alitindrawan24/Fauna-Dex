import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['Press Start 2P', 'monospace'],
      },
      colors: {
        pokedex: {
          red: '#CC0000',
          darkred: '#AA0000',
          navy: '#1a1a2e',
          screen: '#0d1b2a',
          lcd: '#e2f4ff',
        },
      },
    },
  },
  plugins: [],
};

export default config;
