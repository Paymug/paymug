"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  buttonBaseClass,
  buttonVariantClasses,
} from "@/components/ui.styles";

type PaymentSheetProps = {
  buttonLabel: string;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

const OPEN_MS = 380;
const CLOSE_MS = 240;
const OPEN_EASING = "cubic-bezier(0.32, 0.72, 0, 1)";
const CLOSE_EASING = "cubic-bezier(0.4, 0, 1, 1)";

/**
 * Below `lg` the children render in a bottom sheet opened by a floating
 * button. From `lg` up every wrapper is `display: contents`, so the children
 * sit in the page layout as a normal column.
 *
 * The sheet is animated with the Web Animations API (transform + opacity
 * only, so it stays on the compositor) instead of CSS transitions, which
 * lets open and close each use their own timing without class-swap races.
 */
export default function PaymentSheet({
  buttonLabel,
  title,
  defaultOpen = false,
  children,
}: PaymentSheetProps) {
  const [open, setOpen] = useState(defaultOpen);
  // Stays true while the close animation plays, then flips to false so the
  // sheet is hidden (but still laid out, which the PayPal buttons need).
  const [shown, setShown] = useState(defaultOpen);
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const animations = useRef<Animation[]>([]);
  const mounted = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    const backdrop = backdropRef.current;
    const isMobile = !window.matchMedia("(min-width: 1024px)").matches;

    animations.current.forEach((animation) => animation.cancel());
    animations.current = [];

    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    if (!sheet || !backdrop || !isMobile) {
      setShown(open);
      return;
    }

    if (open) {
      setShown(true);
      animations.current = [
        sheet.animate(
          [
            { transform: "translate3d(0, 100%, 0)", opacity: 0 },
            { transform: "translate3d(0, 0, 0)", opacity: 1 },
          ],
          { duration: OPEN_MS, easing: OPEN_EASING, fill: "both" },
        ),
        backdrop.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: OPEN_MS,
          easing: "ease-out",
          fill: "both",
        }),
      ];
      return;
    }

    const closing = [
      sheet.animate(
        [
          { transform: "translate3d(0, 0, 0)", opacity: 1 },
          { transform: "translate3d(0, 100%, 0)", opacity: 0 },
        ],
        { duration: CLOSE_MS, easing: CLOSE_EASING, fill: "both" },
      ),
      backdrop.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: CLOSE_MS,
        easing: "ease-in",
        fill: "both",
      }),
    ];
    animations.current = closing;
    closing[0].onfinish = () => setShown(false);
  }, [open]);

  return (
    <>
      <div
        className={`fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-white via-white/90 to-transparent p-4 transition-opacity duration-200 lg:hidden ${
          open ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className={`${buttonBaseClass} ${buttonVariantClasses.primary} w-full py-3.5 text-base shadow-lg`}
        >
          {buttonLabel}
        </button>
      </div>

      <div
        ref={backdropRef}
        aria-hidden
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 lg:hidden ${
          open ? "" : "pointer-events-none"
        } ${shown ? "visible" : "invisible"}`}
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Payment"
        className={`fixed inset-x-0 bottom-0 top-10 z-50 flex flex-col rounded-t-3xl bg-white will-change-transform lg:contents ${
          shown ? "visible" : "invisible"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-6 py-4 lg:hidden">
          <h2 className="min-w-0 truncate text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close payment"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg leading-none text-muted"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain lg:contents">
          {children}
        </div>
      </div>
    </>
  );
}
