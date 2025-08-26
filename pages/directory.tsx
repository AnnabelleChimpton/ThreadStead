import React, { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import UserCard, { DirectoryUser } from "../components/ui/UserCard";
import { useSiteConfig } from "@/hooks/useSiteConfig";

type SortOption = "recent" | "alphabetical" | "posts";

type DirectoryResponse = {
  users: DirectoryUser[];
  hasMore: boolean;
  total: number;
};

export default function Directory() {
  const { config } = useSiteConfig();
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [total, setTotal] = useState(0);

  // Debounced search
  const [searchQuery, setSearchQuery] = useState("");
  
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchQuery(search);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [search]);

  // Load users function
  const loadUsers = useCallback(async (isInitial = false) => {
    if (!isInitial) setLoadingMore(true);
    setError(null);

    try {
      const offset = isInitial ? 0 : users.length;
      const params = new URLSearchParams({
        limit: "12",
        offset: offset.toString(),
        sortBy,
        ...(searchQuery && { search: searchQuery })
      });

      const res = await fetch(`/api/directory?${params}`);
      
      if (!res.ok) {
        throw new Error(`Failed to load directory: ${res.status}`);
      }

      const data: DirectoryResponse = await res.json();
      
      if (isInitial) {
        setUsers(data.users);
      } else {
        setUsers(prev => [...prev, ...data.users]);
      }
      
      setHasMore(data.hasMore);
      setTotal(data.total);
    } catch (err) {
      setError((err as Error)?.message || "Failed to load directory");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [users.length, sortBy, searchQuery]);

  // Load initial data and when filters change
  useEffect(() => {
    setLoading(true);
    setUsers([]);
    loadUsers(true);
     
    // loadUsers is intentionally omitted to prevent infinite loops (it depends on users.length)
  }, [sortBy, searchQuery]);

  function loadMore() {
    if (!hasMore || loadingMore) return;
    loadUsers(false);
  }

  function handleSortChange(newSort: SortOption) {
    setSortBy(newSort);
  }

  return (
    <Layout>
      {/* Header */}
      <div className="thread-module p-6 mb-6">
        <div className="mb-4">
          <h1 className="thread-headline text-3xl font-bold mb-2">{config.directory_title}</h1>
          <p className="text-thread-sage leading-relaxed">
            Meet your neighbors in this cozy corner of the web. Discover new friends, 
            interesting conversations, and kindred spirits.
          </p>
        </div>
        <div className="thread-divider"></div>
        <div className="mt-6">
          <span className="thread-label">
            {total > 0 ? `${total} residents` : "community members"}
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="thread-module p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <label className="block mb-2">
              <span className="thread-label">Search residents</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, username, or bio..."
                className="w-full mt-1 border border-thread-sage p-3 bg-thread-paper rounded-cozy focus:border-thread-pine focus:ring-1 focus:ring-thread-pine"
              />
            </label>
          </div>

          {/* Sort */}
          <div className="sm:w-48">
            <label className="block mb-2">
              <span className="thread-label">Sort by</span>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                className="w-full mt-1 border border-thread-sage p-3 bg-thread-paper rounded-cozy focus:border-thread-pine focus:ring-1 focus:ring-thread-pine"
              >
                <option value="recent">Recently joined</option>
                <option value="alphabetical">Name (A-Z)</option>
                <option value="posts">Most posts</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <span className="thread-label">Loading residents…</span>
        </div>
      ) : error ? (
        <div className="thread-module p-6">
          <div className="text-thread-sunset bg-red-50 border border-red-200 p-4 rounded-cozy">
            <span className="thread-label">error</span>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="thread-module p-8 text-center">
          <h3 className="thread-headline text-lg mb-2">No residents found</h3>
          <p className="text-thread-sage">
            {searchQuery 
              ? `No one matches "${searchQuery}". Try a different search term.`
              : config.directory_empty_message}
          </p>
        </div>
      ) : (
        <>
          {/* User Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
            {users.map((user) => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="text-center py-6">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="thread-button disabled:opacity-50"
              >
                {loadingMore ? "Loading more…" : "Load More Residents"}
              </button>
            </div>
          )}

          {/* End Message */}
          {!hasMore && users.length > 0 && (
            <div className="text-center py-6">
              <span className="thread-label">
                That&apos;s everyone in the neighborhood! 🏡
              </span>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}