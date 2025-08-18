export const SOCIAL_MODERN_TEMPLATE = `<div>
  <GradientBox gradient="neon" direction="br" padding="xl">
    <FlexContainer direction="row" align="center" justify="between" gap="lg">
      <FlexContainer direction="row" align="center" gap="md">
        <ProfilePhoto size="lg" shape="circle" />
        <div>
          <DisplayName />
          <IfOwner>
            <UserAccount />
          </IfOwner>
        </div>
      </FlexContainer>
      <IfVisitor>
        <FlexContainer direction="column" gap="sm">
          <FollowButton />
          <MutualFriends />
        </FlexContainer>
      </IfVisitor>
    </FlexContainer>
  </GradientBox>

  <Show data="capabilities.bio">
    <CenteredBox maxWidth="lg" padding="lg">
      <NeonBorder color="cyan" intensity="medium" padding="md">
        <Bio />
      </NeonBorder>
    </CenteredBox>
  </Show>

  <SplitLayout ratio="2:1" gap="lg">
    <div>
      <Choose>
        <When data="posts">
          <FlexContainer direction="column" gap="md">
            <WaveText text="Recent Updates" speed="medium" />
            <BlogPosts limit="5" />
          </FlexContainer>
        </When>
        <Otherwise>
          <CenteredBox maxWidth="md" padding="lg">
            <StickyNote color="purple" rotation="3">
              <IfOwner>
                Start sharing your thoughts! Your first post awaits.
              </IfOwner>
              <IfVisitor>
                No posts yet, but stay tuned for amazing content!
              </IfVisitor>
            </StickyNote>
          </CenteredBox>
        </Otherwise>
      </Choose>

      <Show data="images">
        <div>
          <h3>Photo Memories</h3>
          <GridLayout columns="3" gap="sm" responsive="true">
            <PolaroidFrame caption="" rotation="2" shadow="true">
              <UserImage data="images" alt="User photo" size="full" fit="cover" />
            </PolaroidFrame>
            <RevealBox buttonText="More photos..." variant="fade" buttonStyle="link">
              <FlexContainer direction="column" gap="xs">
                <UserImage data="images" index="0" alt="Gallery image" size="md" rounded="lg" />
                <UserImage data="images" index="1" alt="Second gallery image" size="md" rounded="lg" />
                <UserImage data="images" index="2" alt="Third gallery image" size="md" rounded="lg" />
              </FlexContainer>
            </RevealBox>
          </GridLayout>
        </div>
      </Show>
    </div>

    <div>
      <RetroTerminal variant="green" showHeader padding="md">
        <div>$ whoami</div>
        <DisplayName />
        <div>$ status</div>
        <FriendBadge />
        <div>$ connections</div>
        <Show data="featuredFriends">
          <FriendDisplay />
        </Show>
      </RetroTerminal>

      <Show data="websites">
        <NeonBorder color="pink" intensity="soft" padding="sm">
          <h4>Links & Projects</h4>
          <WebsiteDisplay />
        </NeonBorder>
      </Show>

      <IfVisitor>
        <FloatingBadge color="blue" animation="pulse" position="top-right">
          New!
        </FloatingBadge>
        <GradientBox gradient="ocean" padding="md" rounded="true">
          <h4>Leave a Message</h4>
          <Guestbook />
        </GradientBox>
      </IfVisitor>

      <IfOwner>
        <StickyNote color="yellow" size="md" rotation="-2">
          <strong>Quick Actions:</strong><br/>
          • Update your bio<br/>
          • Add more photos<br/>
          • Customize your page
        </StickyNote>
      </IfOwner>
    </div>
  </SplitLayout>

  <CenteredBox maxWidth="full" padding="lg">
    <FlexContainer direction="row" justify="between" align="center" gap="md">
      <SiteBranding />
      <NavigationLinks />
      <NotificationBell />
    </FlexContainer>
  </CenteredBox>
</div>`;