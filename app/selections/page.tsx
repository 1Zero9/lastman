import { getPublicSeason } from "@/lib/competition";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SelectionsPage() {
  const context = await getPublicSeason();
  if (!context) {
    return <div className="rounded-2xl bg-surface p-8 text-text-secondary ring-1 ring-border">No competition is running yet. Check back soon.</div>;
  }
  const { competition, season } = context;

  const gameweeks = await prisma.gameweek.findMany({
    where: { seasonId: season.id, status: { in: ["LOCKED", "SETTLED"] } },
    orderBy: { number: "asc" },
    select: { id: true, number: true, name: true },
  });

  const picks = gameweeks.length
    ? await prisma.pick.groupBy({
        by: ["gameweekId", "teamId"],
        where: { gameweekId: { in: gameweeks.map((gameweek) => gameweek.id) } },
        _count: { _all: true },
      })
    : [];

  const teamIds = [...new Set(picks.map((pick) => pick.teamId))];
  const teams = teamIds.length
    ? await prisma.team.findMany({ where: { id: { in: teamIds } }, select: { id: true, name: true } })
    : [];
  const teamName = new Map(teams.map((team) => [team.id, team.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Selections</h1>
        <p className="mt-1 text-sm text-text-secondary">{competition.name} · {season.name} · pick counts are published after each round locks.</p>
      </div>

      {gameweeks.length === 0 && <div className="rounded-2xl bg-surface p-8 text-text-secondary ring-1 ring-border">No rounds have locked yet. Selections stay hidden until the deadline passes.</div>}

      {gameweeks.map((gameweek) => {
        const rows = picks
          .filter((pick) => pick.gameweekId === gameweek.id)
          .map((pick) => ({ team: teamName.get(pick.teamId) ?? "Unknown", count: pick._count._all }))
          .sort((a, b) => b.count - a.count || a.team.localeCompare(b.team));
        const total = rows.reduce((sum, row) => sum + row.count, 0);
        const max = rows[0]?.count ?? 1;
        return (
          <section key={gameweek.id} className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-text">{gameweek.name}</h2>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{total} picks</span>
            </div>
            <div className="mt-4 space-y-3">
              {rows.map((row) => (
                <div key={row.team} className="flex items-center gap-4">
                  <div className="w-40 shrink-0 truncate text-sm font-semibold text-text">{row.team}</div>
                  <div className="min-w-0 flex-1">
                    <div className="h-6 overflow-hidden rounded-lg bg-background">
                      <div className="flex h-full items-center justify-end rounded-lg bg-primary px-2" style={{ width: `${Math.max(4, (row.count / max) * 100)}%` }}>
                        <span className="text-xs font-bold text-white">{row.count}</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-12 shrink-0 text-right text-xs text-text-secondary">{total ? Math.round((row.count / total) * 100) : 0}%</div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
