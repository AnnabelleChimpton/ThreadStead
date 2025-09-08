import React from 'react';
import { useResidentData } from './ResidentDataProvider';
import PostItem, { Post as PostType } from '../../core/content/PostItem';

interface BlogPostsProps {
  limit?: number;
  className?: string;
}

export default function BlogPosts({ limit = 5, className: customClassName }: BlogPostsProps) {
  const { posts, owner } = useResidentData();
  
  const displayPosts = posts.slice(0, limit);

  if (displayPosts.length === 0) {
    const emptyClassName = customClassName ? `blog-posts-empty profile-tab-content italic opacity-70 text-center py-4 ${customClassName}` : "blog-posts-empty profile-tab-content italic opacity-70 text-center py-4";
    return (
      <div className={emptyClassName}>
        No posts yet.
      </div>
    );
  }

  const containerClassName = customClassName ? `blog-posts profile-tab-content space-y-4 ${customClassName}` : "blog-posts profile-tab-content space-y-4";

  return (
    <div className={containerClassName}>
      <h3 className="blog-posts-title thread-headline text-xl font-bold mb-3">Recent Posts</h3>
      <div className="blog-posts-list space-y-3">
        {displayPosts.map((post) => (
          <PostItem 
            key={post.id} 
            post={{
              ...post,
              visibility: 'public',
              authorId: '',
              author: { id: '', primaryHandle: '', profile: { displayName: '' } },
              upvoteCount: 0,
              downvoteCount: 0,
              commentCount: 0,
              bookmarkCount: 0,
              editedAt: null,
              originalPost: null,
              threadRingId: null,
              threadRing: null,
              isBookmarked: false,
              userVote: null
            } as PostType} 
            isOwner={false} // Template preview is always read-only
            isAdmin={false}
            onChanged={() => {}} // No refresh needed in preview
            currentUser={null} // No current user in template preview
          />
        ))}
      </div>
    </div>
  );
}