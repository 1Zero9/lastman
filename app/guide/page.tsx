import Link from "next/link";

type Item = { title: string; body: string };

const playerSteps: Item[] = [
  {
    title: "Join with your organiser's link or code",
    body: "Your organiser shares a join link (or a 6-character code). Open it, enter your name and email, choose how many entries you want (up to 5), agree to the consents and set a password. If your organiser added you instead, you'll get a confirmation link to do the same.",
  },
  {
    title: "Pay your organiser to activate your entries",
    body: "No money passes through the app. Pay the entry fee directly to your organiser (cash or transfer) — your entries show as \"awaiting payment\" until they confirm it, then you're in the game.",
  },
  {
    title: "Pick one team each round",
    body: "Sign in and open My entries. Tap a team on the fixture board before the countdown hits zero — you can change your pick any time until the deadline. Each entry picks separately.",
  },
  {
    title: "Survive to stay in",
    body: "Your team must WIN. A draw or a loss knocks that entry out. You can't pick the same team twice with one entry, and once you've used a team from the restricted top group you can't pick another from it.",
  },
  {
    title: "Miss the deadline? Autopick",
    body: "If autopick is on and you forget, you're automatically given the most popular eligible team — so you're never knocked out for forgetting, only for losing.",
  },
  {
    title: "Knocked out? Buy back in",
    body: "If buy-backs are enabled, an eliminated entry can pay the entry fee once more to come back to life. Pay your organiser and they'll reinstate you.",
  },
  {
    title: "Last one standing wins",
    body: "The final surviving entry takes the winner's share of the pot; the rest goes to the club. If everyone left is knocked out in the same round, up to 5 survivors split the prize — with more than 5, everyone is reinstated and the game rolls on.",
  },
];

const organiserSteps: Item[] = [
  {
    title: "Create your organiser account",
    body: "Register on the Get started page with your organiser access code (organiser accounts are invite-only). Your organiser account is separate from playing.",
  },
  {
    title: "Set up the fundraiser",
    body: "In the admin area, pick a source league, a run window, the entry fee, the prize split, buy-backs and autopick, plus your club name, website and colours. Every round and fixture in the window is created automatically, and the whole app takes on your club's colours.",
  },
  {
    title: "Share the join link",
    body: "Your dashboard shows the fundraiser's join code and link — share it on WhatsApp and players sign themselves up. You can also add players by hand on the People page.",
  },
  {
    title: "Approve players and confirm payments",
    body: "On the People page, tick players to approve them and tick payments as they come in — confirming a payment activates the entries. Sellers can be credited so you can track who raised what.",
  },
  {
    title: "Run each round",
    body: "On the Schedule page, open the next round so players can pick. At the deadline the round locks (automatically via the scheduled job, or manually) and autopicks fill any gaps. On the Results page, enter the scores and settle — eliminations happen automatically. Void a round if fixtures are postponed.",
  },
  {
    title: "Handle buy-backs and the pot",
    body: "Record a buy-back to bring an eliminated entry back and log the extra payment. The pot summary always shows the total raised, the winner's prize and the club's share.",
  },
  {
    title: "Wrap up and go again",
    body: "When it's over, pay the winner and the club directly. Duplicate the fundraiser to run it again with the same settings, archive it to close it off, or delete it entirely from the danger zone. You can run several fundraisers and switch between them from the dashboard.",
  },
];

const platformItems: Item[] = [
  {
    title: "What platform admins can see",
    body: "The Platform area deliberately excludes participant names, contact details, entries and picks. It exists for provisioning and organiser recovery only.",
  },
  {
    title: "Organiser access",
    body: "New organisers self-register with the organiser access code (set via the ORGANISER_ACCESS_CODE environment variable — if unset, self-registration is closed). Platform admins can grant or revoke organiser access for any account.",
  },
  {
    title: "Provision and recover organisers",
    body: "Attach an organiser (or owner) to any project with a temporary 12+ character password — used for onboarding or when an organiser is locked out. Break-glass support accounts can do this too; every action is audited.",
  },
  {
    title: "Projects and health",
    body: "Platform admins can create empty projects for hand-over and see a health view of every project: seasons, organiser count and participant record count.",
  },
];

function Section({ id, badge, title, intro, items }: { id: string; badge: string; title: string; intro: string; items: Item[] }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">{badge}</p>
      <h2 className="mt-1 text-xl font-bold text-text">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-text-secondary">{intro}</p>
      <ol className="mt-5 space-y-4">
        {items.map((item, index) => (
          <li key={item.title} className="flex gap-4">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              {index + 1}
            </span>
            <div>
              <p className="font-semibold text-text">{item.title}</p>
              <p className="mt-1 text-sm leading-6 text-text-secondary">{item.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Help</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-text">How Last Man Standing works</h1>
        <p className="mt-3 text-text-secondary">
          One guide for everyone: players making their weekly pick, organisers running a club fundraiser, and
          platform admins keeping the lights on.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="#players" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">Playing</a>
          <a href="#organisers" className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-text">Organising</a>
          <a href="#platform" className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-text">Platform admin</a>
        </div>
      </div>

      <Section
        id="players"
        badge="For players"
        title="Playing the game"
        intro="Pick one team a round. If it wins, you survive. Last entry standing takes the prize — the rest goes to the club."
        items={playerSteps}
      />

      <Section
        id="organisers"
        badge="For organisers"
        title="Running a fundraiser"
        intro="You run everything from the admin area: setup, players, payments, rounds and results. Money is always handled offline, directly between you and your players."
        items={organiserSteps}
      />

      <Section
        id="platform"
        badge="For platform admins"
        title="Platform administration"
        intro="A minimal, audited back-office for provisioning projects and recovering organiser access — with no view of participant data."
        items={platformItems}
      />

      <p className="text-sm text-text-secondary">
        See also the <Link href="/rules" className="font-semibold text-primary underline">full rules</Link>, the{" "}
        <Link href="/privacy" className="font-semibold text-primary underline">privacy policy</Link> and the{" "}
        <Link href="/disclaimer" className="font-semibold text-primary underline">disclaimer</Link>. Ready to organise?{" "}
        <Link href="/get-started" className="font-semibold text-primary underline">Get started</Link>.
      </p>
    </div>
  );
}
