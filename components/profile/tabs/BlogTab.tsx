import React, { useEffect, useState } from "react";
import PostItem, { Post as PostType } from "../../content/PostItem";
import NewPostForm from "../../forms/NewPostForm";

interface BlogTabProps {
  username: string;
  ownerUserId: string;
}

export default function BlogTab({ username, ownerUserId }: BlogTabProps) {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const refresh = async () => {
    const res = await fetch(`/api/posts/${encodeURIComponent(username)}`);
    const data = res.ok ? await res.json() : { posts: [] };
    setPosts(Array.isArray(data.posts) ? data.posts : []);
  };

  useEffect(() => { 
    setLoading(true); 
    refresh().finally(() => setLoading(false)); 
  }, [username]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const me = await fetch("/api/auth/me").then(r => r.json());
      if (alive) {
        setIsOwner(me?.loggedIn && me.user?.id === ownerUserId);
        setIsAdmin(me?.loggedIn && me.user?.role === "admin");
      }
    })();
    return () => { alive = false; };
  }, [ownerUserId]);

  if (loading) {
    return (
      <div className="ts-blog-loading" data-component="blog-tab">
        Loading posts…
      </div>
    );
  }

  return (
    <div className="ts-blog-tab-content profile-tab-content space-y-3" data-component="blog-tab">
      {isOwner && (
        <div className="ts-new-post-section mb-3">
          <div className="ts-new-post-label text-sm opacity-70 mb-1">
            Post as you
          </div>
          <NewPostForm onPosted={refresh} />
        </div>
      )}
      <div className="ts-blog-posts-list">
        {posts.length === 0 ? (
          <div className="ts-no-posts-message italic opacity-70">
            No posts yet.
          </div>
        ) : (
          posts.map((p) => (
            <PostItem 
              key={p.id} 
              post={p} 
              isOwner={isOwner} 
              isAdmin={isAdmin} 
              onChanged={refresh} 
            />
          ))
        )}
      </div>
    </div>
  );
}