import { useState, useEffect } from 'react'
import { getUserDisplayName } from '@/lib/threadring-blocks'

interface ThreadRingBlock {
  id: string
  blockType: 'user' | 'instance' | 'actor'
  blockedUserId?: string
  blockedInstance?: string
  blockedActorUri?: string
  reason?: string
  createdAt: string
  blockedUser?: {
    id: string
    handles: Array<{ handle: string }>
    profile: { displayName: string | null } | null
  }
  createdByUser: {
    id: string
    handles: Array<{ handle: string }>
    profile: { displayName: string | null } | null
  }
}

interface ThreadRingBlockManagerProps {
  threadRingSlug: string
}

export default function ThreadRingBlockManager({ threadRingSlug }: ThreadRingBlockManagerProps) {
  const [blocks, setBlocks] = useState<ThreadRingBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({
    blockType: 'user' as 'user' | 'instance' | 'actor',
    target: '',
    reason: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadBlocks()
  }, [threadRingSlug])

  const loadBlocks = async () => {
    try {
      const response = await fetch(`/api/threadrings/${threadRingSlug}/blocks`)
      if (response.ok) {
        const data = await response.json()
        setBlocks(data.blocks)
      } else {
        console.error('Failed to load blocks')
      }
    } catch (error) {
      console.error('Error loading blocks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addForm.target.trim()) return

    setSubmitting(true)
    try {
      const requestData = {
        blockType: addForm.blockType,
        reason: addForm.reason.trim() || undefined,
        ...(addForm.blockType === 'user' && { userId: addForm.target.trim() }),
        ...(addForm.blockType === 'instance' && { instance: addForm.target.trim() }),
        ...(addForm.blockType === 'actor' && { actorUri: addForm.target.trim() })
      }

      const response = await fetch(`/api/threadrings/${threadRingSlug}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        const data = await response.json()
        setBlocks(prev => [data.block, ...prev])
        setShowAddForm(false)
        setAddForm({ blockType: 'user', target: '', reason: '' })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create block')
      }
    } catch (error) {
      console.error('Error creating block:', error)
      alert('Failed to create block')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveBlock = async (blockId: string) => {
    if (!confirm('Are you sure you want to remove this block?')) return

    try {
      const response = await fetch(`/api/threadrings/${threadRingSlug}/blocks/${blockId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setBlocks(prev => prev.filter(block => block.id !== blockId))
      } else {
        alert('Failed to remove block')
      }
    } catch (error) {
      console.error('Error removing block:', error)
      alert('Failed to remove block')
    }
  }

  const formatBlockTarget = (block: ThreadRingBlock) => {
    switch (block.blockType) {
      case 'user':
        return block.blockedUser 
          ? getUserDisplayName(block.blockedUser)
          : `User ID: ${block.blockedUserId}`
      case 'instance':
        return block.blockedInstance
      case 'actor':
        return block.blockedActorUri
      default:
        return 'Unknown'
    }
  }

  const getBlockTypeIcon = (blockType: string) => {
    switch (blockType) {
      case 'user': return '👤'
      case 'instance': return '🌐'
      case 'actor': return '🔗'
      default: return '❓'
    }
  }

  if (loading) {
    return (
      <div className="p-6 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Block Management</h3>
        <div className="text-gray-500">Loading blocks...</div>
      </div>
    )
  }

  return (
    <div className="p-6 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Block Management</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
        >
          🚫 Add Block
        </button>
      </div>

      {/* Add Block Form */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <form onSubmit={handleAddBlock}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Block Type
                </label>
                <select
                  value={addForm.blockType}
                  onChange={(e) => setAddForm(prev => ({ 
                    ...prev, 
                    blockType: e.target.value as 'user' | 'instance' | 'actor',
                    target: '' // Reset target when type changes
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">User</option>
                  <option value="instance">Instance</option>
                  <option value="actor">Actor URI</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {addForm.blockType === 'user' && 'User ID or Handle'}
                  {addForm.blockType === 'instance' && 'Domain Name'}
                  {addForm.blockType === 'actor' && 'Actor URI'}
                </label>
                <input
                  type="text"
                  value={addForm.target}
                  onChange={(e) => setAddForm(prev => ({ ...prev, target: e.target.value }))}
                  placeholder={
                    addForm.blockType === 'user' ? 'user_id or @handle' :
                    addForm.blockType === 'instance' ? 'spam.example.com' :
                    'https://instance.com/users/spammer'
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  value={addForm.reason}
                  onChange={(e) => setAddForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Spam, harassment, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting || !addForm.target.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Adding...' : 'Add Block'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setAddForm({ blockType: 'user', target: '', reason: '' })
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Blocks List */}
      {blocks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <span className="text-4xl mb-4 block">🛡️</span>
          <p className="text-lg">No blocks yet.</p>
          <p className="text-sm mt-2">Use blocks to prevent spam and keep your community safe.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {blocks.map((block) => (
            <div key={block.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{getBlockTypeIcon(block.blockType)}</span>
                  <span className="font-medium text-gray-900">
                    {formatBlockTarget(block)}
                  </span>
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                    {block.blockType}
                  </span>
                </div>
                
                {block.reason && (
                  <p className="text-sm text-gray-600 mb-1">
                    Reason: {block.reason}
                  </p>
                )}
                
                <div className="text-xs text-gray-500">
                  Blocked by {getUserDisplayName(block.createdByUser)} on{' '}
                  {new Date(block.createdAt).toLocaleDateString()}
                </div>
              </div>

              <button
                onClick={() => handleRemoveBlock(block.id)}
                className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
                title="Remove block"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}