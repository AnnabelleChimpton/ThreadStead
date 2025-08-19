# ThreadRings Feature Implementation Plan

ThreadRings are communities reminiscent of old webrings but with a modern twist. This document outlines the implementation plan for this major feature.

## Feature Overview

**What is a ThreadRing?**
- A community with a curator (creator/owner) and members
- Users can associate their posts with one or more ThreadRings they belong to
- Each ThreadRing has its own page showing posts from members, member list, and ring info
- Join settings: open join, invite only, or closed
- **Forkable**: ThreadRings can be forked into derivative communities
- Similar to old webrings but with modern social features

## Database Schema Changes

### New Models Needed

1. **ThreadRing** - Core ring entity
2. **ThreadRingMember** - Junction table for ring membership
3. **PostThreadRing** - Junction table for post-ring associations
4. **ThreadRingInvite** - Invitation system
5. **ThreadRingFork** - Track forking relationships between rings

### New Enums
- `ThreadRingJoinType` (open, invite, closed)
- `ThreadRingVisibility` (public, unlisted, private) 
- `ThreadRingRole` (member, moderator, curator)
- `ThreadRingInviteStatus` (pending, accepted, declined, revoked)

See `prisma/schema.prisma` for detailed schema comments.

## API Endpoints to Implement

### ThreadRing Management
- `POST /api/threadrings/create` - Create new ThreadRing
- `POST /api/threadrings/[slug]/fork` - Fork existing ThreadRing into new derivative
- `GET /api/threadrings/[slug]` - Get ThreadRing details
- `PUT /api/threadrings/[slug]` - Update ThreadRing settings (curator only)
- `DELETE /api/threadrings/[slug]` - Delete ThreadRing (curator only)
- `GET /api/threadrings` - List/discover ThreadRings
- `GET /api/threadrings/[slug]/forks` - Get forks of a ThreadRing
- `GET /api/threadrings/trending` - Get trending ThreadRings by activity

### Membership Management
- `POST /api/threadrings/[slug]/join` - Join open ThreadRing
- `POST /api/threadrings/[slug]/leave` - Leave ThreadRing
- `GET /api/threadrings/[slug]/members` - List members
- `POST /api/threadrings/[slug]/invite` - Invite user (curator/moderator)
- `PUT /api/threadrings/[slug]/members/[userId]` - Update member role
- `DELETE /api/threadrings/[slug]/members/[userId]` - Remove member

### Post Association & Moderation
- `POST /api/posts/[postId]/threadrings` - Associate post with ThreadRings
- `GET /api/threadrings/[slug]/posts` - Get posts in ThreadRing
- `DELETE /api/threadrings/[slug]/posts/[postId]` - Remove post association (curator/moderator)
- `POST /api/threadrings/[slug]/posts/[postId]/pin` - Pin/feature post (curator)
- `DELETE /api/threadrings/[slug]/posts/[postId]/pin` - Unpin post (curator)

### Invitations & Prompts
- `GET /api/threadrings/invites` - User's pending invites
- `PUT /api/threadrings/invites/[inviteId]` - Accept/decline invite
- `POST /api/threadrings/[slug]/prompts` - Create/update ring prompt (curator)
- `GET /api/threadrings/[slug]/prompts` - Get current ring prompt

### Moderation & Safety
- `POST /api/threadrings/[slug]/block` - Block actor/instance (curator)
- `DELETE /api/threadrings/[slug]/block/[actorId]` - Unblock actor (curator)
- `GET /api/threadrings/[slug]/audit` - Get audit log (curator/moderator)

## Frontend Components to Create

### Core Components
- `ThreadRingCard` - Display ring info in listings
- `ThreadRingPage` - Main ring page with posts/members/lineage
- `ThreadRingMemberList` - Display members with roles
- `ThreadRingPostFeed` - Posts associated with ring (respects original post visibility)
- `ThreadRingSettings` - Curator management interface
- `ThreadRingLineage` - Fork genealogy display on ring page
- `ThreadRingBadge` - Small badge/ribbon for posts syndicated to rings
- `MemberSurfControls` - Next/Random member navigation on ring page
- `TrendingRings` - Sidebar module showing active rings

### Forms
- `CreateThreadRingForm` - New ring creation
- `ForkThreadRingForm` - Fork existing ring with customization options
- `ThreadRingInviteForm` - Invite members
- `ThreadRingSelector` - Multi-select for post association
- `ThreadRingPromptForm` - Create/edit ring prompts/challenges
- `SuggestedRingsOnboarding` - Ring suggestions during signup

