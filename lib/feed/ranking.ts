export const GRAVITY = 1.8;

export interface RankablePost {
    id: string;
    createdAt: Date | string | number;
    commentCount: number;
    lastCommentAt?: Date | string | number | null;
}

export function calculateHotScore(post: RankablePost): number {
    const points = post.commentCount + 1; // Base score

    // Calculate time in hours since submission
    // We use the LATEST activity time (post creation or last comment) to bump up active discussions
    const lastActivity = post.lastCommentAt
        ? new Date(post.lastCommentAt).getTime()
        : new Date(post.createdAt).getTime();

    const now = Date.now();
    const ageHours = Math.max(0, (now - lastActivity) / (1000 * 60 * 60));

    // Hacker News / Reddit style gravity decay
    // Score = (P - 0.5) / (T + 2)^G
    const score = (points - 0.5) / Math.pow(ageHours + 2, GRAVITY);

    return score;
}
