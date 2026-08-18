"use client";

import { X } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { dashboardIconButtonClass } from "./dashboard.styles";
import type { DashboardModalProps } from "./DashboardModal.types";

export function DashboardModal({
  title,
  children,
  onClose,
}: DashboardModalProps) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  onCloseRef.current = onClose;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    const frame = requestAnimationFrame(() => {
      dialogRef.current
        ?.querySelector<HTMLElement>(
          "input:not([type='hidden']), textarea"
        )
        ?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1d1c22]/45 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#e8e8ee] bg-white shadow-[0_24px_70px_rgba(24,22,32,0.2)]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-5 pt-4 sm:px-6">
          <h2 id={titleId} className="text-lg font-semibold text-[#333]">
            {title}
          </h2>
          <button
            type="button"
            className={`${dashboardIconButtonClass} !h-8 !w-8`}
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={17} aria-hidden />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}
