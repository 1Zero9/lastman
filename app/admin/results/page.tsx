import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { getAdminContext } from "@/lib/admin";
import { lockGameweek, settleGameweek, voidGameweek } from "@/lib/engine";
import { prisma } from "@/lib/prisma";
import { publicFixturesTag } from "@/lib/public-fixtures";

function fail(message: string): never {
  redirect(`/admin/results?error=${encodeURIComponent(message)}`);
}

async function lock(formData: FormData) {
  "use server";

  const { user, competition } = await getAdminContext();
  const id = String(formData.get("id") ?? "");
  const gameweek = await prisma.gameweek.findFirst({ where: { id, season: { competitionId: competition.id } } });
  if (!gameweek) fail("Gameweek not found.");
  try {
    await prisma.$transaction((tx) => lockGameweek(tx, id, user.id));
  } catch (error) {
    fail(error instanceof Error ? error.message : "Could not lock this gameweek.");
  }
  updateTag(publicFixturesTag(competition.slug));
  revalidatePath("/admin/results");
}

async function score(formData: FormData) {
  "use server";

  const { user, competition } = await getAdminContext();
  const id = String(formData.get("id") ?? "");
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));
  const fixture = await prisma.fixture.findFirst({ where: { id, gameweek: { season: { competitionId: competition.id } } } });
  if (!fixture) fail("Fixture not found.");
  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) {
    fail("Enter a valid final score for both teams.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.fixture.update({ where: { id }, data: { homeScore, awayScore, status: "FINISHED" } });
    await tx.auditEvent.create({
      data: { competitionId: competition.id, actorId: user.id, type: "fixture.result_recorded", entityType: "Fixture", entityId: id, payload: { homeScore, awayScore } },
    });
  });
  updateTag(publicFixturesTag(competition.slug));
  revalidatePath("/admin/results");
}

async function settle(formData: FormData) {
  "use server";

  const { user, competition } = await getAdminContext();
  const id = String(formData.get("id") ?? "");
  const gameweek = await prisma.gameweek.findFirst({ where: { id, season: { competitionId: competition.id } } });
  if (!gameweek) fail("Gameweek not found.");
  let result: { eliminated: number; wipeout: string | null };
  try {
    result = await prisma.$transaction((tx) => settleGameweek(tx, id, user.id));
  } catch (error) {
    fail(error instanceof Error ? error.message : "Could not settle this gameweek.");
  }
  updateTag(publicFixturesTag(competition.slug));
  revalidatePath("/admin/results");
  revalidatePath("/my-entries");
  revalidatePath("/standings");
  revalidatePath("/leaderboard");
  const params = new URLSearchParams({ settled: gameweek.name, eliminated: String(result.eliminated) });
  if (result.wipeout) params.set("wipeout", result.wipeout);
  redirect(`/admin/results?${params.toString()}`);
}

