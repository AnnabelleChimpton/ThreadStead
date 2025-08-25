import { NextApiRequest, NextApiResponse } from 'next'
import { withRingHubFeature } from '@/lib/ringhub-middleware'

// Mock Ring Hub responses for testing client functionality
const mockRings = [
  {
    uri: "http://homepageagain.com/rings/web-dev-circle",
    name: "Web Dev Circle",
    description: "Community for web developers to share knowledge and collaborate",
    slug: "web-dev-circle",
    joinType: "open" as const,
    visibility: "public" as const,
    parentUri: "http://localhost:3100/rings/the-spool",
    spoolUri: "http://localhost:3100/rings/the-spool",
    lineageDepth: 1,
    memberCount: 15,
    postCount: 42,
    descendantCount: 2,
    createdAt: "2025-08-22T00:00:00.000Z",
    curatorNotes: "Welcome to our web development community!"
  },
  {
    uri: "http://homepageagain.com/rings/the-spool",
    name: "The Spool",
    description: "The root of all ThreadRings - the universal starting point",
    slug: "the-spool",
    joinType: "open" as const,
    visibility: "public" as const,
    spoolUri: "http://localhost:3100/rings/the-spool",
    lineageDepth: 0,
    memberCount: 100,
    postCount: 200,
    descendantCount: 10,
    createdAt: "2025-08-01T00:00:00.000Z",
    curatorNotes: "The universal ThreadRing that connects all communities"
  }
]

const mockMembers = [
  {
    did: "did:web:homepageagain.com:users:alice",
    role: "curator" as const,
    joinedAt: "2025-08-15T00:00:00.000Z",
    badge: {
      title: "Web Dev Circle",
      subtitle: "Curator",
      imageUrl: "https://homepageagain.com/badges/web-dev-circle.png",
      backgroundColor: "#1a1a1a",
      textColor: "#00ff00"
    }
  },
  {
    did: "did:web:example.com:users:bob",
    role: "member" as const,
    joinedAt: "2025-08-20T00:00:00.000Z",
    badge: {
      title: "Web Dev Circle", 
      subtitle: "Member",
      backgroundColor: "#1a1a1a",
      textColor: "#ffffff"
    }
  }
]

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { endpoint } = req.query

  try {
    switch (endpoint) {
      case 'rings':
        // Mock /trp/rings endpoint
        return res.status(200).json({
          rings: mockRings,
          total: mockRings.length
        })

      case 'ring':
        // Mock /trp/rings/{slug} endpoint
        const { slug } = req.query
        const ring = mockRings.find(r => r.slug === slug)
        if (!ring) {
          return res.status(404).json({ error: 'Ring not found' })
        }
        return res.status(200).json(ring)

      case 'members':
        // Mock /trp/rings/{slug}/members endpoint
        return res.status(200).json(mockMembers)

      case 'lineage':
        // Mock /trp/rings/{slug}/lineage endpoint
        const spoolRing = mockRings[1]
        return res.status(200).json({
          parent: spoolRing,
          children: [],
          ancestors: [spoolRing]
        })

      case 'health':
        // Mock health check that would pass
        return res.status(200).json({
          status: 'ok',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        })

      case 'demo':
        // Demonstrate how the client would work with real Ring Hub
        return res.status(200).json({
          message: 'Ring Hub Client Integration Demo',
          explanation: 'This demonstrates what the Ring Hub client would return when connected to a real Ring Hub service',
          examples: {
            'GET /trp/rings': {
              description: 'List all rings',
              sample_response: { rings: mockRings, total: mockRings.length }
            },
            'GET /trp/rings/web-dev-circle': {
              description: 'Get specific ring details',
              sample_response: mockRings[0]
            },
            'GET /trp/rings/web-dev-circle/members': {
              description: 'Get ring members',
              sample_response: mockMembers
            },
            'GET /trp/rings/web-dev-circle/lineage': {
              description: 'Get ring genealogy',
              sample_response: {
                parent: mockRings[1],
                children: [],
                ancestors: [mockRings[1]]
              }
            }
          },
          client_features: [
            'HTTP signature authentication with Ed25519',
            'Automatic caching with TTL',
            'Comprehensive error handling',
            'TypeScript type safety',
            'Retry logic and connection pooling',
            'Feature flag integration'
          ],
          integration_status: 'Ready for Ring Hub service'
        })

      default:
        return res.status(400).json({ 
          error: 'Invalid endpoint',
          available_endpoints: ['rings', 'ring', 'members', 'lineage', 'health', 'demo']
        })
    }

  } catch (error) {
    return res.status(500).json({
      error: 'Mock test failed',
      details: error instanceof Error ? error.message : String(error)
    })
  }
}

export default withRingHubFeature(handler)