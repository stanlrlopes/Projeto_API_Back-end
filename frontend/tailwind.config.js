/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          navy: '#0F172A',
          institutional: '#1E3A8A',
          action: '#2563EB',
          actionHover: '#1D4ED8',
          surface: '#F8FAFC',
        },
      },
    },
  },
  plugins: [],
};
