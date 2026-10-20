// Plain page: what a new HTML page opens with, and the one to learn from.
// Ordinary HTML and CSS plus your name and your guestbook.

export const PLAIN_PAGE = `<meta name="color:Paper" content="#f7f4ee">
<meta name="color:Ink" content="#1f1c17">
<meta name="color:Quiet" content="#6b6252">
<meta name="color:Links" content="#3f6b4c">
<meta name="font:Text" content="'Iowan Old Style', 'Palatino Linotype', Georgia, serif">
<style>
/* The whole page: paper colour, one column, a serif */
body {
  background: var(--color-paper);
  margin: 0;
}

.profile-template-root {
  background: var(--color-paper);
  color: var(--color-ink);
  font-family: var(--font-text);
  line-height: 1.7;
  min-height: 100vh;
  padding: 3rem 1.25rem 4rem;
}

.page {
  max-width: 38rem;
  margin: 0 auto;
}

/* Your name at the top, with a line under it */
.page-header {
  border-bottom: 1px solid var(--color-quiet);
  padding-bottom: 1rem;
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 400;
  margin: 0;
}

/* Section headings: small and quiet */
h2 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-quiet);
  margin: 2.5rem 0 0.75rem;
}

p {
  margin: 0 0 1rem;
}

a {
  color: var(--color-links);
  text-underline-offset: 3px;
}

/* A clear ring round whatever the keyboard is on */
a:focus-visible,
button:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--color-links);
  outline-offset: 2px;
}

/* The "right now" list: a dashed line between each */
.now {
  list-style: none;
  padding: 0;
  margin: 0;
}

.now li {
  padding: 0.5rem 0;
  border-bottom: 1px dashed var(--color-quiet);
}

.now li:last-child {
  border-bottom: none;
}

.now em {
  color: var(--color-quiet);
  margin-right: 0.4rem;
}

/* Phones: a little less space around everything */
@media (max-width: 600px) {
  .profile-template-root {
    padding: 2rem 1rem 3rem;
  }

  .page-header h1 {
    font-size: 1.6rem;
  }
}
</style>

<div class="page">
  <header class="page-header">
    <DisplayName as="h1" />
  </header>

  <h2>About me</h2>
  <p>Write a few sentences about yourself here. Where you are, what you make, what you can't stop thinking about lately.</p>

  <h2>Right now</h2>
  <ul class="now">
    <li><em>reading</em> the book on your nightstand</li>
    <li><em>making</em> the thing you keep telling people about</li>
    <li><em>listening to</em> the album you've had on repeat</li>
  </ul>

  <h2>Links</h2>
  <ul>
    <li><a href="https://example.com">A place you write or post</a></li>
    <li><a href="https://example.com">A friend's page</a></li>
  </ul>

  <h2>Guestbook</h2>
  <Guestbook heading="none" />
</div>`;
