/** @type {import('tailwindcss').Config} */
const { fontFamily } = require('tailwindcss/defaultTheme');

const path = require('path');
module.exports = {
  darkMode: 'class',
  content: [
    path.join(__dirname, 'node_modules/flowbite-react/**/*.js'),
    path.join(__dirname, 'pages/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(__dirname, 'components/**/*.{js,ts,jsx,tsx,mdx}'),
  ],
  theme: {
    extend: {},
    fontFamily: {
      sans: ['var(--font-roboto)', ...fontFamily.sans],
    }
  },
  plugins: [
    require("flowbite/plugin")
  ],
}