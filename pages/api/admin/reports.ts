import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { ReportStatus } from "@prisma/client";
import { parsePagePagination } from "@/lib/server/http/pagination";

export default apiHandler(
  { methods: ["GET", "PATCH"], auth: "admin" },
  async (req, res, { user }) => {
    if (req.method === "GET") {
      try {
        const { status, type } = req.query;

        const { page: pageNum, limit: limitNum, skip } = parsePagePagination(req.query, { defaultLimit: 20, maxLimit: 100 });

        const where: any = {};

        if (status && status !== "all") {
          where.status = status as ReportStatus;
        }

        if (type && type !== "all") {
          where.reportType = type;
        }

        const [reports, totalCount] = await Promise.all([
          db.userReport.findMany({
            where,
            skip,
            take: limitNum,
            orderBy: { createdAt: "desc" },
            include: {
              reporter: {
                select: { 
                  id: true,
                  primaryHandle: true 
                }
              },
              reportedUser: {
                select: { 
                  id: true,
                  primaryHandle: true 
                }
              },
              reviewer: {
                select: { 
                  id: true,
                  primaryHandle: true 
                }
              }
            }
          }),
          db.userReport.count({ where })
        ]);

        // Enrich reports with target content info
        const enrichedReports = await Promise.all(
          reports.map(async (report) => {
            let targetContent = null;

            try {
              switch (report.reportType) {
                case "user":
                  const user = await db.user.findUnique({
                    where: { id: report.targetId },
                    select: { primaryHandle: true }
                  });
                  targetContent = { type: "user", handle: user?.primaryHandle };
                  break;

                case "post":
                  const post = await db.post.findUnique({
                    where: { id: report.targetId },
                    select: { title: true, createdAt: true }
                  });
                  targetContent = { type: "post", title: post?.title, createdAt: post?.createdAt };
                  break;

                case "comment":
                  const comment = await db.comment.findUnique({
                    where: { id: report.targetId },
                    select: { content: true, createdAt: true }
                  });
                  targetContent = { 
                    type: "comment", 
                    preview: comment?.content?.substring(0, 100) + (comment?.content && comment.content.length > 100 ? "..." : ""),
                    createdAt: comment?.createdAt 
                  };
                  break;

                case "threadring":
                  const threadRing = await db.threadRing.findUnique({
                    where: { id: report.targetId },
                    select: { name: true, slug: true }
                  });
                  targetContent = { type: "threadring", name: threadRing?.name, slug: threadRing?.slug };
                  break;

                case "guestbook_entry":
                  const guestbook = await db.guestbookEntry.findUnique({
                    where: { id: report.targetId },
                    select: { message: true, createdAt: true }
                  });
                  targetContent = { 
                    type: "guestbook_entry", 
                    preview: guestbook?.message?.substring(0, 100) + (guestbook?.message && guestbook.message.length > 100 ? "..." : ""),
                    createdAt: guestbook?.createdAt 
                  };
                  break;

                case "photo_comment":
                  const photoComment = await db.photoComment.findUnique({
                    where: { id: report.targetId },
                    select: { content: true, createdAt: true }
                  });
                  targetContent = { 
                    type: "photo_comment", 
                    preview: photoComment?.content?.substring(0, 100) + (photoComment?.content && photoComment.content.length > 100 ? "..." : ""),
                    createdAt: photoComment?.createdAt 
                  };
                  break;
              }
            } catch (error) {
              // Content might have been deleted
              targetContent = { type: report.reportType, deleted: true };
            }

            return {
              ...report,
              targetContent
            };
          })
        );

        res.status(200).json({
          reports: enrichedReports,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalCount,
            pages: Math.ceil(totalCount / limitNum)
          }
        });

      } catch (error) {
        console.error("Error fetching reports:", error);
        res.status(500).json({ error: "Failed to fetch reports" });
      }
    } 

    else if (req.method === "PATCH") {
      // Update report status
      try {
        const { reportId, status, resolution } = req.body;

        if (!reportId || !status) {
          return res.status(400).json({ error: "Report ID and status are required" });
        }

        const validStatuses: ReportStatus[] = ["pending", "reviewed", "resolved", "dismissed"];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ error: "Invalid status" });
        }

        const updatedReport = await db.userReport.update({
          where: { id: reportId },
          data: {
            status,
            resolution: resolution?.trim() || null,
            reviewedBy: user.id,
            reviewedAt: new Date()
          },
          include: {
            reporter: {
              select: { primaryHandle: true }
            },
            reportedUser: {
              select: { primaryHandle: true }
            }
          }
        });

        res.status(200).json({ 
          message: "Report updated successfully",
          report: updatedReport 
        });

      } catch (error) {
        console.error("Error updating report:", error);
        res.status(500).json({ error: "Failed to update report" });
      }
    }
  }
);
