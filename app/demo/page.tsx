import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { notFound } from "next/navigation";
import { DEMO_COMPETITION_SLUG } from "@/lib/demo";
import { getPublicFixtures } from "@/lib/public-fixtures";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const data = await getPublicFixtures(DEMO_COMPETITION_SLUG);
  if (!data) notFound();
  const { competition, season, activeGameweeks } = data;
  const gameweek = activeGameweeks[0];
  const formatDate = (date: Date) => formatInTimeZone(date, competition.timezone, "EEE d MMM, HH:mm");

  return (
    <div className="mx-auto max-w-4xl space-y-6 rounded-3xl bg-[radial-gradient(120%_60%_at_50%_-10%,#1c3a2e_0%,#0b1520_55%,#060a10_100%)] p-6 text-white sm:p-8">
      <div className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent">Demo mode — fictional entrants and sample competition data. You cannot join, submit picks, or exchange money here.</div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Explore Last Man Standing</p>
        <h1 className="mt-2 text-3xl font-extrabold">{competition.name}</h1>
        <p className="mt-2 text-white/60">{season.name} · a safe, read-only example of the player experience.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {["One pick each round", "Automatic deadline lock", "Live survival standings"].map((item, index) => (
          <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-xs font-bold text-accent">0{index + 1}</p><p className="mt-2 font-bold">{item}</p></div>
        ))}
      </div>
      {gameweek && (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4"><div><h2 className="font-bold">{gameweek.name}</h2><p className="mt-1 text-sm text-white/55">Sample fixture board</p></div><p className="text-sm text-accent">Deadline: {formatDate(gameweek.deadlineAt)}</p></div>
          <div className="divide-y divide-white/10">{gameweek.fixtures.slice(0, 5).map((fixture) => <div key={fixture.id} className="flex items-center justify-between gap-3 px-5 py-3"><span className="min-w-0 flex-1 truncate text-right font-medium">{fixture.homeTeam.name}</span><span className="shrink-0 rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-white/65">{formatDate(fixture.kickoffAt)}</span><span className="min-w-0 flex-1 truncate font-medium">{fixture.awayTeam.name}</span></div>)}</div>
        </section>
      )}
      <section className="grid gap-4 sm:grid-cols-2">
        <Link href="/demo/player" className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-accent/50 hover:bg-white/10"><p className="text-xs font-bold uppercase tracking-wide text-accent">Player walkthrough</p><h2 className="mt-2 text-lg font-bold">Make a pick and stay alive</h2><p className="mt-2 text-sm text-white/60">See the entry dashboard, deadline and selection flow with disabled sample controls.</p></Link>
        <Link href="/demo/organiser" className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-accent/50 hover:bg-white/10"><p className="text-xs font-bold uppercase tracking-wide text-accent">Organiser walkthrough</p><h2 className="mt-2 text-lg font-bold">Run the fundraiser</h2><p className="mt-2 text-sm text-white/60">See approvals, progress and round management without exposing a real competition.</p></Link>
      </section>
      <div className="flex flex-wrap gap-3"><Link href="/sign-in" className="rounded-xl bg-accent px-5 py-3 font-bold text-nav">Sign in</Link><Link href="/get-started" className="rounded-xl border border-white/20 px-5 py-3 font-bold text-white hover:bg-white/10">Organise a fundraiser</Link></div>
    </div>
  );
}
