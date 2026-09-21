import { notFound } from "next/navigation";
import { getSeasonBySlug } from "@/lib/competition";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function teamInitials(name: string, shortName: string | null) {
  if (shortName) return shortName.slice(0, 3).toUpperCase();
  const words = name.split(" ").filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c1 3-3 4-3 7a3 3 0 0 0 6 0c0-1-.5-2-1-2.5 2 .5 4 2.5 4 5.5a6 6 0 0 1-12 0c0-4 3-4 3-8 0-1 .5-1.7 1-2z" />
    </svg>
  );
}

const rankStyles = [
  { badge: "bg-warning/15 border-warning/40 text-warning", num: "text-warning" },
  { badge: "bg-white/5 border-white/15 text-white/80", num: "text-white/70" },
  { badge: "bg-[#3a2a12]/40 border-[#c99a55]/40 text-[#e3b878]", num: "text-[#d9b98a]" },
];

export default async function LeaderboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await getSeasonBySlug(slug);
  if (!context) notFound();
  const { competition, season } = context;

  const entries = await prisma.entry.findMany({
    where: { seasonId: season.id, status: { not: "VOID" } },
    include: {
      participant: { select: { name: true, confirmedAt: true, anonymisedAt: true } },
      picks: { where: { outcome: "WIN" }, include: { team: { select: { name: true, shortName: true } } }, orderBy: { gameweek: { number: "asc" } } },
    },
  });

  const ranked = entries
    .map((entry) => ({ entry, streak: entry.picks.length }))
    .filter((row) => row.streak > 0)
    .sort((a, b) => b.streak - a.streak || a.entry.createdAt.getTime() - b.entry.createdAt.getTime())
    .slice(0, 20);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">{competition.name} · {season.name}</p>
        <h1 className="mt-1 text-2xl font-bold text-text">Streak leaderboard</h1>
        <p className="mt-1 text-sm text-text-secondary">Most rounds survived in a row, right now.</p>
      </div>

      <div className="overflow-hidden rounded-2xl bg-gradient-to-b from-nav to-[#060a10] shadow-sm">
        {ranked.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-white/60">No streaks yet — check back once a round or two has settled.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {ranked.map((row, index) => {
              const style = rankStyles[index] ?? { badge: "bg-white/5 border-white/10 text-white/60", num: "text-white/50" };
              const displayName = row.entry.participant.anonymisedAt
                ? "Removed entrant"
                : row.entry.participant.confirmedAt
                  ? row.entry.participant.name
                  : `${row.entry.participant.name} (unconfirmed)`;
              const lastTeam = row.entry.picks.at(-1)?.team;
              return (
                <li key={row.entry.id} className={`flex items-center gap-3 px-5 py-3 ${index < 3 ? "bg-white/[0.03]" : ""}`}>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-sm font-extrabold ${style.num}`}>{index + 1}</span>
                  {lastTeam && (
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-extrabold text-white">
                      {teamInitials(lastTeam.name, lastTeam.shortName)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{displayName}</p>
                    <p className="text-xs font-semibold text-white/50">Entry #{row.entry.number}</p>
                  </div>
                  <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${style.badge}`}>
                    <FlameIcon />
                    <span className="font-mono text-sm font-extrabold tabular-nums">{row.streak}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="text-xs text-text-secondary">Streak counts consecutive rounds won by each live or eliminated entry this season.</p>
    </div>
  );
}
