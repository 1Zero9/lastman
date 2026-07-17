import { revalidatePath } from "next/cache";
import { requireSignedInUser } from "@/lib/admin";
import { eligibleTeamIds } from "@/lib/engine";
import { prisma } from "@/lib/prisma";

async function submitPick(formData: FormData) {
  "use server";
  const user = await requireSignedInUser();
  const entryId = String(formData.get("entryId")); const teamId = String(formData.get("teamId"));
  const entry = await prisma.entry.findFirst({ where: { id: entryId, participant: { userId: user.id }, status: "ACTIVE" }, include: { season: true } });
  if (!entry) throw new Error("This entry is not available.");
  const gameweek = await prisma.gameweek.findFirst({ where: { seasonId: entry.seasonId, status: "OPEN" }, orderBy: { number: "asc" } });
  if (!gameweek || new Date() >= gameweek.deadlineAt) throw new Error("Pick submission is closed.");
  const eligible = await eligibleTeamIds(prisma, entry.id, gameweek.id, entry.season.rules as { noTeamRepeats?: boolean; restrictedTeamGroup?: string[] });
  if (!eligible.includes(teamId)) throw new Error("That team is not eligible for this entry.");
  await prisma.pick.upsert({ where: { entryId_gameweekId: { entryId: entry.id, gameweekId: gameweek.id } }, update: { teamId, method: "MEMBER", submittedAt: new Date() }, create: { entryId: entry.id, gameweekId: gameweek.id, teamId, method: "MEMBER" } });
  revalidatePath("/my-entries");
}

export default async function MyEntriesPage() {
  const user = await requireSignedInUser();
  await prisma.participant.updateMany({ where: { userId: null, email: user.email ?? "" }, data: { userId: user.id } });
  const participants = await prisma.participant.findMany({ where: { userId: user.id }, include: { competition: true, entries: { include: { season: { include: { gameweeks: { where: { status: "OPEN" }, orderBy: { number: "asc" }, take: 1 } } }, picks: { include: { team: true, gameweek: true }, orderBy: { submittedAt: "desc" } } } } } });
  if (!participants.length) return <div className="rounded-2xl bg-surface p-6 ring-1 ring-border"><h1 className="text-2xl font-bold text-text">My entries</h1><p className="mt-3 text-text-secondary">No competition entries are linked to this account yet. Ask your organiser to add you using this email address.</p></div>;
  const cards = await Promise.all(participants.flatMap((participant) => participant.entries).map(async (entry) => { const gw = entry.season.gameweeks[0]; const pick = gw ? entry.picks.find((p) => p.gameweekId === gw.id) : undefined; const ids = gw && entry.status === "ACTIVE" ? await eligibleTeamIds(prisma, entry.id, gw.id, entry.season.rules as { noTeamRepeats?: boolean; restrictedTeamGroup?: string[] }) : []; const teams = ids.length ? await prisma.team.findMany({ where: { id: { in: ids } }, orderBy: { name: "asc" } }) : []; return <section key={entry.id} className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border"><div className="flex justify-between"><div><p className="font-bold text-text">{entry.season.name} · Entry #{entry.number}</p><p className="mt-1 text-sm text-text-secondary">{entry.status.toLowerCase().replace("_", " ")}</p></div></div>{gw && entry.status === "ACTIVE" ? <div className="mt-5"><p className="font-semibold text-text">{gw.name} · deadline {gw.deadlineAt.toLocaleString("en-IE")}</p>{pick ? <p className="mt-2 rounded-xl bg-success/10 p-3 text-sm font-medium text-success">Your pick: {pick.team.name}{pick.method === "AUTOPICK" ? " (autopick)" : ""}</p> : <form action={submitPick} className="mt-3 flex flex-wrap gap-3"><input type="hidden" name="entryId" value={entry.id}/><select name="teamId" required className="rounded-xl border border-border bg-white px-4 py-3">{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><button className="rounded-xl bg-primary px-4 py-3 font-semibold text-white">Save pick</button></form>}</div> : <p className="mt-5 text-sm text-text-secondary">No open gameweek is available for this entry.</p>}<p className="mt-4 text-xs text-text-secondary">Used teams: {entry.picks.map((p) => p.team.name).join(", ") || "None"}</p></section>; }));
  return <div className="space-y-6"><div><p className="text-sm font-semibold uppercase tracking-wide text-primary">Member area</p><h1 className="mt-2 text-3xl font-bold text-text">My entries</h1></div>{cards}</div>;
}
