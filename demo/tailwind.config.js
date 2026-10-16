/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 900: '#0B1220', 800: '#0F172A' },
        gold: '#F5C542',
        ok: '#34D399',
        ai: '#22D3EE',
        miss: '#F87171',
        brief: '#A78BFA',
        warn: '#FBBF24',
      },
      fontFamily: {
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        blink: { '0%,49%': { opacity: 1 }, '50%,100%': { opacity: 0 } },
        pulsegold: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(245,197,66,0.55)' },
          '50%': { boxShadow: '0 0 0 10px rgba(245,197,66,0)' },
        },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        blink: 'blink 1s steps(1) infinite',
        pulsegold: 'pulsegold 2s ease-in-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
      },
    },
  },
  plugins: [],
}
