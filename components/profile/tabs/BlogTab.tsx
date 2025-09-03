import React, { useEffect, useState } from "react";
import Link from "next/link";
import PostItem, { Post as PostType } from "../../content/PostItem";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface BlogTabProps {
  username: string;
  ownerUserId: string;
}

export default function BlogTab({ username, ownerUserId }: BlogTabProps) {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user: currentUser } = useCurrentUser();

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
          <Link 
            href="/post/new"
            className="create-new-post-button inline-block border border-black px-6 py-3 bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
          >
            Create New Post
          </Link>
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
              currentUser={currentUser} 
            />
          ))
        )}
      </div>
    </div>
  );
}