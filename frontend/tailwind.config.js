/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        black: '#000000',
        dark: {
          950: '#000000',
          900: '#09090b',
          850: '#0f0f12',
          800: '#141418',
          700: '#1c1c22',
          600: '#27272a',
        },
        brand: {
          50: '#f4f4f5',
          100: '#e4e4e7',
          200: '#d4d4d8',
          300: '#a1a1aa',
          400: '#71717a',
          500: '#ffffff', // pure high-contrast white for primary actions
          600: '#e4e4e7',
          700: '#d4d4d8',
        },
        accent: {
          emerald: '#10b981', // Clean numbers
          red: '#ef4444',     // DNC numbers
          amber: '#f59e0b',   // Warnings / Existing DNC
          cyan: '#06b6d4',    // Highlights / API info
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
