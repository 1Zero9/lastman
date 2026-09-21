export function ScoreboardHero({
  roundNumber,
  roundsTotal,
  roundStatusLabel,
  alive,
  total,
  seasonOrdinal,
}: {
  roundNumber: number | null;
  roundsTotal: number | null;
  roundStatusLabel: string;
  alive: number;
  total: number;
  seasonOrdinal: number | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-nav to-[#060a10] px-5 py-4 text-white shadow-sm">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{ backgroundImage: "repeating-linear-gradient(180deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 5px)" }}
      />
      <div className="relative flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold uppercase tracking-widest text-white/55">Round</span>
          {roundNumber !== null ? (
            <span className="font-mono text-4xl font-extrabold leading-none tabular-nums text-accent drop-shadow-[0_0_18px_rgba(163,230,53,0.35)]">{roundNumber}</span>
          ) : (
            <span className="text-2xl font-extrabold text-white/70">—</span>
          )}
        </div>
        <div className="text-right">
          {roundsTotal !== null && <p className="text-[10px] font-bold uppercase tracking-wide text-white/45">of {roundsTotal}</p>}
          <p className="text-xs font-semibold text-white/75">{roundStatusLabel}</p>
        </div>
      </div>

      <div className="relative my-3 h-px bg-white/10" />

      <div className="relative flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-accent/80">Still standing</p>
          <p className="mt-0.5 flex items-baseline gap-2 font-mono text-4xl font-extrabold tabular-nums leading-none">
            {alive}<span className="text-lg font-bold text-accent">of {total}</span>
          </p>
        </div>
        {seasonOrdinal !== null && (
          <span className="whitespace-nowrap rounded-full border border-warning/40 bg-warning/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-warning">
            Season {seasonOrdinal}
          </span>
        )}
      </div>
    </div>
  );
}
