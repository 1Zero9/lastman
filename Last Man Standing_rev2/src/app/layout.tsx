import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { HeaderLogo } from "@/components/HeaderLogo";

export const metadata: Metadata = {
  title: "RVR Last Man Standing",
  description: "Rivervalley Rangers Last Man Standing fundraiser competition",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-[var(--background)]">
        <header className="bg-rvr-maroon text-rvr-silver shadow-md">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4">
            <HeaderLogo />
            <div>
              <h1 className="text-xl font-bold text-white md:text-2xl">
                RVR Last Man Standing
              </h1>
              <p className="mt-0.5 text-sm text-rvr-silver">
                Rivervalley Rangers 2014 Sat Major – Fundraiser
              </p>
            </div>
          </div>
          <Nav />
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
