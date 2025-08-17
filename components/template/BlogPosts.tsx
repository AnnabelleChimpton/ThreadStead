import React from 'react';
import { useResidentData } from './ResidentDataProvider';

interface BlogPostsProps {
  limit?: number;
}

export default function BlogPosts({ limit = 5 }: BlogPostsProps) {
  const { posts } = useResidentData();
  
  const displayPosts = posts.slice(0, limit);

  if (displayPosts.length === 0) {
    return (
      <div className="ts-blog-posts-empty italic opacity-70 text-center py-4">
        No posts yet.
      </div>
    );
  }

  return (
    <div className="ts-blog-posts space-y-4">
      <h3 className="thread-headline text-xl font-bold mb-3">Recent Posts</h3>
      <div className="space-y-3">
        {displayPosts.map((post) => (
          <article key={post.id} className="ts-blog-post bg-thread-paper border border-thread-sage/30 p-4 rounded-cozy shadow-cozySm">
            <div className="ts-blog-post-meta text-sm text-thread-sage mb-2">
              {new Date(post.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </div>
            <div className="ts-blog-post-content text-thread-charcoal leading-relaxed">
              <div dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}