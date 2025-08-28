# ThreadStead Feature Analysis Report
*Date: 2025-08-28*

## Executive Summary

This document analyzes two major feature proposals for ThreadStead:
1. **JavaScript/Component Extensions** - Enabling users to add interactive JavaScript to their profiles
2. **Multi-Page Profiles** - Allowing users to create multiple pages beyond their main profile

Both features have been evaluated for technical feasibility, security implications, and implementation complexity.

---

## Feature 1: JavaScript/Component Extensions

### Current State

**Existing Security Infrastructure:**
- HTML sanitization via `rehype-sanitize` (`template-parser.ts:8-37`)
- CSS sanitization strips `<script>` tags and `javascript:` URLs (`site-css.ts:36-39`)
- Templates rendered server-side as React components
- Preview isolated in sandboxed iframes (`template-editor.tsx:451`)
- Component registry system with 50+ pre-built components (`template-registry.ts`)

### Implementation Options

#### Option A: Enhanced CSS + Predefined Scripts (LOW LIFT)
- **Description**: Allow specific JavaScript libraries (D3.js, anime.js) as iframe includes
- **Lift**: 1-2 weeks
- **Security**: High (no user code execution)
- **User Value**: Limited flexibility

#### Option B: Component Extension System (MEDIUM LIFT) ⭐ 
- **Description**: Users write small JS functions registered as custom components
- **Lift**: 3-4 weeks
- **Security**: Medium (requires validation layer)
- **User Value**: Good balance of power and safety

**Example Usage:**
```javascript
// User defines in JavaScript tab
function slideshow({ images, autoPlay, duration }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  useInterval(() => {
    if (autoPlay) setCurrentIndex((prev) => (prev + 1) % images.length);
  }, duration);
  return { currentIndex, nextImage, prevImage };
}
```

```html
<!-- User uses in template -->
<Slideshow images="photos" autoPlay="true" duration="3000" />
```

#### Option C: Full Sandboxed JavaScript (HIGH LIFT)
- **Description**: Complete scripting with Web Workers or strict CSP
- **Lift**: 6-8 weeks
- **Security**: Complex (requires robust sandboxing)
- **User Value**: Maximum flexibility

#### Option D: Component Marketplace (RECOMMENDED) ✅
- **Description**: Curated marketplace where creators submit components for review
- **Lift**: 2-3 weeks initial, ongoing curation
- **Security**: Highest (human review + automated testing)
- **User Value**: Professional components without coding

**Benefits:**
- Manual security review catches subtle attacks
- Creates community and potential revenue stream
- Higher quality than user-generated code
- Natural quality curation through ratings

### Security Considerations

#### Attack Vectors Identified
1. **Data Exfiltration**
   - Cross-user data access attempts
   - Keylogging/input capture
   - Steganography in generated content

2. **State Management**
   - React context pollution
   - Hook abuse causing memory leaks
   - Persistence attacks via storage APIs

3. **Resource Exhaustion**
   - Computational complexity bombs (exponential algorithms)
   - Memory bombs (massive arrays/objects)
   - Render loop attacks

4. **Social Engineering**
   - UI impersonation (fake login forms)
   - Clickjacking with invisible overlays
   - Phishing components

5. **Advanced Evasion**
   - Obfuscated/encoded payloads
   - Time-delayed attacks
   - AST parser exploitation

#### Security Requirements
- AST-based code validation
- Execution time limits (50ms per function)
- Memory usage caps
- No DOM/window/global access
- Whitelist-only APIs (React hooks + utilities)
- Regular security audits
- Kill switch for problematic components

### Implementation Architecture

```
lib/
├── js-validator.ts          # AST parsing & security validation
├── js-executor.ts           # Sandboxed execution engine
├── js-components.tsx        # Base component for JS-enhanced elements
├── marketplace/
│   ├── submission.ts        # Component submission system
│   ├── review.ts            # Review queue management
│   └── registry.ts          # Marketplace component registry
```

### Recommendation: Component Marketplace

Start with the **Component Marketplace** approach:
1. Lower security risk than user JavaScript
2. Provides more value (professional components)
3. Creates community engagement
4. Potential revenue stream
5. Easier to implement than complex sandboxing

---

## Feature 2: Multi-Page Profiles

### Current State

**Existing Architecture:**
- Single page profiles at `/resident/[username]`
- Tab-based navigation within profile (Blog, Media, Guestbook)
- Profile data in single `Profile` table (`schema.prisma:65-88`)
- Template system supports custom layouts (single page only)
- Next.js dynamic routing already in use

### Implementation Options

#### Option A: Extend Current Tab System (LOW LIFT) ⭐
- **Description**: Convert existing tabs to separate pages
- **Lift**: 1-2 days
- **Complexity**: Minimal database changes

**URL Structure:**
```
/resident/alice         → Main profile
/resident/alice/blog    → Blog posts
/resident/alice/media   → Media grid
/resident/alice/about   → Extended bio
/resident/alice/links   → Links/websites
```

