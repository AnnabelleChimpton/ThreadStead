/**
 * The longest a comment on a post can be: NewCommentForm's textarea and
 * pages/api/comments/[postId].ts both use it. Room for the markup and
 * image links the form inserts; there was no limit at all.
 */
export const COMMENT_MAX = 10_000;
