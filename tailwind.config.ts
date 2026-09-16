import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        asight: {
          violet: '#5A45FF',
          'violet-dark': '#3814F5',
          lavande: '#EAE7F8',
          'lavande-alt': '#E1DDF8',
          muted: '#A494F7',
          dark: '#171717',
          green: '#9CF694',
          red: '#FF4444',
        },
      },
      fontFamily: {
        heading: ['var(--font-bricolage)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 24px rgba(90,69,255,0.10)',
      },
      borderRadius: {
        lg: '0.75rem',
      },
    },
  },
  plugins: [],
};

export default config;
