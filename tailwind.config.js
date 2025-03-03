export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#00adef',
          DEFAULT: '#0088FF',
          dark: '#3871c1',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(90deg, #00adef 0%, #3871c1 100%)',
      },
    },
  },
  plugins: [],
}