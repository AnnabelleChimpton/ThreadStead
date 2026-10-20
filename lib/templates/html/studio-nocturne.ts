/* Studio Nocturne — a bold dark one-pager in plain HTML.
 * Big display type, project rows, one hot accent. No components. */

export const STUDIO_NOCTURNE_TEMPLATE = `<meta name="color:Background" content="#17161a">
<meta name="color:Text" content="#e8e4dd">
<meta name="color:Accent" content="#ff5d47">
<meta name="font:Text" content="'Avenir Next', 'Helvetica Neue', system-ui, sans-serif">
<style>
body {
  background: var(--color-background);
  margin: 0;
  padding: 0;
}

.profile-template-root {
  background: var(--color-background);
  color: var(--color-text);
  font-family: var(--font-text);
  min-height: 100vh;
  padding: 4rem 1.5rem 5rem;
}

.studio {
  max-width: 780px;
  margin: 0 auto;
}

.studio-kicker {
  color: var(--color-accent);
  font-size: 0.85rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  margin-bottom: 1rem;
}

.studio-title {
  font-size: clamp(2.6rem, 8vw, 4.5rem);
  line-height: 1.05;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 1.5rem;
}

.studio-title em {
  font-style: normal;
  color: var(--color-accent);
}

.studio-lede {
  font-size: 1.2rem;
  line-height: 1.7;
  color: #a8a29a;
  max-width: 560px;
  margin-bottom: 4rem;
}

.studio h2 {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #6f6a63;
  border-bottom: 1px solid #2b2930;
  padding-bottom: 0.75rem;
  margin-bottom: 0;
}

.work-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem 0.25rem;
  border-bottom: 1px solid #2b2930;
  text-decoration: none;
  color: var(--color-text);
  transition: all 0.2s ease;
}

.work-row:hover {
  background: #1e1d22;
  padding-left: 1rem;
  color: var(--color-accent);
}

.work-name {
  font-size: 1.4rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.work-note {
  color: #6f6a63;
  font-size: 0.95rem;
  text-align: right;
}

.work-row:hover .work-note {
  color: #a8a29a;
}

.studio-contact {
  margin-top: 4rem;
}

.studio-contact p {
  color: #a8a29a;
  line-height: 1.7;
  max-width: 560px;
}

.contact-links {
  margin-top: 1.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.contact-pill {
  border: 1px solid #3a3740;
  border-radius: 999px;
  padding: 0.5rem 1.25rem;
  color: var(--color-text);
  text-decoration: none;
  font-size: 0.95rem;
  transition: all 0.2s ease;
}

.contact-pill:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.studio-footer {
  margin-top: 4rem;
  color: #6f6a63;
  font-size: 0.85rem;
  letter-spacing: 0.1em;
}
</style>

<div class="studio">
  <p class="studio-kicker">Portfolio · Est. whenever you say it was</p>

  <h1 class="studio-title">
    Hello, I make <em>things</em> and put them on the internet.
  </h1>

  <p class="studio-lede">
    Swap this line for what you actually do — design, code, zines, music,
    tiny games. One sentence, said plainly, beats a paragraph of titles.
  </p>

  <h2>Selected Work</h2>
  <a class="work-row" href="#">
    <span class="work-name">Project One</span>
    <span class="work-note">what it is · year</span>
  </a>
  <a class="work-row" href="#">
    <span class="work-name">Project Two</span>
    <span class="work-note">what it is · year</span>
  </a>
  <a class="work-row" href="#">
    <span class="work-name">Project Three</span>
    <span class="work-note">the weird one · year</span>
  </a>
  <a class="work-row" href="#">
    <span class="work-name">Project Four</span>
    <span class="work-note">currently underway</span>
  </a>

  <div class="studio-contact">
    <h2>Contact</h2>
    <p>
      Say where people can find you, and what kind of hello you're open to.
    </p>
    <div class="contact-links">
      <a class="contact-pill" href="#">email</a>
      <a class="contact-pill" href="#">the fediverse</a>
      <a class="contact-pill" href="#">everywhere else</a>
    </div>
  </div>

  <p class="studio-footer">BUILT BY HAND · NO FRAMEWORKS WERE HARMED</p>
</div>`;
