import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
    	container: {
    		center: true,
    		padding: '2rem',
    		screens: {
    			'2xl': '1400px'
    		}
    	},
    	extend: {
    		fontFamily: {
    			sans: [
    				'Montserrat',
    				'ui-sans-serif',
    				'system-ui',
    				'-apple-system',
    				'BlinkMacSystemFont',
    				'Segoe UI',
    				'Roboto',
    				'Helvetica Neue',
    				'Arial',
    				'Noto Sans',
    				'sans-serif'
    			],
    			mono: [
    				'IBM Plex Mono',
    				'ui-monospace',
    				'SFMono-Regular',
    				'Menlo',
    				'Monaco',
    				'Consolas',
    				'Liberation Mono',
    				'Courier New',
    				'monospace'
    			],
    			display: [
    				'Inter',
    				'Roboto',
    				'system-ui',
    				'sans-serif'
    			],
    			serif: [
    				'Cormorant Garamond',
    				'ui-serif',
    				'Georgia',
    				'Cambria',
    				'Times New Roman',
    				'Times',
    				'serif'
    			]
    		},
    		colors: {
    			border: 'hsl(var(--border))',
    			input: 'hsl(var(--input))',
    			ring: 'hsl(var(--ring))',
    			background: 'hsl(var(--background))',
    			foreground: 'hsl(var(--foreground))',
    			primary: {
    				DEFAULT: 'hsl(var(--primary))',
    				foreground: 'hsl(var(--primary-foreground))',
    				light: 'hsl(var(--primary-light))',
    				dark: 'hsl(var(--primary-dark))'
    			},
    			secondary: {
    				DEFAULT: 'hsl(var(--secondary))',
    				foreground: 'hsl(var(--secondary-foreground))'
    			},
    			destructive: {
    				DEFAULT: 'hsl(var(--destructive))',
    				foreground: 'hsl(var(--destructive-foreground))'
    			},
    			muted: {
    				DEFAULT: 'hsl(var(--muted))',
    				foreground: 'hsl(var(--muted-foreground))'
    			},
    			accent: {
    				DEFAULT: 'hsl(var(--accent))',
    				foreground: 'hsl(var(--accent-foreground))'
    			},
    			success: {
    				DEFAULT: 'hsl(var(--success))',
    				foreground: 'hsl(var(--success-foreground))'
    			},
    			warning: {
    				DEFAULT: 'hsl(var(--warning))',
    				foreground: 'hsl(var(--warning-foreground))'
    			},
    			emerald: {
    				DEFAULT: 'hsl(var(--emerald))',
    				foreground: 'hsl(var(--emerald-foreground))',
    				light: 'hsl(var(--emerald-light))',
    				dark: 'hsl(var(--emerald-dark))'
    			},
    			sky: {
    				DEFAULT: 'hsl(var(--sky))',
    				foreground: 'hsl(var(--sky-foreground))',
    				light: 'hsl(var(--sky-light))',
    				dark: 'hsl(var(--sky-dark))'
    			},
    			cyan: {
    				DEFAULT: 'hsl(var(--cyan))',
    				foreground: 'hsl(var(--cyan-foreground))',
    				light: 'hsl(var(--cyan-light))',
    				dark: 'hsl(var(--cyan-dark))'
    			},
    			teal: {
    				DEFAULT: 'hsl(var(--teal))',
    				foreground: 'hsl(var(--teal-foreground))',
    				light: 'hsl(var(--teal-light))',
    				dark: 'hsl(var(--teal-dark))'
    			},
    			popover: {
    				DEFAULT: 'hsl(var(--popover))',
    				foreground: 'hsl(var(--popover-foreground))'
    			},
    			card: {
    				DEFAULT: 'hsl(var(--card))',
    				foreground: 'hsl(var(--card-foreground))'
    			},
    			sidebar: {
    				DEFAULT: 'hsl(var(--sidebar-background))',
    				foreground: 'hsl(var(--sidebar-foreground))',
    				primary: 'hsl(var(--sidebar-primary))',
    				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
    				accent: 'hsl(var(--sidebar-accent))',
    				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
    				border: 'hsl(var(--sidebar-border))',
    				ring: 'hsl(var(--sidebar-ring))'
    			}
    		},
    		borderRadius: {
    			lg: 'var(--radius)',
    			md: 'calc(var(--radius) - 2px)',
    			sm: 'calc(var(--radius) - 4px)'
    		},
    		backgroundImage: {
    			'gradient-primary': 'var(--gradient-primary)',
    			'gradient-accent': 'var(--gradient-accent)',
    			'gradient-surface': 'var(--gradient-surface)',
    			'gradient-emerald': 'var(--gradient-emerald)',
    			'gradient-sky': 'var(--gradient-sky)',
    			'gradient-cyan': 'var(--gradient-cyan)',
    			'gradient-teal': 'var(--gradient-teal)',
    			'gradient-ocean': 'var(--gradient-ocean)',
    			'gradient-nature': 'var(--gradient-nature)'
    		},
    		boxShadow: {
    			soft: 'var(--shadow-soft)',
    			medium: 'var(--shadow-medium)',
    			strong: 'var(--shadow-strong)',
    			glow: 'var(--shadow-glow)',
    			'accent-glow': 'var(--shadow-accent-glow)',
    			'emerald-glow': 'var(--shadow-emerald-glow)',
    			'sky-glow': 'var(--shadow-sky-glow)',
    			'cyan-glow': 'var(--shadow-cyan-glow)'
    		},
    		transitionTimingFunction: {
    			smooth: 'var(--transition-smooth)',
    			bounce: 'var(--transition-bounce)',
    			spring: 'var(--transition-spring)'
    		},
    		keyframes: {
    			'accordion-down': {
    				from: {
    					height: '0',
    					opacity: '0'
    				},
    				to: {
    					height: 'var(--radix-accordion-content-height)',
    					opacity: '1'
    				}
    			},
    			'accordion-up': {
    				from: {
    					height: 'var(--radix-accordion-content-height)',
    					opacity: '1'
    				},
    				to: {
    					height: '0',
    					opacity: '0'
    				}
    			},
    			'fade-in': {
    				'0%': {
    					opacity: '0',
    					transform: 'translateY(10px)'
    				},
    				'100%': {
    					opacity: '1',
    					transform: 'translateY(0)'
    				}
    			},
    			'fade-in-scale': {
    				'0%': {
    					opacity: '0',
    					transform: 'scale(0.95)'
    				},
    				'100%': {
    					opacity: '1',
    					transform: 'scale(1)'
    				}
    			},
    			'slide-up': {
    				'0%': {
    					opacity: '0',
    					transform: 'translateY(20px)'
    				},
    				'100%': {
    					opacity: '1',
    					transform: 'translateY(0)'
    				}
    			},
    			'slide-down': {
    				'0%': {
    					opacity: '0',
    					transform: 'translateY(-20px)'
    				},
    				'100%': {
    					opacity: '1',
    					transform: 'translateY(0)'
    				}
    			},
    			'bounce-in': {
    				'0%': {
    					opacity: '0',
    					transform: 'scale(0.3)'
    				},
    				'50%': {
    					opacity: '1',
    					transform: 'scale(1.05)'
    				},
    				'70%': {
    					transform: 'scale(0.95)'
    				},
    				'100%': {
    					opacity: '1',
    					transform: 'scale(1)'
    				}
    			},
    			'glow-pulse': {
    				'0%, 100%': {
    					boxShadow: '0 0 20px hsl(var(--primary) / 0.1)'
    				},
    				'50%': {
    					boxShadow: '0 0 40px hsl(var(--primary) / 0.3), 0 0 60px hsl(var(--accent) / 0.2)'
    				}
    			},
    			float: {
    				'0%, 100%': {
    					transform: 'translateY(0px)'
    				},
    				'50%': {
    					transform: 'translateY(-5px)'
    				}
    			},
    			'float-delayed': {
    				'0%, 100%': {
    					transform: 'translateY(0px)'
    				},
    				'50%': {
    					transform: 'translateY(-20px)'
    				}
    			},
    			blob: {
    				'0%': {
    					transform: 'translate(0px, 0px) scale(1)'
    				},
    				'33%': {
    					transform: 'translate(30px, -50px) scale(1.1)'
    				},
    				'66%': {
    					transform: 'translate(-20px, 20px) scale(0.9)'
    				},
    				'100%': {
    					transform: 'translate(0px, 0px) scale(1)'
    				}
    			},
    			shimmer: {
    				'0%': {
    					backgroundPosition: '-200% 0'
    				},
    				'100%': {
    					backgroundPosition: '200% 0'
    				}
    			}
    		},
    		animation: {
    			'accordion-down': 'accordion-down 0.2s ease-out',
    			'accordion-up': 'accordion-up 0.2s ease-out',
    			'fade-in': 'fade-in 0.3s ease-out',
    			'fade-in-scale': 'fade-in-scale 0.3s ease-out',
    			'slide-up': 'slide-up 0.4s ease-out',
    			'slide-down': 'slide-down 0.4s ease-out',
    			'bounce-in': 'bounce-in 0.6s ease-out',
    			'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
    			float: 'float 3s ease-in-out infinite',
    			'float-delayed': 'float-delayed 6s ease-in-out infinite',
    			blob: 'blob 7s infinite',
    			shimmer: 'shimmer 2s linear infinite'
    		}
    	}
    },
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
