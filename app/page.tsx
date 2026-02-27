import Link from "next/link";
import { gameWeeks } from "@/data/fixtures";
import { entries, activeCount, eliminatedCount } from "@/data/entries";

export default function HomePage() {
  const gw = gameWeeks[0];
  const totalEntries = entries.length;

  return (
    <div className="space-y-8">

      {/* How it works */}
      <section className="rounded-xl bg-gradient-to-br from-rvr-maroon to-rvr-maroon-light p-6 text-white shadow-md">
        <h2 className="mb-3 text-lg font-bold">How it works</h2>
        <p className="leading-relaxed text-white/85">
          Pick one Premier League team each gameweek. If your team{" "}
          <strong className="text-white">wins</strong>, you&apos;re through to the next round. Draw or
          lose and you&apos;re <strong className="text-white">out</strong>. Entry is €10 per person — 30%
          goes to prize money (min €250), 70% funds the players&apos; trip. The Top 6 (Arsenal, Man City,
          Villa, Man United, Chelsea, Liverpool) can each only be picked{" "}
          <strong className="text-white">once</strong> in the entire competition.
        </p>
        <Link
          href="/rules"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-white/70 transition-colors hover:text-white"
        >
          Full rules →
        </Link>
      </section>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gray-50" />
          <p className="relative text-4xl font-extrabold text-gray-900">{totalEntries}</p>
          <p className="relative mt-1 text-sm font-medium text-gray-500">Total entries</p>
        </div>
        <div className="relative overflow-hidden rounded-xl bg-rvr-maroon p-6 shadow-sm">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
          <p className="relative text-4xl font-extrabold text-white">{activeCount}</p>
          <p className="relative mt-1 text-sm font-medium text-white/65">Still alive</p>
        </div>
        <div className="relative overflow-hidden rounded-xl bg-red-600 p-6 shadow-sm">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
          <p className="relative text-4xl font-extrabold text-white">{eliminatedCount}</p>
          <p className="relative mt-1 text-sm font-medium text-red-100">Eliminated in GW1</p>
        </div>
      </section>

      {/* Current gameweek */}
      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="mb-2 inline-block rounded-full bg-rvr-maroon-muted px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-rvr-maroon">
              Current gameweek
            </span>
            <p className="font-semibold text-gray-900">{gw.label}</p>
            <p className="mt-0.5 text-sm text-gray-500">Cut-off: {gw.cutOff}</p>
          </div>
          <Link
            href="/fixtures"
            className="shrink-0 rounded-lg bg-rvr-maroon px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rvr-maroon-dark"
          >
            View fixtures
          </Link>
        </div>
      </section>

      {/* Quick links */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-gray-900">Quick links</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { href: "/fixtures", label: "Fixtures", desc: "This weekend's matches" },
            { href: "/standings", label: "Standings", desc: "All entrants and picks" },
            { href: "/selections", label: "Selections", desc: "Team pick counts for GW1" },
            { href: "/rules", label: "Full rules", desc: "Payment, cut-off, Top 6 rule" },
          ].map(({ href, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center justify-between rounded-xl bg-white px-5 py-4 shadow-sm ring-1 ring-gray-100 transition-all hover:shadow-md hover:ring-rvr-maroon"
            >
              <div>
                <p className="font-semibold text-gray-900 transition-colors group-hover:text-rvr-maroon">
                  {label}
                </p>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
              <span className="text-gray-300 transition-colors group-hover:text-rvr-maroon">→</span>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
