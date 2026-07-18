import { timingSafeEqual } from "node:crypto";
import { getServerSession } from "next-auth";
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

export async function getAdminContext() {
  const user = await requireSignedInUser();
  const membership = await prisma.competitionMember.findFirst({
    where: {
      userId: user.id,
      role: { in: ["OWNER", "ADMIN"] },
      competition: { status: { not: "ARCHIVED" } },
    },
    include: { competition: true },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) redirect("/admin/setup");
  return { user, membership, competition: membership.competition };
}

export function moneyToCents(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : fallback;
}
