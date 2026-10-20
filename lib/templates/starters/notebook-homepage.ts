// Notebook homepage: a sidebar homepage in the site's own colours, built from
// the parts of your page the site keeps for you (friends, rings, house,
// posts, guestbook). Sections with nothing in them stay hidden.

export const NOTEBOOK_HOMEPAGE = `<meta name="color:Page" content="#a9c6d8">
<meta name="color:Paper" content="#fcfaf7">
<meta name="color:Ink" content="#3d3431">
<meta name="color:Edges" content="#c99a74">
<meta name="color:Links" content="#2f5d7c">
<meta name="font:Text" content="Georgia, 'Times New Roman', serif">
<meta name="font:Labels" content="'Courier New', Courier, monospace">
<style>
/* The page: dusty blue, with paper cards on it */
body {
  background: var(--color-page);
  margin: 0;
}

.profile-template-root {
  background: var(--color-page);
  color: var(--color-ink);
  font-family: var(--font-text);
  line-height: 1.6;
  min-height: 100vh;
  padding: 2rem 1rem 3rem;
}

/* Two columns: a narrow sidebar and the main part */
.notebook {
  display: grid;
  grid-template-columns: 15rem 1fr;
  gap: 1.25rem;
  max-width: 60rem;
  margin: 0 auto;
}

/* Every card: paper, a thin edge and a small shadow */
.side,
.card {
  background: var(--color-paper);
  border: 1px solid var(--color-edges);
  box-shadow: 3px 3px 0 var(--color-edges);
  padding: 1.25rem;
}

.card {
  margin-bottom: 1.25rem;
}

.side h1 {
  font-size: 1.5rem;
  margin: 0.75rem 0;
}

/* Small typewriter labels over each section */
h2 {
  font-family: var(--font-labels);
  font-size: 0.85rem;
  font-weight: 700;
  margin: 1.5rem 0 0.75rem;
}

.card h2 {
  margin-top: 0;
}

a {
  color: var(--color-links);
}

a:focus-visible,
button:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--color-links);
  outline-offset: 2px;
}

/* Phones: one column, the sidebar on top */
@media (max-width: 600px) {
  .notebook {
    grid-template-columns: 1fr;
  }
}
</style>

<div class="notebook">
  <aside class="side">
    <ProfilePhoto size="md" shape="square" />
    <DisplayName as="h1" />
    <HouseBadge />

    <h2>My rings</h2>
    <MyRings />
  </aside>

  <main>
    <section class="card">
      <h2>About me</h2>
      <p>Write about yourself here. What you're into, what you're working on, what people should know before they sign your guestbook.</p>
    </section>

    <If data="featuredFriends.length">
      <section class="card">
        <h2>My friends</h2>
        <FriendDisplay heading="none" />
      </section>
    </If>

    <If data="posts.length">
      <section class="card">
        <h2>Lately</h2>
        <BlogPosts limit="3" heading="none" />
      </section>
    </If>

    <section class="card">
      <h2>Guestbook</h2>
      <Guestbook heading="none" />
    </section>
  </main>
</div>`;
