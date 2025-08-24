# ThreadRing Page API Optimization Analysis

## Current State: API Calls on ThreadRing Page Load

When loading a single threadring page, we currently make **up to 12 different API calls**, which creates performance issues and complexity.

### Server-Side (getServerSideProps)
1. **Ring Hub API Calls** (if Ring Hub enabled):
   - `GET /trp/rings/{slug}` - Get ring descriptor
   - `GET /trp/rings/spool/stats` - Get Ring Hub stats (for Spool only)
   - `GET /trp/rings/{slug}/lineage` - Get ring lineage (for non-Spool rings)

2. **Local Database Query** (fallback):
   - Single database query for ring with curator, members, and badge data

### Client-Side (useEffect hooks + components)

#### Page Component API Calls:
3. `GET /api/threadrings/stats` - Global threadring stats (SpoolLandingPage only)
4. `GET /api/threadrings/{slug}/members` - Get members list
5. `GET /api/threadrings/{slug}/lineage` - Get lineage data (client-side fetch)
6. `GET /api/threadrings/{slug}/posts?scope={feedScope}` - Get posts feed
7. `GET /api/auth/me` - Get current user info
8. `GET /api/threadrings/{slug}/ownership` - Check ownership (conditional)

#### Component API Calls:
9. `GET /api/threadrings/{slug}/stats` - ThreadRingStats component
10. `GET /api/threadrings/{slug}/prompts` - ThreadRingActivePrompt component  
11. `GET /api/threadrings/{slug}/random-member?scope={scope}` - RandomMemberDiscovery component
12. `GET /api/threadrings/{slug}/lineage` - ThreadRingLineage component

#### User Action API Calls (conditional):
13. `POST /api/threadrings/{slug}/join` - Join ring (user action)
14. `POST /api/threadrings/{slug}/leave` - Leave ring (user action)

### Summary
- **Server-side**: 1-3 Ring Hub API calls + potential database fallback
- **Client-side**: 8-9 ThreadStead API calls on page load
- **Total**: Up to 12 API calls, each potentially triggering additional Ring Hub calls

---

## Proposed Solution: Unified API Endpoint

### API Design

**Endpoint:** `GET /api/threadrings/{slug}/page-data`  
**Authentication:** Optional (response changes based on auth status)  
**Query Parameters:**
- `scope=current|parent|children|family` (for posts feed)
- `posts_limit=20` (default)
- `posts_offset=0` (default)

### Response Structure

```typescript
interface ThreadRingPageData {
  // Core ring information (always included)
  ring: {
    id: string
    name: string
    slug: string
    description?: string
    curatorNote?: string
    joinType: 'open' | 'invite' | 'closed'
    visibility: 'public' | 'unlisted' | 'private'
    memberCount: number
    postCount: number
    createdAt: string
    isSystemRing: boolean
    
    // Hierarchical data
    parentId?: string
    directChildrenCount: number
    totalDescendantsCount: number
    lineageDepth: number
    
    // Badge info
    badge?: {
      title: string
      subtitle?: string
      backgroundColor: string
      textColor: string
      templateId?: string
      imageUrl?: string
      isActive: boolean
    }
  }
  
  // User-specific data (only if authenticated)
  userContext?: {
    isMember: boolean
    role?: 'member' | 'moderator' | 'curator'
    canJoin: boolean
    canLeave: boolean
    canModerate: boolean
    canManage: boolean
  }
  
  // Posts feed
  posts: {
    posts: Post[]
    total: number
    hasMore: boolean
    scope: string
    limit: number
    offset: number
  }
  
  // Members/Leadership info
  members: {
    isPublicInfo: boolean // true for non-members
    total: number
    members: Array<{
      id: string
      displayName: string
      role: 'member' | 'moderator' | 'curator'
      joinedAt: string
      avatarUrl?: string
      // Full member list only if authenticated & member
    }>
  }
  
  // Lineage/genealogy data
  lineage?: {
    ancestors: Array<{slug: string, name: string}>
    descendants: TreeNode[]
    depth: number
  }
  
  // Statistics
  stats: {
    memberCount: number
    postCount: number
    pinnedPostCount: number
    moderatorCount: number
    recentActivity?: { // Only if member
      newMembersThisWeek: number
      newPostsThisWeek: number
    }
    topPosters?: Array<{ // Only if member
      displayName: string
      postCount: number
    }>
  }
  
  // Active prompt/challenge (if exists)
  activePrompt?: {
    id: string
    content: string
    createdAt: string
    expiresAt?: string
  }
  
  // Random member suggestion (if member)
  randomMember?: {
    displayName: string
    avatarUrl?: string
    recentPost?: string
    scope: string
  }
}
```

### Implementation Strategy

#### Ring Hub Integration
```typescript
// For Ring Hub rings, make consolidated calls:
async function getRingHubPageData(slug: string, viewer?: User) {
  const client = viewer ? getAuthenticatedClient(viewer.id) : getPublicClient()
  
  // Parallel Ring Hub API calls
  const [ringData, membershipInfo, postsData, lineageData] = await Promise.allSettled([
    client.getRing(slug),
    client.getRingMembershipInfo(slug), // Public endpoint
    viewer ? client.getRingFeed(slug, {scope, limit, offset}) : null,
    client.getRingLineage(slug)
  ])
  
  // Transform and combine data
  return transformToPageData({ringData, membershipInfo, postsData, lineageData}, viewer)
}
```

