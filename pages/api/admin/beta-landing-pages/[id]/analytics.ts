import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { requireAdmin } from "@/lib/auth/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid landing page ID" });
  }

  try {
    // Get basic landing page info
    const landingPage = await db.betaLandingPage.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            profile: { select: { displayName: true } },
            primaryHandle: true
          }
        }
      }
    });

    if (!landingPage) {
      return res.status(404).json({ error: "Landing page not found" });
    }

    // Get signup statistics
    const signupStats = await db.betaLandingSignup.groupBy({
      by: ['status'],
      where: { landingPageId: id },
      _count: { id: true }
    });

    // Get signup attempts statistics
    const attemptStats = await db.signupAttempt.groupBy({
      by: ['success'],
      where: { landingPageId: id },
      _count: { id: true }
    });

    // Get daily signup breakdown for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailySignups = await db.betaLandingSignup.findMany({
      where: {
        landingPageId: id,
        signupStartedAt: { gte: thirtyDaysAgo }
      },
      select: {
        signupStartedAt: true,
        signupCompletedAt: true,
        status: true
      },
      orderBy: { signupStartedAt: 'asc' }
    });

    // Get top IP addresses
    const topIPs = await db.betaLandingSignup.groupBy({
      by: ['ipAddress'],
      where: {
        landingPageId: id,
        ipAddress: { not: null }
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    });

    // Calculate conversion metrics
    const totalAttempts = attemptStats.reduce((sum, stat) => sum + stat._count.id, 0);
    const successfulAttempts = attemptStats.find(stat => stat.success)?._count.id || 0;
    const failedAttempts = attemptStats.find(stat => !stat.success)?._count.id || 0;

    const startedSignups = signupStats.find(stat => stat.status === 'started')?._count.id || 0;
    const completedSignups = signupStats.find(stat => stat.status === 'completed')?._count.id || 0;
    const abandonedSignups = signupStats.find(stat => stat.status === 'abandoned')?._count.id || 0;

    const totalSignups = startedSignups + completedSignups + abandonedSignups;
    const conversionRate = totalSignups > 0 ? (completedSignups / totalSignups * 100) : 0;
    const completionRate = startedSignups > 0 ? (completedSignups / startedSignups * 100) : 0;

    // Group daily data for chart
    const dailyData = dailySignups.reduce((acc, signup) => {
      const date = signup.signupStartedAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { started: 0, completed: 0, abandoned: 0 };
      }
      acc[date][signup.status]++;
      return acc;
    }, {} as Record<string, { started: number; completed: number; abandoned: number }>);

    // Calculate average time to complete
    const completedWithTime = dailySignups.filter(s =>
      s.status === 'completed' && s.signupCompletedAt && s.signupStartedAt
    );

    const averageTimeToComplete = completedWithTime.length > 0
      ? completedWithTime.reduce((sum, signup) => {
          const timeToComplete = signup.signupCompletedAt!.getTime() - signup.signupStartedAt.getTime();
          return sum + timeToComplete;
        }, 0) / completedWithTime.length
      : 0;

    const analytics = {
      landingPage: {
        id: landingPage.id,
        name: landingPage.name,
        slug: landingPage.slug,
        title: landingPage.title,
        isActive: landingPage.isActive,
        isPaused: landingPage.isPaused,
        signupLimit: landingPage.signupLimit,
        signupCount: landingPage.signupCount,
        limitReached: landingPage.limitReached,
        createdAt: landingPage.createdAt,
        endedAt: landingPage.endedAt
      },
      metrics: {
        totalAttempts,
        successfulAttempts,
        failedAttempts,
        totalSignups,
        startedSignups,
        completedSignups,
        abandonedSignups,
        conversionRate: Math.round(conversionRate * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        averageTimeToCompleteMinutes: Math.round(averageTimeToComplete / (1000 * 60))
      },
      dailyData: Object.entries(dailyData).map(([date, data]) => ({
        date,
        ...data
      })),
      topIPs: topIPs.map(ip => ({
        ipAddress: ip.ipAddress,
        signupCount: ip._count.id
      }))
    };

    return res.json({ analytics });
  } catch (error) {
    console.error("Error fetching beta landing page analytics:", error);
    return res.status(500).json({ error: "Failed to fetch analytics" });
  }
}