import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireSignedInUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/sign-in");
  return session.user;
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
