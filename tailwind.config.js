/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Discord-inspired dark palette
        pulse: {
          bg: {
            primary: '#1a1b1e',    // Darkest - server list bg
            secondary: '#242527',  // Channel list bg
            tertiary: '#2b2d31',   // Chat area bg
            elevated: '#313338',   // Message hover bg
            modifier: '#3b3d43',   // Input bg
            floating: '#111214',   // Tooltips, modals backdrop
          },
          surface: {
            overlay: '#2b2d31',
            card: '#313338',
            input: '#1e1f22',
          },
          brand: {
            DEFAULT: '#5865f2',
            hover: '#4752c4',
            dim: '#3c45a5',
          },
          text: {
            normal: '#dbdee1',
            muted: '#80848e',
            link: '#00a8fc',
            positive: '#23a55a',
            warning: '#f0b232',
            danger: '#f23f43',
          },
          status: {
            online: '#23a55a',
            idle: '#f0b232',
            dnd: '#f23f43',
            offline: '#80848e',
          },
          channel: {
            default: '#80848e',
            selected: '#dbdee1',
          },
        },
      },
      fontFamily: {
        sans: ['"gg sans"', 'Noto Sans', 'Whitney', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'bounce-in': 'bounceIn 0.3s ease-out',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          from: { transform: 'translateY(-10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      boxShadow: {
        'elevation-low': '0 1px 0 rgba(4,4,5,0.2), 0 1.5px 0 rgba(6,6,7,0.05), 0 2px 0 rgba(4,4,5,0.05)',
        'elevation-medium': '0 4px 4px rgba(0,0,0,0.16)',
        'elevation-high': '0 8px 16px rgba(0,0,0,0.24)',
      },
    },
  },
  plugins: [],
}
