import Link from "next/link";

const fixtures = [
  { home: "Arsenal", away: "Wolverhampton", pick: true },
  { home: "Chelsea", away: "Manchester United", pick: false },
  { home: "Liverpool", away: "Bournemouth", pick: false },
];

export default function DemoPlayerPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-3xl bg-[radial-gradient(120%_60%_at_50%_-10%,#1c3a2e_0%,#0b1520_55%,#060a10_100%)] p-6 text-white sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Demo · player view</p><h1 className="mt-2 text-3xl font-extrabold">Your entries</h1></div><Link href="/demo" className="text-sm font-semibold text-accent underline">Back to demo</Link></div>
      <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4"><p className="font-bold text-warning">Round 1 locks in 2 days</p><p className="mt-1 text-sm text-white/65">This is a guided preview. The selection controls are deliberately disabled.</p></div>
      <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-white/5 p-4"><p className="text-xs font-semibold uppercase text-white/50">Prize pot</p><p className="mt-2 text-2xl font-extrabold">€180</p></div><div className="rounded-2xl bg-white/5 p-4"><p className="text-xs font-semibold uppercase text-white/50">Your live entries</p><p className="mt-2 text-2xl font-extrabold">2 <span className="text-sm text-white/50">of 2</span></p></div><div className="rounded-2xl bg-accent p-4 text-nav"><p className="text-xs font-semibold uppercase text-nav/60">Your chance</p><p className="mt-2 text-2xl font-extrabold">2 in 18</p></div></div>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5"><div className="flex items-center justify-between"><div><h2 className="font-bold">Entry #1</h2><p className="mt-1 text-sm text-white/55">Choose one team for this round.</p></div><span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent">Active</span></div><div className="mt-5 space-y-2">{fixtures.map((fixture) => <button key={fixture.home} disabled className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left ${fixture.pick ? "border-accent/50 bg-accent/10" : "border-white/10 bg-black/10"}`}><span className="font-semibold">{fixture.home} <span className="text-white/45">v</span> {fixture.away}</span><span className={fixture.pick ? "text-accent" : "text-white/35"}>{fixture.pick ? "Selected" : "Available"}</span></button>)}</div><p className="mt-4 text-xs text-white/45">In a real competition, tap an available team to save or change your pick before the deadline.</p></section>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5"><h2 className="font-bold">Entry #2</h2><p className="mt-2 text-sm text-white/60">No pick yet. The player sees this clearly, alongside the automatic deadline reminder.</p><button disabled className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white/45">Pick a team</button></section>
    </div>
  );
}
