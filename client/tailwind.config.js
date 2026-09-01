/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary — muted rose/red
        primary: {
          50:  '#fdf3f3',
          100: '#fae5e5',
          200: '#f5cece',
          300: '#edaaaa',
          400: '#e07e7e',
          500: '#d96868',  // #D96868 main
          600: '#c44d4d',
          700: '#a53c3c',
          800: '#883434',
          900: '#712f2f',
        },
        // Secondary — sage / forest green
        sage: {
          50:  '#f4f8f0',
          100: '#e5eedb',
          200: '#cddebb',
          300: '#adc891',
          400: '#91ae6e',  // #91AE6E light sage
          500: '#76974f',
          600: '#689d4b',  // #689D4B forest green
          700: '#507839',
          800: '#426030',
          900: '#374f29',
        },
        // Neutral background
        surface: '#F2F2F2',
      },
    },
  },
  plugins: [],
}
