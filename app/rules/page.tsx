import { RulesContent } from "@/components/RulesContent";

export default function RulesPage() {
  return (
    <div className="space-y-6 rounded-3xl bg-[radial-gradient(120%_60%_at_50%_-10%,#1c3a2e_0%,#0b1520_55%,#060a10_100%)] p-6 sm:p-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Help</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white">The rules</h1>
      </div>
      <RulesContent />
    </div>
  );
}
