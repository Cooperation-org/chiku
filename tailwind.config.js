/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				// LinkedTrust brand colors extracted from logo
				lt: {
					dark: '#3f2534',      // deep purple-brown (primary dark)
					cyan: '#00b2e5',      // bright cyan
					teal: '#00d0db',      // teal
					coral: '#ff6872',     // coral/salmon
					green: '#8dc63f',     // lime green
					gold: '#ffca4d',      // gold/yellow
				},
				// Light mode surface colors
				'surface-light': {
					0: '#fafafa',         // page background
					1: '#ffffff',         // card/sidebar background
					2: '#f4f4f5',         // elevated elements
					3: '#e4e4e7',         // hover states
				},
				// Dark mode surface colors
				'surface-dark': {
					0: '#0a0a0b',         // darkest background
					1: '#111113',         // card background
					2: '#1a1a1d',         // elevated surface
					3: '#232326',         // hover states
				},
				border: {
					DEFAULT: '#e4e4e7',
					dark: '#2a2a2e',
					hover: '#d4d4d8',
					'dark-hover': '#3a3a3e',
				}
			},
			fontFamily: {
				sans: [
					'Inter',
					'-apple-system',
					'BlinkMacSystemFont',
					'Segoe UI',
					'Roboto',
					'sans-serif'
				],
				mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace']
			},
			animation: {
				'fade-in': 'fadeIn 150ms ease-out',
				'slide-up': 'slideUp 150ms ease-out',
			},
			keyframes: {
				fadeIn: {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' },
				},
				slideUp: {
					'0%': { opacity: '0', transform: 'translateY(4px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				}
			}
		}
	},
	plugins: []
};
