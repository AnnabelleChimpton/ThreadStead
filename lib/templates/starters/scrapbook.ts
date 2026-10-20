// Scrapbook: graph paper with cards stuck on it. Your posts in the middle,
// the guestbook at the bottom.

export const SCRAPBOOK = `<meta name="color:Paper" content="#fdf3d9">
<meta name="color:Ink" content="#3a2f26">
<meta name="color:Headings" content="#b2432f">
<meta name="color:Shadow" content="#e8b64c">
<meta name="color:Links" content="#1d4ed8">
<meta name="font:Text" content="'Trebuchet MS', Verdana, sans-serif">
<style>
/* Graph paper: two faint grids of lines over cream */
body {
  background: var(--color-paper);
  margin: 0;
}

.profile-template-root {
  background-color: var(--color-paper);
  background-image:
    linear-gradient(rgba(178, 67, 47, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(178, 67, 47, 0.08) 1px, transparent 1px);
  background-size: 24px 24px;
  color: var(--color-ink);
  font-family: var(--font-text);
  line-height: 1.6;
  min-height: 100vh;
  padding: 2.5rem 1rem 4rem;
}

.scrapbook {
  max-width: 54rem;
  margin: 0 auto;
}

h1 {
  text-align: center;
  font-size: 2.2rem;
  color: var(--color-headings);
  border-bottom: 3px dashed var(--color-headings);
  padding-bottom: 0.5rem;
  margin: 0 0 2rem;
}

h2 {
  color: var(--color-headings);
  font-size: 1.2rem;
  margin: 0 0 0.75rem;
}

/* Two columns: you on the left, your posts on the right */
.spread {
  display: grid;
  grid-template-columns: 16rem 1fr;
  gap: 1.5rem;
  align-items: start;
}

/* A card stuck on the page: ink edge, yellow shadow, a slight tilt */
.card {
  background: #fffdf7;
  border: 3px solid var(--color-ink);
  border-radius: 6px;
  box-shadow: 5px 5px 0 var(--color-shadow);
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  transform: rotate(-0.6deg);
}

.card:nth-of-type(even) {
  transform: rotate(0.5deg);
}

/* Old-web links: blue, underlined, purple once you've been */
a {
  color: var(--color-links);
}

a:visited {
  color: #7c3aed;
}

a:focus-visible,
button:focus-visible,
textarea:focus-visible {
  outline: 3px solid var(--color-shadow);
  outline-offset: 2px;
}

/* Phones: one column, no tilt */
@media (max-width: 600px) {
  .spread {
    grid-template-columns: 1fr;
  }

  .card,
  .card:nth-of-type(even) {
    transform: none;
  }
}
</style>

<div class="scrapbook">
  <DisplayName as="h1" />

  <div class="spread">
    <div>
      <div class="card">
        <ProfilePhoto size="lg" shape="square" />
      </div>
      <div class="card">
        <h2>About me</h2>
        <p>Write about yourself here, like the first page of a scrapbook: who made it, and what's inside.</p>
      </div>
    </div>

    <div class="card">
      <h2>What I've been up to</h2>
      <BlogPosts limit="4" heading="none" />
    </div>
  </div>

  <div class="card">
    <h2>Sign my guestbook</h2>
    <Guestbook heading="none" />
  </div>
</div>`;
