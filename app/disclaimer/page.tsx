import Link from "next/link";

export const metadata = { title: "Disclaimer" };

export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Legal</p>
        <h1 className="mt-2 text-3xl font-bold text-text">Disclaimer</h1>
      </div>

      <section className="space-y-4 rounded-2xl bg-surface p-6 text-sm leading-6 text-text ring-1 ring-border">
        <p>
          This is an unofficial, community-run fundraising tool. It is not affiliated with, endorsed by, or connected to
          any football league, association, club, broadcaster, or governing body. Team and league names are used solely
          to identify real-world fixtures.
        </p>
        <p>
          <span className="font-semibold">No money passes through this app.</span> Entry fees, prizes and fundraising
          proceeds are handled entirely offline by your competition organiser. Any figures shown here are a record kept
          by the organiser, not a financial service. Disputes about money are between you and your organiser.
        </p>
        <p>
          <span className="font-semibold">Local rules apply.</span> Depending on your region, running a competition with
          an entry fee and a prize may be regulated (for example as a lottery, prize competition, or fundraising event)
          and may have tax implications. It is the organiser&apos;s responsibility to make sure their competition is
          lawful where they run it. This app provides no legal, tax, or gambling advice.
        </p>
        <p>
          <span className="font-semibold">Use at your own risk.</span> The app is provided as-is, without warranty of any
          kind. The maintainers accept no responsibility for errors in fixtures, results, settlement, lost picks,
          downtime, or any loss arising from use of the app. Organisers should keep their own records.
        </p>
        <p>
          <span className="font-semibold">Spirit of the game.</span> This app exists to help clubs raise money and have
          fun doing it. Play fair, pay your organiser promptly, and remember the real winner is the cause.
        </p>
      </section>

      <p className="text-sm text-text-secondary">
        See also the <Link href="/privacy" className="font-semibold text-primary underline">privacy policy</Link>.
      </p>
    </div>
  );
}
