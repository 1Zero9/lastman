import { formatInTimeZone } from "date-fns-tz";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ClubWelcome } from "@/components/ClubWelcome";
import { Countdown } from "@/components/Countdown";
import { requireSignedInUser } from "@/lib/admin";
import { getPotSummary } from "@/lib/competition";
import { eligibleTeamIds } from "@/lib/engine";
import { prisma } from "@/lib/prisma";

type Rules = {
  noTeamRepeats?: boolean;
  restrictedTeamGroup?: string[];
  autopick?: { enabled?: boolean };
  buyBack?: { enabled?: boolean; maxPerEntry?: number };
};

const formatMoney = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(cents / 100);

function fail(message: string): never {
  redirect(`/my-entries?error=${encodeURIComponent(message)}`);
}

async function submitPick(formData: FormData) {
  "use server";

  const user = await requireSignedInUser();
  const entryId = String(formData.get("entryId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const entry = await prisma.entry.findFirst({
    where: { id: entryId, participant: { userId: user.id }, status: "ACTIVE" },
    include: { season: true },
  });
  if (!entry) fail("This entry is not available.");
  const gameweek = await prisma.gameweek.findFirst({
    where: { seasonId: entry.seasonId, status: "OPEN" },
    orderBy: { number: "asc" },
  });
  if (!gameweek || new Date() >= gameweek.deadlineAt) fail("The deadline for this round has passed.");
  const eligible = await eligibleTeamIds(prisma, entry.id, gameweek.id, entry.season.rules as Rules);
  if (!eligible.includes(teamId)) fail("That team is not available for this entry.");
  const team = await prisma.team.findUniqueOrThrow({ where: { id: teamId }, select: { name: true } });
  await prisma.pick.upsert({
    where: { entryId_gameweekId: { entryId: entry.id, gameweekId: gameweek.id } },
    update: { teamId, method: "MEMBER", submittedAt: new Date() },
    create: { entryId: entry.id, gameweekId: gameweek.id, teamId, method: "MEMBER" },
  });
  revalidatePath("/my-entries");
  redirect(`/my-entries?saved=${encodeURIComponent(team.name)}`);
}

