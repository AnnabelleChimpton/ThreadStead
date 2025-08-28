import React, { useState, useEffect } from "react";
import CompactBadgeDisplay from "../CompactBadgeDisplay";

interface Post {
  id: string;
  title: string | null;
  bodyText: string | null;
  bodyMarkdown: string | null;
  visibility: string;
  createdAt: string;
  publishedAt: string | null;
  author: {
    id: string;
    primaryHandle: string | null;
    profile: {
      displayName: string | null;
    } | null;
  };
  threadRings: Array<{
    threadRing: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
  _count: {
    comments: number;
  };
}

interface PostsResponse {
  posts: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function PostsSection() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    visibility: "all",
    search: "",
    author: "",
    page: 1,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });

  useEffect(() => {
    loadPosts();
  }, [filters]);

  async function loadPosts() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        visibility: filters.visibility,
        search: filters.search,
        author: filters.author,
        page: filters.page.toString(),
        limit: "20",
      });

      const res = await fetch(`/api/admin/posts?${params}`);
      if (res.ok) {
        const data: PostsResponse = await res.json();
        setPosts(data.posts);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to load posts:", error);
    } finally {
      setLoading(false);
    }
  }

  async function deletePost(post: Post) {
    const authorName = post.author.profile?.displayName || post.author.primaryHandle || "Unknown";
    const postTitle = post.title || post.bodyText?.substring(0, 50) + "..." || "Untitled post";
    
    const confirmMessage = `Are you sure you want to delete this post?\n\nPost: "${postTitle}"\nAuthor: ${authorName}\n\nThis action cannot be undone.`;
    if (!confirm(confirmMessage)) return;

    setDeleting(post.id);
    try {
      const res = await fetch("/api/admin/delete-post", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });

      if (res.ok) {
        await loadPosts(); // Refresh the list
        alert("Post deleted successfully");
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete post");
      }
    } catch (error) {
      console.error("Failed to delete post:", error);
      alert("Failed to delete post");
    } finally {
      setDeleting(null);
    }
  }

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case "public": return "bg-green-100 text-green-800";
      case "followers": return "bg-blue-100 text-blue-800";
      case "friends": return "bg-purple-100 text-purple-800";
      case "private": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatVisibility = (visibility: string) => {
    return visibility.charAt(0).toUpperCase() + visibility.slice(1);
  };

  const truncateText = (text: string | null, maxLength: number = 100) => {
    if (!text) return "No content";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <div className="border border-gray-300 rounded p-4 bg-gray-50">
      <h3 className="font-bold mb-3 flex items-center gap-2">
        📝 Posts Management
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        View and manage all posts across the platform. Search, filter, and delete posts as needed.
      </p>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 p-3 bg-white border border-gray-200 rounded">
        <div>
          <label className="block text-sm font-medium mb-1">Visibility:</label>
          <select
            value={filters.visibility}
            onChange={(e) => setFilters({ ...filters, visibility: e.target.value, page: 1 })}
            className="w-full border border-black p-1 text-sm"
          >
            <option value="all">All Visibility</option>
            <option value="public">Public</option>
            <option value="followers">Followers</option>
            <option value="friends">Friends</option>
            <option value="private">Private</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Search Content:</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            placeholder="Search titles/content..."
            className="w-full border border-black p-1 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Author:</label>
          <input
            type="text"
            value={filters.author}
            onChange={(e) => setFilters({ ...filters, author: e.target.value, page: 1 })}
            placeholder="Search by author..."
            className="w-full border border-black p-1 text-sm"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={loadPosts}
            disabled={loading}
            className="w-full border border-black px-3 py-1 bg-blue-200 hover:bg-blue-100 shadow-[1px_1px_0_#000] text-sm"
          >
            {loading ? "Loading..." : "Search"}
          </button>
        </div>
      </div>

      {/* Results Summary */}
      {!loading && (
        <div className="mb-3 text-sm text-gray-600">
          Showing {posts.length} of {pagination.total} posts
        </div>
      )}

      {/* Posts List */}
      <div className="space-y-3">
        {loading && posts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No posts found</div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-white border border-gray-300 rounded p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {/* Header with visibility and date */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getVisibilityColor(post.visibility)}`}>
                      {formatVisibility(post.visibility)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                    {post._count.comments > 0 && (
                      <span className="text-xs bg-blue-100 px-2 py-1 rounded">
                        💬 {post._count.comments} comment{post._count.comments !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  {post.title && (
                    <div className="font-semibold text-gray-900 mb-2">
                      {post.title}
                    </div>
                  )}

                  {/* Content preview */}
                  <div className="text-sm text-gray-700 mb-2">
                    {truncateText(post.bodyText)}
                  </div>

                  {/* Author */}
                  <div className="text-sm mb-2">
                    <strong>Author:</strong> {post.author.profile?.displayName || post.author.primaryHandle || "Unknown"}
                    
                    {/* User badges */}
                    <div className="mt-1">
                      <CompactBadgeDisplay 
                        userId={post.author.id} 
                        context="posts" 
                        size="small"
                      />
                    </div>
                  </div>

                  {/* ThreadRings */}
                  {post.threadRings && post.threadRings.length > 0 && (
                    <div className="text-sm mb-2">
                      <strong>ThreadRings:</strong>{" "}
                      {post.threadRings
                        .filter((tr) => tr && tr.threadRing && tr.threadRing.id)
                        .map((tr, index) => (
                          <span key={tr.threadRing.id}>
                            {index > 0 && ", "}
                            <span className="text-blue-600">{tr.threadRing.name}</span>
                          </span>
                        ))}
                    </div>
                  )}

                  {/* Post ID for reference */}
                  <div className="text-xs text-gray-500 font-mono">
                    ID: {post.id}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 ml-4">
                  <a
                    href={`/post/${post.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-black px-2 py-1 bg-blue-200 hover:bg-blue-100 shadow-[1px_1px_0_#000] text-xs text-center"
                  >
                    👁️ View
                  </a>
                  <button
                    onClick={() => deletePost(post)}
                    disabled={deleting === post.id}
                    className="border border-black px-2 py-1 bg-red-200 hover:bg-red-100 shadow-[1px_1px_0_#000] text-xs"
                  >
                    {deleting === post.id ? "Deleting..." : "🗑️ Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
            disabled={filters.page === 1}
            className="border border-black px-3 py-1 bg-white hover:bg-gray-100 shadow-[1px_1px_0_#000] text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm">
            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
          </span>
          <button
            onClick={() => setFilters({ ...filters, page: Math.min(pagination.pages, filters.page + 1) })}
            disabled={filters.page === pagination.pages}
            className="border border-black px-3 py-1 bg-white hover:bg-gray-100 shadow-[1px_1px_0_#000] text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}