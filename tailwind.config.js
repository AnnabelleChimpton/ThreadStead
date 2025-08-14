// tailwind.config.js
module.exports = {
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ThreadStead color palette
        thread: {
          // Base colors
          cream: "#F5E9D4",      // warm base
          sage: "#A18463",       // muted sage
          pine: "#2E4B3F",       // deep pine
          // Accent colors  
          sky: "#8EC5E8",        // soft sky blue
          meadow: "#4FAF6D",     // fresh meadow green
          sunset: "#E27D60",     // warm sunset coral
          // Neutrals
          paper: "#FCFAF7",      // off-white paper
          stone: "#B8B8B8",      // mid gray
          charcoal: "#2F2F2F",   // dark charcoal
        },
        // Legacy retro colors for backward compatibility
        retro: {
          paper: "#FCFAF7",
          ink: "#2F2F2F",
          sun: "#F5E9D4",
          link: "#2E4B3F",
          linkHover: "#E27D60",
          box: "#FCFAF7",
          border: "#A18463",
          accent: "#8EC5E8",
        },
      },
      boxShadow: {
        cozy: "3px 3px 0 #A18463",      // warm sage shadow
        cozySm: "2px 2px 0 #A18463",    // small warm shadow
        thread: "4px 4px 8px rgba(46, 75, 63, 0.15)", // soft pine shadow
        retro: "4px 4px 0 #A18463",     // updated retro shadow
        retroSm: "2px 2px 0 #A18463",
      },
      fontFamily: {
        // Serif for headlines
        headline: ["Georgia", "Times New Roman", "serif"],
        // Humanist sans-serif for body
        body: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        // Monospace for micro-labels
        mono: ["Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"],
        // Legacy
        retro: ["Georgia", "Times New Roman", "serif"],
      },
      borderRadius: {
        cozy: "8px",
        thread: "12px",
      },
    },
  },
  plugins: [],
};
