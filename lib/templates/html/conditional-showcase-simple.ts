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
}

.example-label {
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 5px;
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

.result-badge {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  margin: 5px;
}

.result-true {
  background: #c6f6d5;
  color: #22543d;
}

.result-false {
  background: #fed7d7;
  color: #742a2a;
}

.level-badge {
  display: inline-block;
  padding: 10px 20px;
  border-radius: 25px;
  font-size: 1.1rem;
  font-weight: 700;
  margin: 10px 0;
}
</style>

<div class="showcase-container">
  <div class="page-header">
    <h1 class="page-title">Conditional Logic Showcase</h1>
    <p class="page-subtitle">See conditional operators with <DisplayName as="span" />'s profile</p>

    <Choose>
      <When data="posts.length" greaterThanOrEqual="50">
        <div class="user-level-banner">⭐ EXPERT Level (50+ posts)</div>
      </When>
      <When data="posts.length" greaterThanOrEqual="10">
        <div class="user-level-banner">✨ INTERMEDIATE Level (10+ posts)</div>
      </When>
      <Otherwise>
        <div class="user-level-banner">🌱 BEGINNER Level</div>
      </Otherwise>
    </Choose>
  </div>

  <div class="content-grid">
    <!-- Comparison Operators -->
    <div class="section-card comparison-section">
      <h2 class="section-title">🔢 Comparison Operators</h2>

      <div class="example-item">
        <div class="example-label">Greater Than</div>
        <div class="code-snippet">&lt;Show data="posts.length" greaterThan="5"&gt;</div>
        <Show data="posts.length" greaterThan="5">
          <span class="result-badge result-true">✓ More than 5 posts</span>
        </Show>
        <Show data="posts.length" lessThanOrEqual="5">
          <span class="result-badge result-false">✗ 5 or fewer posts</span>
        </Show>
      </div>

      <div class="example-item">
        <div class="example-label">Less Than</div>
        <div class="code-snippet">&lt;Show data="posts.length" lessThan="100"&gt;</div>
        <Show data="posts.length" lessThan="100">
          <span class="result-badge result-true">✓ Under 100 posts</span>
        </Show>
        <Show data="posts.length" greaterThanOrEqual="100">
          <span class="result-badge result-false">✗ 100+ posts</span>
        </Show>
      </div>

      <div class="example-item">
        <div class="example-label">Not Equals</div>
        <div class="code-snippet">&lt;Show data="posts.length" notEquals="0"&gt;</div>
        <Show data="posts.length" notEquals="0">
          <span class="result-badge result-true">✓ Has posts</span>
        </Show>
        <Show data="posts.length" equals="0">
          <span class="result-badge result-false">✗ No posts</span>
        </Show>
      </div>
    </div>

    <!-- String Operators -->
    <div class="section-card string-section">
      <h2 class="section-title">📝 String Operators</h2>

      <div class="example-item">
        <div class="example-label">Contains</div>
        <div class="code-snippet">&lt;Show data="capabilities.bio" contains="developer"&gt;</div>
        <Show data="capabilities.bio" contains="developer">
          <span class="result-badge result-true">✓ Bio has "developer"</span>
        </Show>
        <Show not="capabilities.bio">
          <span class="result-badge result-false">✗ No bio</span>
        </Show>
      </div>

      <div class="example-item">
        <div class="example-label">Starts With</div>
        <div class="code-snippet">&lt;Show data="owner.handle" startsWith="admin"&gt;</div>
        <Show data="owner.handle" startsWith="admin">
          <span class="result-badge result-true">✓ Admin account</span>
        </Show>
      </div>
    </div>

    <!-- Logical Operators -->
    <div class="section-card logical-section">
      <h2 class="section-title">🔗 Logical Operators</h2>

      <div class="example-item">
        <div class="example-label">AND - All must be true</div>
        <div class="code-snippet">&lt;Show and="posts,capabilities.bio"&gt;</div>
        <Show and="posts,capabilities.bio">
          <span class="result-badge result-true">✓ Has posts AND bio</span>
        </Show>
      </div>

      <div class="example-item">
        <div class="example-label">OR - At least one true</div>
        <div class="code-snippet">&lt;Show or="posts,guestbook"&gt;</div>
        <Show or="posts,guestbook">
          <span class="result-badge result-true">✓ Has posts OR guestbook</span>
        </Show>
      </div>

      <div class="example-item">
        <div class="example-label">NOT - Must be false</div>
        <div class="code-snippet">&lt;Show not="featuredFriends"&gt;</div>
        <Show not="featuredFriends">
          <span class="result-badge result-true">✓ No featured friends</span>
        </Show>
      </div>
    </div>

    <!-- Level System -->
    <div class="section-card level-section">
      <h2 class="section-title">🏆 Level System</h2>

      <div class="example-item">
        <div class="example-label">Choose/When/Otherwise</div>
        <Choose>
          <When data="posts.length" greaterThanOrEqual="50">
            <span class="level-badge" style="background: linear-gradient(135deg, #ffecd2, #fcb69f);">⭐ EXPERT</span>
          </When>
          <When data="posts.length" greaterThanOrEqual="10">
            <span class="level-badge" style="background: linear-gradient(135deg, #a8edea, #fed6e3);">✨ INTERMEDIATE</span>
          </When>
          <Otherwise>
            <span class="level-badge" style="background: linear-gradient(135deg, #84fab0, #8fd3f4);">🌱 BEGINNER</span>
          </Otherwise>
        </Choose>
      </div>
    </div>
  </div>

  <!-- Owner/Visitor Section -->
  <div class="section-card" style="background: white; padding: 25px; border-radius: 12px; margin-top: 20px;">
    <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0 0 15px 0; border-bottom: 3px solid #e53e3e; padding-bottom: 10px; color: #9b2c2c;">👥 Owner vs Visitor</h2>

    <div class="example-item">
      <div class="example-label">IfOwner Component</div>
      <IfOwner>
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border: 2px solid #f59e0b;">
          <strong>👤 Owner View:</strong> You see this because you own this profile
        </div>
      </IfOwner>
      <IfVisitor>
        <span class="result-badge result-false">Hidden (you're a visitor)</span>
      </IfVisitor>
    </div>

    <div class="example-item">
      <div class="example-label">IfVisitor Component</div>
      <IfVisitor>
        <div style="background: #dbeafe; padding: 15px; border-radius: 8px; border: 2px solid #3b82f6;">
          <strong>👋 Visitor View:</strong> Welcome! You see this because you're visiting
        </div>
      </IfVisitor>
      <IfOwner>
        <span class="result-badge result-false">Hidden (you're the owner)</span>
      </IfOwner>
    </div>
  </div>

  <!-- Syntax Reference -->
  <div style="background: white; border-radius: 12px; padding: 25px; margin-top: 30px;">
    <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0 0 20px 0; border-bottom: 3px solid #667eea; padding-bottom: 10px;">📚 Syntax Reference</h2>

    <h3 style="color: #4a5568; margin: 15px 0 10px 0;">Comparison Operators</h3>
    <div class="code-snippet">&lt;Show data="posts.length" greaterThan="10"&gt;...&lt;/Show&gt;
&lt;Show data="posts.length" lessThan="100"&gt;...&lt;/Show&gt;
&lt;Show data="posts.length" equals="5"&gt;...&lt;/Show&gt;
&lt;Show data="posts.length" notEquals="0"&gt;...&lt;/Show&gt;</div>

    <h3 style="color: #4a5568; margin: 15px 0 10px 0;">String Operators</h3>
    <div class="code-snippet">&lt;Show data="capabilities.bio" contains="developer"&gt;...&lt;/Show&gt;
&lt;Show data="owner.handle" startsWith="admin"&gt;...&lt;/Show&gt;
&lt;Show data="owner.handle" endsWith="_test"&gt;...&lt;/Show&gt;</div>

    <h3 style="color: #4a5568; margin: 15px 0 10px 0;">Logical Operators</h3>
    <div class="code-snippet">&lt;Show and="posts,capabilities.bio"&gt;...&lt;/Show&gt;
&lt;Show or="posts,guestbook"&gt;...&lt;/Show&gt;
&lt;Show not="posts"&gt;...&lt;/Show&gt;</div>

    <h3 style="color: #4a5568; margin: 15px 0 10px 0;">Branching</h3>
    <div class="code-snippet">&lt;Choose&gt;
  &lt;When data="posts.length" greaterThan="50"&gt;Expert&lt;/When&gt;
  &lt;When data="posts.length" greaterThan="10"&gt;Intermediate&lt;/When&gt;
  &lt;Otherwise&gt;Beginner&lt;/Otherwise&gt;
&lt;/Choose&gt;</div>
  </div>

  <div style="background: white; border-radius: 12px; padding: 20px; text-align: center; margin-top: 30px; color: #718096;">
    <p><strong>Conditional Logic Showcase</strong> - Built with Threadstead</p>
  </div>
</div>`;
