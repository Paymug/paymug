"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui";
import type { AbandonmentSurveyProps } from "./AbandonmentSurvey.types";

export function AbandonmentSurvey({
  storeId,
  productId,
  question,
  options,
  hasEmail,
  email,
  completed,
}: AbandonmentSurveyProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [customAnswer, setCustomAnswer] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const triggeredRef = useRef(false);
  const pendingHrefRef = useRef<string | null>(null);
  const completedRef = useRef(completed);
  const doneRef = useRef(false);
  completedRef.current = completed;
  doneRef.current = done || completed;

  useEffect(() => {
    if (completed) return;
    let revealTimer: number | undefined;
    let exitTimer: number | undefined;

    function trigger(href: string | null) {
      if (completedRef.current || doneRef.current || triggeredRef.current) {
        return;
      }
      triggeredRef.current = true;
      pendingHrefRef.current = href;
      setOpen(true);
    }

    function cancelExit() {
      if (exitTimer !== undefined) {
        window.clearTimeout(exitTimer);
        exitTimer = undefined;
      }
    }

    function scheduleExit() {
      if (completedRef.current || doneRef.current || triggeredRef.current) {
        return;
      }
      if (exitTimer !== undefined) return;
      // Wait a moment so briefly moving the pointer out and back doesn't
      // trigger the popup.
      exitTimer = window.setTimeout(() => {
        exitTimer = undefined;
        trigger(null);
      }, 600);
    }

    function onMouseOut(event: MouseEvent) {
      // relatedTarget === null means the pointer left the document entirely.
      if (event.relatedTarget) return;
      scheduleExit();
    }

    function onMouseLeave() {
      // Fires when the pointer leaves the document (top/edge/tab bar).
      scheduleExit();
    }

    function onPointerReturn() {
      cancelExit();
    }

    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (completedRef.current || doneRef.current) return;
      // Browsers only allow the native "Leave site?" prompt here — a custom
      // modal cannot render during unload. If the visitor cancels the prompt
      // the page stays mounted, so reveal the survey shortly after.
      event.preventDefault();
      event.returnValue = "";
      if (revealTimer === undefined) {
        revealTimer = window.setTimeout(() => {
          revealTimer = undefined;
          if (!completedRef.current && !doneRef.current) {
            triggeredRef.current = true;
            setOpen(true);
          }
        }, 350);
      }
    }

    function onClickCapture(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank") return;
      try {
        if (new URL(href, window.location.href).origin !== window.location.origin) {
          return;
        }
      } catch {
        return;
      }
      if (completedRef.current || doneRef.current || triggeredRef.current) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      trigger(href);
    }

    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseover", onPointerReturn);
    document.addEventListener("mouseenter", onPointerReturn);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClickCapture, true);
    return () => {
      if (revealTimer !== undefined) window.clearTimeout(revealTimer);
      if (exitTimer !== undefined) window.clearTimeout(exitTimer);
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseover", onPointerReturn);
      document.removeEventListener("mouseenter", onPointerReturn);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, [completed]);

  function finish() {
    setOpen(false);
    setDone(true);
    const href = pendingHrefRef.current;
    pendingHrefRef.current = null;
    if (href) window.location.href = href;
  }

  async function submit() {
    setSubmitting(true);
    const answer = customAnswer.trim() || selected;
    try {
      await fetch("/api/abandonment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          storeId,
          productId,
          email: hasEmail ? email?.trim() || undefined : emailInput.trim() || undefined,
          answer: answer || undefined,
          marketingOptIn,
        }),
      });
    } catch {
      // The survey is best-effort; never block the visitor.
    }
    setSubmitting(false);
    finish();
  }

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-[#222129]/45 p-4 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) finish();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-[#e8e8ee] bg-white p-6 shadow-[0_24px_60px_rgba(25,24,31,0.25)]">
        <h2 className="text-lg font-semibold text-[#2a2a33]">{question}</h2>
        <p className="mt-1 text-sm text-muted">
          Your answer helps the store improve.
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="mt-4 space-y-3"
        >
          {options.length > 0 && (
            <div className="space-y-2">
              {options.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#e8e8ee] px-3.5 py-2.5 text-sm transition hover:bg-[#fafafd]"
                >
                  <input
                    type="radio"
                    name="abandonment-answer"
                    value={option}
                    checked={selected === option}
                    onChange={() => {
                      setSelected(option);
                      setCustomAnswer("");
                    }}
                    className="accent-[var(--accent)]"
                  />
                  {option}
                </label>
              ))}
            </div>
          )}

          <input
            value={customAnswer}
            onChange={(event) => {
              setCustomAnswer(event.target.value);
              if (event.target.value) setSelected("");
            }}
            placeholder="Other (please specify)"
            maxLength={300}
            className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-stone-400 focus:border-accent focus:ring-3 focus:ring-accent/25"
          />

          {!hasEmail && (<>
            <label className="mt-4 mb-2 font-medium text-sm block">Receive future updates</label>
            <input
              type="email"
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              placeholder="Your email (optional)"
              className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-stone-400 focus:border-accent focus:ring-3 focus:ring-accent/25"
            />
            <label className="flex items-start gap-2 text-xs leading-5 text-muted">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(event) => setMarketingOptIn(event.target.checked)}
                className="mt-0.5 accent-[var(--accent)]"
              />
              Email me future updates. No spam.
            </label>
          </>
          )}


          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={finish}
              className="cursor-pointer text-sm text-muted hover:text-foreground"
            >
              No thanks
            </button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Sending…" : "Send"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
