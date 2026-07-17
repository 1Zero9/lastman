const formatMoney = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);

export function PotSummary({ raisedCents, prizeCents, clubCents, currency }: { raisedCents: number; prizeCents: number; clubCents: number; currency: string }) {
  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-2xl bg-nav text-center text-white shadow-sm">
      <div className="px-3 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Raised</p>
        <p className="mt-1 text-xl font-extrabold sm:text-2xl">{formatMoney(raisedCents, currency)}</p>
      </div>
      <div className="border-x border-white/10 bg-white/5 px-3 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Winner</p>
        <p className="mt-1 text-xl font-extrabold sm:text-2xl">{formatMoney(prizeCents, currency)}</p>
      </div>
      <div className="px-3 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">To the club</p>
        <p className="mt-1 text-xl font-extrabold sm:text-2xl">{formatMoney(clubCents, currency)}</p>
      </div>
    </div>
  );
}
