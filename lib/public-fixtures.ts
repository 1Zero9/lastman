import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export function publicFixturesTag(slug: string) {
  return `public-fixtures:${slug}`;
}

// Cache only the anonymous fixtures read model; player data stays request-time.
export function getPublicFixtures(slug: string) {
  return unstable_cache(
    async () => {
      const competition = await prisma.competition.findFirst({
        where: { slug, status: { not: "DRAFT" } },
        include: { seasons: { orderBy: { createdAt: "desc" }, take: 1, include: { league: true } } },
      });
      const season = competition?.seasons[0];
      if (!competition || !season) return null;

      const gameweekMeta = await prisma.gameweek.findMany({
        where: { seasonId: season.id },
        select: { id: true, number: true, name: true, status: true, deadlineAt: true, _count: { select: { fixtures: true } } },
        orderBy: { number: "asc" },
      });
      const nextDraftGameweekId = gameweekMeta.find((gameweek) => gameweek.status === "DRAFT")?.id;
      const highlightedIds = gameweekMeta
        .filter((gameweek) => gameweek.status === "OPEN" || gameweek.status === "LOCKED" || gameweek.id === nextDraftGameweekId)
        .map((gameweek) => gameweek.id);
      const activeGameweeks = await prisma.gameweek.findMany({
        where: { id: { in: highlightedIds } },
        include: { fixtures: { include: { homeTeam: true, awayTeam: true }, orderBy: { kickoffAt: "asc" } } },
        orderBy: { number: "asc" },
      });

      return { competition, season, gameweekMeta, activeGameweeks };
    },
    ["public-fixtures", slug],
    { revalidate: 300, tags: [publicFixturesTag(slug)] },
  )();
}
