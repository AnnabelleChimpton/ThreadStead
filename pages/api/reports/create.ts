import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { ReportType, ReportReason } from "@prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const { 
    reportType, 
    targetId, 
    reason, 
    customReason, 
    description,
    reportedUserId 
  } = req.body as {
    reportType: ReportType;
    targetId: string;
    reason: ReportReason;
    customReason?: string;
    description?: string;
    reportedUserId?: string;
  };

  // Validate required fields
  if (!reportType || !targetId || !reason) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Validate reportType
  const validReportTypes: ReportType[] = ["user", "post", "comment", "threadring", "guestbook_entry", "photo_comment"];
  if (!validReportTypes.includes(reportType)) {
    return res.status(400).json({ error: "Invalid report type" });
  }

  // Validate reason
  const validReasons: ReportReason[] = ["spam", "harassment", "hate_speech", "violence", "misinformation", "sexual_content", "copyright", "other"];
  if (!validReasons.includes(reason)) {
    return res.status(400).json({ error: "Invalid reason" });
  }

  // If reason is "other", require customReason
  if (reason === "other" && !customReason?.trim()) {
    return res.status(400).json({ error: "Custom reason is required when selecting 'other'" });
  }

  try {
    // Check if user has already reported this content
    const existingReport = await db.userReport.findFirst({
      where: {
        reporterId: user.id,
        reportType,
        targetId
      }
    });

    if (existingReport) {
      return res.status(409).json({ error: "You have already reported this content" });
    }

    // Verify the reported content exists based on type
    let reportedUser: string | null = reportedUserId || null;
    
    switch (reportType) {
      case "user":
        const userExists = await db.user.findUnique({ where: { id: targetId } });
        if (!userExists) return res.status(404).json({ error: "User not found" });
        reportedUser = targetId;
        break;
        
      case "post":
        const post = await db.post.findUnique({ 
          where: { id: targetId }, 
          select: { authorId: true } 
        });
        if (!post) return res.status(404).json({ error: "Post not found" });
        reportedUser = post.authorId;
        break;
        
      case "comment":
        const comment = await db.comment.findUnique({ 
          where: { id: targetId }, 
          select: { authorId: true } 
        });
        if (!comment) return res.status(404).json({ error: "Comment not found" });
        reportedUser = comment.authorId;
        break;
        
      case "threadring":
        const threadRing = await db.threadRing.findUnique({ 
          where: { id: targetId }, 
          select: { curatorId: true } 
        });
        if (!threadRing) return res.status(404).json({ error: "ThreadRing not found" });
        reportedUser = threadRing.curatorId;
        break;
        
      case "guestbook_entry":
        const guestbookEntry = await db.guestbookEntry.findUnique({ 
          where: { id: targetId }, 
          select: { authorId: true } 
        });
        if (!guestbookEntry) return res.status(404).json({ error: "Guestbook entry not found" });
        reportedUser = guestbookEntry.authorId;
        break;
        
      case "photo_comment":
        const photoComment = await db.photoComment.findUnique({ 
          where: { id: targetId }, 
          select: { authorId: true } 
        });
        if (!photoComment) return res.status(404).json({ error: "Photo comment not found" });
        reportedUser = photoComment.authorId;
        break;
    }

    // Prevent self-reporting
    if (reportedUser === user.id) {
      return res.status(400).json({ error: "You cannot report your own content" });
    }

    // Create the report
    const report = await db.userReport.create({
      data: {
        reporterId: user.id,
        reportedUserId: reportedUser,
        reportType,
        targetId,
        reason,
        customReason: reason === "other" ? customReason?.trim() : null,
        description: description?.trim() || null
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

    res.status(201).json({ 
      message: "Report submitted successfully",
      report: {
        id: report.id,
        reportType: report.reportType,
        reason: report.reason,
        status: report.status,
        createdAt: report.createdAt
      }
    });

  } catch (error) {
    console.error("Error creating report:", error);
    res.status(500).json({ error: "Failed to create report" });
  }
}