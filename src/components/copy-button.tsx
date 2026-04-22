"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type CopyButtonProps = {
  text: string;
  className?: string;
  idleLabel?: string;
  copiedLabel?: string;
};

export function CopyButton({
  text,
  className,
  idleLabel = "Copy",
  copiedLabel = "Copied",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-950 hover:text-slate-950",
        className,
      )}
    >
      {copied ? copiedLabel : idleLabel}
    </button>
  );
}
