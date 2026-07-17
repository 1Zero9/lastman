import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requirePlatformAccess } from "@/lib/admin";
import { defaultRules, makeSlug } from "@/lib/competition";
import { prisma } from "@/lib/prisma";

async function provisionOrganiser(formData: FormData) {
  "use server";
  const actor = await requirePlatformAccess();
  const competitionId = String(formData.get("competitionId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "ADMIN");
  if (!competitionId || !email || password.length < 12 || !["OWNER", "ADMIN"].includes(role)) throw new Error("Enter an organiser email, a 12+ character temporary password, and a role.");
  const competition = await prisma.competition.findUnique({ where: { id: competitionId } });
  if (!competition) throw new Error("Competition not found.");
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({ where: { email }, update: { displayName: displayName || undefined, passwordHash }, create: { email, displayName: displayName || null, passwordHash } });
    await tx.competitionMember.upsert({ where: { competitionId_userId: { competitionId, userId: user.id } }, update: { role: role as "OWNER" | "ADMIN" }, create: { competitionId, userId: user.id, role: role as "OWNER" | "ADMIN" } });
    await tx.auditEvent.create({ data: { competitionId, actorId: actor.id, type: "organiser.provisioned", entityType: "CompetitionMember", entityId: user.id, payload: { role } } });
  });
  revalidatePath("/platform");
}

async function createProject(formData: FormData) {
  "use server";
  const actor = await requirePlatformAccess();
  if (actor.platformRole !== "PLATFORM_ADMIN") throw new Error("Only a platform administrator can create a project.");
  const name = String(formData.get("name") ?? "").trim(); const seasonName = String(formData.get("seasonName") ?? "").trim();
  if (!name || !seasonName) throw new Error("Project and season names are required.");
  const suffix = crypto.randomUUID().slice(0, 8);
  await prisma.$transaction(async (tx) => { const competition = await tx.competition.create({ data: { name, slug: `${makeSlug(name)}-${suffix}`, status: "DRAFT" } }); await tx.season.create({ data: { competitionId: competition.id, name: seasonName, slug: `${makeSlug(seasonName)}-${suffix}`, rules: defaultRules, status: "DRAFT" } }); await tx.auditEvent.create({ data: { competitionId: competition.id, actorId: actor.id, type: "project.provisioned", entityType: "Competition", entityId: competition.id } }); });
  revalidatePath("/platform");
}

export default async function PlatformPage() {
  const actor = await requirePlatformAccess();
  const competitions = await prisma.competition.findMany({ include: { seasons: { select: { id: true, name: true, status: true } }, _count: { select: { participants: true, members: true } } }, orderBy: { createdAt: "desc" } });
  const isAdmin = actor.platformRole === "PLATFORM_ADMIN";
  return <div className="space-y-8"><div><p className="text-sm font-semibold uppercase tracking-wide text-primary">{isAdmin ? "Platform administration" : "Break-glass support"}</p><h1 className="mt-2 text-3xl font-bold text-text">Projects & organiser recovery</h1><p className="mt-2 max-w-2xl text-text-secondary">This area intentionally excludes participant names, contact details, entries and picks. It is for project provisioning and organiser recovery only.</p></div>{isAdmin && <section className="rounded-2xl bg-surface p-6 ring-1 ring-border"><h2 className="font-bold text-text">Create project</h2><form action={createProject} className="mt-4 flex flex-wrap gap-3"><input name="name" placeholder="Project name" required className="rounded-xl border border-border px-4 py-3"/><input name="seasonName" placeholder="First season" required className="rounded-xl border border-border px-4 py-3"/><button className="rounded-xl bg-primary px-4 py-3 font-semibold text-white">Create project</button></form></section>}<section className="rounded-2xl bg-surface p-6 ring-1 ring-border"><h2 className="font-bold text-text">Provision or recover organiser</h2><form action={provisionOrganiser} className="mt-4 grid gap-3 md:grid-cols-2"><select name="competitionId" required className="rounded-xl border border-border bg-white px-4 py-3"><option value="">Choose project</option>{competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><select name="role" className="rounded-xl border border-border bg-white px-4 py-3"><option value="ADMIN">Organiser</option><option value="OWNER">Owner</option></select><input name="displayName" placeholder="Organiser name" className="rounded-xl border border-border px-4 py-3"/><input name="email" type="email" placeholder="Organiser email" required className="rounded-xl border border-border px-4 py-3"/><input name="password" type="password" minLength={12} placeholder="Temporary password (12+ characters)" required className="rounded-xl border border-border px-4 py-3 md:col-span-2"/><button className="w-fit rounded-xl bg-nav px-4 py-3 font-semibold text-white md:col-span-2">Provision access</button></form></section><section className="overflow-hidden rounded-2xl bg-surface ring-1 ring-border"><div className="border-b border-border px-6 py-4"><h2 className="font-bold text-text">Project health</h2></div><div className="divide-y divide-border">{competitions.map(c => <div key={c.id} className="px-6 py-4"><p className="font-semibold text-text">{c.name}</p><p className="mt-1 text-sm text-text-secondary">{c.seasons.map(s => s.name).join(", ") || "No season"} · {c._count.members} organisers · {c._count.participants} participant records</p></div>)}</div></section></div>;
}