async function voidRound(formData: FormData) {
  "use server";

  const { user, competition } = await getAdminContext();
  const id = String(formData.get("id") ?? "");
  const gameweek = await prisma.gameweek.findFirst({ where: { id, season: { competitionId: competition.id } } });
  if (!gameweek) fail("Gameweek not found.");
  try {
    await prisma.$transaction((tx) => voidGameweek(tx, id, user.id));
  } catch (error) {
    fail(error instanceof Error ? error.message : "Could not void this gameweek.");
  }
  updateTag(publicFixturesTag(competition.slug));
  revalidatePath("/admin/results");
  revalidatePath("/my-entries");
  revalidatePath("/standings");
}

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ error?: string; settled?: string; eliminated?: string; wipeout?: string }> }) {
  const { error, settled, eliminated, wipeout } = await searchParams;
  const { competition } = await getAdminContext();
  const season = await prisma.season.findFirstOrThrow({ where: { competitionId: competition.id }, orderBy: { createdAt: "desc" } });
  const weeks = await prisma.gameweek.findMany({
    where: { seasonId: season.id, status: { in: ["OPEN", "LOCKED"] } },
    include: { fixtures: { include: { homeTeam: true, awayTeam: true } } },
    orderBy: { number: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin</p>
        <h1 className="mt-2 text-3xl font-bold text-text">Lock &amp; settle gameweeks</h1>
      </div>

      {error && <div className="rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm font-semibold text-error">{error}</div>}
      {settled && (
        <div className="rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm text-text">
          <p className="font-semibold text-success">{settled} settled — {eliminated} {eliminated === "1" ? "entry" : "entries"} eliminated.</p>
          {wipeout === "split_winners" && (
            <p className="mt-1">Every remaining entry lost this round, and the field was small enough to split the prize — those entries are now marked as joint winners and the season is complete.</p>
          )}
          {wipeout === "rollover" && (
            <p className="mt-1">Every remaining entry lost this round. With the field this size, none of them are out — they&apos;ve all been rolled back to active so the competition can continue next round.</p>
          )}
        </div>
      )}

      {weeks.map((gameweek) => {
        const allScored = gameweek.fixtures.length > 0 && gameweek.fixtures.every((fixture) => fixture.status === "FINISHED");
        return (
          <section key={gameweek.id} className="rounded-2xl bg-surface p-6 ring-1 ring-border">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-text">{gameweek.name}</h2>
                <p className="text-sm text-text-secondary">{gameweek.status.toLowerCase()}</p>
              </div>
              <div className="flex gap-2">
                {gameweek.status === "OPEN" && (
                  <form action={lock}>
                    <input type="hidden" name="id" value={gameweek.id} />
                    <button className="rounded-xl bg-nav px-4 py-2 font-semibold text-white">Lock &amp; autopick</button>
                  </form>
                )}
                <form action={voidRound}>
                  <input type="hidden" name="id" value={gameweek.id} />
                  <button className="rounded-xl border border-error px-4 py-2 font-semibold text-error" title="Void this round: no one is eliminated, and every pick this round is returned as a bye — it won't count as used or toward the restricted-group limit.">
                    Void round
                  </button>
                </form>
              </div>
            </div>

            {gameweek.status === "LOCKED" && (
              <div className="mt-5 space-y-3">
                {gameweek.fixtures.map((fixture) => (
                  <form key={fixture.id} action={score} className="flex flex-wrap items-center gap-2 rounded-xl bg-background p-3">
                    <input type="hidden" name="id" value={fixture.id} />
                    <span className="min-w-44 font-medium text-text">{fixture.homeTeam.name} v {fixture.awayTeam.name}</span>
                    <input name="homeScore" type="number" min="0" defaultValue={fixture.homeScore ?? undefined} className="w-16 rounded border border-border p-2" />
                    <span>–</span>
                    <input name="awayScore" type="number" min="0" defaultValue={fixture.awayScore ?? undefined} className="w-16 rounded border border-border p-2" />
                    <button className="rounded-lg border border-border px-3 py-2 text-sm font-semibold">Save result</button>
                    {fixture.status === "FINISHED" && <span className="text-xs font-semibold text-success">✓ recorded</span>}
                  </form>
                ))}
                {allScored ? (
                  <form action={settle}>
                    <input type="hidden" name="id" value={gameweek.id} />
                    <button className="rounded-xl bg-primary px-4 py-3 font-semibold text-white">Settle gameweek</button>
                  </form>
                ) : (
                  <p className="rounded-xl bg-warning/10 px-4 py-3 text-sm font-semibold text-warning">
                    Enter a final score for every fixture above before you can settle this round.
                  </p>
                )}
              </div>
            )}
          </section>
        );
      })}
      {weeks.length === 0 && <p className="rounded-2xl bg-surface p-6 text-text-secondary ring-1 ring-border">No open or locked gameweeks.</p>}
    </div>
  );
}