### Navigation
- Add ThreadRings to main navigation
- ThreadRings directory/discovery page
- User's ThreadRings in profile

## Pages to Create

- `/threadrings` - Directory/discovery page
- `/threadrings/[slug]` - Individual ThreadRing page  
- `/threadrings/[slug]/members` - Member management (curator view)
- `/threadrings/[slug]/settings` - Ring settings (curator view)
- `/threadrings/create` - Create new ThreadRing
- `/resident/[username]/threadrings` - User's ThreadRings

## Integration Points

### Post Creation
- Add ThreadRing selector to `NewPostForm.tsx` (already has TODO comment)
- Allow selecting multiple ThreadRings for cross-posting
- **Visibility enforcement**: Ensure ring feeds respect post's original visibility (never widen scope)
- Add ThreadRing badges to all post displays when syndicated to rings

### User Profile
- Add ThreadRings tab showing curated and member rings
- Show ThreadRing badges/affiliations

### Notifications
- Ring invitations
- New posts in rings
- New members joining curated rings
- **Ring fork notifications** - Soft notification to original ring's feed when forked
- Add to `NotificationType` enum: `threadring_fork`

### Feed
- Option to filter feed by ThreadRing
- "Ring Feed" showing posts from all user's ThreadRings
- **Onboarding integration**: Show suggested rings during user signup
- Display trending rings in sidebar or discovery modules

## Implementation Phases

### ✅ Phase 1: Core Infrastructure (COMPLETED)
1. ✅ Database schema migration with federation-ready URIs
2. ✅ Basic CRUD operations for ThreadRings (create functionality)
3. ✅ Membership system with automatic curator assignment
4. ✅ **Performance**: Denormalized counters and composite indexes
5. ✅ ThreadRing creation form and page
6. ✅ ThreadRing display page with server-side rendering

### ✅ Phase 2: Post Association & Moderation (COMPLETED)
1. ✅ Associate posts with ThreadRings (with visibility enforcement)
2. ✅ ThreadRing post feeds with post badges
3. ✅ Update post creation flow
4. **Ring-level post moderation**: Remove associations, pin/unpin posts
5. **Ring prompts/challenges**: Curator-driven engagement

### Phase 3: Discovery & Social
1. ThreadRing directory with trending calculation
2. Search and discovery
3. Invitation system with soft notifications
4. **Fork functionality** - Allow users to fork existing rings
5. **Onboarding integration**: Suggested rings for new users
6. **Member surf**: Next/Random member navigation

### Phase 4: Polish & Features
1. Advanced moderation tools (block lists, audit trails)
2. Ring statistics and insights
3. Ring themes/customization (CSS)
4. Import/export functionality
5. Fork history and genealogy tracking with lineage UI
6. **Federation skeleton**: Actor model, inbox/outbox, HTTP signatures

## ✅ Phase 1 Implementation Summary

**What was completed in Phase 1:**

### Database Schema
- ✅ Complete ThreadRing models with all relationships
- ✅ Federation-ready canonical URIs on all entities
- ✅ Denormalized counters (memberCount, postCount) for performance
- ✅ Comprehensive indexes for trending and discovery queries
- ✅ Enum types for join settings, visibility, roles, and statuses

### API Endpoints  
- ✅ `POST /api/threadrings/create` - Full ThreadRing creation with validation
- ✅ `GET /api/threadrings/[slug]` - Server-side data fetching
- ✅ Automatic curator assignment and membership creation
- ✅ Slug uniqueness validation and auto-generation

### Frontend Components
- ✅ `CreateThreadRingForm` - Complete form with all settings
- ✅ ThreadRing creation page at `/threadrings/create`
- ✅ ThreadRing display page at `/threadrings/[slug]` 
- ✅ Navigation integration in main header
- ✅ Server-side rendering for performance and SEO

### Key Features Working
- ✅ **User becomes curator automatically** when creating a ThreadRing
- ✅ **Join type settings**: open, invite-only, closed
- ✅ **Visibility settings**: public, unlisted, private  
- ✅ **Auto-slug generation** from ThreadRing names
- ✅ **Form validation** and error handling
- ✅ **Member display** with roles and join dates
- ✅ **Federation URIs** ready for future inter-instance communication

## Notes for Implementation

