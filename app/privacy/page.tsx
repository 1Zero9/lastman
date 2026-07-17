import Link from "next/link";
import { POLICY_VERSION } from "@/lib/competition";

export const metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Legal</p>
        <h1 className="mt-2 text-3xl font-bold text-text">Privacy policy</h1>
        <p className="mt-1 text-sm text-text-secondary">Version {POLICY_VERSION}</p>
      </div>

      <section className="space-y-4 rounded-2xl bg-surface p-6 text-sm leading-6 text-text ring-1 ring-border">
        <h2 className="text-lg font-bold">What this app is</h2>
        <p>
          Last Man Standing is a fundraising competition tool used by clubs and community organisers. All money is
          handled offline by your competition organiser — this app never collects, holds, or transfers payments.
        </p>

        <h2 className="text-lg font-bold">What we collect and why</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li><span className="font-semibold">Name and email</span> — to identify your entry, show you in the standings, and let you sign in and make picks. Lawful basis: your consent, given when you confirm your entry.</li>
          <li><span className="font-semibold">Club and location (optional)</span> — to help organisers understand who is taking part. Only stored if you provide them.</li>
          <li><span className="font-semibold">Picks and results</span> — the record of the competition itself.</li>
          <li><span className="font-semibold">Payment records</span> — the organiser records whether your offline entry fee was received. No card or bank details ever touch this app.</li>
        </ul>

        <h2 className="text-lg font-bold">Optional consents</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li><span className="font-semibold">Leaderboard history</span> — if you opt in, your results are kept after the season to build all-time leaderboards. If you don&apos;t, they are anonymised when your data is removed.</li>
          <li><span className="font-semibold">Future contact</span> — if you opt in, your organiser may contact you about future fundraisers or app updates. You can withdraw at any time.</li>
        </ul>

        <h2 className="text-lg font-bold">Retention</h2>
        <p>
          Personal data is deleted or anonymised 12 months after the season ends, unless you opted into leaderboard
          history or a new season is running. Anonymised competition records (picks and results without names) may be
          kept so past seasons still add up.
        </p>

        <h2 className="text-lg font-bold">Your rights</h2>
        <p>
          You can ask for a copy of your data, correct it, or have it removed at any time (right to be forgotten).
          If you have an account, use the tools on your <Link href="/account" className="font-semibold text-primary underline">account page</Link>.
          Otherwise contact your competition organiser, who can remove you from the admin dashboard. Removal anonymises
          your name and contact details while keeping the competition maths intact.
        </p>

        <h2 className="text-lg font-bold">Sharing</h2>
        <p>
          Your name and picks are visible to other members of your competition once a round locks. We do not sell data.
          Data is hosted on managed infrastructure (Vercel and a managed PostgreSQL database) within the provider&apos;s
          data-processing terms. A separate platform-support role exists for account recovery and is deliberately
          blocked from viewing participant names, contact details, entries and picks.
        </p>
      </section>

      <p className="text-sm text-text-secondary">
        See also the <Link href="/disclaimer" className="font-semibold text-primary underline">disclaimer</Link>.
      </p>
    </div>
  );
}
