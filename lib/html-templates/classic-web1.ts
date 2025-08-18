export const CLASSIC_WEB1_TEMPLATE = `<CenteredBox maxWidth="lg" padding="md">
  <RetroTerminal variant="blue" showHeader="false" padding="lg">
    <h1>Welcome to <DisplayName as="span" />'s Homepage</h1>
    <p>Last updated: Today</p>
  </RetroTerminal>

  <div>
    <a href="#about">About</a> | 
    <a href="#content">Content</a> | 
    <a href="#links">Links</a> | 
    <a href="#contact">Contact</a>
  </div>

  <h2>About This Site</h2>
  <StickyNote color="yellow" size="lg" rotation="1">
    <Show data="capabilities.bio">
      <Bio />
    </Show>
    <Show data="capabilities.bio" equals="">
      <p>Welcome to my personal homepage! This site was created to share my thoughts and connect with others on the World Wide Web.</p>
    </Show>
  </StickyNote>

  <h2>Latest Updates</h2>
  <Choose>
    <When data="posts">
      <RetroTerminal variant="white" showHeader="true" padding="md">
        <BlogPosts limit="3" />
      </RetroTerminal>
    </When>
    <Otherwise>
      <RetroTerminal variant="amber" showHeader="false" padding="md">
        <p>[ No updates yet - Coming soon! ]</p>
      </RetroTerminal>
    </Otherwise>
  </Choose>

  <Show data="images">
    <h2>Photo Gallery</h2>
    <PolaroidFrame caption="From my collection" rotation="2" shadow="true">
      <UserImage data="images" alt="Gallery image" size="lg" border="true" />
    </PolaroidFrame>
  </Show>

  <h2>Cool Links</h2>
  <StickyNote color="blue" size="lg" rotation="-1">
    <Show data="websites">
      <WebsiteDisplay />
    </Show>
    <Show data="websites" equals="">
      <p>
        <a href="https://www.yahoo.com">Yahoo!</a> - My favorite search engine<br/>
        <a href="https://www.geocities.com">GeoCities</a> - Free homepages for everyone<br/>
        <a href="https://www.altavista.com">AltaVista</a> - Another great search tool
      </p>
    </Show>
  </StickyNote>

  <h2>Contact & Guestbook</h2>
  <StickyNote color="pink" size="lg" rotation="1">
    <p>Feel free to sign my guestbook! I read every entry.</p>
    <Guestbook />
  </StickyNote>

  <RetroTerminal variant="green" showHeader="false" padding="sm">
    <div>Visitor #1337 | You are visitor number [COUNTER]</div>
    <div>Best viewed in Netscape Navigator 4.0+ or Internet Explorer 4.0+</div>
    <div>Copyright © 1999 <DisplayName />. All rights reserved.</div>
  </RetroTerminal>

  <StickyNote color="orange" size="md" rotation="3">
    <p>🔗 PERSONAL HOMEPAGE WEBRING 🔗</p>
    <p>
      <a href="#">« Previous</a> | 
      <a href="#">Random</a> | 
      <a href="#">Next »</a>
    </p>
  </StickyNote>
</CenteredBox>`;