#### Authentication Handling
```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const viewer = await getSessionUser(req) // Optional - no 401 if missing
  const { slug } = req.query
  
  if (featureFlags.ringhub()) {
    const pageData = await getRingHubPageData(slug, viewer)
    return res.json(pageData)
  } else {
    const pageData = await getLocalPageData(slug, viewer)
    return res.json(pageData)
  }
}
```

### Benefits

#### For Non-Members (Public Data):
- **1 API call** instead of 8-12
- Gets: ring info, public member info (curator/mods), posts feed, basic stats
- No authentication waterfall

#### For Members (Full Data):
- **1 API call** instead of 8-12
- Gets: everything above + full member list, detailed stats, user context, random member
- Single authentication check

#### Ring Hub Team Benefits:
1. **Reduced API Load**: 1 call instead of 8-12 per page view
2. **Better Caching**: Single endpoint easier to cache
3. **Atomic Consistency**: All data from same point in time
4. **Clearer Usage Patterns**: One endpoint to monitor/optimize

---

## Potential Pitfalls & Considerations

### Performance & User Experience Pitfalls

#### 1. All-or-Nothing Loading
- **Problem**: If any part of the data fails to load, the entire page is broken
- **Current**: Individual components can fail gracefully, showing partial data
- **Risk**: User sees blank page longer vs. progressive loading

#### 2. Over-fetching & Slower Initial Load
- **Problem**: Loading data that may not be immediately visible (stats, random member, etc.)
- **Current**: Components load data on-demand when scrolled into view
- **Risk**: Slower time-to-first-paint, especially on mobile

#### 3. Caching Complexity
```typescript
// Different data has different cache requirements:
// - Ring info: Cache for hours
// - Member count: Cache for minutes  
// - Posts: Cache for seconds
// - User context: Don't cache (user-specific)
```

### Development & Maintenance Pitfalls

#### 4. Single Point of Failure
- **Problem**: One complex endpoint handling 8+ different concerns
- **Risk**: Bug in stats calculation breaks entire page load
- **Current**: Individual endpoints can fail independently

#### 5. Complex Authorization Logic
```typescript
// This gets messy fast:
if (viewer && isMember) {
  // Full member list + stats + random member
} else if (viewer && !isMember) {
  // Public info + user can join status
} else {
  // Public info only
}
```

#### 6. Tight Coupling
- **Problem**: Changes to posts feed affect stats, member list, etc.
- **Risk**: Team working on lineage feature breaks member display
- **Testing**: Much harder to test individual features in isolation

### Ring Hub Integration Pitfalls

#### 7. Ring Hub API Mismatch
- **Problem**: Ring Hub may not want/be able to implement such a complex endpoint
- **Reality**: They might prefer keeping individual endpoints for flexibility
- **Risk**: You build unified API but still make 8+ Ring Hub calls underneath

#### 8. Rate Limiting Issues
```typescript
// Different Ring Hub endpoints may have different limits:
// - /rings/{slug} - 1000/hour
// - /rings/{slug}/members - 100/hour  
// - /rings/{slug}/posts - 500/hour
```

#### 9. Inconsistent Response Times
- **Problem**: Posts feed takes 2s, ring info takes 50ms
- **Result**: Everything waits for slowest component

### Error Handling Pitfalls

#### 10. Loss of Granular Error Messages
- **Current**: "Failed to load members" vs "Failed to load posts"
- **Unified**: "Failed to load page data" (less actionable for users)

#### 11. Graceful Degradation Loss
```typescript
// Current: Show ring info even if member list fails
// Unified: Show nothing if anything fails (unless carefully handled)
```

---

## Alternative: Hybrid Approach

Consider a **two-tier approach** instead:

### Tier 1: Essential Page Data (blocking)
```typescript
GET /api/threadrings/{slug}/essential
// Returns: ring info, user context, basic stats
// Fast, reliable, required for page render
```

### Tier 2: Progressive Enhancement (non-blocking)
```typescript
GET /api/threadrings/{slug}/posts?scope=current
GET /api/threadrings/{slug}/members  
GET /api/threadrings/{slug}/lineage
// Load after page renders, can fail gracefully
```

---

## Migration Strategy

1. **Phase 1**: Create unified endpoint alongside existing ones
2. **Phase 2**: Update threadring page to use unified endpoint
3. **Phase 3**: Remove old individual endpoints (after verification)
4. **Phase 4**: Ring Hub team can implement similar consolidated endpoint

---

## Questions to Consider Before Implementation

1. **What's the actual performance problem?** 
   - Is it request count, total load time, or perceived performance?
   
2. **Ring Hub cooperation?**
   - Will they implement a unified endpoint, or will you still make multiple Ring Hub calls?

3. **User priorities?**
   - Do users need to see posts immediately, or is ring info + join button enough?

4. **Error tolerance?**
   - Is it better to show partial data quickly or complete data slowly?

---

## Recommendation

Start with **instrumenting the current approach** to measure:
- Which API calls are slowest
- Which calls fail most often  
- What users interact with first

Then consider **selective consolidation**:
- Combine only the 2-3 most critical calls
- Keep progressive loading for secondary features
- Maintain individual endpoints for debugging/flexibility

This gives you performance wins without the complexity risks of a mega-endpoint.

---

## Status

**Current Status**: Analysis complete, implementation on hold
**Next Steps**: 
1. Instrument existing API calls to gather performance data
2. Discuss Ring Hub team's appetite for unified endpoints
3. Consider selective consolidation of 2-3 most critical calls first