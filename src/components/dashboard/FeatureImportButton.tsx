"use client";

import { DotsThreeOutlineVerticalIcon, SlidersHorizontalIcon, UploadSimple } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import type { FeatureImportResponse } from "@/lib/feature-import.types";
import type { FeatureImportButtonProps } from "./FeatureImportButton.types";

export function FeatureImportButton({
  feature,
  onImported,
}: FeatureImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  async function importFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setMessage(null);
    setFailed(false);
    const formData = new FormData();
    formData.set("file", file);
    try {
      const response = await fetch(`/api/features/${feature}/import`, {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as FeatureImportResponse;
      if (!response.ok) throw new Error(data.error || "Could not import file");
      const details = [
        `${data.imported || 0} imported`,
        data.skipped ? `${data.skipped} duplicates skipped` : "",
        data.failed ? `${data.failed} rows failed` : "",
      ].filter(Boolean);
      setMessage(details.join(" · "));
      setFailed(Boolean(data.failed));
      await onImported();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import file");
      setFailed(true);
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  }

  return (
    <div ref={menuRef} className="relative flex flex-col items-end gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.json,text/csv,application/json"
        className="sr-only"
        onChange={(event) => void importFile(event)}
      />
      <Button
        type="button"
        variant="ghost"
        className="h-10 p-0"
        disabled={importing}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        <SlidersHorizontalIcon size={16} weight="bold" aria-hidden />
      </Button>

      {open && (
        <div
          role="menu"
          aria-label="More actions"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-70 min-w-44 rounded-xl border border-[#d7e0ea] bg-white py-2 shadow-[0_20px_45px_rgba(28,39,55,0.18)]"
        >
          <button
            type="button"
            role="menuitem"
            disabled={importing}
            className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-foreground transition hover:bg-[#f7f7f8] disabled:cursor-not-allowed disabled:opacity-55"
            onClick={() => {
              setOpen(false);
              inputRef.current?.click();
            }}
          >
            <UploadSimple size={16} weight="bold" aria-hidden />
            {importing ? "Importing…" : "Import data"}
          </button>
        </div>
      )}

      {message && (
        <p
          className={`absolute right-0 top-[calc(100%+0.35rem)] z-60 whitespace-nowrap text-xs ${
            failed ? "text-danger" : "text-emerald-700"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
