import { calculateHotScore, GRAVITY } from "../ranking";

describe("calculateHotScore", () => {
    const NOW = 1672531200000; // 2023-01-01 00:00:00 UTC

    beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(NOW);
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    it("should rank posts with more comments higher", () => {
        const postA = {
            id: "1",
            createdAt: NOW - 1000 * 60 * 60, // 1 hour ago
            commentCount: 10,
            lastCommentAt: NOW - 1000 * 60 * 60
        };
        const postB = {
            id: "2",
            createdAt: NOW - 1000 * 60 * 60, // 1 hour ago
            commentCount: 5,
            lastCommentAt: NOW - 1000 * 60 * 60
        };

        expect(calculateHotScore(postA)).toBeGreaterThan(calculateHotScore(postB));
    });

    it("should rank recent posts higher than older posts with same comments", () => {
        const postA = {
            id: "1",
            createdAt: NOW - 1000 * 60 * 60, // 1 hour ago
            commentCount: 10,
            lastCommentAt: NOW - 1000 * 60 * 60
        };
        const postB = {
            id: "2",
            createdAt: NOW - 1000 * 60 * 60 * 24, // 24 hours ago
            commentCount: 10,
            lastCommentAt: NOW - 1000 * 60 * 60 * 24
        };

        expect(calculateHotScore(postA)).toBeGreaterThan(calculateHotScore(postB));
    });

    it("should boost older posts with recent comments", () => {
        const oldPostNoActivity = {
            id: "1",
            createdAt: NOW - 1000 * 60 * 60 * 24, // 24 hours ago
            commentCount: 5,
            lastCommentAt: NOW - 1000 * 60 * 60 * 24 // Last comment 24 hours ago
        };

        const oldPostRecentActivity = {
            id: "2",
            createdAt: NOW - 1000 * 60 * 60 * 24, // 24 hours ago
            commentCount: 5,
            lastCommentAt: NOW - 1000 * 60 * 5 // Last comment 5 mins ago
        };

        expect(calculateHotScore(oldPostRecentActivity)).toBeGreaterThan(calculateHotScore(oldPostNoActivity));
    });

    it("should handle posts with no comments", () => {
        const post = {
            id: "1",
            createdAt: NOW,
            commentCount: 0,
            lastCommentAt: null
        };

        // Score should be (1 - 0.5) / (0 + 2)^1.8 = 0.5 / 3.48...
        const expectedScore = 0.5 / Math.pow(2, GRAVITY);
        expect(calculateHotScore(post)).toBeCloseTo(expectedScore);
    });
});
