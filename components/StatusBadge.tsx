import type { EntryStatus } from "@/types/lms";

export function StatusBadge({ status }: { status: EntryStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
        status === "active"
          ? "bg-rvr-maroon-muted text-rvr-maroon ring-rvr-maroon/20"
          : "bg-red-50 text-red-600 ring-red-200"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "active" ? "bg-rvr-maroon" : "bg-red-500"
        }`}
      />
      {status === "active" ? "Active" : "Out"}
    </span>
  );
}
