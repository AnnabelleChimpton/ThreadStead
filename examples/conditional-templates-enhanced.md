# Enhanced Conditional Rendering in Templates

Your templating system now supports powerful conditional rendering with comparison operators, logical operations, and string matching. Here's a complete guide to all the available features.

## Table of Contents
- [Basic Conditional Rendering](#basic-conditional-rendering)
- [Comparison Operators](#comparison-operators)
- [String Operators](#string-operators)
- [Logical Operators](#logical-operators)
- [Owner/Visitor Components](#ownervisitor-components)
- [Multi-Condition Rendering](#multi-condition-rendering)
- [Real-World Examples](#real-world-examples)

---

## Basic Conditional Rendering

### Show Component
Display content based on simple conditions:

```html
<!-- Show content if user has posts -->
<Show data="posts">
  <h3>My Blog Posts</h3>
  <BlogPosts limit="5" />
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

---

## Comparison Operators

### Numeric Comparisons

#### Greater Than (`greaterThan`)
```html
<!-- Show for users with many posts -->
<Show data="posts.length" greaterThan="10">
  <div class="badge">🏆 Prolific Poster</div>
</Show>
```

#### Less Than (`lessThan`)
```html
<!-- Encourage new users -->
<Show data="posts.length" lessThan="3">
  <p>Welcome! Start by creating your first post.</p>
</Show>
```

#### Greater Than or Equal (`greaterThanOrEqual`)
```html
<!-- Veteran user badge -->
<Show data="posts.length" greaterThanOrEqual="50">
  <div class="badge veteran">⭐ Veteran User</div>
</Show>
```

#### Less Than or Equal (`lessThanOrEqual`)
```html
<!-- Limited content view -->
<Show data="posts.length" lessThanOrEqual="5">
  <BlogPosts limit="5" />
</Show>
```

#### Not Equal (`notEquals`)
```html
<!-- Show to all users except specific handle -->
<Show data="owner.handle" notEquals="admin">
  <FollowButton />
</Show>
```

#### Equal (`equals`)
```html
<!-- Exact match -->
<Show data="posts.length" equals="0">
  <p>No posts yet - be the first to post!</p>
</Show>
```

---

## String Operators

### Contains (`contains`)
```html
<!-- Show developer-specific content -->
<Show data="capabilities.bio" contains="developer">
  <div class="tag">💻 Developer</div>
</Show>

<!-- Check for keywords -->
<Show data="owner.displayName" contains="Admin">
  <div class="admin-badge">Admin User</div>
</Show>
```

### Starts With (`startsWith`)
```html
<!-- Admin users -->
<Show data="owner.handle" startsWith="admin">
  <div class="badge">🛡️ Admin</div>
</Show>

<!-- Moderators -->
<Show data="owner.handle" startsWith="mod_">
  <div class="badge">🛡️ Moderator</div>
</Show>
```

### Ends With (`endsWith`)
```html
<!-- Test accounts -->
<Show data="owner.handle" endsWith="_test">
  <div class="notice">🧪 Test Account</div>
</Show>

<!-- Beta users -->
<Show data="owner.handle" endsWith="_beta">
  <div class="badge">🚀 Beta Tester</div>
</Show>
```

### Regex Match (`matches`)
```html
<!-- Email pattern -->
<Show data="owner.handle" matches="^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$">
  <div>Valid email format</div>
</Show>

<!-- Numeric suffix pattern -->
<Show data="owner.handle" matches="user\\d{3,}">
  <div>Numbered user account</div>
</Show>
```

---

## Logical Operators

### AND Operator (`and`)
All conditions must be true:

```html
<!-- Show when user has BOTH posts AND bio -->
<Show and="posts,capabilities.bio">
  <div class="complete-profile">
    ✓ Complete Profile
  </div>
</Show>

<!-- Multiple conditions -->
<Show and="posts,capabilities.bio,featuredFriends">
  <div class="rich-profile">
    🌟 Active Member
  </div>
</Show>
```

### OR Operator (`or`)
At least one condition must be true:

```html
<!-- Show if user has EITHER posts OR guestbook entries -->
<Show or="posts,guestbook">
  <div class="has-content">
    This profile has content!
  </div>
</Show>

<!-- Social proof -->
<Show or="featuredFriends,posts,guestbook">
  <SocialSection />
</Show>
```

### NOT Operator (`not`)
Condition must be false:

```html
<!-- Show when user has NO posts -->
<Show not="posts">
  <div class="empty-state">
    <p>No posts yet. Start sharing!</p>
  </div>
</Show>

<!-- Missing bio prompt -->
<Show not="capabilities.bio">
  <IfOwner>
    <p>Add a bio to tell visitors about yourself!</p>
  </IfOwner>
</Show>
```

---

## Owner/Visitor Components

### IfOwner Component
Show content only to the profile owner:

```html
<IfOwner>
  <p>This is your profile - only you can see this message!</p>
  <button>Edit Profile</button>
</IfOwner>
```

### IfVisitor Component
Show content only to visitors (not the owner):

```html
<IfVisitor>
  <p>Welcome to my profile! Feel free to sign my guestbook.</p>
  <FollowButton />
</IfVisitor>
```

---

## Multi-Condition Rendering

### Choose/When/Otherwise
Handle multiple conditions with fallbacks:

```html
<Choose>
  <When data="posts.length" greaterThan="20">
    <div class="prolific-poster">
      <h3>🏆 Top Contributor</h3>
      <BlogPosts limit="10" />
    </div>
  </When>

  <When data="posts.length" greaterThan="5">
    <div class="active-poster">
      <h3>✍️ Active Blogger</h3>
      <BlogPosts limit="5" />
    </div>
  </When>

  <When data="posts" greaterThan="0">
    <div class="has-posts">
      <BlogPosts limit="3" />
    </div>
  </When>

  <Otherwise>
    <div class="no-posts">
      <p>No posts yet - check back soon!</p>
    </div>
  </Otherwise>
</Choose>
```

### Complex Branching

```html
<Choose>
  <!-- Premium users -->
  <When data="owner.handle" startsWith="premium_">
    <PremiumProfile />
  </When>

  <!-- Admin users -->
  <When data="owner.handle" startsWith="admin">
    <AdminProfile />
  </When>

  <!-- Users with complete profiles -->
  <When and="posts,capabilities.bio,featuredFriends">
    <CompleteProfile />
  </When>

  <!-- Basic users -->
  <Otherwise>
    <BasicProfile />
  </Otherwise>
</Choose>
```

---

## Real-World Examples

### Gamified User Levels

```html
<Choose>
  <When data="posts.length" greaterThanOrEqual="100">
    <div class="level-master">
      <span class="badge">🎖️ Master Level</span>
      <p>You've created over 100 posts!</p>
    </div>
  </When>

  <When data="posts.length" greaterThanOrEqual="50">
    <div class="level-expert">
      <span class="badge">⭐ Expert Level</span>
      <p>You're an experienced poster!</p>
    </div>
  </When>

  <When data="posts.length" greaterThanOrEqual="10">
    <div class="level-intermediate">
      <span class="badge">✨ Intermediate Level</span>
      <p>Keep posting to reach expert!</p>
    </div>
  </When>

  <Otherwise>
    <div class="level-beginner">
      <span class="badge">🌱 Beginner</span>
      <p>Create 10 posts to level up!</p>
    </div>
  </Otherwise>
</Choose>
```

### Content Quality Indicators

```html
<!-- Show quality badge for profiles with rich content -->
<Show and="posts,capabilities.bio">
  <Show data="posts.length" greaterThan="5">
    <div class="quality-profile-badge">
      ✓ Quality Profile
    </div>
  </Show>
</Show>

<!-- Encourage profile completion -->
<Choose>
  <When and="posts,capabilities.bio,featuredFriends">
    <div class="complete">100% Complete Profile</div>
  </When>

  <When and="posts,capabilities.bio">
    <div class="partial">75% Complete - Add featured friends!</div>
  </When>

  <When or="posts,capabilities.bio">
    <div class="partial">50% Complete</div>
  </When>

  <Otherwise>
    <IfOwner>
      <div class="empty">Complete your profile to get started!</div>
    </IfOwner>
  </Otherwise>
</Choose>
```

### Role-Based Content

```html
<!-- Admin-only section -->
<Show data="owner.handle" startsWith="admin">
  <div class="admin-tools">
    <h3>Admin Tools</h3>
    <button>Manage Users</button>
    <button>View Analytics</button>
  </div>
</Show>

<!-- Moderator section -->
<Show data="owner.handle" matches="^(admin|mod)_">
  <div class="moderator-tools">
    <h3>Moderation</h3>
    <button>Review Reports</button>
  </div>
</Show>

<!-- Regular users -->
<Show data="owner.handle" matches="^(?!admin|mod)">
  <div class="user-content">
    <BlogPosts />
  </div>
</Show>
```

### Bio-Based Customization

```html
<!-- Show tech-themed layout for developers -->
<Show data="capabilities.bio" contains="developer">
  <RetroTerminal variant="green">
    <DisplayName />
    <Bio />
  </RetroTerminal>
</Show>

<!-- Show creative layout for designers -->
<Show data="capabilities.bio" contains="designer">
  <GradientBox gradient="rainbow">
    <DisplayName />
    <Bio />
  </GradientBox>
</Show>

<!-- Default layout for others -->
<Show not="capabilities.bio">
  <div class="standard-layout">
    <DisplayName />
  </div>
</Show>
```

### Social Proof Indicators

```html
<!-- Popular profile indicator -->
<Choose>
  <When data="posts.length" greaterThan="50">
    <div class="popular-badge">🔥 Popular Creator</div>
  </When>

  <When and="posts,featuredFriends">
    <Show data="posts.length" greaterThan="10">
      <div class="active-badge">✨ Active Member</div>
    </Show>
  </When>

  <When or="posts,guestbook">
    <div class="engaged-badge">📝 Engaged User</div>
  </When>
</Choose>
```

### Conditional Layouts

```html
<!-- Different layouts based on content -->
<Choose>
  <!-- Rich content: 3-column layout -->
  <When and="posts,capabilities.bio,featuredFriends">
    <Grid columns="3" gap="md">
      <GridItem><Bio /></GridItem>
      <GridItem><BlogPosts /></GridItem>
      <GridItem><FriendDisplay /></GridItem>
    </Grid>
  </When>

  <!-- Some content: 2-column layout -->
  <When or="posts,capabilities.bio">
    <SplitLayout ratio="2:1">
      <div>
        <Show data="capabilities.bio">
          <Bio />
        </Show>
        <Show data="posts">
          <BlogPosts />
        </Show>
      </div>
      <div>
        <IfVisitor>
          <FollowButton />
        </IfVisitor>
      </div>
    </SplitLayout>
  </When>

  <!-- Minimal content: centered layout -->
  <Otherwise>
    <CenteredBox maxWidth="md">
      <DisplayName />
      <IfOwner>
        <p>Start building your profile!</p>
      </IfOwner>
    </CenteredBox>
  </Otherwise>
</Choose>
```

---

## Condition Types Reference

### Data Path Conditions
- `data="posts"` - Truthy check (arrays check length > 0)
- `data="posts.length"` - Access nested properties
- `data="owner.handle"` - Access object properties

### Comparison Operations
- `equals="value"` - Exact string match
- `notEquals="value"` - Not equal to value
- `greaterThan="5"` - Numeric greater than
- `lessThan="10"` - Numeric less than
- `greaterThanOrEqual="5"` - Numeric >=
- `lessThanOrEqual="10"` - Numeric <=

### String Operations
- `contains="substring"` - String contains
- `startsWith="prefix"` - String starts with
- `endsWith="suffix"` - String ends with
- `matches="regex"` - Regex pattern match

### Logical Operations
- `and="path1,path2,path3"` - All must be truthy
- `or="path1,path2,path3"` - At least one truthy
- `not="path"` - Must be falsy

### Existence Checks
- `exists="path"` - Check if property exists
- `when="has:path"` - Check if exists and not empty
- `when="!path"` - Negation check

---

## Migration from Old Syntax

### Before (Limited)
```html
<Show data="posts">
  <BlogPosts />
</Show>

<Show data="posts.length" equals="0">
  <p>No posts</p>
</Show>
```

### After (Enhanced)
```html
<!-- More expressive comparisons -->
<Show data="posts.length" greaterThan="0">
  <BlogPosts />
</Show>

<Show data="posts.length" equals="0">
  <p>No posts</p>
</Show>

<!-- Combine conditions -->
<Show and="posts,capabilities.bio">
  <CompleteProfile />
</Show>

<!-- String matching -->
<Show data="owner.handle" startsWith="admin">
  <AdminBadge />
</Show>
```

All old syntax still works! The new operators are additive enhancements.
