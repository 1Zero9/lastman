import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { HeaderLogo } from "@/components/HeaderLogo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Last Man Standing — RVR",
  description: "Invite-only Last Man Standing fundraising competition for River Valley Rangers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}>
        <header className="bg-gradient-to-b from-rvr-maroon-dark to-rvr-maroon shadow-lg">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-5">
            <HeaderLogo />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">
                RVR Last Man Standing
              </h1>
              <p className="mt-0.5 text-sm text-white/55">
                Rivervalley Rangers 2014 Sat Major · Fundraiser
              </p>
            </div>
          </div>
          <Nav />
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
