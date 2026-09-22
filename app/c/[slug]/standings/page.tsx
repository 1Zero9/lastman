import { notFound } from "next/navigation";
import { getPotSummary, getSeasonBySlug } from "@/lib/competition";
import { prisma } from "@/lib/prisma";
import { PotSummary } from "@/components/PotSummary";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-accent/15 text-accent",
  ELIMINATED: "bg-error/15 text-red-300",
  WINNER: "bg-warning/20 text-warning",
  PENDING_PAYMENT: "bg-white/10 text-white/60",
  VOID: "bg-white/5 text-white/40",
};

export default async function StandingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await getSeasonBySlug(slug);
  if (!context) notFound();
  const { competition, season } = context;

  const [pot, entries, revealedGameweeks] = await Promise.all([
    getPotSummary(season.id, competition),
    prisma.entry.findMany({
      where: { seasonId: season.id, status: { not: "VOID" } },
      include: {
        participant: { select: { name: true, confirmedAt: true, anonymisedAt: true } },
        picks: { include: { team: { select: { shortName: true, name: true } } } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    }),
    prisma.gameweek.findMany({
      where: { seasonId: season.id, status: { in: ["LOCKED", "SETTLED", "CANCELLED"] } },
      orderBy: { number: "asc" },
      select: { id: true, number: true, status: true },
    }),
  ]);

  const alive = entries.filter((entry) => entry.status === "ACTIVE" || entry.status === "WINNER").length;

  return (
    <div className="space-y-6 rounded-3xl bg-[radial-gradient(120%_60%_at_50%_-10%,#1c3a2e_0%,#0b1520_55%,#060a10_100%)] p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Standings</h1>
          <p className="mt-1 text-sm text-white/50">{competition.name} · {season.name}{season.league ? ` · ${season.league.name}` : ""}</p>
        </div>
        <span className="rounded-full bg-accent/15 px-3 py-1 text-sm font-semibold text-accent">{alive} of {entries.length} still standing</span>
      </div>

      <PotSummary {...pot} />

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm">
          <thead>
            <tr className="bg-black/30 text-white">
              <th className="px-4 py-3 font-semibold">Entrant</th>
              <th className="px-4 py-3 font-semibold">Entry</th>
              {revealedGameweeks.map((gameweek) => (
                <th key={gameweek.id} className="px-3 py-3 text-center font-semibold">R{gameweek.number}</th>
              ))}
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 bg-white/5">
            {entries.length === 0 && (
              <tr><td colSpan={3 + revealedGameweeks.length} className="px-4 py-6 text-white/50">No entries yet.</td></tr>
            )}
            {entries.map((entry) => {
              const eliminated = entry.status === "ELIMINATED";
              const displayName = entry.participant.anonymisedAt
                ? "Removed entrant"
                : entry.participant.confirmedAt
                  ? entry.participant.name
                  : `${entry.participant.name} (unconfirmed)`;
              return (
                <tr key={entry.id} className={eliminated ? "bg-error/5" : undefined}>
                  <td className={`px-4 py-3 font-medium ${eliminated ? "text-white/40 line-through" : "text-white"}`}>{displayName}</td>
                  <td className="px-4 py-3 text-white/50">#{entry.number}{entry.buyBackCount > 0 ? " · buy-back" : ""}</td>
                  {revealedGameweeks.map((gameweek) => {
                    const pick = entry.picks.find((item) => item.gameweekId === gameweek.id);
                    const outcomeClass = pick?.outcome === "WIN" ? "text-accent" : pick?.outcome === "PENDING" ? "text-white" : pick?.outcome === "VOID" ? "text-white/40" : "text-red-300";
                    return (
                      <td key={gameweek.id} className={`px-3 py-3 text-center font-medium ${outcomeClass}`}>
                        {pick ? pick.team.shortName ?? pick.team.name : "–"}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[entry.status] ?? "bg-white/10 text-white/50"}`}>
                      {entry.status.toLowerCase().replace("_", " ")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-white/40">Picks are revealed once a round locks. Entrants appear after they confirm their entry.</p>
    </div>
  );
}
