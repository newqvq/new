import { cn } from "@/lib/utils";

type AlertBannerProps = {
  kind: "error" | "success";
  message: string;
  className?: string;
};

export function AlertBanner({ kind, message, className }: AlertBannerProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        kind === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700",
        className,
      )}
    >
      {message}
    </div>
  );
}
