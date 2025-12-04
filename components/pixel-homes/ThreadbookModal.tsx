import React, { useState, useEffect } from 'react'
import Modal from '../ui/feedback/Modal'
import { PixelIcon } from '@/components/ui/PixelIcon'

interface ThreadRingLineage {
  id: string
  name: string
  slug: string
  role: 'member' | 'moderator' | 'curator'
  joinedAt: string
  parentRing?: {
    id: string
    name: string
    slug: string
  }
  childRings?: Array<{
    id: string
    name: string
    slug: string
  }>
  lineageDepth: number
  lineagePath: string
}

interface ThreadbookModalProps {
  isOpen: boolean
  onClose: () => void
  username: string
}

const generateASCIITree = (rings: ThreadRingLineage[]): string => {
  if (rings.length === 0) return 'No ThreadRing memberships found.'

  // Sort rings by lineage depth and join date
  const sortedRings = rings.sort((a, b) => {
    if (a.lineageDepth !== b.lineageDepth) {
      return a.lineageDepth - b.lineageDepth
    }
    return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
  })

  let ascii = '🌳 ThreadRing Lineage Tree\n\n'
  
  // Group by depth
  const ringsByDepth: { [depth: number]: ThreadRingLineage[] } = {}
  sortedRings.forEach(ring => {
    if (!ringsByDepth[ring.lineageDepth]) {
      ringsByDepth[ring.lineageDepth] = []
    }
    ringsByDepth[ring.lineageDepth].push(ring)
  })

  const depths = Object.keys(ringsByDepth).map(Number).sort((a, b) => a - b)
  
  depths.forEach((depth, depthIndex) => {
    const ringsAtDepth = ringsByDepth[depth]
    
    if (depth === 0) {
      ascii += '🌱 Root Rings:\n'
    } else {
      ascii += `${'  '.repeat(depth)}🌿 Generation ${depth}:\n`
    }
    
    ringsAtDepth.forEach((ring, ringIndex) => {
      const indent = '  '.repeat(depth + 1)
      const connector = ringIndex === ringsAtDepth.length - 1 ? '└─' : '├─'
      const roleIcon = ring.role === 'curator' ? '👑' : ring.role === 'moderator' ? '🛡️' : '👤'
      
      ascii += `${indent}${connector} ${roleIcon} ${ring.name}\n`
      ascii += `${indent}${ringIndex === ringsAtDepth.length - 1 ? '   ' : '│  '}   /tr/${ring.slug}\n`
      
      const joinDate = new Date(ring.joinedAt).toLocaleDateString()
      ascii += `${indent}${ringIndex === ringsAtDepth.length - 1 ? '   ' : '│  '}   📅 Joined ${joinDate}\n`
      
      if (ringIndex < ringsAtDepth.length - 1) {
        ascii += `${indent}│\n`
      }
    })
    
    if (depthIndex < depths.length - 1) {
      ascii += `${'  '.repeat(depth + 1)}│\n`
    }
  })

  ascii += '\n═══════════════════════════════════\n'
  ascii += `📊 Total Rings: ${rings.length}\n`
  ascii += `🏆 Leadership Roles: ${rings.filter(r => r.role !== 'member').length}\n`
  ascii += `🌍 Max Depth: ${Math.max(...rings.map(r => r.lineageDepth))}\n`

  return ascii
}

export default function ThreadbookModal({ isOpen, onClose, username }: ThreadbookModalProps) {
  const [lineage, setLineage] = useState<ThreadRingLineage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && username) {
      loadLineage()
    }
  }, [isOpen, username])

  const loadLineage = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/threadring-lineage`)
      
      if (!response.ok) {
        throw new Error('Failed to load ThreadRing lineage')
      }

      const data = await response.json()
      setLineage(data.lineage || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lineage')
      setLineage([])
    } finally {
      setLoading(false)
    }
  }

  const asciiTree = generateASCIITree(lineage)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ThreadRing Lineage">
      <div className="max-w-2xl">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-thread-sage"></div>
            <span className="ml-3 text-thread-sage">Loading lineage...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800 text-sm">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            <div className="text-sm text-thread-pine">
              Explore the ThreadRing family tree for <strong>@{username}</strong>
            </div>
            
            <div className="bg-thread-paper border border-thread-sage rounded-lg p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap overflow-x-auto">
              {asciiTree}
            </div>
            
            {lineage.length > 0 && (
              <div className="text-xs text-thread-sage space-y-1">
                <div><strong>Legend:</strong></div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1"><PixelIcon name="trophy" size={12} /> Curator</span>
                  <span className="flex items-center gap-1"><PixelIcon name="shield" size={12} /> Moderator</span>
                  <span className="flex items-center gap-1"><PixelIcon name="user" size={12} /> Member</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1"><PixelIcon name="drop" size={12} /> Root ring</span>
                  <span className="flex items-center gap-1"><PixelIcon name="drop" size={12} /> Child ring</span>
                  <span className="flex items-center gap-1"><PixelIcon name="clock" size={12} /> Join date</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-thread-sage text-thread-paper rounded-md hover:bg-thread-pine transition-colors"
          >
            Close Threadbook
          </button>
        </div>
      </div>
    </Modal>
  )
}