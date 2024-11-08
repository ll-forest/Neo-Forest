/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cyber-blue': '#0ff',
        'cyber-pink': '#f0f',
        'cyber-purple': '#90f',
      },
      animation: {
        'float': 'float 5s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'hover-bounce': 'hover-bounce 1s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-glow': {
          '0%, 100%': { 
            opacity: 1,
            filter: 'drop-shadow(0 0 2px #0ff) drop-shadow(0 0 5px #0ff)'
          },
          '50%': { 
            opacity: 0.8,
            filter: 'drop-shadow(0 0 10px #0ff) drop-shadow(0 0 20px #0ff)'
          },
        },
        'hover-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
}