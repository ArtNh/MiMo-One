/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{tsx,ts,jsx,js}'],
  theme: {
    extend: {
      keyframes: {
        bristle: {
          '0%, 100%': { transform: 'scale(1) rotate(0deg)' },
          '25%': { transform: 'scale(1.05) rotate(-2deg)' },
          '75%': { transform: 'scale(1.05) rotate(2deg)' },
        }
      },
      animation: {
        bristle: 'bristle 0.15s ease-in-out infinite',
      }
    },
  },
  plugins: [],
};
