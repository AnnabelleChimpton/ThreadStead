// Night Window: a room late at night, with a lamp visitors can switch on and
// off and a count of kudos. The one starter with buttons that remember
// things (<Var persist>), so it's the one to read for how they work.

export const NIGHT_WINDOW = `<meta name="color:Night" content="#0d1226">
<meta name="color:Text" content="#cfd6f2">
<meta name="color:Lamp" content="#f5c96a">
<meta name="color:Card" content="#161d3d">
<meta name="font:Text" content="'Iowan Old Style', 'Palatino Linotype', Georgia, serif">
<style>
/* The room: dark blue, one column */
body {
  background: var(--color-night);
  margin: 0;
}

.profile-template-root {
  background: var(--color-night);
  color: var(--color-text);
  font-family: var(--font-text);
  line-height: 1.6;
  min-height: 100vh;
  padding: 3rem 1.25rem 4rem;
}

.room {
  max-width: 38rem;
  margin: 0 auto;
}

.room-header {
  text-align: center;
  margin-bottom: 2rem;
}

.room-header h1 {
  font-size: 2.4rem;
  font-weight: 400;
  color: var(--color-lamp);
  margin: 0;
}

/* Your buttons (<Button>): round, outlined in lamp yellow */
.room .template-button {
  background: transparent;
  border: 1px solid var(--color-lamp);
  border-radius: 999px;
  color: var(--color-lamp);
  padding: 0.5rem 1.25rem;
  margin-top: 0.75rem;
}

.room .template-button:hover {
  background: rgba(245, 201, 106, 0.15);
}

a:focus-visible,
button:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--color-lamp);
  outline-offset: 2px;
}

/* The two states of the room: lamp on, lamp off */
.scene,
.card {
  background: var(--color-card);
  border: 1px solid rgba(245, 201, 106, 0.35);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.scene-dark {
  border-color: rgba(160, 190, 255, 0.3);
}

h2 {
  font-size: 1.15rem;
  font-style: italic;
  font-weight: 400;
  color: var(--color-lamp);
  margin: 0 0 0.75rem;
}

.kudos {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

a {
  color: var(--color-lamp);
}

/* Phones: a smaller name */
@media (max-width: 600px) {
  .room-header h1 {
    font-size: 1.8rem;
  }
}
</style>

<div class="room">
  <Var name="lampOn" type="boolean" initial="true" persist="true" />
  <Var name="kudos" type="number" initial="0" persist="true" />

  <div class="room-header">
    <DisplayName as="h1" />
    <Button>
      <OnClick>
        <Toggle var="lampOn" />
      </OnClick>
      Switch the lamp
    </Button>
  </div>

  <If data="$vars.lampOn">
    <div class="scene">
      <h2>The lamp is on</h2>
      <p>Write what a visitor sees with the light on. Your bio, a hello, what's on the desk.</p>
    </div>
  </If>
  <If not="$vars.lampOn">
    <div class="scene scene-dark">
      <h2>Lamp off</h2>
      <p>Write what they see in the dark. A secret, a smaller hello, the view out of the window.</p>
    </div>
  </If>

  <div class="kudos">
    <Button>
      <OnClick>
        <Increment var="kudos" />
      </OnClick>
      Leave a kudo
    </Button>
    <span>You've left <ShowVar name="kudos" /> here.</span>
  </div>

  <If data="posts.length">
    <div class="card">
      <h2>From my notebook</h2>
      <BlogPosts limit="3" heading="none" />
    </div>
  </If>

  <div class="card">
    <h2>Guestbook</h2>
    <Guestbook heading="none" />
  </div>
</div>`;
