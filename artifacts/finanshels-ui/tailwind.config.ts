import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * Finanshels Design System — Tailwind configuration
 *
 * Tier 1 (primitive) palette lives under `navy`, `orange`, `gray`.
 * Tier 2 (semantic) roles live under `brand`, `success`, `error`, `info`
 * and the shadcn/ui CSS-variable tokens (primary, secondary, muted, ...).
 *
 * Components should reference Tier 2 tokens; never Tier 1 directly.
 */
const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ---- Tier 1: primitives ---- */
        navy: {
          50: '#E6E9EB',
          200: '#B2BABF',
          600: '#334756',
          800: '#0A2B3B',
          900: '#082032',
        },
        orange: {
          50: '#FFF7E9',
          100: '#FEF0E7',
          300: '#FFA533',
          500: '#F16611',
          600: '#D95C0F',
          700: '#C1520E',
        },
        gray: {
          50: '#F9FAFB',
          100: '#F4F4F4',
          200: '#EEEEEE',
          300: '#DDDDDD',
          // Use a readable secondary-text neutral instead of Tailwind's
          // low-contrast default gray-400 (#9CA3AF).
          400: '#6B7280',
        },
        /* ---- Tier 2: semantic roles ---- */
        brand: {
          DEFAULT: '#F16611', // --color-brand-primary
          hover: '#D95C0F', // --color-brand-hover
        },
        'text-primary': '#082032',
        surface: '#FFFFFF',
        'bg-dark': '#082032',
        success: '#22C55E',
        error: '#EF4444',
        info: '#334756',
        /* ---- shadcn/ui tokens (CSS variables in globals.css) ---- */
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      fontFamily: {
        sans: ['var(--font-poppins)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      /* Typography scale — Poppins for UI, JetBrains Mono for code */
      fontSize: {
        'display-hero': ['53px', { lineHeight: '72px', fontWeight: '700', letterSpacing: '-0.5px' }],
        'display-lg': ['32px', { lineHeight: '44px', fontWeight: '600', letterSpacing: '-0.3px' }],
        'heading-xl': ['24px', { lineHeight: '34px', fontWeight: '600' }],
        'heading-lg': ['20px', { lineHeight: '30px', fontWeight: '500' }],
        'heading-md': ['16px', { lineHeight: '24px', fontWeight: '500' }],
        'body-lg': ['16px', { lineHeight: '26px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '22px', fontWeight: '400' }],
        'body-md-emphasis': ['14px', { lineHeight: '22px', fontWeight: '500' }],
        'body-sm': ['13px', { lineHeight: '20px', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '18px', fontWeight: '400' }],
        overline: ['11px', { lineHeight: '16px', fontWeight: '600', letterSpacing: '0.5px' }],
        'metric-lg': ['28px', { lineHeight: '38px', fontWeight: '600' }],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        /* Add-Tags dialog — scale + rise + fade; inset-0/m-auto handles centering */
        'dialog-enter': {
          from: {
            opacity: '0',
            transform: 'translateY(14px) scale(0.95)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
          },
        },
        'dialog-leave': {
          from: {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
          },
          to: {
            opacity: '0',
            transform: 'translateY(8px) scale(0.96)',
          },
        },
        /* Backdrop */
        'overlay-enter': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'overlay-leave': {
          from: { opacity: '1' },
          to:   { opacity: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'dialog-enter':   'dialog-enter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'dialog-leave':   'dialog-leave 0.18s cubic-bezier(0.4, 0, 1, 1) forwards',
        'overlay-enter':  'overlay-enter 0.2s ease forwards',
        'overlay-leave':  'overlay-leave 0.18s ease forwards',
      },
    },
  },
  plugins: [animate],
};

export default config;
