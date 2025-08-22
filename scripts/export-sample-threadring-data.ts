#!/usr/bin/env tsx

/**
 * Export Sample ThreadRing Data for Ring Hub Testing
 * 
 * This script extracts representative ThreadRing data from the ThreadStead
 * database to use for testing Ring Hub functionality during migration.
 */

import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

interface SampleThreadRingData {
  rings: any[]
  members: any[]
  posts: any[]
  forks: any[]
  invites: any[]
  blocks: any[]
  prompts: any[]
  badges: any[]
  metadata: {
    exportDate: string
    totalRings: number
    totalMembers: number
    totalPosts: number
    spoolId: string
    features: string[]
  }
}

async function exportSampleData() {
  console.log('🔍 Scanning ThreadRing database...')

  try {
    // Get basic counts
    const totalRings = await prisma.threadRing.count()
    const totalMembers = await prisma.threadRingMember.count()
    const totalPosts = await prisma.postThreadRing.count()

    console.log(`📊 Found ${totalRings} rings, ${totalMembers} memberships, ${totalPosts} post associations`)

    // Export ThreadRings with all related data
    const rings = await prisma.threadRing.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                handles: true,
                profile: {
                  select: {
                    displayName: true
                  }
                }
              }
            }
          }
        },
        posts: {
          include: {
            post: {
              select: {
                id: true,
                title: true,
                bodyMarkdown: true,
                visibility: true,
                createdAt: true,
                authorId: true
              }
            }
          }
        },
        parentForks: true,
        childFork: true,
        invites: {
          include: {
            invitee: {
              select: {
                id: true,
                handles: true,
                profile: {
                  select: {
                    displayName: true
                  }
                }
              }
            },
            inviter: {
              select: {
                id: true,
                handles: true,
                profile: {
                  select: {
                    displayName: true
                  }
                }
              }
            }
          }
        },
        blocks: {
          include: {
            createdByUser: {
              select: {
                id: true,
                handles: true,
                profile: {
                  select: {
                    displayName: true
                  }
                }
              }
            }
          }
        },
        prompts: {
          include: {
            responses: {
              include: {
                post: {
                  select: {
                    id: true,
                    title: true,
                    bodyMarkdown: true,
                    createdAt: true,
                    authorId: true
                  }
                }
              }
            }
          }
        },
        badge: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Find The Spool
    const spool = rings.find(r => r.isSystemRing && r.slug === 'spool')
    const spoolId = spool?.id || 'not-found'

    console.log(`🌳 Found The Spool: ${spoolId}`)

    // Extract separate collections for easier analysis
    const members = rings.flatMap(ring => ring.members || [])
    const posts = rings.flatMap(ring => ring.posts || [])
    const forks = rings.flatMap(ring => [...(ring.parentForks || []), ...(ring.childFork ? [ring.childFork] : [])])
    const invites = rings.flatMap(ring => ring.invites || [])
    const blocks = rings.flatMap(ring => ring.blocks || [])
    const prompts = rings.flatMap(ring => ring.prompts || [])
    const badges = rings.map(ring => ring.badge).filter(Boolean)

    // Determine implemented features
    const features = []
    if (rings.some(r => r.isSystemRing)) features.push('The Spool Architecture')
    if (forks.length > 0) features.push('Fork System')
    if (invites.length > 0) features.push('Invitation System')
    if (blocks.length > 0) features.push('Block Lists')
    if (prompts.length > 0) features.push('Ring Prompts/Challenges')
    if (badges.length > 0) features.push('88x31 Badge System')
    if (rings.some(r => r.lineageDepth !== undefined)) features.push('Genealogy System')
    if (rings.some(r => r.totalDescendantsCount > 0)) features.push('Hierarchical Counters')

    // Build sample data export
    const sampleData: SampleThreadRingData = {
      rings: rings.map(ring => ({
        ...ring,
        // Clean up for JSON export
        createdAt: ring.createdAt.toISOString(),
        updatedAt: ring.updatedAt.toISOString(),
        members: undefined, // Moved to separate collection
        posts: undefined,   // Moved to separate collection
        forks: undefined,   // Moved to separate collection
        invites: undefined, // Moved to separate collection
        blocks: undefined,  // Moved to separate collection
        prompts: undefined, // Moved to separate collection
        badge: undefined    // Moved to separate collection
      })),
      members,
      posts,
      forks,
      invites,
      blocks,
      prompts,
      badges,
      metadata: {
        exportDate: new Date().toISOString(),
        totalRings,
        totalMembers,
        totalPosts,
        spoolId,
        features
      }
    }

    // Write to file
    const exportPath = join(process.cwd(), 'sample-threadring-data.json')
    writeFileSync(exportPath, JSON.stringify(sampleData, null, 2))

    console.log(`✅ Sample data exported to: ${exportPath}`)
    console.log(`📊 Export Summary:`)
    console.log(`   - ${sampleData.rings.length} ThreadRings`)
    console.log(`   - ${sampleData.members.length} Memberships`)
    console.log(`   - ${sampleData.posts.length} Post Associations`)
    console.log(`   - ${sampleData.forks.length} Forks`)
    console.log(`   - ${sampleData.invites.length} Invitations`)
    console.log(`   - ${sampleData.blocks.length} Blocks`)
    console.log(`   - ${sampleData.prompts.length} Prompts`)
    console.log(`   - ${sampleData.badges.length} Badges`)
    console.log(`🎯 Features Found: ${features.join(', ')}`)

    // Generate Ring Hub mapping guide
    const mappingGuide = generateRingHubMappingGuide(sampleData)
    const mappingPath = join(process.cwd(), 'ring-hub-mapping-guide.md')
    writeFileSync(mappingPath, mappingGuide)
    
    console.log(`📋 Ring Hub mapping guide: ${mappingPath}`)

  } catch (error) {
    console.error('❌ Error exporting sample data:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

function generateRingHubMappingGuide(data: SampleThreadRingData): string {
  return `# ThreadStead → Ring Hub Data Mapping Guide

**Generated**: ${data.metadata.exportDate}  
**Source Data**: ${data.metadata.totalRings} ThreadRings, ${data.metadata.totalMembers} memberships

## 🎯 Ring Hub Implementation Priority

Based on the exported ThreadStead data, Ring Hub should implement these features in order:

### Phase 1: Core Ring Operations
- **Ring CRUD**: ${data.rings.length} existing rings to migrate
- **Membership System**: ${data.members.length} existing memberships
- **Basic Settings**: joinType, visibility, curator roles

### Phase 2: Content & Association
- **Post References**: ${data.posts.length} post-ring associations
- **Content Feeds**: Ring-specific post feeds
- **Visibility Enforcement**: Respect original post privacy

### Phase 3: Social Features  
- **Fork System**: ${data.forks.length} existing fork relationships
- **Invitation System**: ${data.invites.length} existing invitations
- **Discovery**: Search and trending algorithms

### Phase 4: Advanced Features
- **Moderation**: ${data.blocks.length} existing blocks
- **Engagement**: ${data.prompts.length} existing prompts/challenges  
- **Badges**: ${data.badges.length} existing 88x31 badges

## 🗄️ Data Model Mapping

### ThreadRing → RingDescriptor
\`\`\`typescript
interface RingDescriptor {
  // Core fields
  uri: string              // ThreadStead canonicalUri
  name: string             // ThreadStead name
  description: string      // ThreadStead description
  slug: string             // ThreadStead slug
  
  // Settings
  joinType: JoinType       // ThreadStead joinType
  visibility: Visibility   // ThreadStead visibility
  
  // Hierarchical (The Spool Architecture)
  parentUri?: string       // ThreadStead parentId → URI resolution
  spoolUri: string         // Always "{INSTANCE}/threadrings/spool"
  lineageDepth: number     // ThreadStead lineageDepth
  
  // Counters
  memberCount: number      // ThreadStead memberCount
  postCount: number        // ThreadStead postCount
  descendantCount: number  // ThreadStead totalDescendantsCount
  
  // Metadata
  createdAt: string        // ThreadStead createdAt
  curatorNotes?: string    // ThreadStead curatorNote
}
\`\`\`

### ThreadRingMember → Ring Membership
\`\`\`typescript
interface RingMember {
  did: string              // User DID (to be generated from ThreadStead userId)
  role: MemberRole         // ThreadStead role (member/moderator/curator)
  joinedAt: string         // ThreadStead joinedAt
  badge?: BadgeInfo        // Optional badge metadata
}
\`\`\`

### PostThreadRing → PostRef
\`\`\`typescript
interface PostRef {
  uri: string              // Post canonical URI
  digest: string           // Content hash for verification
  submittedBy: string      // Author DID
  submittedAt: string      // ThreadStead createdAt
  isPinned: boolean        // ThreadStead isPinned
  metadata?: any           // Additional context (prompt responses, etc.)
}
\`\`\`

## 🔗 The Spool Migration

**The Spool ID**: \`${data.metadata.spoolId}\`

Ring Hub must recreate The Spool architecture:
1. **Create Ring Hub Spool**: Universal parent ring for genealogy root
2. **Migrate Hierarchy**: Preserve lineage relationships and counters  
3. **Genealogy Support**: Interactive tree visualization
4. **Performance**: Maintain O(log n) fork operations

## 🎨 Advanced Features to Implement

### Detected Features in ThreadStead Data:
${data.metadata.features.map(f => `- ✅ **${f}**: Ready for migration`).join('\n')}

### Feature Implementation Notes:

#### Fork System (${data.forks.length} existing forks)
- Preserve parent-child relationships
- Maintain fork creation timestamps
- Support multi-level hierarchies

#### Block Lists (${data.blocks.length} existing blocks)  
- Support user, instance, and actor blocking
- Preserve block reasons and audit trails
- Implement API-level enforcement

#### Ring Prompts (${data.prompts.length} existing prompts)
- Curator-driven engagement challenges
- Post-prompt response associations
- Time-limited prompt support

#### Badge System (${data.badges.length} existing badges)
- 88x31 webring badge format
- Template library and auto-generation
- HTML embed functionality

## 🚀 Migration Strategy

### Week 1-2: Core Architecture
1. **Ring CRUD API**: Implement basic ring operations
2. **Membership API**: User DID mapping and role management  
3. **The Spool Creation**: Establish genealogy root

### Week 3-4: Content & Social
1. **PostRef System**: Post association with content verification
2. **Fork Implementation**: Hierarchical ring relationships
3. **Feed Generation**: Ring-specific content feeds

### Week 5-6: Advanced Features
1. **Block Lists**: Safety and moderation features
2. **Badge System**: 88x31 webring badges
3. **Prompt System**: Engagement features

### Week 7-8: Integration & Testing
1. **ThreadStead Client**: API integration layer
2. **Migration Testing**: Validate data transfer
3. **Performance Optimization**: Scale testing

## 📊 Test Data Scenarios

The exported data provides these test scenarios:

### Basic Operations
- Create/read/update/delete rings
- Join/leave membership management
- Post association and feeds

### Complex Scenarios  
- Multi-level fork hierarchies
- Cross-ring content aggregation
- Block list enforcement
- Prompt response tracking

### Edge Cases
- The Spool as universal parent
- Private ring visibility
- Curator role transitions
- Badge template variations

---

*This mapping guide should be used alongside the sample data JSON file to implement Ring Hub functionality that maintains full compatibility with existing ThreadStead ThreadRings.*`
}

if (require.main === module) {
  exportSampleData().catch(console.error)
}

export { exportSampleData }