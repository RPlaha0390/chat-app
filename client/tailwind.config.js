/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#1B1D23', dark: '#EDEEF2' },
        surface: { DEFAULT: '#F7F8FA', dark: '#15161B' },
        raised: { DEFAULT: '#FFFFFF', dark: '#1E2027' },
        primary: {
          DEFAULT: '#5B3DF5',
          dark: '#8B7BFF',
          hover: '#4C2FE0',
          'hover-dark': '#9D8FFF',
        },
        accent: '#F2A93B',
        online: '#2FB673',
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
