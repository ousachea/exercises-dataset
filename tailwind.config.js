/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './components/**/*.{vue,js,ts}',
    './pages/**/*.{vue,js,ts}',
    './app.vue',
    './error.vue'
  ],
  theme: {
    extend: {
      colors: {
        // Ported from the original design tokens (accent orange + zinc scale)
        base: '#f4f4f5',
        surface: '#ffffff',
        elevated: '#f0f0f1',
        line: '#e4e4e7',
        'line-hover': '#c4c4c7',
        accent: '#ff4f00',
        'accent-muted': 'rgba(255, 79, 0, 0.08)',
        ink: '#111111',
        'ink-soft': '#71717a',
        'ink-faint': '#a1a1aa'
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '18px'
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Inter',
          'Segoe UI',
          'sans-serif'
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'SF Mono',
          'Menlo',
          'Consolas',
          'monospace'
        ]
      }
    }
  },
  plugins: []
}
