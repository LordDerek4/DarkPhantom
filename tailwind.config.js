/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Colors reference CSS variables so themes can be swapped at runtime.
        // Tailwind v3 opacity modifier syntax: rgb(var(--x) / <alpha-value>)
        pulse: {
          bg: {
            primary:  'rgb(var(--pulse-bg-primary)  / <alpha-value>)',
            secondary:'rgb(var(--pulse-bg-secondary) / <alpha-value>)',
            tertiary: 'rgb(var(--pulse-bg-tertiary)  / <alpha-value>)',
            elevated: 'rgb(var(--pulse-bg-elevated)  / <alpha-value>)',
            modifier: 'rgb(var(--pulse-bg-modifier)  / <alpha-value>)',
            floating: 'rgb(var(--pulse-bg-floating)  / <alpha-value>)',
          },
          surface: {
            overlay: 'rgb(var(--pulse-surface-overlay) / <alpha-value>)',
            card:    'rgb(var(--pulse-surface-card)    / <alpha-value>)',
            input:   'rgb(var(--pulse-surface-input)   / <alpha-value>)',
          },
          brand: {
            DEFAULT: 'rgb(var(--pulse-brand)       / <alpha-value>)',
            hover:   'rgb(var(--pulse-brand-hover)  / <alpha-value>)',
            dim:     'rgb(var(--pulse-brand-dim)    / <alpha-value>)',
          },
          text: {
            normal:   'rgb(var(--pulse-text-normal)   / <alpha-value>)',
            muted:    'rgb(var(--pulse-text-muted)    / <alpha-value>)',
            link:     'rgb(var(--pulse-text-link)     / <alpha-value>)',
            positive: 'rgb(var(--pulse-text-positive) / <alpha-value>)',
            warning:  'rgb(var(--pulse-text-warning)  / <alpha-value>)',
            danger:   'rgb(var(--pulse-text-danger)   / <alpha-value>)',
          },
          status: {
            online:  'rgb(var(--pulse-status-online)  / <alpha-value>)',
            idle:    'rgb(var(--pulse-status-idle)    / <alpha-value>)',
            dnd:     'rgb(var(--pulse-status-dnd)     / <alpha-value>)',
            offline: 'rgb(var(--pulse-status-offline) / <alpha-value>)',
          },
          channel: {
            default:  'rgb(var(--pulse-channel-default)  / <alpha-value>)',
            selected: 'rgb(var(--pulse-channel-selected) / <alpha-value>)',
          },
        },
      },
      fontFamily: {
        sans: ['"gg sans"', 'Noto Sans', 'Whitney', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      animation: {
        'fade-in':   'fadeIn 0.2s ease-out',
        'slide-up':  'slideUp 0.2s ease-out',
        'slide-down':'slideDown 0.2s ease-out',
        'bounce-in': 'bounceIn 0.3s ease-out',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { transform: 'translateY(10px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        slideDown: { from: { transform: 'translateY(-10px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        bounceIn: {
          '0%':   { transform: 'scale(0.8)', opacity: '0' },
          '60%':  { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
      },
      boxShadow: {
        'elevation-low':    '0 1px 0 rgba(4,4,5,0.2), 0 1.5px 0 rgba(6,6,7,0.05), 0 2px 0 rgba(4,4,5,0.05)',
        'elevation-medium': '0 4px 4px rgba(0,0,0,0.16)',
        'elevation-high':   '0 8px 16px rgba(0,0,0,0.24)',
      },
    },
  },
  plugins: [],
}
