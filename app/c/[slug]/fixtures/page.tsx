import { formatInTimeZone } from "date-fns-tz";
import { notFound } from "next/navigation";
import { getCompetitionFixtures, getPublicFixtures } from "@/lib/public-fixtures";
import { isDemoCompetition } from "@/lib/demo";
import { requireCompetitionAccess } from "@/lib/admin";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  DRAFT: "bg-white/10 text-white/60",
  OPEN: "bg-accent/15 text-accent",
  LOCKED: "bg-warning/15 text-warning",
  SETTLED: "bg-white/10 text-white/50",
  CANCELLED: "bg-error/15 text-red-300",
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
  const demo = isDemoCompetition(slug);
  if (!demo) await requireCompetitionAccess(slug);
  const fixtureData = demo ? await getPublicFixtures(slug) : await getCompetitionFixtures(slug);
  if (!fixtureData) notFound();
  const { competition, season, gameweekMeta, activeGameweeks } = fixtureData;

  const formatDate = (date: Date) => formatInTimeZone(date, competition.timezone, "EEE d MMM, HH:mm");
  const activeGameweekIds = new Set(activeGameweeks.map((gameweek) => gameweek.id));
  const otherGameweeks = gameweekMeta.filter((gameweek) => !activeGameweekIds.has(gameweek.id));

  const renderGameweek = (gameweek: (typeof activeGameweeks)[number]) => (
    <article key={gameweek.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-white">{gameweek.name}</h2>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[gameweek.status]}`}>{gameweek.status.toLowerCase()}</span>
        </div>
        <p className="text-sm text-white/50">Pick deadline: {formatDate(gameweek.deadlineAt)}</p>
      </div>
      <div className="divide-y divide-white/10">
        {gameweek.fixtures.map((fixture) => (
          <div key={fixture.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
            <p className="min-w-0 flex-1 truncate text-right font-medium text-white">{fixture.homeTeam.name}</p>
            {fixture.status === "FINISHED" && fixture.homeScore !== null && fixture.awayScore !== null ? (
              <p className="shrink-0 rounded-lg bg-accent px-3 py-1 font-bold text-nav">{fixture.homeScore} – {fixture.awayScore}</p>
            ) : fixture.status === "POSTPONED" || fixture.status === "CANCELLED" ? (
              <p className="shrink-0 rounded-lg bg-error/15 px-3 py-1 text-xs font-semibold text-red-300">{fixture.status.toLowerCase()}</p>
            ) : (
              <p className="shrink-0 rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-white/60">{formatDate(fixture.kickoffAt)}</p>
            )}
            <p className="min-w-0 flex-1 truncate font-medium text-white">{fixture.awayTeam.name}</p>
          </div>
        ))}
      </div>
    </article>
  );

  const renderSummaryRow = (gameweek: GameweekMeta) => (
    <div key={gameweek.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
      <div className="flex items-center gap-2">
        <span className="font-bold text-white">{gameweek.name}</span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[gameweek.status]}`}>{gameweek.status.toLowerCase()}</span>
      </div>
      <p className="text-sm text-white/50">{gameweek._count.fixtures} fixture{gameweek._count.fixtures === 1 ? "" : "s"} · deadline {formatDate(gameweek.deadlineAt)}</p>
    </div>
  );

  return (
    <div className="space-y-6 rounded-3xl bg-[radial-gradient(120%_60%_at_50%_-10%,#1c3a2e_0%,#0b1520_55%,#060a10_100%)] p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Fixtures</h1>
        <p className="mt-1 text-sm text-white/50">{competition.name} · {season.name}{season.league ? ` · ${season.league.name}` : ""}</p>
      </div>

      {gameweekMeta.length === 0 && <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white/50">Fixtures will appear once the organiser publishes the schedule.</div>}

      <div className="space-y-6">
        {activeGameweeks.map(renderGameweek)}
        {otherGameweeks.length > 0 && (
          <details className="rounded-2xl border border-white/10 bg-white/5 p-2">
            <summary className="cursor-pointer select-none rounded-xl px-4 py-3 text-sm font-semibold text-white/60">
              {otherGameweeks.length} more gameweek{otherGameweeks.length === 1 ? "" : "s"}{" "}(upcoming &amp; settled) — click to show
            </summary>
            <div className="mt-2 space-y-3 p-2">{otherGameweeks.map(renderSummaryRow)}</div>
          </details>
        )}
      </div>
    </div>
  );
}
