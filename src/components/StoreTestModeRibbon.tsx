"use client";

import { X } from "@phosphor-icons/react";
import { useEffect, useId, useState } from "react";

export function StoreTestModeRibbon() {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed -left-11 top-5 z-40 w-40 -rotate-45 cursor-pointer border-y border-amber-500 bg-amber-300 py-2 text-center text-xs font-bold uppercase text-amber-950 shadow-md transition hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
        aria-haspopup="dialog"
      >
        Test mode
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1d1c22]/45 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md rounded-2xl border border-[#e8e8ee] bg-white shadow-[0_24px_70px_rgba(24,22,32,0.2)]"
          >
            <header className="flex items-center justify-between border-b border-[#ededf2] px-5 py-4">
              <h2 id={titleId} className="text-lg font-semibold text-[#333]">
                This store is in test mode
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-[#77778a] transition hover:bg-[#f4f4f7] hover:text-[#333]"
                aria-label="Close test mode information"
              >
                <X size={17} aria-hidden />
              </button>
            </header>
            <div className="px-5 py-5 text-sm leading-6 text-muted">
              You are viewing sandbox products and store data. Test payments do
              not create live transactions, and customers continue to see the
              live store.
            </div>
          </section>
        </div>
      )}
    </>
  );
}
