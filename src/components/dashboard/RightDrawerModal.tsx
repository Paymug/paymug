"use client";

import { X } from "@phosphor-icons/react";
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type {
  RightDrawerModalHandle,
  RightDrawerModalProps,
} from "./RightDrawerModal.types";

export const RightDrawerModal = forwardRef<
  RightDrawerModalHandle,
  RightDrawerModalProps
>(function RightDrawerModal(
  { eyebrow, title, description, footer, onClose, children },
  ref
) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    setMounted(true);
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => {
    if (!closing) return;
    const timeout = window.setTimeout(onClose, 280);
    return () => window.clearTimeout(timeout);
  }, [closing, onClose]);

  function close() {
    setClosing(true);
    setVisible(false);
  }

  useImperativeHandle(ref, () => ({ close }));

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 bg-[#1c1b22]/40 transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`ml-auto flex h-dvh w-full max-w-[26rem] flex-col overflow-hidden border-l border-[#ececf1] bg-white shadow-[-12px_0_40px_rgba(24,23,31,0.1)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="shrink-0 border-b border-[#f0f0f4] px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {eyebrow && (
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9a9aaf]">
                  {eyebrow}
                </p>
              )}
              <h2
                id={titleId}
                className={`truncate text-lg font-semibold tracking-tight text-[#2a2a33] ${
                  eyebrow ? "mt-1.5" : ""
                }`}
              >
                {title}
              </h2>
              {description && (
                <p
                  id={descriptionId}
                  className="mt-1 text-sm leading-5 text-[#8b8ba3]"
                >
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={close}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#9a9aaf] transition hover:bg-[#f5f5f8] hover:text-[#2a2a33]"
              aria-label="Close"
            >
              <X size={16} weight="bold" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>

        {footer && (
          <footer className="shrink-0 border-t border-[#f0f0f4] bg-white px-5 py-4">
            {footer}
          </footer>
        )}
      </section>
    </div>,
    document.body
  );
});
