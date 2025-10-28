/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        drift: {
          safe: '#10b981',      // green-500
          warning: '#f59e0b',   // amber-500
          danger: '#ef4444',    // red-500
        },
      },
    },
  },
  plugins: [],
}
