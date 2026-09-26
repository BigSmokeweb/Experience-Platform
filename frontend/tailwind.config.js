/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['var(--font-fraunces)', 'Georgia', 'serif'],
        serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
        fraunces: ['var(--font-fraunces)', 'Georgia', 'serif'],
        display: ['var(--font-eczar)', 'Eczar', 'Georgia', 'serif'],
        eczar: ['var(--font-eczar)', 'Eczar', 'Georgia', 'serif'],
        playfair: ['var(--font-eczar)', 'Eczar', 'Georgia', 'serif'],
        subheading: ['var(--font-cormorant)', 'Cormorant Garamond', 'Garamond', 'serif'],
        cormorant: ['var(--font-cormorant)', 'Cormorant Garamond', 'Garamond', 'serif'],
        mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'monospace'],
        jetbrains: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'monospace'],
        'edu-cursive': ['"Edu NSW ACT Cursive"', '"Edu NSW ACT Hand Cursive"', '"Edu NSW ACT Foundation"', 'cursive'],
        'luxurious-script': ['"Luxurious Script"', 'var(--font-luxurious-script)', 'cursive'],
        luxurious: ['"Luxurious Script"', 'var(--font-luxurious-script)', 'cursive'],
        script: ['"Edu NSW ACT Cursive"', '"Edu NSW ACT Hand Cursive"', '"Edu NSW ACT Foundation"', 'cursive'],
        cursive: ['"Edu NSW ACT Cursive"', '"Edu NSW ACT Hand Cursive"', '"Edu NSW ACT Foundation"', 'cursive'],
        'corn-font': ['"Manifold CF"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        corn: ['"Manifold CF"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        alpine: {
          sky: '#8B7355',
          sage: '#A69B80',
          ivory: '#F5F1E6',
          stone: '#D4CFC0',
          charcoal: '#2C2C2C',
          teal: '#347F8C',
          'teal-dark': '#2A6772',
          gold: '#C4A265',
        },
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
        indigo: {
          900: '#1e1b4b',
          950: '#0f172a',
        },
      },
    },
  },
  plugins: [],
};
