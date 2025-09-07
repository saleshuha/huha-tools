import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      /* Typography - Prism Pro Font System */
      fontFamily: {
        'sans': ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        'display': ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'Monaco', 'monospace'],
      },
      
      /* Color System - Using CSS Variables */
      colors: {
        /* Neutral Palette */
        neutral: {
          50: 'hsl(var(--neutral-50))',
          100: 'hsl(var(--neutral-100))',
          200: 'hsl(var(--neutral-200))',
          300: 'hsl(var(--neutral-300))',
          400: 'hsl(var(--neutral-400))',
          500: 'hsl(var(--neutral-500))',
          600: 'hsl(var(--neutral-600))',
          700: 'hsl(var(--neutral-700))',
          800: 'hsl(var(--neutral-800))',
          900: 'hsl(var(--neutral-900))',
          950: 'hsl(var(--neutral-950))',
        },
        
        /* Primary Brand Colors */
        primary: {
          50: 'hsl(var(--primary-50))',
          100: 'hsl(var(--primary-100))',
          200: 'hsl(var(--primary-200))',
          300: 'hsl(var(--primary-300))',
          400: 'hsl(var(--primary-400))',
          500: 'hsl(var(--primary-500))',
          600: 'hsl(var(--primary-600))',
          700: 'hsl(var(--primary-700))',
          800: 'hsl(var(--primary-800))',
          900: 'hsl(var(--primary-900))',
          950: 'hsl(var(--primary-950))',
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        
        /* Semantic UI Colors */
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          elevated: 'hsl(var(--surface-elevated))',
          container: 'hsl(var(--surface-container))',
          'container-high': 'hsl(var(--surface-container-high))',
        },
        
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
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
        
        success: {
          50: 'hsl(var(--success-50))',
          500: 'hsl(var(--success-500))',
          600: 'hsl(var(--success-600))',
          DEFAULT: 'hsl(var(--success-500))',
          foreground: 'hsl(var(--success-foreground))',
        },
        
        warning: {
          50: 'hsl(var(--warning-50))',
          500: 'hsl(var(--warning-500))',
          600: 'hsl(var(--warning-600))',
          DEFAULT: 'hsl(var(--warning-500))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        
        error: {
          50: 'hsl(var(--error-50))',
          500: 'hsl(var(--error-500))',
          600: 'hsl(var(--error-600))',
          DEFAULT: 'hsl(var(--error-500))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        
        /* Content Colors */
        'foreground-secondary': 'hsl(var(--foreground-secondary))',
        'foreground-muted': 'hsl(var(--foreground-muted))',
        'foreground-placeholder': 'hsl(var(--foreground-placeholder))',

        /* Legacy Color Mappings for Backward Compatibility */
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        },
        emerald: {
          DEFAULT: 'hsl(142 76% 40%)',
          foreground: 'hsl(0 0% 100%)',
          light: 'hsl(142 76% 50%)',
          dark: 'hsl(142 76% 30%)'
        },
        sky: {
          DEFAULT: 'hsl(199 89% 48%)',
          foreground: 'hsl(0 0% 100%)',
          light: 'hsl(199 89% 58%)',
          dark: 'hsl(199 89% 38%)'
        },
        cyan: {
          DEFAULT: 'hsl(188 94% 42%)',
          foreground: 'hsl(0 0% 100%)',
          light: 'hsl(188 94% 52%)',
          dark: 'hsl(188 94% 32%)'
        },
        teal: {
          DEFAULT: 'hsl(173 58% 39%)',
          foreground: 'hsl(0 0% 100%)',
          light: 'hsl(173 58% 49%)',
          dark: 'hsl(173 58% 29%)'
        },
      },
      
      /* Border Radius System */
      borderRadius: {
        'xs': 'var(--radius-xs)',
        'sm': 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      
      /* Shadow System */
      boxShadow: {
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-md)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        'glow': 'var(--shadow-glow)',
        'inner': 'var(--shadow-inner)',
        /* Legacy mappings */
        'soft': 'var(--shadow-soft)',
        'medium': 'var(--shadow-medium)',
        'strong': 'var(--shadow-strong)',
        'accent-glow': 'var(--shadow-glow)',
        'emerald-glow': '0 0 20px hsl(142 76% 40% / 0.15)',
        'sky-glow': '0 0 20px hsl(199 89% 48% / 0.15)',
        'cyan-glow': '0 0 20px hsl(188 94% 42% / 0.15)',
        'success': '0 4px 8px -2px hsl(var(--success-500) / 0.2)',
        'warning': '0 4px 8px -2px hsl(var(--warning-500) / 0.2)',
        'destructive': '0 4px 8px -2px hsl(var(--error-500) / 0.2)',
      },
      
      /* Animation System */
      transitionTimingFunction: {
        'prism': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'prism-slow': 'cubic-bezier(0.23, 1, 0.32, 1)',
        'smooth': 'var(--transition-normal)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
      },
      
      /* Layout System */
      maxWidth: {
        'container': 'var(--container-max)',
        'content': 'var(--content-max)',
      },
      
      width: {
        'sidebar': 'var(--sidebar-width)',
        'sidebar-collapsed': 'var(--sidebar-collapsed)',
      },

      /* Background Images */
      backgroundImage: {
        'prism-gradient': 'linear-gradient(135deg, hsl(var(--primary-500)), hsl(var(--primary-600)))',
        'prism-subtle': 'linear-gradient(180deg, hsl(var(--background)), hsl(var(--surface-container)))',
        /* Legacy mappings */
        'gradient-primary': 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-700)))',
        'gradient-accent': 'linear-gradient(135deg, hsl(var(--accent)), hsl(var(--neutral-200)))',
        'gradient-surface': 'linear-gradient(180deg, hsl(var(--background)), hsl(var(--surface-container)))',
        'gradient-emerald': 'linear-gradient(135deg, hsl(142 76% 40%), hsl(142 76% 50%))',
        'gradient-sky': 'linear-gradient(135deg, hsl(199 89% 48%), hsl(199 89% 58%))',
        'gradient-cyan': 'linear-gradient(135deg, hsl(188 94% 42%), hsl(188 94% 52%))',
        'gradient-teal': 'linear-gradient(135deg, hsl(173 58% 39%), hsl(173 58% 49%))',
        'gradient-ocean': 'linear-gradient(135deg, hsl(199 89% 48%), hsl(188 94% 42%))',
        'gradient-nature': 'linear-gradient(135deg, hsl(142 76% 40%), hsl(173 58% 39%))',
      },
      
      /* Keyframes */
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "prism-fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "prism-slide-in": {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "prism-scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "prism-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        /* Legacy animation mappings */
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'fade-in-scale': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'bounce-in': {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px hsl(var(--primary) / 0.1)' },
          '50%': { boxShadow: '0 0 40px hsl(var(--primary) / 0.3), 0 0 60px hsl(var(--accent) / 0.2)' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' }
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      },
      
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "prism-fade-in": "prism-fade-in 0.3s ease-out",
        "prism-slide-in": "prism-slide-in 0.3s ease-out",
        "prism-scale-in": "prism-scale-in 0.2s ease-out",
        "prism-pulse": "prism-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        /* Legacy animation mappings */
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-in-scale': 'fade-in-scale 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'slide-down': 'slide-down 0.4s ease-out',
        'bounce-in': 'bounce-in 0.6s ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite'
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;