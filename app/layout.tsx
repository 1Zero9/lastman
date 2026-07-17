import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { HeaderLogo } from "@/components/HeaderLogo";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildClubTheme } from "@/lib/club-theme";
import { APP_NAME, APP_VERSION } from "@/lib/app-info";
import { PwaRegister } from "@/components/PwaRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "A fundraising competition platform.",
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/lms-logo.png", type: "image/png" }],
    apple: [{ url: "/lms-logo.png", type: "image/png" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  let isOrganiser = false;
  let isPlatform = false;
  let clubColor: string | null = null;
  if (session?.user?.id) {
    const [membership, platformUser, participant] = await Promise.all([
      prisma.competitionMember.findFirst({
        where: { userId: session.user.id, role: { in: ["OWNER", "ADMIN"] }, competition: { status: { not: "ARCHIVED" } } },
        select: { competition: { select: { status: true, clubColor: true } } },
      }),
      prisma.user.findUnique({ where: { id: session.user.id }, select: { platformRole: true } }),
      prisma.participant.findFirst({
        where: { userId: session.user.id, anonymisedAt: null, competition: { status: "ACTIVE" } },
        orderBy: { createdAt: "desc" },
        select: { competition: { select: { clubColor: true } } },
      }),
    ]);
    isOrganiser = Boolean(membership);
    isPlatform = ["PLATFORM_ADMIN", "BREAKGLASS_SUPPORT"].includes(platformUser?.platformRole ?? "");
    clubColor =
      participant?.competition.clubColor ??
      (membership?.competition.status === "ACTIVE" ? membership.competition.clubColor : null);
  }
  const clubTheme = clubColor ? buildClubTheme(clubColor) : null;
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
        style={(clubTheme as React.CSSProperties | null) ?? undefined}
      >
        <PwaRegister />
        <header className="sticky top-0 z-30 border-b border-white/10 bg-nav/95 shadow-lg backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <HeaderLogo />
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold tracking-tight text-white md:text-xl">
                Last Man Standing
              </h1>
              <p className="mt-0.5 hidden text-xs text-white/55 sm:block">
                Fundraising competition platform · v{APP_VERSION}
              </p>
            </div>
          </div>
          <Nav isAuthenticated={Boolean(session?.user)} isOrganiser={isOrganiser} isPlatform={isPlatform} />
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:py-8 md:pb-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-28 md:pb-10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-xs text-text-secondary">
            <p>Unofficial fundraising tool · money is handled offline by your organiser · v{APP_VERSION}</p>
            <div className="flex gap-4">
              <Link href="/privacy" className="font-semibold hover:text-primary">Privacy</Link>
              <Link href="/disclaimer" className="font-semibold hover:text-primary">Disclaimer</Link>
              <Link href="/rules" className="font-semibold hover:text-primary">Rules</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
