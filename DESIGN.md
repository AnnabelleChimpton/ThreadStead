# ThreadStead Design Guide

How to make your ThreadStead page *yours* — starting from the cozy-homestead
look the site gives you, and going as far as you want from there.

Your custom CSS styles your **whole page**: the header, the background, the
navigation, everything. That's the point — it's your homestead.

## Table of Contents
- [The ThreadStead Palette](#the-threadstead-palette)
- [Start From a Preset](#start-from-a-preset)
- [The Class Contract](#the-class-contract)
- [Layout Patterns](#layout-patterns)
- [Color & Backgrounds](#color--backgrounds)
- [Fonts](#fonts)
- [Animation](#animation)
- [CSS Modes](#css-modes)
- [Tips](#tips)

## The ThreadStead Palette

These are the site's own colors. You don't have to use them — but designs
that riff on them will sit beautifully inside the rest of the site.

```css
:root {
  --thread-cream:    #F5E9D4;  /* warm base */
  --thread-sage:     #A18463;  /* muted brown — borders, quiet text */
  --thread-pine:     #2E4B3F;  /* deep green — headings, links */
  --thread-sky:      #8EC5E8;  /* soft blue — accents */
  --thread-meadow:   #4FAF6D;  /* fresh green — success, life */
  --thread-sunset:   #E27D60;  /* warm coral — highlights, warmth */
  --thread-paper:    #FCFAF7;  /* off-white — cards */
  --thread-charcoal: #2F2F2F;  /* main text */
}
```

A gradient that always looks at home:

```css
.thread-surface {
  background: linear-gradient(135deg, #2E4B3F 0%, #4FAF6D 100%) !important;
}
```

## Start From a Preset

The CSS editor's Theme Gallery has five complete, working starting points:
**Abstract Art**, **Charcoal Nights**, **Pixel Petals**, **Retro Social**,
and **Classic Linen**. Pick the one closest to your vision, then edit — every
preset is ordinary CSS you can read and change line by line. This is the
fastest route to a beautiful page.

## The Class Contract

Your page's markup uses stable, documented class names — they are a public
API and won't change out from under you. The full list lives in
[THREADSTEAD_CSS_CLASS_REFERENCE.md](./THREADSTEAD_CSS_CLASS_REFERENCE.md).
The ones you'll touch most:

```css
.thread-surface            /* the page background */
.site-header, .site-footer /* chrome above and below */
.ts-profile-container      /* your profile's outer wrapper */
.ts-profile-header         /* the header section */
.ts-profile-display-name   /* your name */
.ts-profile-bio            /* your bio text */
.blog-post-card            /* each blog post */
.ts-profile-button         /* action buttons */
```

Use `!important` freely — your page, your rules. (The site's styles are
layered underneath yours, but `!important` guarantees you win every fight.)

## Layout Patterns

Center your content and give it a card:

```css
.ts-profile-container {
  max-width: 720px;
  margin: 0 auto;
}

.blog-post-card {
  background: var(--thread-paper, #FCFAF7) !important;
  border: 2px solid var(--thread-sage, #A18463) !important;
  border-radius: 12px !important;
  box-shadow: 4px 4px 0 rgba(46, 75, 63, 0.15) !important;
}
```

## Color & Backgrounds

The whole page backdrop:

```css
.thread-surface {
  background: #F5E9D4 !important;   /* or a gradient, or a pattern */
}
```

A patterned background (paper grain):

```css
.thread-surface {
  background:
    repeating-linear-gradient(45deg,
      rgba(161, 132, 99, 0.06) 0 2px, transparent 2px 12px),
    #F5E9D4 !important;
}
```

## Fonts

`@import` **must be the very first thing in your CSS** — before any rule, or
the browser ignores it (that's a CSS rule, not ours). Google Fonts work:

```css
@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600&display=swap');

.ts-profile-display-name {
  font-family: 'Quicksand', sans-serif !important;
}
```

## Animation

`@keyframes` work in your custom CSS:

```css
@keyframes gentle-float {
  from { transform: translateY(0); }
  50%  { transform: translateY(-6px); }
  to   { transform: translateY(0); }
}

.profile-photo-frame {
  animation: gentle-float 4s ease-in-out infinite;
}
```

## CSS Modes

In the CSS editor you choose how much of the site's styling to keep:

- **Extend** (`inherit`) — the site look stays; your CSS layers on top.
  Right for most pages.
- **Override** (`override`) — same as extend today; kept for future use.
- **Full control** (`disable`) — the site's CSS is removed entirely and only
  your CSS applies. You are responsible for *everything*, including making
  text readable. For the adventurous.

## Tips

- **Iterate in the preview.** The editor's preview popup shows exactly what
  the live page will do — same CSS delivery, no surprises.
- **Steal from the presets.** They're maintained, on-brand, and demonstrate
  every technique on this page.
- **Contrast matters.** `--thread-charcoal` on `--thread-cream` is the house
  pairing for a reason. Check your text is readable on whatever you build.
- **One `@import` line, at the top.** Multiple font families can share a
  single import URL.

## Need Help?

Open the in-app design tutorial (Design → CSS Tutorial) for a guided,
copy-paste-friendly version of everything here, or start a thread in the
help ring.
