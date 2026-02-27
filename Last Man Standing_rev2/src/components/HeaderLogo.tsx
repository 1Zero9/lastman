"use client";

import { useState } from "react";

export function HeaderLogo() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) return null;

  return (
    <img
      src="/logo.png"
      alt="River Valley Rangers"
      className="h-14 w-14 shrink-0 rounded-full object-contain bg-black/20"
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
      style={loaded ? {} : { visibility: "hidden" }}
    />
  );
}
