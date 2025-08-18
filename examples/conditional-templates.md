# Conditional Rendering in Templates

Your templating system now supports conditional rendering based on user data and preferences. Here are the available components:

## Basic Conditional Rendering

### Show Component
Display content based on simple conditions:

```html
<!-- Show content if user has posts -->
<Show data="posts">
  <h3>My Blog Posts</h3>
  <BlogPosts limit="5" />
</Show>

<!-- Show content if user has exactly 3 posts -->
<Show data="posts.length" equals="3">
  <p>You have exactly 3 posts!</p>
</Show>

<!-- Show content if bio exists -->
<Show exists="capabilities.bio">
  <Bio />
</Show>

<!-- Show content based on custom condition -->
<Show when="has:featuredFriends">
  <h3>Featured Friends</h3>
  <FriendDisplay />
</Show>
```

## Owner/Visitor Conditional Rendering

### IfOwner Component
Show content only to the profile owner:

```html
<IfOwner>
  <p>This is your profile - only you can see this message!</p>
  <FollowButton />
</IfOwner>
```

### IfVisitor Component
Show content only to visitors (not the owner):

```html
<IfVisitor>
  <p>Welcome to my profile! Feel free to sign my guestbook.</p>
  <Guestbook />
</IfVisitor>
```

## Multi-Condition Rendering

### Choose/When/Otherwise
Handle multiple conditions with fallbacks:

```html
<Choose>
  <When data="posts.length" equals="0">
    <p>No posts yet - check back soon!</p>
  </When>
  <When data="posts">
    <BlogPosts limit="3" />
  </When>
  <Otherwise>
    <p>Welcome to my profile!</p>
  </Otherwise>
</Choose>
```

## Data-Attribute Syntax

You can also use data attributes for simpler cases:

```html
<!-- Using data-component syntax -->
<div data-component="Show" data-when="has:posts">
  <div data-component="BlogPosts" data-limit="5"></div>
</div>

<div data-component="IfOwner">
  <p>Owner-only content</p>
</div>
```

## Advanced Examples

### Complex Profile Layout
```html
<div>
  <ProfileHero variant="tape" />
  
  <Choose>
    <When data="capabilities.bio">
      <Bio />
    </When>
    <Otherwise>
      <IfOwner>
        <p>Add a bio to tell visitors about yourself!</p>
      </IfOwner>
    </Otherwise>
  </Choose>
  
  <Show data="posts">
    <h2>Recent Posts</h2>
    <BlogPosts limit="3" />
  </Show>
  
  <IfVisitor>
    <Show data="guestbook">
      <h2>Guestbook</h2>
      <Guestbook />
    </Show>
  </IfVisitor>
</div>
```

### Conditional Layout Based on Content
```html
<Choose>
  <When condition="has:featuredFriends">
    <SplitLayout ratio="2:1">
      <div>
        <BlogPosts limit="5" />
      </div>
      <div>
        <h3>Featured Friends</h3>
        <FriendDisplay />
      </div>
    </SplitLayout>
  </When>
  <Otherwise>
    <CenteredBox maxWidth="lg">
      <BlogPosts limit="5" />
    </CenteredBox>
  </Otherwise>
</Choose>
```

## Condition Types

### Data Path Conditions
- `data="posts"` - Truthy check (arrays check length > 0)
- `data="posts.length"` - Access nested properties
- `data="owner.handle"` - Access object properties

### Equality Conditions
- `data="posts.length" equals="5"` - Exact match
- `data="owner.handle" equals="john"` - String comparison

### Existence Conditions
- `exists="capabilities.bio"` - Check if property exists
- `when="has:featuredFriends"` - Check if property exists and is not empty

### Future: Preference-Based Conditions
When preferences are added to the data structure:
```html
<Show data="preferences.showGuestbook" equals="true">
  <Guestbook />
</Show>

<Show when="preferences.theme" equals="dark">
  <NeonBorder color="blue">
    <ProfilePhoto />
  </NeonBorder>
</Show>
```