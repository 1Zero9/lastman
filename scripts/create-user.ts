import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

const email = process.env.BOOTSTRAP_USER_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_USER_PASSWORD;
const displayName = process.env.BOOTSTRAP_USER_NAME?.trim();

if (!email || !password) {
  throw new Error("Set BOOTSTRAP_USER_EMAIL and BOOTSTRAP_USER_PASSWORD before running this script.");
}

if (password.length < 12) {
  throw new Error("BOOTSTRAP_USER_PASSWORD must be at least 12 characters long.");
}

const passwordHash = await bcrypt.hash(password, 12);
const user = await prisma.user.upsert({
  where: { email },
  update: { displayName: displayName || undefined, passwordHash },
  create: { email, displayName: displayName || null, passwordHash },
});

console.log(`Account ready for ${user.email}`);
await prisma.$disconnect();
