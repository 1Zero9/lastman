import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requirePlatformAccess } from "@/lib/admin";
import { defaultRules, makeSetupCode, makeSlug } from "@/lib/competition";
import { prisma } from "@/lib/prisma";

async function provisionOrganiser(formData: FormData) {
  "use server";
  const actor = await requirePlatformAccess();
  if (actor.platformRole !== "PLATFORM_ADMIN") throw new Error("Only a platform administrator can provision organiser access.");
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

async function generateSetupCode(formData: FormData) {
  "use server";
  const actor = await requirePlatformAccess();
  if (actor.platformRole !== "PLATFORM_ADMIN") throw new Error("Only a platform administrator can generate setup codes.");
  const label = String(formData.get("label") ?? "").trim() || null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = makeSetupCode();
    try {
      await prisma.competitionSetupCode.create({ data: { code, label, createdByUserId: actor.id } });
      revalidatePath("/platform");
      return;
    } catch {
      // code collision — try again with a fresh random code
    }
  }
  throw new Error("Could not generate a setup code. Please try again.");
}

async function revokeSetupCode(formData: FormData) {
  "use server";
  const actor = await requirePlatformAccess();
  if (actor.platformRole !== "PLATFORM_ADMIN") throw new Error("Only a platform administrator can revoke setup codes.");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Setup code not found.");
  await prisma.competitionSetupCode.deleteMany({ where: { id, usedAt: null } });
  revalidatePath("/platform");
}

async function toggleOrganiserAccess(formData: FormData) {
  "use server";
  const actor = await requirePlatformAccess();
  if (actor.platformRole !== "PLATFORM_ADMIN") throw new Error("Only a platform administrator can change organiser access.");
  const userId = String(formData.get("userId") ?? "");
  const grant = formData.get("grant") === "1";
  if (!userId) throw new Error("User not found.");
  await prisma.user.update({ where: { id: userId }, data: { organiserApprovedAt: grant ? new Date() : null } });
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
  const users = isAdmin ? await prisma.user.findMany({ select: { id: true, email: true, displayName: true, platformRole: true, organiserApprovedAt: true, createdAt: true, _count: { select: { memberships: true } } }, orderBy: { createdAt: "desc" } }) : [];
  const setupCodes = isAdmin ? await prisma.competitionSetupCode.findMany({ include: { usedBy: { select: { email: true, displayName: true } }, competition: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 50 }) : [];
  return <div className="space-y-8"><div><p className="text-sm font-semibold uppercase tracking-wide text-primary">{isAdmin ? "Platform administration" : "Break-glass support"}</p><h1 className="mt-2 text-3xl font-bold text-text">Projects & organiser recovery</h1><p className="mt-2 max-w-2xl text-text-secondary">This area intentionally excludes participant names, contact details, entries and picks. It is for project provisioning and organiser recovery only.</p></div>{isAdmin && <section className="rounded-2xl bg-surface p-6 ring-1 ring-border"><h2 className="font-bold text-text">Create project</h2><form action={createProject} className="mt-4 flex flex-wrap gap-3"><input name="name" placeholder="Project name" required className="rounded-xl border border-border px-4 py-3"/><input name="seasonName" placeholder="First season" required className="rounded-xl border border-border px-4 py-3"/><button className="rounded-xl bg-primary px-4 py-3 font-semibold text-white">Create project</button></form></section>}{isAdmin && <section className="overflow-hidden rounded-2xl bg-surface ring-1 ring-border"><div className="border-b border-border px-6 py-4"><h2 className="font-bold text-text">Competition setup codes</h2><p className="mt-1 text-sm text-text-secondary">Every new fundraiser needs one of these one-time codes to complete setup at <code>/admin/setup</code> — generate one here and send it to the organiser. Each code works once, for one competition, and this list is only visible to a platform admin.</p><form action={generateSetupCode} className="mt-4 flex flex-wrap gap-3"><input name="label" placeholder="Label (e.g. club or organiser name)" className="flex-1 rounded-xl border border-border px-4 py-3"/><button className="rounded-xl bg-primary px-4 py-3 font-semibold text-white">Generate code</button></form></div><div className="divide-y divide-border">{setupCodes.length === 0 && <p className="px-6 py-4 text-sm text-text-secondary">No setup codes yet.</p>}{setupCodes.map(c => <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"><div><p className="font-mono text-lg font-bold tracking-wider text-text">{c.code}</p><p className="mt-0.5 text-sm text-text-secondary">{c.label ?? "No label"} · {c.usedAt ? `used by ${c.usedBy?.displayName ?? c.usedBy?.email} for ${c.competition?.name ?? "a competition"}` : "unused"}</p></div>{!c.usedAt && <form action={revokeSetupCode}><input type="hidden" name="id" value={c.id}/><button className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-secondary">Revoke</button></form>}</div>)}</div></section>}<section className="rounded-2xl bg-surface p-6 ring-1 ring-border"><h2 className="font-bold text-text">Provision or recover organiser</h2><form action={provisionOrganiser} className="mt-4 grid gap-3 md:grid-cols-2"><select name="competitionId" required className="rounded-xl border border-border bg-white px-4 py-3"><option value="">Choose project</option>{competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><select name="role" className="rounded-xl border border-border bg-white px-4 py-3"><option value="ADMIN">Organiser</option><option value="OWNER">Owner</option></select><input name="displayName" placeholder="Organiser name" className="rounded-xl border border-border px-4 py-3"/><input name="email" type="email" placeholder="Organiser email" required className="rounded-xl border border-border px-4 py-3"/><input name="password" type="password" minLength={12} placeholder="Temporary password (12+ characters)" required className="rounded-xl border border-border px-4 py-3 md:col-span-2"/><button className="w-fit rounded-xl bg-nav px-4 py-3 font-semibold text-white md:col-span-2">Provision access</button></form></section>{isAdmin && <section className="overflow-hidden rounded-2xl bg-surface ring-1 ring-border"><div className="border-b border-border px-6 py-4"><h2 className="font-bold text-text">Organiser access</h2><p className="mt-1 text-sm text-text-secondary">Manually grant or revoke organiser status for an account — most organisers are granted this automatically when they redeem a setup code above.</p></div><div className="divide-y divide-border">{users.map(u => <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"><div><p className="font-semibold text-text">{u.displayName ?? u.email}</p><p className="mt-0.5 text-sm text-text-secondary">{u.email} · {u.platformRole !== "MEMBER" ? u.platformRole.toLowerCase().replace("_", " ") : u._count.memberships > 0 ? "organiser" : u.organiserApprovedAt ? "organiser (no competition yet)" : "player"}</p></div><form action={toggleOrganiserAccess}><input type="hidden" name="userId" value={u.id}/><input type="hidden" name="grant" value={u.organiserApprovedAt ? "0" : "1"}/><button className={u.organiserApprovedAt ? "rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-secondary" : "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"}>{u.organiserApprovedAt ? "Revoke organiser access" : "Grant organiser access"}</button></form></div>)}</div></section>}<section className="overflow-hidden rounded-2xl bg-surface ring-1 ring-border"><div className="border-b border-border px-6 py-4"><h2 className="font-bold text-text">Project health</h2></div><div className="divide-y divide-border">{competitions.map(c => <div key={c.id} className="px-6 py-4"><p className="font-semibold text-text">{c.name}</p><p className="mt-1 text-sm text-text-secondary">{c.seasons.map(s => s.name).join(", ") || "No season"} · {c._count.members} organisers · {c._count.participants} participant records</p></div>)}</div></section></div>;
}
