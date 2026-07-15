/** @type {import('tailwindcss').Config} */

// Semantic design tokens. Every color maps to a CSS custom property defined in
// src/index.css, with one value set for light (:root) and one for dark (html.dark).
// Components use these token classes (bg-surface, text-ink-muted, border-edge, …)
// instead of raw palette classes so both themes work without per-class overrides.
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Backgrounds, from page floor to interactive hover layer
        base: token('base'),
        surface: token('surface'),
        raised: token('raised'),
        overlay: token('overlay'),
        // Borders
        edge: {
          DEFAULT: token('edge'),
          strong: token('edge-strong'),
        },
        // Text, from highest to lowest emphasis
        ink: {
          DEFAULT: token('ink'),
          secondary: token('ink-secondary'),
          muted: token('ink-muted'),
          tertiary: token('ink-tertiary'),
          faint: token('ink-faint'),
        },
        // Brand accent (buttons, links, active nav)
        accent: {
          DEFAULT: token('accent'),
          hover: token('accent-hover'),
          ink: token('accent-ink'),
        },
        // Status semantics: DEFAULT for fills/bars, -ink for readable text
        success: { DEFAULT: token('success'), ink: token('success-ink') },
        warning: { DEFAULT: token('warning'), ink: token('warning-ink') },
        danger: { DEFAULT: token('danger'), ink: token('danger-ink') },
        info: { DEFAULT: token('info'), ink: token('info-ink') },
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        pop: 'var(--shadow-pop)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out both',
        'slide-up': 'slide-up 0.22s ease-out both',
        'scale-in': 'scale-in 0.16s ease-out both',
      },
    },
  },
  plugins: [],
}
