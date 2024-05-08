/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
   './node_modules/flowbite-react/**/*.js',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
    fontFamily: {
      sans: ['var(--font-roboto)', 'sans-serif'],
    }
  },
  plugins: [
    'flowbite/plugin'
  ],
}