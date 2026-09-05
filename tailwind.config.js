/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0b',        // near-black background
        panel: '#161618',      // dark gray panel
        panel2: '#1e1e21',     // slightly lighter panel / rows
        line: '#2a2a2e',       // hairline borders
        muted: '#8a8a90',      // secondary text
        accent: '#e8a33d',     // warm amber - "operator brass" call accent
        accentDim: '#8a6321',
        good: '#3fbf6b',       // online / accept
        bad: '#e0503f',        // decline / hang up
        warn: '#e0503f',
      },
      fontFamily: {
        sans: ['Roboto', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['Roboto Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
};
