/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#111f3a',
          800: '#1a2b4a',
          700: '#2a3e63',
          500: '#4c628a',
          100: '#e4e9f2',
          50: '#f1f4fa',
        },
        ink: {
          900: '#0f172a',
          700: '#334155',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
        },
        green: {
          600: '#16a34a',
          500: '#22c55e',
          50: '#ecfdf5',
        },
        red: {
          600: '#dc2626',
          500: '#ef4444',
          50: '#fef2f2',
        },
        amber: {
          500: '#f59e0b',
          50: '#fffbeb',
        },
      },
      fontFamily: {
        display: ['"Inter Tight"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        md: '14px',
        lg: '20px',
      },
    },
  },
  plugins: [],
}
