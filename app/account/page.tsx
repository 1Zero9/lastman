import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/sign-in");

  return (
    <div className="mx-auto max-w-xl rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">Account</p>
      <h1 className="mt-2 text-2xl font-bold text-text">{session.user.name ?? "Member"}</h1>
      <p className="mt-1 text-text-secondary">{session.user.email}</p>
      <p className="mt-6 rounded-xl bg-background p-4 text-sm text-text-secondary">
        Your entries and competition access will appear here once you have been invited to a season.
      </p>
    </div>
  );
}
