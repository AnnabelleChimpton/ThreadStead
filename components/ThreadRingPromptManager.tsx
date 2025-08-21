import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import ThreadRingPromptResponses from './ThreadRingPromptResponses'

interface ThreadRingPrompt {
  id: string
  title: string
  description: string
  startsAt: string
  endsAt: string | null
  isActive: boolean
  isPinned: boolean
  responseCount: number
  createdById: string
  createdBy?: {
    id: string
    handles: Array<{
      handle: string
    }>
    profile: {
      displayName: string | null
    } | null
  }
  createdAt: string
  updatedAt: string
}

interface ThreadRingPromptManagerProps {
  threadRingSlug: string
  canManage: boolean
}

export default function ThreadRingPromptManager({ 
  threadRingSlug, 
  canManage 
}: ThreadRingPromptManagerProps) {
  const [prompts, setPrompts] = useState<ThreadRingPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<ThreadRingPrompt | null>(null)
  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    endsAt: '',
    isActive: false,
    isPinned: false
  })

  useEffect(() => {
    fetchPrompts()
  }, [threadRingSlug])

  const fetchPrompts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/threadrings/${threadRingSlug}/prompts`)
      if (!response.ok) throw new Error('Failed to fetch prompts')
      const data = await response.json()
      setPrompts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompts')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingPrompt 
        ? `/api/threadrings/${threadRingSlug}/prompts/${editingPrompt.id}`
        : `/api/threadrings/${threadRingSlug}/prompts`
      
      const response = await fetch(url, {
        method: editingPrompt ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          endsAt: formData.endsAt || null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save prompt')
      }

      await fetchPrompts()
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt')
    }
  }

  const handleDelete = async (promptId: string) => {
    if (!confirm('Are you sure you want to delete this prompt? This will also remove all responses.')) {
      return
    }

    try {
      const response = await fetch(`/api/threadrings/${threadRingSlug}/prompts/${promptId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete prompt')
      }

      await fetchPrompts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete prompt')
    }
  }

  const handleEdit = (prompt: ThreadRingPrompt) => {
    setEditingPrompt(prompt)
    setFormData({
      title: prompt.title,
      description: prompt.description,
      endsAt: prompt.endsAt ? new Date(prompt.endsAt).toISOString().slice(0, 16) : '',
      isActive: prompt.isActive,
      isPinned: prompt.isPinned
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingPrompt(null)
    setFormData({
      title: '',
      description: '',
      endsAt: '',
      isActive: false,
      isPinned: false
    })
  }

  const toggleResponses = (promptId: string) => {
    setExpandedPromptId(expandedPromptId === promptId ? null : promptId)
  }

  if (loading) return <div className="p-4">Loading prompts...</div>
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Prompts & Challenges</h2>
        {canManage && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showForm ? 'Cancel' : 'New Prompt'}
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && canManage && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold">
            {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
          </h3>
          
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              maxLength={200}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              required
              maxLength={1000}
            />
          </div>

          <div>
            <label htmlFor="endsAt" className="block text-sm font-medium text-gray-700 mb-1">
              End Date (Optional)
            </label>
            <input
              type="datetime-local"
              id="endsAt"
              value={formData.endsAt}
              onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm font-medium">Set as Active Prompt</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isPinned}
                onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm font-medium">Pin Prompt</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {editingPrompt ? 'Update Prompt' : 'Create Prompt'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Prompts List */}
      <div className="space-y-4">
        {prompts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No prompts yet. {canManage && "Create your first prompt to engage your community!"}
          </div>
        ) : (
          prompts.map((prompt) => (
            <div
              key={prompt.id}
              className={`p-4 border rounded-lg ${
                prompt.isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{prompt.title}</h3>
                    {prompt.isActive && (
                      <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                        Active
                      </span>
                    )}
                    {prompt.isPinned && (
                      <span className="px-2 py-1 bg-yellow-500 text-white text-xs rounded-full">
                        📌 Pinned
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-700 mb-2 whitespace-pre-wrap">{prompt.description}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span>
                      By {prompt.createdBy?.profile?.displayName || prompt.createdBy?.handles[0]?.handle || 'Unknown User'}
                    </span>
                    <span>{formatDistanceToNow(new Date(prompt.createdAt))} ago</span>
                    <span>{prompt.responseCount} responses</span>
                    {prompt.endsAt && (
                      <span className="text-orange-600">
                        Ends {formatDistanceToNow(new Date(prompt.endsAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => toggleResponses(prompt.id)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    {expandedPromptId === prompt.id ? 'Hide' : 'View'} Responses ({prompt.responseCount})
                  </button>
                  
                  {prompt.responseCount > 0 && (
                    <Link
                      href={`/threadrings/${threadRingSlug}/prompts/${prompt.id}/responses`}
                      className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                    >
                      View All →
                    </Link>
                  )}
                  {canManage && (
                    <>
                      <button
                        onClick={() => handleEdit(prompt)}
                        className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(prompt.id)}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {/* Prompt Responses */}
              {expandedPromptId === prompt.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <ThreadRingPromptResponses
                    threadRingSlug={threadRingSlug}
                    promptId={prompt.id}
                    promptTitle={prompt.title}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}