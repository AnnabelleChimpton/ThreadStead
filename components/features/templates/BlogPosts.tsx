import React from 'react';
import { useResidentData } from './ResidentDataProvider';
import PostItem, { Post as PostType } from '../../core/content/PostItem';
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface BlogPostsProps extends UniversalCSSProps {
  limit?: number;
  className?: string;
  mode?: 'full' | 'count'; // Renamed from 'display' to avoid CSS prop collision
}

export default function BlogPosts(props: BlogPostsProps) {
  // Separate CSS properties from component-specific properties
  const { cssProps, componentProps } = separateCSSProps(props);
  const { limit = 5, className: customClassName, mode = 'full' } = componentProps;

  const { posts, owner } = useResidentData();

  // Defensive programming: ensure posts is an array and filter out invalid posts
  const safePosts = Array.isArray(posts) ? posts.filter(post => post && post.id) : [];
  const displayPosts = safePosts.slice(0, limit);

  // If mode is 'count', just return the count
  if (mode === 'count') {
    return <>{safePosts.length}</>;
  }

  // Apply CSS properties as inline styles
  const appliedStyles = applyCSSProps(cssProps);

  if (displayPosts.length === 0) {
    const baseEmptyClasses = "blog-posts-empty profile-tab-content italic opacity-70 text-center py-4";
    const filteredEmptyClasses = removeTailwindConflicts(baseEmptyClasses, cssProps);
    const emptyClassName = customClassName ? `${filteredEmptyClasses} ${customClassName}` : filteredEmptyClasses;

    return (
      <div className={emptyClassName} style={appliedStyles}>
        No posts yet.
      </div>
    );
  }

  const baseContainerClasses = "blog-posts profile-tab-content space-y-4";
  const filteredContainerClasses = removeTailwindConflicts(baseContainerClasses, cssProps);
  const containerClassName = customClassName ? `${filteredContainerClasses} ${customClassName}` : filteredContainerClasses;

  return (
    <div className={containerClassName} style={appliedStyles}>
      <h3 className="blog-posts-title thread-headline text-xl font-bold mb-3">Recent Posts</h3>
      <div className="blog-posts-list space-y-3">
        {displayPosts.map((post) => (
          <PostItem
            key={post.id}
            post={{
              ...post,
              visibility: 'public',
              authorId: owner.id,
              author: {
                id: owner.id,
                primaryHandle: owner.handle,
                profile: {
                  displayName: owner.displayName,
                  avatarUrl: owner.avatarUrl
                }
              },
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
            viewContext="widget"
          />
        ))}
      </div>
    </div>
  );
}