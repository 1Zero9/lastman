import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { HeaderLogo } from "@/components/HeaderLogo";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Last Man Standing",
  description: "A fundraising competition platform.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}>
        <header className="sticky top-0 z-30 border-b border-white/10 bg-nav/95 shadow-lg backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <HeaderLogo />
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold tracking-tight text-white md:text-xl">
                Last Man Standing
              </h1>
              <p className="mt-0.5 hidden text-xs text-white/55 sm:block">
                Fundraising competition platform
              </p>
            </div>
          </div>
          <Nav isAuthenticated={Boolean(session?.user)} />
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:py-8 md:pb-8">{children}</main>
      </body>
    </html>
  );
}
