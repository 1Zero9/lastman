import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { lockGameweek } from "@/lib/engine";
import { prisma } from "@/lib/prisma";
import { publicFixturesTag } from "@/lib/public-fixtures";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const overdue = await prisma.gameweek.findMany({
    where: { status: "OPEN", deadlineAt: { lte: new Date() } },
    select: { id: true, season: { select: { competition: { select: { slug: true } } } } },
  });
  const results: Array<{ id: string; autopicks: number }> = [];
  for (const gameweek of overdue) {
    const result = await prisma.$transaction((tx) => lockGameweek(tx, gameweek.id));
    revalidateTag(publicFixturesTag(gameweek.season.competition.slug), "max");
    results.push({ id: gameweek.id, autopicks: result.autopicks });
  }
  return NextResponse.json({ processed: results.length, results });
}
