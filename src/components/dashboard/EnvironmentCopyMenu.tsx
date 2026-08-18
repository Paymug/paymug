"use client";

import { Copy, DotsThree } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { dashboardButtonBaseClass } from "./dashboard.styles";
import type {
  EnvironmentCopyMenuProps,
  EnvironmentCopyResponse,
} from "./EnvironmentCopyMenu.types";

export function EnvironmentCopyMenu({
  kind,
  selectedIds,
  environment,
  onCopied,
}: EnvironmentCopyMenuProps) {
  const [open, setOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const targetEnvironment = environment === "live" ? "sandbox" : "live";
  const targetLabel = targetEnvironment === "live" ? "Live" : "Test";

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function copySelected() {
    if (!selectedIds.length) return;
    setCopying(true);
    setMessage(null);
    try {
      const response = await fetch("/api/dashboard/environment/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          ids: selectedIds,
          targetEnvironment,
        }),
      });
      const data = (await response.json()) as EnvironmentCopyResponse;
      if (!response.ok) throw new Error(data.error || "Could not copy records");
      setMessage(`${data.copied || 0} copied to ${targetLabel}`);
      setOpen(false);
      await onCopied?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not copy records");
    } finally {
      setCopying(false);
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        className={`${dashboardButtonBaseClass} border border-border bg-white text-foreground hover:bg-[#fafafd]`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <DotsThree size={18} weight="bold" aria-hidden />
        More
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-border bg-white p-1.5 shadow-xl">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[#fafafd] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!selectedIds.length || copying}
            onClick={() => void copySelected()}
          >
            <Copy size={16} aria-hidden />
            Copy selected to {targetLabel}
          </button>
          {!selectedIds.length && (
            <p className="px-3 pb-2 pt-1 text-xs text-muted">
              Select one or more rows first.
            </p>
          )}
        </div>
      )}
      {message && (
        <p className="absolute right-0 top-full mt-2 whitespace-nowrap text-xs text-muted">
          {message}
        </p>
      )}
    </div>
  );
}
