-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('MEMBER', 'PLATFORM_ADMIN', 'BREAKGLASS_SUPPORT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "platformRole" "PlatformRole" NOT NULL DEFAULT 'MEMBER';
