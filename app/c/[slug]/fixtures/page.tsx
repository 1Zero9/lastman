import { formatInTimeZone } from "date-fns-tz";
import { notFound } from "next/navigation";
import { getSeasonBySlug } from "@/lib/competition";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  DRAFT: "bg-border text-text-secondary",
  OPEN: "bg-success/10 text-success",
  LOCKED: "bg-nav/10 text-nav",
  SETTLED: "bg-info/10 text-info",
  CANCELLED: "bg-error/10 text-error",
};

type GameweekMeta = {
  id: string;
  number: number;
  name: string;
  status: keyof typeof statusStyles;
  deadlineAt: Date;
  _count: { fixtures: number };
};

export default async function FixturesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await getSeasonBySlug(slug);
  if (!context) notFound();
  const { competition, season } = context;

  const gameweekMeta = await prisma.gameweek.findMany({
    where: { seasonId: season.id },
    select: { id: true, number: true, name: true, status: true, deadlineAt: true, _count: { select: { fixtures: true } } },
    orderBy: { number: "asc" },
  });

  const formatDate = (date: Date) => formatInTimeZone(date, competition.timezone, "EEE d MMM, HH:mm");
  const nextDraftGameweekId = gameweekMeta.find((gameweek) => gameweek.status === "DRAFT")?.id;
  const highlightedIds = gameweekMeta
    .filter((gameweek) => gameweek.status === "OPEN" || gameweek.status === "LOCKED" || gameweek.id === nextDraftGameweekId)
    .map((gameweek) => gameweek.id);
  const otherGameweeks = gameweekMeta.filter((gameweek) => !highlightedIds.includes(gameweek.id));

  // Full fixture + team detail only for the handful shown open by default — the collapsed set below
  // (usually most of a season) is metadata-only, same fix as admin/schedule: a public, unauthenticated
  // page shouldn't pay for every round's fixtures+teams on every single load.
  const activeGameweeks = await prisma.gameweek.findMany({
    where: { id: { in: highlightedIds } },
    include: { fixtures: { include: { homeTeam: true, awayTeam: true }, orderBy: { kickoffAt: "asc" } } },
    orderBy: { number: "asc" },
  });

  const renderGameweek = (gameweek: (typeof activeGameweeks)[number]) => (
    <article key={gameweek.id} className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-text">{gameweek.name}</h2>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[gameweek.status]}`}>{gameweek.status.toLowerCase()}</span>
        </div>
        <p className="text-sm text-text-secondary">Pick deadline: {formatDate(gameweek.deadlineAt)}</p>
      </div>
      <div className="divide-y divide-border">
        {gameweek.fixtures.map((fixture) => (
          <div key={fixture.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
            <p className="min-w-0 flex-1 truncate text-right font-medium text-text">{fixture.homeTeam.name}</p>
            {fixture.status === "FINISHED" && fixture.homeScore !== null && fixture.awayScore !== null ? (
              <p className="shrink-0 rounded-lg bg-nav px-3 py-1 font-bold text-white">{fixture.homeScore} – {fixture.awayScore}</p>
            ) : fixture.status === "POSTPONED" || fixture.status === "CANCELLED" ? (
              <p className="shrink-0 rounded-lg bg-error/10 px-3 py-1 text-xs font-semibold text-error">{fixture.status.toLowerCase()}</p>
            ) : (
              <p className="shrink-0 rounded-lg bg-background px-3 py-1 text-xs font-semibold text-text-secondary">{formatDate(fixture.kickoffAt)}</p>
            )}
            <p className="min-w-0 flex-1 truncate font-medium text-text">{fixture.awayTeam.name}</p>
          </div>
        ))}
      </div>
    </article>
  );

  const renderSummaryRow = (gameweek: GameweekMeta) => (
    <div key={gameweek.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface px-5 py-4 shadow-sm ring-1 ring-border">
      <div className="flex items-center gap-2">
        <span className="font-bold text-text">{gameweek.name}</span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[gameweek.status]}`}>{gameweek.status.toLowerCase()}</span>
      </div>
      <p className="text-sm text-text-secondary">{gameweek._count.fixtures} fixture{gameweek._count.fixtures === 1 ? "" : "s"} · deadline {formatDate(gameweek.deadlineAt)}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Fixtures</h1>
        <p className="mt-1 text-sm text-text-secondary">{competition.name} · {season.name}{season.league ? ` · ${season.league.name}` : ""}</p>
      </div>

      {gameweekMeta.length === 0 && <div className="rounded-2xl bg-surface p-8 text-text-secondary ring-1 ring-border">Fixtures will appear once the organiser publishes the schedule.</div>}

      <div className="space-y-6">
        {activeGameweeks.map(renderGameweek)}
        {otherGameweeks.length > 0 && (
          <details className="rounded-2xl bg-surface p-2 shadow-sm ring-1 ring-border">
            <summary className="cursor-pointer select-none rounded-xl px-4 py-3 text-sm font-semibold text-text-secondary">
              {otherGameweeks.length} more gameweek{otherGameweeks.length === 1 ? "" : "s"}{" "}(upcoming &amp; settled) — click to show
            </summary>
            <div className="mt-2 space-y-3 p-2">{otherGameweeks.map(renderSummaryRow)}</div>
          </details>
        )}
      </div>
    </div>
  );
}
