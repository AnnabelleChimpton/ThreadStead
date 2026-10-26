// Old web: a 1999 homepage. Stars, a marquee, a webring, little buttons.

export const OLD_WEB = `<meta name="color:Sky" content="#05050f">
<meta name="color:Text" content="#e8e8e8">
<meta name="color:Headings" content="#ffff66">
<meta name="color:Links" content="#66ccff">
<meta name="font:Text" content="'Times New Roman', Times, serif">
<style>
/* Night sky: the site's tiled stars on black */
body {
  background: var(--color-sky) url('/assets/stars-bg.gif');
  margin: 0;
}

.profile-template-root {
  color: var(--color-text);
  font-family: var(--font-text);
  font-size: 1.1rem;
  line-height: 1.5;
  min-height: 100vh;
  padding: 2rem 1rem 3rem;
}

/* One narrow column, centred, the way pages were */
.homepage {
  max-width: 40rem;
  margin: 0 auto;
  text-align: center;
}

h1,
h2 {
  color: var(--color-headings);
}

h1 {
  font-size: 2.6rem;
  margin: 0.5rem 0;
}

a {
  color: var(--color-links);
}

a:visited {
  color: #cc99ff;
}

a:focus-visible,
button:focus-visible,
textarea:focus-visible {
  outline: 2px dotted var(--color-headings);
  outline-offset: 2px;
}

/* The groove line between sections */
hr {
  border: none;
  border-top: 3px groove #8888aa;
  margin: 2rem 0;
}

/* Your scrolling message. It stays still for anyone who's asked their
   computer for less motion. */
.ticker {
  overflow: hidden;
  white-space: nowrap;
  border: 2px ridge #8888aa;
  padding: 0.3rem 0;
}

.ticker span {
  display: inline-block;
  padding-left: 100%;
  animation: ticker 18s linear infinite;
}

@keyframes ticker {
  to { transform: translateX(-100%); }
}

@media (prefers-reduced-motion: reduce) {
  .ticker span {
    animation: none;
    padding-left: 0;
  }
}

/* A row of 88x31 buttons */
.buttons img {
  width: 88px;
  height: 31px;
  margin: 0.2rem;
  image-rendering: pixelated;
}

/* The guestbook reads left to right */
.guestbook {
  text-align: left;
}

/* Phones: smaller name, a bit less space */
@media (max-width: 600px) {
  h1 {
    font-size: 1.9rem;
  }

  .profile-template-root {
    padding: 1.25rem 0.75rem 2rem;
  }
}
</style>

<div class="homepage">
  <ProfilePhoto size="md" shape="square" />
  <DisplayName as="h1" />

  <div class="ticker"><span>Write something here and it scrolls across the top of your page.</span></div>

  <hr>

  <h2>About me</h2>
  <p>Write about yourself here. Old pages were made of exactly this: a few lines about who you are and what you like.</p>

  <hr>

  <h2>My webring</h2>
  <RingNav ring="welcome" />

  <h2>Buttons</h2>
  <p class="buttons">
    <HouseBadge />
  </p>
  <p>Put other people's 88x31 buttons here with an img tag, each one linking to their page.</p>

  <hr>

  <div class="guestbook">
    <h2>Sign my guestbook</h2>
    <Guestbook heading="none" />
  </div>
</div>`;
