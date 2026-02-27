import type { EntryStatus } from "@/types/lms";

export function StatusBadge({ status }: { status: EntryStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        status === "active"
          ? "bg-rvr-maroon-muted text-rvr-maroon"
          : "bg-red-100 text-red-800"
      }`}
    >
      {status === "active" ? "Active" : "Out"}
    </span>
  );
}
