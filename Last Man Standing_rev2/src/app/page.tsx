import Link from "next/link";
import { gameWeeks } from "@/data/fixtures";
import { entries, activeCount, eliminatedCount } from "@/data/entries";

export default function HomePage() {
  const gw = gameWeeks[0];
  const totalEntries = entries.length;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-gray-900">How it works</h2>
        <p className="mt-2 text-gray-700">
          Pick one Premier League team each gameweek. If your team <strong>wins</strong>, you&apos;re
          through to the next round. If they <strong>draw or lose</strong>, you&apos;re out. Entry is
          €10 per person (once-off); 30% of funds go to prize money (min €250), 70% to the
          players&apos; trip. You can only pick each of the Top 6 (Arsenal, Man City, Aston Villa, Man
          United, Chelsea, Liverpool) <strong>once</strong> in the whole competition.
        </p>
      </section>

      <section className="rounded-lg border border-rvr-maroon/20 bg-rvr-maroon-muted p-4">
        <h2 className="text-lg font-semibold text-gray-900">Current gameweek</h2>
        <p className="mt-1 text-gray-700">{gw.label}</p>
        <p className="text-sm text-gray-600">Cut-off: {gw.cutOff}</p>
        <Link
          href="/fixtures"
          className="mt-3 inline-block font-medium text-rvr-maroon hover:underline"
        >
          View fixtures →
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{totalEntries}</p>
          <p className="text-sm text-gray-600">Total entries</p>
        </div>
        <div className="rounded-lg border border-rvr-maroon/30 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-rvr-maroon">{activeCount}</p>
          <p className="text-sm text-gray-600">Still in</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-red-700">{eliminatedCount}</p>
          <p className="text-sm font-medium text-red-700">Out (GW1)</p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">Quick links</h2>
        <ul className="mt-2 space-y-1">
          <li>
            <Link href="/fixtures" className="font-semibold text-rvr-maroon hover:underline">
              Fixtures
            </Link>
            {" – "}
            <span className="text-gray-600">This weekend&apos;s matches</span>
          </li>
          <li>
            <Link href="/standings" className="font-semibold text-rvr-maroon hover:underline">
              Standings
            </Link>
            {" – "}
            <span className="text-gray-600">All entrants and picks</span>
          </li>
          <li>
            <Link href="/selections" className="font-semibold text-rvr-maroon hover:underline">
              Selections
            </Link>
            {" – "}
            <span className="text-gray-600">How many picked each team (GW1)</span>
          </li>
          <li>
            <Link href="/rules" className="font-semibold text-rvr-maroon hover:underline">
              Full rules
            </Link>
            {" – "}
            <span className="text-gray-600">Payment, cut-off, Top 6 rule, disputes</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
