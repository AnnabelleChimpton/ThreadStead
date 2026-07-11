/* Quiet Garden — proof that a plain, beautiful HTML page lives here.
 * No components, no scripting: header, about, now, links, footer. */

export const QUIET_GARDEN_TEMPLATE = `<style>
body {
  background: #f7f4ee;
  margin: 0;
  padding: 0;
}

.profile-template-root {
  background: #f7f4ee;
  color: #1f1c17;
  font-family: 'Iowan Old Style', 'Palatino Linotype', Georgia, serif;
  line-height: 1.75;
  min-height: 100vh;
  padding: 3.5rem 1.25rem 5rem;
}

.garden {
  max-width: 620px;
  margin: 0 auto;
}

.garden-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  border-bottom: 1px solid #ddd5c4;
  padding-bottom: 1.25rem;
  margin-bottom: 2.5rem;
}

.garden-name {
  font-size: 1.5rem;
  font-weight: 400;
  letter-spacing: 0.01em;
}

.garden-nav a {
  color: #6d6355;
  text-decoration: none;
  margin-left: 1.25rem;
  font-size: 0.95rem;
}

.garden-nav a:hover {
  color: #4a7c59;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.garden-intro {
  font-size: 1.35rem;
  line-height: 1.6;
  margin-bottom: 3rem;
}

.garden-intro em {
  color: #4a7c59;
}

.garden section {
  margin-bottom: 3rem;
}

.garden h2 {
  font-size: 0.85rem;
  font-weight: 400;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #8f8371;
  margin-bottom: 1rem;
}

.now-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.now-list li {
  padding: 0.6rem 0;
  border-bottom: 1px dashed #ddd5c4;
}

.now-list li:last-child {
  border-bottom: none;
}

.now-label {
  color: #8f8371;
  font-style: italic;
  margin-right: 0.5rem;
}

.link-garden {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.75rem;
}

.link-card {
  display: block;
  border: 1px solid #ddd5c4;
  border-radius: 8px;
  padding: 1rem 1.15rem;
  text-decoration: none;
  color: #1f1c17;
  background: #fffdf8;
  transition: all 0.2s ease;
}

.link-card:hover {
  border-color: #4a7c59;
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(74, 124, 89, 0.12);
}

.link-card strong {
  display: block;
  font-weight: 400;
  font-size: 1.05rem;
  margin-bottom: 0.15rem;
}

.link-card span {
  color: #8f8371;
  font-size: 0.9rem;
}

.garden-footer {
  border-top: 1px solid #ddd5c4;
  padding-top: 1.25rem;
  color: #8f8371;
  font-size: 0.9rem;
  font-style: italic;
}

a {
  color: #4a7c59;
}
</style>

<div class="garden">
  <header class="garden-header">
    <span class="garden-name">Your Name</span>
    <nav class="garden-nav">
      <a href="#about">about</a>
      <a href="#now">now</a>
      <a href="#links">links</a>
    </nav>
  </header>

  <p class="garden-intro">
    Hello — welcome to my little plot of the internet.
    I keep things here the way you'd keep a garden: <em>slowly, and mostly for the pleasure of it</em>.
  </p>

  <section id="about">
    <h2>About</h2>
    <p>
      Write a few honest sentences about yourself here. Where you are, what you make,
      what you can't stop reading about lately. It doesn't have to be impressive —
      it has to sound like you.
    </p>
  </section>

  <section id="now">
    <h2>Now</h2>
    <ul class="now-list">
      <li><span class="now-label">reading</span> a book you'd press into a friend's hands</li>
      <li><span class="now-label">making</span> the thing you keep telling people about</li>
      <li><span class="now-label">listening</span> to the same album for the ninth day running</li>
    </ul>
  </section>

  <section id="links">
    <h2>Links</h2>
    <div class="link-garden">
      <a class="link-card" href="#">
        <strong>A project of yours</strong>
        <span>one line about why it exists</span>
      </a>
      <a class="link-card" href="#">
        <strong>Somewhere you write</strong>
        <span>essays, notes, a blog</span>
      </a>
      <a class="link-card" href="#">
        <strong>A friend's site</strong>
        <span>the old web runs on links</span>
      </a>
      <a class="link-card" href="#">
        <strong>Something you love</strong>
        <span>share the good stuff</span>
      </a>
    </div>
  </section>

  <footer class="garden-footer">
    tended by hand · replanted whenever the mood strikes
  </footer>
</div>`;
