"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-full px-4 py-1.5 text-sm font-medium text-white/65 transition-all hover:bg-white/10 hover:text-white"
    >
      Sign out
    </button>
  );
}
