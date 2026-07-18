import { timingSafeEqual } from "node:crypto";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export function organiserCodeValid(code: string) {
  const expected = process.env.ORGANISER_ACCESS_CODE ?? "";
  if (!expected || !code) return false;
  const a = Buffer.from(code);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function hasOrganiserAccess(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { organiserApprovedAt: true, platformRole: true, memberships: { where: { role: { in: ["OWNER", "ADMIN"] } }, select: { id: true }, take: 1 } },
  });
  return Boolean(user.organiserApprovedAt) || ["PLATFORM_ADMIN", "BREAKGLASS_SUPPORT"].includes(user.platformRole) || user.memberships.length > 0;
}

export async function requireSignedInUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/sign-in");
  return session.user;
}

export async function requirePlatformAccess() {
  const user = await requireSignedInUser();
  const platformUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { platformRole: true, email: true, displayName: true, id: true } });
  if (!['PLATFORM_ADMIN', 'BREAKGLASS_SUPPORT'].includes(platformUser.platformRole)) redirect('/account');
  return platformUser;
}

export const ACTIVE_COMPETITION_COOKIE = "lms_active_competition";

export async function listAdminMemberships(userId: string) {
  return prisma.competitionMember.findMany({
    where: { userId, role: { in: ["OWNER", "ADMIN"] } },
    include: { competition: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getAdminContext() {
  const user = await requireSignedInUser();
  const memberships = await listAdminMemberships(user.id);
  if (!memberships.length) redirect("/admin/setup");

  const cookieStore = await cookies();
  const selectedId = cookieStore.get(ACTIVE_COMPETITION_COOKIE)?.value;
  const membership =
    memberships.find((item) => item.competitionId === selectedId) ??
    memberships.find((item) => item.competition.status !== "ARCHIVED") ??
    memberships[0];

  return { user, membership, competition: membership.competition, memberships };
}

export function moneyToCents(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : fallback;
}
