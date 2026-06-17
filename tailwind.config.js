/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cyan: { DEFAULT: '#00F0FF' },
        violet: { DEFAULT: '#BC13FE' },
        danger: '#FF003C',
        bg: '#05050A',
        bg2: '#0a0a14',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'monospace'],
        michroma: ['Michroma', 'monospace'],
      },
      keyframes: {
        blink: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } },
        fadeIn: { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulse2: { '0%,100%': { boxShadow: '0 0 20px #00F0FF44' }, '50%': { boxShadow: '0 0 40px #00F0FF99' } },
        scanline: { '0%': { top: 0 }, '100%': { top: '100%' } },
      },
      animation: {
        blink: 'blink 1.5s infinite',
        fadeIn: 'fadeIn 0.4s ease',
        pulse2: 'pulse2 2s infinite',
        scanline: 'scanline 3s linear infinite',
      },
    },
  },
  plugins: [],
};
