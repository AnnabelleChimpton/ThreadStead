import React, { useState, useEffect } from 'react';

interface SiteNewsItem {
  id: string;
  title: string;
  summary: string;
  content?: string;
  url?: string;
  publishedAt: string;
  type: 'announcement' | 'feature' | 'maintenance' | 'community';
  priority: 'high' | 'medium' | 'low';
  isPublished: boolean;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

interface NewNewsItem {
  title: string;
  summary: string;
  content?: string;
  url?: string;
  type: 'announcement' | 'feature' | 'maintenance' | 'community';
  priority: 'high' | 'medium' | 'low';
  isPublished: boolean;
  publishedAt?: string;
}

export default function SiteNewsSection() {
  const [news, setNews] = useState<SiteNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<SiteNewsItem | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [newItem, setNewItem] = useState<NewNewsItem>({
    title: '',
    summary: '',
    content: '',
    url: '',
    type: 'announcement',
    priority: 'medium',
    isPublished: true,
    publishedAt: ''
  });

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/site-news', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setNews(data.news);
      } else {
        console.error('Failed to fetch news');
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewsItem = async () => {
    try {
      const response = await fetch('/api/admin/site-news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(newItem)
      });

      if (response.ok) {
        await fetchNews();
        setShowCreateForm(false);
        setNewItem({
          title: '',
          summary: '',
          content: '',
          url: '',
          type: 'announcement',
          priority: 'medium',
          isPublished: true,
          publishedAt: ''
        });
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating news item:', error);
      alert('Failed to create news item');
    }
  };

  const updateNewsItem = async (item: SiteNewsItem) => {
    try {
      const response = await fetch(`/api/admin/site-news/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          title: item.title,
          summary: item.summary,
          content: item.content,
          url: item.url,
          type: item.type,
          priority: item.priority,
          isPublished: item.isPublished,
          publishedAt: item.publishedAt
        })
      });

      if (response.ok) {
        await fetchNews();
        setEditingItem(null);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating news item:', error);
      alert('Failed to update news item');
    }
  };

  const deleteNewsItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this news item?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/site-news/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await fetchNews();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting news item:', error);
      alert('Failed to delete news item');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'announcement': return 'bg-blue-100 text-blue-800';
      case 'feature': return 'bg-purple-100 text-purple-800';
      case 'maintenance': return 'bg-orange-100 text-orange-800';
      case 'community': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return <div className="text-center">Loading site news...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Site News Management</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          {showCreateForm ? 'Cancel' : 'Create News'}
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          <h4 className="font-semibold mb-3">Create New News Item</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Title"
              value={newItem.title}
              onChange={(e) => setNewItem({...newItem, title: e.target.value})}
              className="border border-gray-300 rounded px-3 py-2"
            />
            <input
              type="text"
              placeholder="Custom URL (optional)"
              value={newItem.url}
              onChange={(e) => setNewItem({...newItem, url: e.target.value})}
              className="border border-gray-300 rounded px-3 py-2"
            />
            <select
              value={newItem.type}
              onChange={(e) => setNewItem({...newItem, type: e.target.value as any})}
              className="border border-gray-300 rounded px-3 py-2"
            >
              <option value="announcement">Announcement</option>
              <option value="feature">Feature</option>
              <option value="maintenance">Maintenance</option>
              <option value="community">Community</option>
            </select>
            <select
              value={newItem.priority}
              onChange={(e) => setNewItem({...newItem, priority: e.target.value as any})}
              className="border border-gray-300 rounded px-3 py-2"
            >
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublished"
                checked={newItem.isPublished}
                onChange={(e) => setNewItem({...newItem, isPublished: e.target.checked})}
                className="rounded"
              />
              <label htmlFor="isPublished">Published</label>
            </div>
            <input
              type="datetime-local"
              value={newItem.publishedAt}
              onChange={(e) => setNewItem({...newItem, publishedAt: e.target.value})}
              className="border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <textarea
            placeholder="Summary"
            value={newItem.summary}
            onChange={(e) => setNewItem({...newItem, summary: e.target.value})}
            rows={3}
            className="w-full border border-gray-300 rounded px-3 py-2 mt-4"
          />
          <textarea
            placeholder="Full content (optional)"
            value={newItem.content}
            onChange={(e) => setNewItem({...newItem, content: e.target.value})}
            rows={5}
            className="w-full border border-gray-300 rounded px-3 py-2 mt-4"
          />
          <button
            onClick={createNewsItem}
            disabled={!newItem.title || !newItem.summary}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
          >
            Create News Item
          </button>
        </div>
      )}

      {/* News Items List */}
      <div className="space-y-4">
        {news.map((item) => (
          <div key={item.id} className="border border-gray-300 rounded-lg p-4 bg-white">
            {editingItem?.id === item.id ? (
              // Edit mode
              <div className="space-y-4">
                <input
                  type="text"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({...editingItem, title: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 font-semibold"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    value={editingItem.type}
                    onChange={(e) => setEditingItem({...editingItem, type: e.target.value as any})}
                    className="border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="announcement">Announcement</option>
                    <option value="feature">Feature</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="community">Community</option>
                  </select>
                  <select
                    value={editingItem.priority}
                    onChange={(e) => setEditingItem({...editingItem, priority: e.target.value as any})}
                    className="border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
                <textarea
                  value={editingItem.summary}
                  onChange={(e) => setEditingItem({...editingItem, summary: e.target.value})}
                  rows={3}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`published-${item.id}`}
                    checked={editingItem.isPublished}
                    onChange={(e) => setEditingItem({...editingItem, isPublished: e.target.checked})}
                  />
                  <label htmlFor={`published-${item.id}`}>Published</label>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => updateNewsItem(editingItem)}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingItem(null)}
                    className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // View mode
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-lg">{item.title}</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteNewsItem(item.id)}
                      className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${getPriorityColor(item.priority)}`}></div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(item.type)}`}>
                    {item.type}
                  </span>
                  <span className="text-sm text-gray-600">
                    by {item.authorName}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(item.publishedAt).toLocaleDateString()}
                  </span>
                  {!item.isPublished && (
                    <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">
                      Draft
                    </span>
                  )}
                </div>

                <p className="text-gray-700 text-sm mb-2">{item.summary}</p>

                {item.url && (
                  <p className="text-xs text-blue-600">URL: {item.url}</p>
                )}
              </div>
            )}
          </div>
        ))}

        {news.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No news items found. Create your first news item to get started.
          </div>
        )}
      </div>
    </div>
  );
}