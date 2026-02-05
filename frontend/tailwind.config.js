export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-dark': '#0f172a', // Deep Navy
        'brand-blue': '#38bdf8', // Electric Blue (Sky 400ish)
        'brand-purple': '#c084fc', // Soft Purple
        'brand-glass': 'rgba(255, 255, 255, 0.05)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Assuming we import Inter or use system sans
      }
    },
  },
  plugins: [],
}