#### Option B: Custom Page System (MODERATE LIFT)
- **Description**: Allow users to create unlimited custom pages
- **Lift**: 1 week
- **Complexity**: New database table required

**Database Schema:**
```sql
CREATE TABLE "ProfilePage" (
  id          String @id @default(cuid())
  profileId   String 
  slug        String  -- "about", "projects", etc.
  title       String
  content     String? -- Rich text/markdown
  template    String? -- Custom HTML template
  customCSS   String? -- Page-specific styles
  enabled     Boolean @default(true)
  sortOrder   Int     @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  profile     Profile @relation(fields: [profileId], references: [id])
  @@unique([profileId, slug])
)
```

#### Option C: Full Page Builder (HIGH LIFT)
- **Description**: Drag-drop page builder with advanced features
- **Lift**: 2-3 weeks
- **Complexity**: New UI components, complex state management

### Technical Implementation

#### File Structure
```
pages/resident/[username]/
├── index.tsx           # Main profile (existing)
├── blog.tsx           # Blog posts
├── media.tsx          # Media grid (already exists)
├── about.tsx          # Extended bio (new)
├── links.tsx          # Links/websites (new)
└── [page].tsx         # Dynamic user-defined pages
```

#### Navigation Component
```tsx
<nav className="profile-nav">
  <Link href={`/resident/${username}`}>Profile</Link>
  <Link href={`/resident/${username}/blog`}>Blog</Link>
  <Link href={`/resident/${username}/media`}>Media</Link>
  {customPages.map(page => (
    <Link key={page.slug} href={`/resident/${username}/${page.slug}`}>
      {page.title}
    </Link>
  ))}
</nav>
```

#### Dynamic Page Handler
```typescript
// pages/resident/[username]/[page].tsx
export default function CustomProfilePage({ 
  username, 
  pageData, 
  residentData 
}: CustomProfilePageProps) {
  
  if (pageData.template) {
    // Render with custom template system
    return (
      <ProfileLayout username={username}>
        {transformNodeToReact(pageData.templateAst)}
      </ProfileLayout>
    );
  }
  
  // Fallback to simple content
  return (
    <ProfileLayout username={username}>
      <div dangerouslySetInnerHTML={{ __html: pageData.content }} />
    </ProfileLayout>
  );
}
```

### Benefits & Considerations

**Benefits:**
- Natural extension of existing architecture
- Reuses template system and component registry
- SEO benefits from multiple pages
- Better content organization for users

**Considerations:**
- Navigation UI needs careful design
- Page management interface required
- URL slug validation and uniqueness
- Storage limits for content

### Recommendation: Phased Approach

**Phase 1** (1-2 days): Add static About page
- Single additional page at `/resident/[username]/about`
- Store in extended Profile field
- Test user reception

**Phase 2** (1 week): Custom page system
- Add ProfilePage table
- Basic page management UI
- 3-5 pages per user limit initially

**Phase 3** (Future): Advanced features
- Page templates/themes
- Analytics per page
- Custom domains
- Marketplace integration for page templates

---

## Implementation Priority & Timeline

### Recommended Sequence

1. **Week 1-2: Multi-Page Profiles (Phase 1)**
   - Quick win with About page
   - Minimal risk
   - Tests infrastructure for expansion

2. **Week 3-4: Component Marketplace Foundation**
   - Set up submission system
   - Create review process
   - Build initial component library

3. **Week 5-6: Multi-Page Profiles (Phase 2)**
   - Implement ProfilePage table
   - Add page management UI
   - Deploy custom page system

4. **Ongoing: Marketplace Curation**
   - Review submitted components
   - Build marketplace UI
   - Community engagement

### Success Metrics

**Multi-Page Profiles:**
- % of users creating additional pages
- Average pages per user
- Page view distribution
- SEO traffic improvement

**Component Marketplace:**
- Components submitted/approved ratio
- Component usage statistics
- User satisfaction scores
- Security incidents (target: 0)

### Risk Mitigation

**Security:**
- Start with marketplace (human review) over user JS
- Implement kill switches for both features
- Regular security audits
- Clear user content indicators

**Performance:**
- Page limits initially (3-5 per user)
- Component performance benchmarks
- CDN for static page content
- Database query optimization

**User Experience:**
- Feature flags for gradual rollout
- A/B testing for navigation changes
- Clear documentation and tutorials
- Responsive support for early adopters

---

## Conclusion

Both features are technically feasible with ThreadStead's current architecture:

1. **Multi-Page Profiles**: LOW to MODERATE lift with high user value
2. **Component Marketplace**: MODERATE lift with better security than user JavaScript

The existing template system, component registry, and Next.js routing make these features natural extensions rather than architectural overhauls.

**Recommended approach**: Start with multi-page profiles (quick win) while building the component marketplace infrastructure (long-term value).

---

*Document prepared for future development reference. Update as implementation progresses.*