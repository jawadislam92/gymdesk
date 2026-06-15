import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Bold fitness-brand accent — energetic orange.
        brand: {
          DEFAULT: '#f97316', // orange-500
          dark: '#ea580c', // orange-600
          light: '#fb923c', // orange-400
          50: '#fff7ed',
          100: '#ffedd5',
        },
        // Dark app chrome (sidebar / nav).
        ink: {
          DEFAULT: '#15171c',
          light: '#20232b',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'ui-sans-serif', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
