/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { ink: '#171411', walnut: '#39251C', gold: '#B58A4B', cream: '#EDE3D2', 'gold-soft': '#D9AE6A' },
      fontFamily: { display: ['var(--font-display)', 'serif'], sans: ['var(--font-body)', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
