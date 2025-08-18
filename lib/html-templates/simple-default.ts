export const SIMPLE_DEFAULT_TEMPLATE = `<div>
  <ProfileHero variant="plain" />
  
  <Show data="capabilities.bio">
    <CenteredBox maxWidth="lg" padding="md">
      <Bio />
    </CenteredBox>
  </Show>
  
  <CenteredBox maxWidth="lg" padding="md">
    <Choose>
      <When data="posts">
        <h2>Recent Posts</h2>
        <BlogPosts limit="5" />
      </When>
      <Otherwise>
        <IfOwner>
          <p>Welcome to your profile! Start by adding some posts or customizing your page.</p>
        </IfOwner>
        <IfVisitor>
          <p>This profile is just getting started. Check back soon for updates!</p>
        </IfVisitor>
      </Otherwise>
    </Choose>
    
    <IfVisitor>
      <CenteredBox maxWidth="lg" padding="lg">
        <FollowButton />
        <Show data="guestbook">
          <h3>Guestbook</h3>
          <Guestbook />
        </Show>
      </CenteredBox>
    </IfVisitor>
  </CenteredBox>
</div>`;