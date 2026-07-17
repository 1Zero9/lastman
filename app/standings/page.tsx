import { getPotSummary, getPublicSeason } from "@/lib/competition";
import { prisma } from "@/lib/prisma";
import { PotSummary } from "@/components/PotSummary";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-success/10 text-success",
  ELIMINATED: "bg-error/10 text-error",
  WINNER: "bg-accent/20 text-nav",
  PENDING_PAYMENT: "bg-warning/10 text-warning",
  VOID: "bg-border text-text-secondary",
};

export default async function StandingsPage() {
  const context = await getPublicSeason();
  if (!context) {
    return <div className="rounded-2xl bg-surface p-8 text-text-secondary ring-1 ring-border">No competition is running yet. Check back soon.</div>;
  }
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Standings</h1>
          <p className="mt-1 text-sm text-text-secondary">{competition.name} · {season.name}{season.league ? ` · ${season.league.name}` : ""}</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{alive} of {entries.length} still standing</span>
      </div>

      <PotSummary {...pot} />

      <div className="overflow-x-auto rounded-2xl shadow-sm ring-1 ring-border">
        <table className="min-w-full divide-y divide-border text-left text-sm">
          <thead>
            <tr className="bg-nav text-white">
              <th className="px-4 py-3 font-semibold">Entrant</th>
              <th className="px-4 py-3 font-semibold">Entry</th>
              {revealedGameweeks.map((gameweek) => (
                <th key={gameweek.id} className="px-3 py-3 text-center font-semibold">R{gameweek.number}</th>
              ))}
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {entries.length === 0 && (
              <tr><td colSpan={3 + revealedGameweeks.length} className="px-4 py-6 text-text-secondary">No entries yet.</td></tr>
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
                  <td className={`px-4 py-3 font-medium ${eliminated ? "text-text-secondary line-through" : "text-text"}`}>{displayName}</td>
                  <td className="px-4 py-3 text-text-secondary">#{entry.number}{entry.buyBackCount > 0 ? " · buy-back" : ""}</td>
                  {revealedGameweeks.map((gameweek) => {
                    const pick = entry.picks.find((item) => item.gameweekId === gameweek.id);
                    const outcomeClass = pick?.outcome === "WIN" ? "text-success" : pick?.outcome === "PENDING" ? "text-text" : pick?.outcome === "VOID" ? "text-text-secondary" : "text-error";
                    return (
                      <td key={gameweek.id} className={`px-3 py-3 text-center font-medium ${outcomeClass}`}>
                        {pick ? pick.team.shortName ?? pick.team.name : "–"}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[entry.status] ?? "bg-border text-text-secondary"}`}>
                      {entry.status.toLowerCase().replace("_", " ")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-text-secondary">Picks are revealed once a round locks. Entrants appear after they confirm their entry.</p>
    </div>
  );
}