- Follow existing code patterns in the codebase
- Use existing UI components and styling patterns
- Maintain consistency with current permission model
- Consider performance with larger ring memberships
- Plan for future features like ring themes, advanced moderation
- ThreadRing slugs should be globally unique and URL-friendly
- Consider rate limiting for ring creation, forking, and invitations
- **Fork notifications should be soft/ambient** - appear in ring feed but not as urgent notifications
- Forked rings should maintain some connection to their origin for discovery
- Consider limits on fork depth or fork chains to prevent spam
- **Visibility enforcement is critical**: Ring syndication must never widen post visibility scope
- **Federation-ready from day one**: Use canonical URIs to avoid painful migrations later
- **Performance-first**: Denormalized counters and strategic indexes for trending/discovery
- **Audit everything**: Moderation actions need trails for dispute resolution
- **Post badges everywhere**: Make ring membership visible on all post displays
- **Soft notifications with CTAs**: Fork notifications should include "View/Join" actions
- **Block lists prevent abuse**: Both actor-level and instance-level blocking for safety

## Files Created/Modified in Phase 1

### Database
- `prisma/schema.prisma` - Added complete ThreadRing models and relationships
- Migration: `20250819022311_add_threadrings` - Applied successfully

### API Endpoints
- `pages/api/threadrings/create.ts` - ThreadRing creation with validation
- `pages/api/threadrings/[slug].ts` - ThreadRing data fetching

### Frontend Components  
- `components/forms/CreateThreadRingForm.tsx` - Complete creation form
- `pages/threadrings/create.tsx` - ThreadRing creation page
- `pages/threadrings/[slug].tsx` - ThreadRing display page with SSR
- `components/Layout.tsx` - Added ThreadRings navigation link

### Type Definitions
- `types/threadrings.ts` - Complete TypeScript interfaces
- Added all enum types and request/response interfaces

**Status**: Phase 1 is production-ready! Users can create and view ThreadRings.

## ✅ Phase 2 Implementation Summary

**What was completed in Phase 2:**

### Post-ThreadRing Association System
- ✅ `NewPostForm` updated with ThreadRing selection checkboxes
- ✅ Multi-select ThreadRing association during post creation
- ✅ API validation ensures users can only associate posts with rings they're members of
- ✅ Automatic ThreadRing post count updates when posts are associated

### ThreadRing Post Feeds  
- ✅ `GET /api/threadrings/[slug]/posts` - Complete post feed API with visibility enforcement
- ✅ ThreadRing pages now display actual posts from members instead of placeholder
- ✅ Real-time post loading with proper error handling and loading states
- ✅ Post refresh functionality when posts are updated/deleted

### Comprehensive Visibility Enforcement
- ✅ **ThreadRing Access Control**: Public vs private ring access validation
- ✅ **Post Visibility Filtering**: Respects individual post privacy settings
- ✅ **Relationship-based Access**: Complex OR queries for followers/friends filtering  
- ✅ **Never Widens Scope**: Ring association never makes private posts more visible
- ✅ **Performance Optimized**: Efficient queries with proper includes and relationships

### ThreadRing Badges & Display
- ✅ `ThreadRingBadge` component for displaying ring associations on posts
- ✅ ThreadRing badges integrated into `PostItem` component
- ✅ All post APIs updated to include ThreadRing data (recent, active, user posts, single post)
- ✅ Consistent badge display across all feeds and post views

### Files Created/Modified in Phase 2

#### API Endpoints
- `pages/api/threadrings/[slug]/posts.ts` - ThreadRing post feed with visibility enforcement
- `pages/api/posts/create.ts` - Modified to handle ThreadRing associations  
- `pages/api/feed/recent.ts` - Updated to include ThreadRing data
- `pages/api/feed/active.ts` - Updated to include ThreadRing data
- `pages/api/posts/[username].ts` - Updated to include ThreadRing data
- `pages/api/posts/single/[postId].ts` - Updated to include ThreadRing data

#### Frontend Components
- `components/forms/NewPostForm.tsx` - Added ThreadRing selection with user membership API
- `components/ThreadRingBadge.tsx` - New badge component for post associations
- `components/content/PostItem.tsx` - Updated Post type and added ThreadRing badges display
- `pages/threadrings/[slug].tsx` - Updated to display real posts with proper loading states

#### New API Endpoints
- `pages/api/users/me/threadrings.ts` - Fetch user's ThreadRing memberships for post creation

**Status**: Phase 2 is production-ready! Users can associate posts with ThreadRings and view ring-specific feeds with proper privacy enforcement.