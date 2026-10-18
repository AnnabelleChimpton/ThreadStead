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
          // Follows the notebook's gray-green ink (5.2:1 on cream); the old tan
          // #A18463 (3.4:1) is only the fallback when no site CSS is loaded.
          sage: "var(--ha-ink-mid, #A18463)",
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
        // Pixel Homes themed palettes
        'pixel-homes': {
          'thread-sage': {
            primary: '#A18463',    // sage
            secondary: '#2E4B3F',  // pine  
            accent: '#8EC5E8',     // sky
            base: '#F5E9D4',       // cream
            detail: '#4FAF6D'      // meadow
          },
          'charcoal-nights': {
            primary: '#2F2F2F',    // charcoal
            secondary: '#B8B8B8',  // stone
            accent: '#E27D60',     // sunset
            base: '#FCFAF7',       // paper
            detail: '#A18463'      // sage
          },
          'pixel-petals': {
            primary: '#E27D60',    // sunset
            secondary: '#4FAF6D',  // meadow
            accent: '#8EC5E8',     // sky
            base: '#F5E9D4',       // cream
            detail: '#2E4B3F'      // pine
          },
          'crt-glow': {
            primary: '#8EC5E8',    // sky
            secondary: '#2F2F2F',  // charcoal
            accent: '#4FAF6D',     // meadow
            base: '#FCFAF7',       // paper
            detail: '#E27D60'      // sunset
          },
          'classic-linen': {
            primary: '#F5E9D4',    // cream
            secondary: '#A18463',  // sage
            accent: '#2E4B3F',     // pine
            base: '#FCFAF7',       // paper
            detail: '#8EC5E8'      // sky
          }
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
        // Site-theme tokens: read the admin site CSS palette (--ha-* vars,
        // currently "90s Cozy Notebook") and fall back to the thread palette
        // when no site CSS is loaded. Use these for chrome that should follow
        // the site theme; stock Tailwind colors can't be reached by it.
        nb: {
          surface: "var(--ha-surface, #F5E9D4)",
          peach: "var(--ha-header, #F5E9D4)",
          paper: "var(--ha-paper, #FCFAF7)",
          ink: "var(--ha-ink-dark, #2E4B3F)",
          "ink-mid": "var(--ha-ink-mid, #A18463)",
          rose: "var(--ha-rose, #E27D60)",
          "rose-ink": "var(--ha-rose-ink, #9B3B2A)",
          lav: "var(--ha-lav, #8EC5E8)",
          butter: "var(--ha-butter, #F5E9D4)",
        },
      },
      // Tailwind v4 kebab-cases these keys: cozySm → shadow-cozy-sm
      boxShadow: {
        cozy: "3px 3px 0 var(--ha-ink-mid, #A18463)",      // warm sage shadow
        cozySm: "2px 2px 0 var(--ha-ink-mid, #A18463)",    // small warm shadow
        cozyLg: "5px 5px 0 var(--ha-ink-mid, #A18463)",    // hover lift for cozy cards
        thread: "4px 4px 8px rgba(46, 75, 63, 0.15)", // soft pine shadow
        retro: "4px 4px 0 var(--ha-ink-mid, #A18463)",     // updated retro shadow
        retroSm: "2px 2px 0 var(--ha-ink-mid, #A18463)",
        nb: "3px 3px 0 var(--ha-ink-mid, #A18463)",
        nbSm: "2px 2px 0 var(--ha-ink-mid, #A18463)",
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
