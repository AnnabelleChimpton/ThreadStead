// tailwind.config.js
module.exports = {
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        retro: {
          paper: "#FFFDF7",
          ink: "#111111",
          sun: "#FFE08A",
          link: "#0033CC",
          linkHover: "#CC0000",
          box: "#FFFFFF",
          border: "#111111",
          accent: "#FF66CC",
        },
      },
      boxShadow: {
        retro: "4px 4px 0 #111",       // chonky shadow
        retroSm: "2px 2px 0 #111",
      },
      fontFamily: {
        retro: ['"Comic Sans MS"', "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
