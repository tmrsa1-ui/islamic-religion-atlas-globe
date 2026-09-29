/** @type {import('tailwindcss').Config} */
const ctx = (v) => `rgb(var(--${v}) / <alpha-value>)`;
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.ts"],
  theme: {
    extend: {
      // Context colors: .night and .paper (app/globals.css) define the values.
      colors: {
        fg: ctx("fg"), muted: ctx("muted"), bg: ctx("bg"), surface: ctx("surface"), rule: ctx("rule"),
        accent: ctx("accent"), accent2: ctx("accent2"), clay: ctx("clay"), field: ctx("field"),
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
