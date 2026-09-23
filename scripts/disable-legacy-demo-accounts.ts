import { PlatformRole } from "@prisma/client";
import { prisma } from "../lib/prisma";

const LEGACY_EMAILS = [
  "demo.admin@lastman.demo",
  "demo.organiser@lastman.demo",
  "demo.player@lastman.demo",
  "demo.pending@lastman.demo",
];

async function main() {
  const result = await prisma.user.updateMany({
    where: { email: { in: LEGACY_EMAILS } },
    data: { passwordHash: null, organiserApprovedAt: null, platformRole: PlatformRole.MEMBER },
  });
  console.log(`Disabled ${result.count} legacy demo logins.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
