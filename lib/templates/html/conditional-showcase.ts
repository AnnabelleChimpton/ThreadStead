export const CONDITIONAL_SHOWCASE_TEMPLATE = `<style>
/* Conditional Logic Showcase - Educational Template */
body {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-attachment: fixed;
  color: #2d3748;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  margin: 0;
  padding: 20px;
  font-size: 15px;
  line-height: 1.6;
}

.showcase-container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  background: white;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  margin-bottom: 30px;
}

.page-title {
  font-size: 3rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 10px 0;
}

.page-subtitle {
  font-size: 1.2rem;
  color: #718096;
  margin: 0;
}

.user-level-banner {
  margin-top: 20px;
  padding: 15px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 8px;
  color: white;
  font-size: 1.3rem;
  font-weight: bold;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 25px;
  margin-bottom: 30px;
}

.section-card {
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.15);
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 3px solid;
}

.comparison-section .section-title { border-color: #3182ce; color: #2c5282; }
.string-section .section-title { border-color: #38a169; color: #22543d; }
.logical-section .section-title { border-color: #805ad5; color: #553c9a; }
.level-section .section-title { border-color: #dd6b20; color: #9c4221; }

.example-item {
  margin: 15px 0;
  padding: 15px;
  background: #f7fafc;
  border-radius: 8px;
  border-left: 4px solid #cbd5e0;
}

.example-label {
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 5px;
  font-size: 1.1rem;
}

.data-display {
  background: #edf2f7;
  padding: 10px;
  border-radius: 6px;
  margin: 8px 0;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: #2d3748;
}

.data-label {
  font-weight: 600;
  color: #4a5568;
}

.data-value {
  color: #2b6cb0;
  font-weight: 700;
}

.code-snippet {
  background: #2d3748;
  color: #68d391;
  padding: 8px 12px;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  margin: 8px 0;
}

.condition-check {
  background: #e6fffa;
  border-left: 4px solid #38b2ac;
  padding: 10px;
  margin: 8px 0;
  border-radius: 4px;
}

.result-badge {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  margin: 5px 0;
}

.result-true {
  background: #c6f6d5;
  color: #22543d;
  border: 2px solid #38a169;
}

.result-false {
  background: #fed7d7;
  color: #742a2a;
  border: 2px solid #e53e3e;
}

.level-badge {
  display: inline-block;
  padding: 10px 20px;
  border-radius: 25px;
  font-size: 1.1rem;
  font-weight: 700;
  margin: 10px 0;
}

.explanation {
  margin-top: 10px;
  padding: 10px;
  background: #fff5f5;
  border-left: 4px solid #fc8181;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #742a2a;
}
</style>

<div class="showcase-container">
  <div class="page-header">
    <h1 class="page-title">Conditional Logic Showcase</h1>
    <p class="page-subtitle">Live examples with <DisplayName as="span" />'s actual profile data</p>

    <Choose>
      <When data="posts.length" greater-than-or-equal="50">
        <div class="user-level-banner">⭐ EXPERT Level - You have 50+ posts!</div>
      </When>
      <When data="posts.length" greater-than-or-equal="10">
        <div class="user-level-banner">✨ INTERMEDIATE Level - You have 10-49 posts!</div>
      </When>
      <When data="posts.length" greater-than="0">
        <div class="user-level-banner">🌱 BEGINNER Level - You have 1-9 posts!</div>
      </When>
      <Otherwise>
        <div class="user-level-banner">🆕 NEW - Create your first post to start leveling up!</div>
      </Otherwise>
    </Choose>
  </div>

  <div class="content-grid">
    <!-- Comparison Operators -->
    <div class="section-card comparison-section">
      <h2 class="section-title">🔢 Comparison Operators</h2>

      <div class="example-item">
        <div class="example-label">Greater Than (&gt;)</div>
        <div class="code-snippet">＜If data="posts.length" greater-than="5"＞</div>

        <div class="data-display">
          <span class="data-label">Your post count:</span> <BlogPosts limit="1000" mode="count" />
        </div>

        <div class="condition-check">
          <strong>Checking:</strong> Is post count &gt; 5?
        </div>

        <Choose>
          <When data="posts.length" greater-than="5">
            <span class="result-badge result-true">✓ TRUE - You have MORE than 5 posts</span>
            <div class="explanation">
              This content shows because your post count is greater than 5.
            </div>
          </When>
          <Otherwise>
            <span class="result-badge result-false">✗ FALSE - You have 5 or fewer posts</span>
            <div class="explanation">
              This content shows when you have 5 or fewer posts.
            </div>
          </Otherwise>
        </Choose>
      </div>

      <div class="example-item">
        <div class="example-label">Less Than (&lt;)</div>
        <div class="code-snippet">＜If data="posts.length" less-than="100"＞</div>

        <div class="data-display">
          <span class="data-label">Your post count:</span> <BlogPosts limit="1000" mode="count" />
        </div>

        <div class="condition-check">
          <strong>Checking:</strong> Is post count &lt; 100?
        </div>

        <Choose>
          <When data="posts.length" less-than="100">
            <span class="result-badge result-true">✓ TRUE - You have under 100 posts</span>
            <div class="explanation">
              This shows because you haven't reached 100 posts yet.
            </div>
          </When>
          <Otherwise>
            <span class="result-badge result-false">✗ FALSE - You have 100+ posts!</span>
            <div class="explanation">
              Wow! This shows if you have 100 or more posts. You're a prolific creator!
            </div>
          </Otherwise>
        </Choose>
      </div>

      <div class="example-item">
        <div class="example-label">Equals (=)</div>
        <div class="code-snippet">＜If data="posts.length" equals="0"＞</div>

        <div class="data-display">
          <span class="data-label">Your post count:</span> <BlogPosts limit="1000" mode="count" />
        </div>

        <div class="condition-check">
          <strong>Checking:</strong> Is post count exactly 0?
        </div>

        <Choose>
          <When data="posts.length" equals="0">
            <span class="result-badge result-true">✓ TRUE - No posts yet</span>
            <div class="explanation">
              You haven't created any posts. Start sharing your thoughts!
            </div>
          </When>
          <Otherwise>
            <span class="result-badge result-false">✗ FALSE - You have posts!</span>
            <div class="explanation">
              You've already started posting. Great work!
            </div>
          </Otherwise>
        </Choose>
      </div>

      <div class="example-item">
        <div class="example-label">Not Equals (!=)</div>
        <div class="code-snippet">＜If data="posts.length" not-equals="0"＞</div>

        <div class="data-display">
          <span class="data-label">Your post count:</span> <BlogPosts limit="1000" mode="count" />
        </div>

        <div class="condition-check">
          <strong>Checking:</strong> Is post count NOT equal to 0?
        </div>

        <Choose>
          <When data="posts.length" not-equals="0">
            <span class="result-badge result-true">✓ TRUE - You have at least one post</span>
            <div class="explanation">
              Perfect! This shows any content you want visible only when users have posts.
            </div>
          </When>
          <Otherwise>
            <span class="result-badge result-false">✗ FALSE - No posts yet</span>
            <div class="explanation">
              This shows the empty state message when you have no posts.
            </div>
          </Otherwise>
        </Choose>
      </div>
    </div>

    <!-- String Operators -->
    <div class="section-card string-section">
      <h2 class="section-title">📝 String Operators</h2>

      <div class="example-item">
        <div class="example-label">Contains</div>
        <div class="code-snippet">＜If data="capabilities.bio" contains="developer"＞</div>

        <div class="data-display">
          <span class="data-label">Your bio:</span> <Bio />
        </div>

        <div class="condition-check">
          <strong>Checking:</strong> Does bio contain "developer"?
        </div>

        <Choose>
          <When data="capabilities.bio" contains="developer">
            <span class="result-badge result-true">✓ TRUE - Your bio mentions "developer"</span>
            <div class="explanation">
              Your bio contains the word "developer" - you could show developer-specific content!
            </div>
          </When>
          <When data="capabilities.bio">
            <span class="result-badge result-false">✗ FALSE - Your bio doesn't mention "developer"</span>
            <div class="explanation">
              Your bio exists but doesn't contain the word "developer".
            </div>
          </When>
          <Otherwise>
            <span class="result-badge result-false">✗ No bio to check</span>
            <div class="explanation">
              Add a bio to see string matching in action!
            </div>
          </Otherwise>
        </Choose>
      </div>

      <div class="example-item">
        <div class="example-label">Starts With</div>
        <div class="code-snippet">＜If data="owner.handle" starts-with="admin"＞</div>

        <div class="data-display">
          <span class="data-label">Your username:</span> <DisplayName />
        </div>

        <div class="condition-check">
          <strong>Checking:</strong> Does username start with "admin"?
        </div>

        <If data="owner.handle" starts-with="admin">
          <span class="result-badge result-true">✓ TRUE - Admin account detected</span>
          <div class="explanation">
            Your username starts with "admin" - you could show admin tools here!
          </div>
        </If>
        <If data="owner.handle">
          <Choose>
            <When data="owner.handle" starts-with="admin"></When>
            <Otherwise>
              <span class="result-badge result-false">✗ FALSE - Username doesn't start with "admin"</span>
              <div class="explanation">
                Your username exists but doesn't start with "admin".
              </div>
            </Otherwise>
          </Choose>
        </If>
      </div>

      <div class="example-item">
        <div class="example-label">Ends With</div>
        <div class="code-snippet">＜If data="owner.handle" ends-with="_test"＞</div>

        <div class="data-display">
          <span class="data-label">Your username:</span> <DisplayName />
        </div>

        <div class="condition-check">
          <strong>Checking:</strong> Does username end with "_test"?
        </div>

        <If data="owner.handle" ends-with="_test">
          <span class="result-badge result-true">✓ TRUE - Test account</span>
          <div class="explanation">
            This is a test account - you could show a warning banner!
          </div>
        </If>
        <If data="owner.handle">
          <Choose>
            <When data="owner.handle" ends-with="_test"></When>
            <Otherwise>
              <span class="result-badge result-false">✗ FALSE - Username doesn't end with "_test"</span>
              <div class="explanation">
                Your username exists but doesn't end with "_test". This is a regular account.
              </div>
            </Otherwise>
          </Choose>
        </If>
      </div>
    </div>

    <!-- Logical Operators -->
    <div class="section-card logical-section">
      <h2 class="section-title">🔗 Logical Operators</h2>

      <div class="example-item">
        <div class="example-label">AND - All must be true</div>
        <div class="code-snippet">&lt;If and="posts,capabilities.bio"&gt;</div>

        <div class="data-display">
          <span class="data-label">Has posts?</span> <If data="posts"><span class="data-value">YES</span></If><If not="posts"><span class="data-value">NO</span></If><br/>
          <span class="data-label">Has bio?</span> <If data="capabilities.bio"><span class="data-value">YES</span></If><If not="capabilities.bio"><span class="data-value">NO</span></If>
        </div>

        <div class="condition-check">
          <strong>Checking:</strong> Does user have BOTH posts AND bio?
        </div>

        <If and="posts,capabilities.bio">
          <span class="result-badge result-true">✓ TRUE - You have both posts AND bio</span>
          <div class="explanation">
            Both conditions are true! This is a complete profile.
          </div>
        </If>
        <If not="posts">
          <span class="result-badge result-false">✗ FALSE - Missing posts</span>
        </If>
        <If not="capabilities.bio">
          <span class="result-badge result-false">✗ FALSE - Missing bio</span>
        </If>
      </div>

      <div class="example-item">
        <div class="example-label">OR - At least one true</div>
        <div class="code-snippet">&lt;If or="posts,guestbook"&gt;</div>

        <div class="data-display">
          <span class="data-label">Has posts?</span> <If data="posts"><span class="data-value">YES</span></If><If not="posts"><span class="data-value">NO</span></If><br/>
          <span class="data-label">Has guestbook?</span> <If data="guestbook"><span class="data-value">YES</span></If><If not="guestbook"><span class="data-value">NO</span></If>
        </div>

        <div class="condition-check">
          <strong>Checking:</strong> Does user have posts OR guestbook (or both)?
        </div>

        <If or="posts,guestbook">
          <span class="result-badge result-true">✓ TRUE - Has posts OR guestbook (or both)</span>
          <div class="explanation">
            At least one condition is true! Your profile has some content.
          </div>
        </If>
      </div>

      <div class="example-item">
        <div class="example-label">NOT - Must be false</div>
        <div class="code-snippet">&lt;If not="featuredFriends"&gt;</div>

        <div class="data-display">
          <span class="data-label">Has featured friends?</span> <If data="featuredFriends"><span class="data-value">YES</span></If><If not="featuredFriends"><span class="data-value">NO</span></If>
        </div>

        <div class="condition-check">
          <strong>Checking:</strong> Does user NOT have featured friends?
        </div>

        <If not="featuredFriends">
          <span class="result-badge result-true">✓ TRUE - No featured friends set</span>
          <div class="explanation">
            This shows when the condition is FALSE (no featured friends).
          </div>
        </If>
        <If data="featuredFriends">
          <span class="result-badge result-false">✗ FALSE - Has featured friends</span>
          <div class="explanation">
            You have featured friends set up!
          </div>
        </If>
      </div>
    </div>

    <!-- Level System -->
    <div class="section-card level-section">
      <h2 class="section-title">🏆 Level System with Choose/When/Otherwise</h2>

      <div class="example-item">
        <div class="example-label">Multi-Tier Branching</div>
        <div class="code-snippet">&lt;Choose&gt;
  &lt;When data="posts.length" greater-than-or-equal="50"&gt;Expert&lt;/When&gt;
  &lt;When data="posts.length" greater-than-or-equal="10"&gt;Intermediate&lt;/When&gt;
  &lt;Otherwise&gt;Beginner&lt;/Otherwise&gt;
&lt;/Choose&gt;</div>

        <div class="data-display">
          <span class="data-label">Your post count:</span> <BlogPosts limit="1000" mode="count" />
        </div>

        <div class="condition-check">
          <strong>Checking:</strong> Which tier do you fall into?<br/>
          • 50+ posts = Expert<br/>
          • 10-49 posts = Intermediate<br/>
          • 0-9 posts = Beginner
        </div>

        <Choose>
          <When data="posts.length" greater-than-or-equal="50">
            <span class="level-badge" style="background: linear-gradient(135deg, #ff9a9e, #fecfef); color: #7c2d12;">⭐ EXPERT LEVEL</span>
            <div class="explanation">
              <strong>First When matched!</strong> You have 50+ posts, so this is the result shown.
            </div>
          </When>
          <When data="posts.length" greater-than-or-equal="10">
            <span class="level-badge" style="background: linear-gradient(135deg, #a8edea, #fed6e3); color: #7c2d12;">✨ INTERMEDIATE</span>
            <div class="explanation">
              <strong>Second When matched!</strong> You have 10-49 posts.
            </div>
          </When>
          <When data="posts.length" greater-than="0">
            <span class="level-badge" style="background: linear-gradient(135deg, #84fab0, #8fd3f4); color: #065f46;">🌱 BEGINNER</span>
            <div class="explanation">
              <strong>Third When matched!</strong> You have 1-9 posts.
            </div>
          </When>
          <Otherwise>
            <span class="level-badge" style="background: linear-gradient(135deg, #ffecd2, #fcb69f); color: #7c2d12;">🆕 NEW USER</span>
            <div class="explanation">
              <strong>Otherwise matched!</strong> None of the When conditions were true (no posts).
            </div>
          </Otherwise>
        </Choose>

        <div class="explanation" style="margin-top: 15px; background: #e6fffa; border-left-color: #38b2ac;">
          <strong>💡 How Choose works:</strong> It checks each When in order and shows the FIRST one that's true. If none match, it shows Otherwise.
        </div>
      </div>
    </div>
  </div>

  <!-- Owner/Visitor Section -->
  <div class="section-card" style="background: white; padding: 25px; border-radius: 12px; margin-top: 20px;">
    <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0 0 15px 0; border-bottom: 3px solid #e53e3e; padding-bottom: 10px; color: #9b2c2c;">👥 Owner vs Visitor</h2>

    <div class="example-item">
      <div class="example-label">IfOwner Component</div>
      <div class="code-snippet">&lt;IfOwner&gt;Owner-only content&lt;/IfOwner&gt;</div>

      <div class="condition-check">
        <strong>Checking:</strong> Is the current viewer the profile owner?
      </div>

      <IfOwner>
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border: 2px solid #f59e0b; margin: 10px 0;">
          <strong>👤 Owner View:</strong> You see this because you OWN this profile.
        </div>
        <span class="result-badge result-true">✓ TRUE - You are the owner</span>
        <div class="explanation">
          Use this to show edit buttons, private notes, or analytics that only you should see.
        </div>
      </IfOwner>
      <IfVisitor>
        <span class="result-badge result-false">✗ Hidden from you (you're a visitor)</span>
        <div class="explanation">
          Visitors don't see this content.
        </div>
      </IfVisitor>
    </div>

    <div class="example-item">
      <div class="example-label">IfVisitor Component</div>
      <div class="code-snippet">&lt;IfVisitor&gt;Visitor-only content&lt;/IfVisitor&gt;</div>

      <div class="condition-check">
        <strong>Checking:</strong> Is the current viewer NOT the profile owner?
      </div>

      <IfVisitor>
        <div style="background: #dbeafe; padding: 15px; border-radius: 8px; border: 2px solid #3b82f6; margin: 10px 0;">
          <strong>👋 Visitor View:</strong> You see this because you're VISITING this profile.
        </div>
        <span class="result-badge result-true">✓ TRUE - You are a visitor</span>
        <div class="explanation">
          Use this to show welcome messages, follow buttons, or guest-specific content.
        </div>
      </IfVisitor>
      <IfOwner>
        <span class="result-badge result-false">✗ Hidden from you (you're the owner)</span>
        <div class="explanation">
          You don't see visitor content when viewing your own profile.
        </div>
      </IfOwner>
    </div>

    <div class="explanation" style="background: #fff5f5; border-left-color: #fc8181; margin-top: 15px;">
      <strong>💡 Pro Tip:</strong> IfOwner and IfVisitor are mutually exclusive - only ONE will ever show at a time!
    </div>
  </div>

  <!-- Relationship Status -->
  <div class="section-card" style="background: white; padding: 25px; border-radius: 12px; margin-top: 20px;">
    <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0 0 15px 0; border-bottom: 3px solid #10b981; padding-bottom: 10px; color: #047857;">💚 Relationship-Based Content</h2>

    <div class="example-item">
      <div class="example-label">Friend-Only Content</div>
      <div class="code-snippet">&lt;If data="viewer.isFriend"&gt;Secret friend content&lt;/If&gt;</div>

      <div class="condition-check">
        <strong>Checking:</strong> Is the viewer a friend (mutual follows)?
      </div>

      <IfVisitor>
        <If data="viewer.isFriend">
          <div style="background: #d1fae5; padding: 15px; border-radius: 8px; border: 2px solid #10b981; margin: 10px 0;">
            <strong>💚 Friend Zone!</strong> You see this because we're friends!
          </div>
          <span class="result-badge result-true">✓ TRUE - We're friends!</span>
          <div class="explanation">
            Use this to show exclusive content only to your friends: private photos, contact info, etc.
          </div>
        </If>
        <If not="viewer.isFriend">
          <span class="result-badge result-false">✗ FALSE - Not friends yet</span>
          <div class="explanation">
            This content is hidden because you're not friends with the profile owner.
          </div>
        </If>
      </IfVisitor>
      <IfOwner>
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border: 2px solid #f59e0b; margin: 10px 0;">
          <strong>Owner View:</strong> You can't be friends with yourself! This shows friend-only content to visitors who are your friends.
        </div>
      </IfOwner>
    </div>

    <div class="example-item">
      <div class="example-label">Follower Content</div>
      <div class="code-snippet">&lt;If data="viewer.isFollowing"&gt;Thanks for following!&lt;/If&gt;</div>

      <div class="condition-check">
        <strong>Checking:</strong> Is the viewer following this profile?
      </div>

      <IfVisitor>
        <If data="viewer.isFollowing">
          <div style="background: #dbeafe; padding: 15px; border-radius: 8px; border: 2px solid #3b82f6; margin: 10px 0;">
            <strong>💙 Follower!</strong> Thanks for following!
          </div>
          <span class="result-badge result-true">✓ TRUE - You're following</span>
          <div class="explanation">
            Show special content to followers: updates, early access, etc.
          </div>
        </If>
        <If not="viewer.isFollowing">
          <span class="result-badge result-false">✗ FALSE - Not following</span>
          <div class="explanation">
            Could show a "Follow me!" button here for non-followers.
          </div>
        </If>
      </IfVisitor>
      <IfOwner>
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border: 2px solid #f59e0b; margin: 10px 0;">
          <strong>Owner View:</strong> This shows content to visitors who follow you.
        </div>
      </IfOwner>
    </div>

    <div class="example-item">
      <div class="example-label">Non-Friend CTA</div>
      <div class="code-snippet">&lt;IfVisitor&gt;&lt;If not="viewer.isFriend"&gt;Add friend button&lt;/If&gt;&lt;/IfVisitor&gt;</div>

      <div class="condition-check">
        <strong>Checking:</strong> Is viewer NOT a friend (to show "Add Friend" CTA)?
      </div>

      <IfVisitor>
        <If not="viewer.isFriend">
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border: 2px solid #f59e0b; margin: 10px 0;">
            <strong>👋 Hey there!</strong> We're not friends yet. Want to add me?
          </div>
          <span class="result-badge result-true">✓ TRUE - Not friends (CTA visible)</span>
          <div class="explanation">
            Perfect for showing "Add Friend" or "Follow" buttons only to non-friends.
          </div>
        </If>
        <If data="viewer.isFriend">
          <span class="result-badge result-false">✗ Already friends (CTA hidden)</span>
          <div class="explanation">
            No need to show "Add Friend" button since you're already friends!
          </div>
        </If>
      </IfVisitor>
      <IfOwner>
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border: 2px solid #f59e0b; margin: 10px 0;">
          <strong>Owner View:</strong> Visitors who aren't your friends will see a CTA to add you.
        </div>
      </IfOwner>
    </div>

    <div class="explanation" style="background: #ecfdf5; border-left-color: #10b981; margin-top: 15px;">
      <strong>💡 Use Cases:</strong> Friend galleries, exclusive posts, follower-only updates, personalized CTAs, and more!
    </div>
  </div>

  <!-- Syntax Reference -->
  <div style="background: white; border-radius: 12px; padding: 25px; margin-top: 30px;">
    <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0 0 20px 0; border-bottom: 3px solid #667eea; padding-bottom: 10px;">📚 Quick Syntax Reference</h2>

    <h3 style="color: #4a5568; margin: 15px 0 10px 0;">Comparison Operators</h3>
    <div class="code-snippet">＜If data="posts.length" greater-than="10"＞...＜/If＞
＜If data="posts.length" less-than="100"＞...＜/If＞
＜If data="posts.length" greater-than-or-equal="5"＞...＜/If＞
＜If data="posts.length" less-than-or-equal="50"＞...＜/If＞
＜If data="posts.length" equals="5"＞...＜/If＞
＜If data="posts.length" not-equals="0"＞...＜/If＞</div>

    <h3 style="color: #4a5568; margin: 15px 0 10px 0;">String Operators</h3>
    <div class="code-snippet">＜If data="capabilities.bio" contains="developer"＞...＜/If＞
＜If data="owner.handle" starts-with="admin"＞...＜/If＞
＜If data="owner.handle" ends-with="_test"＞...＜/If＞
＜If data="owner.handle" matches="user\d+"＞...＜/If＞</div>

    <h3 style="color: #4a5568; margin: 15px 0 10px 0;">Logical Operators</h3>
    <div class="code-snippet">＜If and="posts,capabilities.bio"＞All must be true＜/If＞
＜If or="posts,guestbook"＞At least one true＜/If＞
＜If not="posts"＞Must be false＜/If＞</div>

    <h3 style="color: #4a5568; margin: 15px 0 10px 0;">Multi-Condition Branching</h3>
    <div class="code-snippet">＜Choose＞
  ＜When data="posts.length" greater-than="50"＞Expert content＜/When＞
  ＜When data="posts.length" greater-than="10"＞Intermediate content＜/When＞
  ＜Otherwise＞Beginner content＜/Otherwise＞
＜/Choose＞</div>

    <h3 style="color: #4a5568; margin: 15px 0 10px 0;">Owner/Visitor</h3>
    <div class="code-snippet">＜IfOwner＞Only you see this＜/IfOwner＞
＜IfVisitor＞Only visitors see this＜/IfVisitor＞</div>

    <h3 style="color: #4a5568; margin: 15px 0 10px 0;">Relationship Status</h3>
    <div class="code-snippet">＜If data="viewer.isFriend"＞Friend-only content＜/If＞
＜If data="viewer.isFollowing"＞Follower content＜/If＞
＜If data="viewer.isFollower"＞They follow you＜/If＞
＜If not="viewer.isFriend"＞Add friend CTA＜/If＞</div>
  </div>

  <div style="background: white; border-radius: 12px; padding: 20px; text-align: center; margin-top: 30px; color: #718096;">
    <p><strong>Conditional Logic Showcase</strong> - All examples use YOUR live profile data</p>
    <p style="font-size: 0.9rem;">Try editing your profile (add posts, change bio, etc.) and reload to see conditions change!</p>
  </div>
</div>`;
