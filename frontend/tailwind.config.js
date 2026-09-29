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
        black: '#020806',
        // Layered dark-green surfaces: page -> card -> elevated -> border
        surface: {
          page: '#020806',
          card: '#07110d',
          raised: '#0c1814',
          hover: '#122019',
          border: '#163024',
          'border-strong': '#1e3d2e',
        },
        brand: {
          50: '#f4f4f5',
          100: '#e4e4e7',
          200: '#d4d4d8',
          300: '#a1a1aa',
          400: '#71717a',
          500: '#ffffff',
          600: '#e4e4e7',
          700: '#d4d4d8',
        },
        accent: {
          emerald: '#10b981', // Clean numbers
          red: '#ef4444',     // DNC numbers
          amber: '#f59e0b',   // Warnings / Existing DNC
          cyan: '#06b6d4',    // Highlights / API info
          violet: '#8b5cf6',  // Secondary highlights
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(167,243,208,0.04) inset, 0 10px 28px -14px rgba(0,0,0,0.75)',
        glow: '0 0 0 1px rgba(16,185,129,0.12), 0 12px 40px -12px rgba(16,185,129,0.28)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.35s ease-out both',
        'fade-in': 'fade-in 0.25s ease-out both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
}
