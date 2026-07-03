/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: '#0f0e0d', 2: '#1a1816', 3: '#242120' },
        surface: '#2a2725',
        border: '#3d3835',
        text: { DEFAULT: '#f5f0eb', muted: '#a89f96' },
        accent: { DEFAULT: '#d4a574', light: '#e8c9a0', dark: '#b8874f' },
        rose: '#c97b84',
        success: '#6dbf8a',
        danger: '#e07070',
        warning: '#e8b84a',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