export default async function MyEntriesPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { error, saved } = await searchParams;
  const user = await requireSignedInUser();
  await prisma.participant.updateMany({ where: { userId: null, email: user.email ?? "" }, data: { userId: user.id } });
  const participants = await prisma.participant.findMany({
    where: { userId: user.id, anonymisedAt: null },
    include: {
      competition: true,
      entries: {
        include: { season: true, picks: { include: { team: true, gameweek: true } } },
        orderBy: { number: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!participants.some((participant) => participant.entries.length)) {
    const [membership, account] = await Promise.all([
      prisma.competitionMember.findFirst({ where: { userId: user.id, role: { in: ["OWNER", "ADMIN"] } }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: user.id }, select: { organiserApprovedAt: true } }),
    ]);
    return (
      <div className="rounded-2xl bg-surface p-6 ring-1 ring-border">
        <h1 className="text-2xl font-bold text-text">My entries</h1>
        <p className="mt-3 text-text-secondary">No competition entries are linked to this account yet. Playing? Use the join link or code your organiser shared, or ask them to add you with this email address.</p>
        {membership ? (
          <Link href="/admin" className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 font-semibold text-white">Open the admin area</Link>
        ) : account?.organiserApprovedAt ? (
          <Link href="/admin/setup" className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 font-semibold text-white">Set up your fundraiser</Link>
        ) : null}
      </div>
    );
  }

  const host = (await headers()).get("host") ?? "";

  type OpenGameweek = NonNullable<Awaited<ReturnType<typeof getOpenGameweek>>>;
  function getOpenGameweek(seasonId: string) {
    return prisma.gameweek.findFirst({
      where: { seasonId, status: "OPEN" },
      orderBy: { number: "asc" },
      include: { fixtures: { include: { homeTeam: true, awayTeam: true }, orderBy: { kickoffAt: "asc" } } },
    });
  }

  const seasonInfo = new Map<string, {
    openGameweek: OpenGameweek | null;
    alive: number;
    total: number;
    winners: number;
    lastSettledNumber: number | null;
    pot: { raisedCents: number; prizeCents: number; clubCents: number; currency: string };
  }>();
  const eligibleByEntry = new Map<string, Set<string>>();

  for (const participant of participants) {
    for (const entry of participant.entries) {
      if (!seasonInfo.has(entry.seasonId)) {
        const [openGameweek, statusGroups, lastSettled, pot] = await Promise.all([
          getOpenGameweek(entry.seasonId),
          prisma.entry.groupBy({ by: ["status"], where: { seasonId: entry.seasonId, status: { not: "VOID" } }, _count: { _all: true } }),
          prisma.gameweek.findFirst({ where: { seasonId: entry.seasonId, status: "SETTLED" }, orderBy: { number: "desc" }, select: { number: true } }),
          getPotSummary(entry.seasonId, participant.competition),
        ]);
        const count = (status: string) => statusGroups.find((group) => group.status === status)?._count._all ?? 0;
        seasonInfo.set(entry.seasonId, {
          openGameweek,
          alive: count("ACTIVE") + count("WINNER"),
          total: statusGroups.reduce((sum, group) => sum + group._count._all, 0),
          winners: count("WINNER"),
          lastSettledNumber: lastSettled?.number ?? null,
          pot,
        });
      }
      const info = seasonInfo.get(entry.seasonId)!;
      if (entry.status === "ACTIVE" && info.openGameweek) {
        eligibleByEntry.set(entry.id, new Set(await eligibleTeamIds(prisma, entry.id, info.openGameweek.id, entry.season.rules as Rules)));
      }
    }
  }

  const welcomeParticipant = participants.find((participant) => participant.confirmedAt && participant.approvedAt && !participant.anonymisedAt && participant.competition.clubName);

  return (
    <div className="space-y-8">
      {welcomeParticipant && (
        <ClubWelcome
          competitionId={welcomeParticipant.competitionId}
          playerName={welcomeParticipant.name}
          clubName={welcomeParticipant.competition.clubName!}
          clubWebsite={welcomeParticipant.competition.clubWebsite}
          clubColor={welcomeParticipant.competition.clubColor}
          welcomeMessage={welcomeParticipant.competition.welcomeMessage}
        />
      )}
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Member area</p>
        <h1 className="mt-2 text-3xl font-bold text-text">My entries</h1>
      </div>
      {error && <div className="rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm font-semibold text-error">{error}</div>}
      {saved && <div className="rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm font-semibold text-success">Pick saved — you&apos;re on {saved}. You can change it any time before the deadline.</div>}

      {participants.filter((participant) => participant.entries.length).map((participant) => {
        const { competition } = participant;
        const seasonGroups = new Map<string, typeof participant.entries>();
        for (const entry of participant.entries) {
          const group = seasonGroups.get(entry.seasonId) ?? [];
          group.push(entry);
          seasonGroups.set(entry.seasonId, group);
        }

        return [...seasonGroups.entries()].map(([seasonId, entries]) => {
          const info = seasonInfo.get(seasonId)!;
          const season = entries[0].season;
          const rules = season.rules as Rules;
          const myLive = entries.filter((entry) => entry.status === "ACTIVE" || entry.status === "WINNER").length;
          const chancePct = info.alive > 0 ? Math.round((myLive / info.alive) * 100) : 0;
          const joinUrl = competition.joinCode ? `https://${host}/join/${competition.joinCode}` : null;
          const shareText = myLive > 0
            ? `⚽ ${competition.name}: I'm still standing${info.lastSettledNumber ? ` after Round ${info.lastSettledNumber}` : ""}! ${info.alive} of ${info.total} entries left — think you'd survive?${joinUrl ? ` Join in: ${joinUrl}` : ""}`
            : `⚽ I'm playing ${competition.name} — one team a round, last one standing wins.${joinUrl ? ` Join in: ${joinUrl}` : ""}`;
          const kickoffFormat = (date: Date) => formatInTimeZone(date, competition.timezone, "EEE d MMM, HH:mm");

          return (
            <section key={seasonId} className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-text">{competition.name}</h2>
                  <p className="mt-0.5 text-sm text-text-secondary">{season.name}</p>
                </div>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-success px-4 py-2.5 text-sm font-bold text-white transition hover:bg-success/90"
                >
                  Share on WhatsApp
                </a>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-nav p-4 text-white shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Still standing</p>
                  <p className="mt-1.5 text-2xl font-extrabold">{info.alive} <span className="text-sm font-semibold text-white/60">of {info.total}</span></p>
                </div>
                <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Prize pot</p>
                  <p className="mt-1.5 text-2xl font-extrabold text-text">{formatMoney(info.pot.prizeCents, info.pot.currency)}</p>
                </div>
                <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Your live entries</p>
                  <p className="mt-1.5 text-2xl font-extrabold text-text">{myLive} <span className="text-sm font-semibold text-text-secondary">of {entries.length}</span></p>
                </div>
                <div className="rounded-2xl bg-primary p-4 text-white shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Your chance</p>
                  <p className="mt-1.5 text-2xl font-extrabold">{myLive > 0 ? `${myLive} in ${info.alive}` : "—"}</p>
                  {myLive > 0 && <p className="text-xs font-semibold text-white/70">≈ {chancePct}% of the pot</p>}
                </div>
              </div>

              {entries.map((entry) => {
                const streak = entry.picks.filter((pick) => pick.outcome === "WIN").length;
                const usedIds = new Set(entry.picks.map((pick) => pick.teamId));
                const usedNames = [...entry.picks].sort((a, b) => a.gameweek.number - b.gameweek.number).map((pick) => pick.team.name);
                const gameweek = info.openGameweek;
                const pick = gameweek ? entry.picks.find((item) => item.gameweekId === gameweek.id) : undefined;
                const eligible = eligibleByEntry.get(entry.id) ?? new Set<string>();
                const deadlinePassed = gameweek ? new Date() >= gameweek.deadlineAt : false;
                const eliminationPick = entry.eliminatedGameweekId ? entry.picks.find((item) => item.gameweekId === entry.eliminatedGameweekId) : undefined;
                const buyBackAvailable = entry.status === "ELIMINATED" && rules.buyBack?.enabled && entry.buyBackCount < (rules.buyBack.maxPerEntry ?? 1) && season.status !== "COMPLETED";
                const prizeShare = info.winners > 0 ? Math.floor(info.pot.prizeCents / info.winners) : info.pot.prizeCents;

                if (entry.status === "WINNER") {
                  return (
                    <section key={entry.id} className="rounded-2xl bg-accent/15 p-6 shadow-sm ring-2 ring-accent">
                      <p className="text-3xl">🏆</p>
                      <h3 className="mt-2 text-xl font-extrabold text-text">Entry #{entry.number} — last one standing!</h3>
                      <p className="mt-2 text-text-secondary">
                        {info.winners > 1 ? `You share the prize with ${info.winners - 1} other ${info.winners === 2 ? "survivor" : "survivors"} — your share is about ` : "You take the prize pot of "}
                        <span className="font-bold text-text">{formatMoney(prizeShare, info.pot.currency)}</span>. Your organiser will be in touch about the payout.
                      </p>
                    </section>
                  );
                }

                if (entry.status === "ELIMINATED") {
                  return (
                    <section key={entry.id} className="rounded-2xl bg-error/5 p-6 shadow-sm ring-1 ring-error/30">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-bold text-text">Entry #{entry.number}</h3>
                        <span className="rounded-full bg-error/10 px-2.5 py-1 text-xs font-semibold text-error">knocked out</span>
                      </div>
                      <p className="mt-2 text-sm text-text-secondary">
                        {eliminationPick
                          ? `${eliminationPick.team.name} let you down in ${eliminationPick.gameweek.name}.`
                          : "This entry was knocked out."}
                        {streak > 0 ? ` A good run though — you survived ${streak} ${streak === 1 ? "round" : "rounds"}.` : ""}
                      </p>
                      {buyBackAvailable && (
                        <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">
                          <p className="text-sm font-bold text-text">Get back in the game for {formatMoney(competition.entryFeeCents, competition.currency)}</p>
                          <p className="mt-1 text-sm text-text-secondary">One buy-back is allowed per entry — pay your organiser and they&apos;ll bring this entry back to life. Every buy-back means more for the club too.</p>
                        </div>
                      )}
                      <p className="mt-4 text-xs text-text-secondary">Teams used: {usedNames.join(", ") || "None"}</p>
                    </section>
                  );
                }

                if (entry.status === "PENDING_PAYMENT") {
                  return (
                    <section key={entry.id} className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-bold text-text">Entry #{entry.number}</h3>
                        <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">awaiting payment</span>
                      </div>
                      <p className="mt-2 text-sm text-text-secondary">Pay {formatMoney(competition.entryFeeCents, competition.currency)} to your organiser to activate this entry — it goes live as soon as they confirm.</p>
                    </section>
                  );
                }

                return (
                  <section key={entry.id} className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-border">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-bold text-text">Entry #{entry.number}</h3>
                        <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">in the game</span>
                        {streak > 0 && <span className="rounded-full bg-accent/20 px-2.5 py-1 text-xs font-bold text-nav">🔥 {streak}-round streak</span>}
                        {entry.buyBackCount > 0 && <span className="rounded-full bg-border px-2.5 py-1 text-xs font-semibold text-text-secondary">buy-back</span>}
                      </div>
                      {gameweek && (
                        <div className="text-right">
                          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{gameweek.name} deadline</p>
                          <Countdown deadline={gameweek.deadlineAt.toISOString()} />
                        </div>
                      )}
                    </div>

                    {gameweek ? (
                      <div className="px-6 py-5">
                        {pick ? (
                          <div className="rounded-xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">
                            You&apos;re on {pick.team.name}{pick.method === "AUTOPICK" ? " (autopicked)" : ""}.{" "}
                            {!deadlinePassed && <span className="font-medium">Tap another team below to switch before the deadline.</span>}
                          </div>
                        ) : (
                          <div className="rounded-xl bg-warning/10 px-4 py-3 text-sm font-semibold text-text">
                            No pick yet — tap a team to lock it in.{" "}
                            {rules.autopick?.enabled !== false && <span className="font-medium text-text-secondary">Miss the deadline and you&apos;ll be auto-assigned the most popular team left.</span>}
                          </div>
                        )}

                        {deadlinePassed ? (
                          <p className="mt-4 text-sm text-text-secondary">The deadline has passed — picks for {gameweek.name} are locked.</p>
                        ) : (
                          <form action={submitPick} className="mt-4 space-y-2">
                            <input type="hidden" name="entryId" value={entry.id} />
                            {gameweek.fixtures.map((fixture) => {
                              const renderTeam = (team: { id: string; name: string }) => {
                                const isPicked = pick?.teamId === team.id;
                                const canPick = eligible.has(team.id);
                                if (isPicked) {
                                  return (
                                    <span className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-3 text-sm font-bold text-white shadow-sm">
                                      ✓ {team.name}
                                    </span>
                                  );
                                }
                                if (!canPick) {
                                  return (
                                    <span className="flex w-full flex-col items-center rounded-xl bg-background px-3 py-2 text-sm font-medium text-text-secondary/60 line-through">
                                      {team.name}
                                      <span className="text-[10px] font-semibold uppercase tracking-wide no-underline">{usedIds.has(team.id) ? "already used" : "top-6 used"}</span>
                                    </span>
                                  );
                                }
                                return (
                                  <button
                                    name="teamId"
                                    value={team.id}
                                    className="w-full rounded-xl border border-border bg-white px-3 py-3 text-sm font-bold text-text transition hover:border-primary hover:bg-primary/5 hover:text-primary"
                                  >
                                    {team.name}
                                  </button>
                                );
                              };
                              return (
                                <div key={fixture.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                  {renderTeam(fixture.homeTeam)}
                                  <span className="w-24 text-center text-[11px] font-semibold text-text-secondary">{kickoffFormat(fixture.kickoffAt)}</span>
                                  {renderTeam(fixture.awayTeam)}
                                </div>
                              );
                            })}
                          </form>
                        )}
                      </div>
                    ) : (
                      <p className="px-6 py-5 text-sm text-text-secondary">No round is open right now — you&apos;ll pick here as soon as the organiser opens the next one.</p>
                    )}
                    <p className="border-t border-border px-6 py-3 text-xs text-text-secondary">Teams used: {usedNames.join(", ") || "None yet"}</p>
                  </section>
                );
              })}
            </section>
          );
        });
      })}
    </div>
  );
}
