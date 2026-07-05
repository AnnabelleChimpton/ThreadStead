import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { SITE_NAME } from "@/lib/config/site/constants";
import { withThreadRingSupport } from "@/lib/api/ringhub/ringhub-middleware";
import { getRingHubClient } from "@/lib/api/ringhub/ringhub-client";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { rankSearchResults } from "@/lib/search/relevance";

interface SearchResult {
  type: 'threadring' | 'user' | 'post';
  id: string;
  title: string;
  description?: string;
  url: string;
  meta?: string;
}

export default withThreadRingSupport(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  system: 'ringhub' | 'local'
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const query = String(req.query.q || "").trim();
    const type = String(req.query.type || "all");
    const limit = Math.min(parseInt(String(req.query.limit || "20")), 50);

    // Unknown types used to silently return [] (e.g. type=threadring,
    // singular) — fail loudly instead.
    const ALLOWED_TYPES = ["all", "threadrings", "users", "posts"];
    if (!ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({
        error: `Invalid type "${type}" — expected one of: ${ALLOWED_TYPES.join(", ")}`,
      });
    }

    if (!query) {
      return res.json({ results: [] });
    }

    const viewer = await getSessionUser(req);
    const results: SearchResult[] = [];
    // Per-source failures are REPORTED, not swallowed: the old code caught
    // Ring Hub errors silently, so ring search read as "no results" for
    // months while every hub call failed.
    const sourceErrors: Array<{ source: string; message: string }> = [];

    // Search ThreadRings
    if (type === 'all' || type === 'threadrings') {
      if (system === 'ringhub') {
        // Use Ring Hub for ThreadRing search
        let ringHubClient;
        if (viewer) {
          ringHubClient = createAuthenticatedRingHubClient(viewer.id);
        } else {
          ringHubClient = getRingHubClient();
          if (!ringHubClient) {
            console.warn("Ring Hub client not configured, skipping ThreadRing search");
          }
        }

        if (ringHubClient) {
          try {
            const ringResult = await ringHubClient.listRings({
              search: query,
              limit,
              sort: 'members',
              order: 'desc'
            });

            const threadRingResults = ringResult.rings.map((descriptor: any) => ({
              type: 'threadring' as const,
              id: descriptor.id,
              title: descriptor.name,
              description: descriptor.description || undefined,
              url: `/rings/${descriptor.slug}`,
              meta: `${descriptor.memberCount || 0} members • ${descriptor.postCount || 0} posts`
            }));

            results.push(...threadRingResults);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("Ring Hub search failed:", {
              error: message,
              name: error instanceof Error ? error.name : undefined,
              query,
              authenticated: !!viewer,
            });
            sourceErrors.push({ source: "threadrings", message });
          }
        } else {
          sourceErrors.push({ source: "threadrings", message: "Ring Hub client not configured" });
        }
      } else {
        // Local ThreadRing search fallback
        const threadRings = await db.threadRing.findMany({
          where: {
            AND: [
              {
                visibility: {
                  in: ["public", "unlisted"]
                }
              },
              {
                OR: [
                  {
                    name: {
                      contains: query,
                      mode: "insensitive"
                    }
                  },
                  {
                    description: {
                      contains: query,
                      mode: "insensitive"
                    }
                  },
                  {
                    slug: {
                      contains: query,
                      mode: "insensitive"
                    }
                  }
                ]
              }
            ]
          },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            memberCount: true,
            postCount: true,
            createdAt: true
          },
          orderBy: [
            { memberCount: "desc" },
            { postCount: "desc" }
          ],
          take: limit
        });

        results.push(...threadRings.map(ring => ({
          type: 'threadring' as const,
          id: ring.id,
          title: ring.name,
          description: ring.description || undefined,
          url: `/rings/${ring.slug}`,
          meta: `${ring.memberCount} members • ${ring.postCount} posts`
        })));
      }
    }

    // Search Users
    if (type === 'all' || type === 'users') {
      const users = await db.user.findMany({
        where: {
          OR: [
            {
              handles: {
                some: {
                  handle: {
                    contains: query,
                    mode: "insensitive"
                  }
                }
              }
            },
            {
              profile: {
                displayName: {
                  contains: query,
                  mode: "insensitive"
                }
              }
            },
            {
              profile: {
                bio: {
                  contains: query,
                  mode: "insensitive"
                }
              }
            }
          ]
        },
        include: {
          handles: {
            take: 1,
            orderBy: { handle: "asc" }
          },
          profile: {
            select: {
              displayName: true,
              bio: true,
              avatarUrl: true
            }
          },
          _count: {
            select: {
              posts: {
                where: {
                  visibility: "public"
                }
              },
              followers: true
            }
          }
        },
        orderBy: [
          { createdAt: "desc" }
        ],
        take: limit
      });

      const transformedUsers = users
        .filter(user => user.handles.length > 0)
        .map(user => ({
          type: 'user' as const,
          id: user.id,
          title: user.profile?.displayName || user.handles[0]?.handle || 'Unknown User',
          description: user.profile?.bio || undefined,
          url: `/resident/${user.handles[0]?.handle}`,
          meta: `@${user.handles[0]?.handle} • ${user._count.posts} posts • ${user._count.followers} followers`
        }));

      results.push(...transformedUsers);
    }

    // Search Posts
    if (type === 'all' || type === 'posts') {
      const posts = await db.post.findMany({
        where: {
          AND: [
            {
              visibility: "public"
            },
            {
              OR: [
                {
                  title: {
                    contains: query,
                    mode: "insensitive"
                  }
                },
                {
                  bodyText: {
                    contains: query,
                    mode: "insensitive"
                  }
                },
                {
                  bodyMarkdown: {
                    contains: query,
                    mode: "insensitive"
                  }
                },
                {
                  bodyHtml: {
                    contains: query,
                    mode: "insensitive"
                  }
                },
                {
                  // Prisma's `has` is exact + case-sensitive on array
                  // elements; cover the common casings since stored tags
                  // aren't guaranteed normalized.
                  tags: {
                    hasSome: Array.from(new Set([query, query.toLowerCase(), query.toUpperCase()]))
                  }
                }
              ]
            }
          ]
        },
        include: {
          author: {
            include: {
              handles: {
                take: 1,
                orderBy: { handle: "asc" }
              },
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true
                }
              }
            }
          },
          _count: {
            select: {
              comments: {
                where: {
                  status: "visible"
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: limit
      });

      const transformedPosts = posts
        .filter(post => post.author.handles.length > 0)
        .map(post => {
          const authorHandle = post.author.handles[0]?.handle;
          const authorName = post.author.profile?.displayName || authorHandle;

          // Enhanced excerpt generation with context
          const generateExcerpt = (post: any, query: string): string | undefined => {
            // Combine all content fields, prioritizing bodyText
            const contents = [
              post.bodyText,
              post.bodyMarkdown,
              post.bodyHtml
            ].filter(Boolean);

            if (contents.length === 0) return undefined;

            let bestContent = contents[0];

            // Find the best content field that contains the query
            for (const content of contents) {
              if (content.toLowerCase().includes(query.toLowerCase())) {
                bestContent = content;
                break;
              }
            }

            // Strip HTML tags if content is HTML
            let cleanContent = bestContent;
            if (post.bodyHtml && bestContent === post.bodyHtml) {
              cleanContent = bestContent.replace(/<[^>]*>/g, '');
            }

            // Strip markdown formatting if content is markdown
            if (post.bodyMarkdown && bestContent === post.bodyMarkdown) {
              cleanContent = bestContent
                .replace(/#{1,6}\s+/g, '') // Remove headers
                .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
                .replace(/\*(.*?)\*/g, '$1') // Remove italic
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
                .replace(/`([^`]+)`/g, '$1'); // Remove inline code
            }

            // Try to find context around the search term
            const queryIndex = cleanContent.toLowerCase().indexOf(query.toLowerCase());
            if (queryIndex !== -1 && cleanContent.length > 150) {
              // Extract context around the match
              const start = Math.max(0, queryIndex - 75);
              const end = Math.min(cleanContent.length, queryIndex + query.length + 75);
              let excerpt = cleanContent.substring(start, end);

              // Add ellipsis if we truncated
              if (start > 0) excerpt = '...' + excerpt;
              if (end < cleanContent.length) excerpt = excerpt + '...';

              return excerpt;
            }

            // Fallback to simple truncation
            return cleanContent.length > 150
              ? cleanContent.substring(0, 150) + '...'
              : cleanContent;
          };

          const timeAgo = new Date(post.createdAt).toLocaleDateString();

          return {
            type: 'post' as const,
            id: post.id,
            title: post.title || 'Untitled Post',
            description: generateExcerpt(post, query) || undefined,
            url: `/resident/${authorHandle}/post/${post.id}`,
            meta: `by ${authorName} • ${timeAgo} • ${post._count.comments} comments`
          };
        });

      results.push(...transformedPosts);
    }

    // Rank by relevance (the old code SHUFFLED type=all results, burying
    // exact matches under keyword mentions). Exact title match first, then
    // prefix/word/substring, with a small type weight (ring > user > post).
    const ranked = rankSearchResults(results, query, limit);

    return res.json({
      results: ranked,
      query,
      type,
      total: ranked.length,
      // Sources that errored during this search — the UI shows a degraded
      // notice instead of pretending "no results".
      partial: sourceErrors.length > 0,
      errors: sourceErrors
    });

    } catch (error) {
    console.error("Error performing search:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});