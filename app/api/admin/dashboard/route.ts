import { NextResponse } from "next/server";
import { getChatRatingStats } from "@/lib/cms/chat";
import { cmsDashboardStats } from "@/lib/cms/content";
import { requireAdmin } from "@/lib/cms/session";
import { readDb } from "@/lib/cms/store";

export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const db = readDb();
  const stats = cmsDashboardStats();
  const ratings = getChatRatingStats();
  const recentLeads = [...db.leads]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

  return NextResponse.json({
    ok: true,
    stats: {
      ...stats,
      chatRatingAverage: ratings.average,
      chatRatingCount: ratings.count,
    },
    recentLeads,
    recentRatings: ratings.recent.map((item) => ({
      id: item.id,
      rating: item.rating,
      comment: item.ratingComment || "",
      ratedAt: item.ratedAt,
      visitorName: item.visitorName || "Гість",
    })),
  });
}
