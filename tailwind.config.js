/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0B1F3A',
          deep: '#142B4A',
          light: '#1B3B66',
          muted: '#244778',
          subtle: '#3A5E94',
        },
        surface: {
          DEFAULT: '#EEF2F7',
          card: '#FFFFFF',
          elevated: '#F8FAFC',
          inset: '#E4EAF2',
          border: '#DDE3EA',
          borderHover: '#C6D0DC',
        },
        ink: {
          primary: '#172033',
          secondary: '#667085',
          muted: '#8F9AA8',
          inverted: '#FFFFFF',
        },
        status: {
          success: '#0D7A53',
          'success-bg': '#E8F6F0',
          warning: '#B55B09',
          'warning-bg': '#FEF4E8',
          danger: '#C52828',
          'danger-bg': '#FDECEC',
          info: '#205898',
          'info-bg': '#EEF4FC',
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        'neu-raised': '7px 7px 18px rgba(11, 31, 58, 0.08), -7px -7px 18px rgba(255, 255, 255, 0.95)',
        'neu-raised-sm': '4px 4px 10px rgba(11, 31, 58, 0.06), -4px -4px 10px rgba(255, 255, 255, 0.90)',
        'neu-raised-lg': '12px 12px 28px rgba(11, 31, 58, 0.10), -12px -12px 28px rgba(255, 255, 255, 0.95)',
        'neu-inset': 'inset 3px 3px 6px rgba(11, 31, 58, 0.08), inset -3px -3px 6px rgba(255, 255, 255, 0.92)',
        'neu-inset-sm': 'inset 2px 2px 4px rgba(11, 31, 58, 0.06), inset -2px -2px 4px rgba(255, 255, 255, 0.88)',
        'neu-pressed': 'inset 4px 4px 8px rgba(11, 31, 58, 0.12), inset -4px -4px 8px rgba(255, 255, 255, 0.90)',
        'navy-glow': '0 4px 14px rgba(11, 31, 58, 0.22)',
      },
      borderRadius: {
        'architectural': '12px',
        'architectural-sm': '8px',
        'architectural-lg': '18px',
        'architectural-xl': '24px',
      },
    },
  },
  plugins: [],
};
