/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Bagani Brand Colors
        'bagani-red': {
          DEFAULT: '#8B0000',
          light: '#B22222',
          dark: '#5C0000',
        },
        'bagani-blue': {
          DEFAULT: '#1E40AF',
          light: '#3B82F6',
          dark: '#1E3A8A',
        },
        'bagani-gray': {
          light: '#F3F4F6',
          DEFAULT: '#6B7280',
          dark: '#1F2937',
        },
        'bagani-yellow': {
          DEFAULT: '#F59E0B',
          light: '#FCD34D',
        },
        // Existing theme colors
        'primary-red': '#d32f2f',
      },
      fontFamily: {
        sans: ['Poppins', 'Arial', 'Helvetica', 'sans-serif'],
      },
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '1.5rem',
          lg: '2rem',
        },
      },
    },
  },
  plugins: [],
}
