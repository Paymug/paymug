"use client";

import { Check, X } from "@phosphor-icons/react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Alert, Button, Textarea } from "@/components/ui";
import type {
  AffiliateDetailsDrawerProps,
  AffiliateDetailsResponse,
} from "./AffiliateDetailsDrawer.types";

export function AffiliateDetailsDrawer({
  affiliate,
  onClose,
  onUpdated,
}: AffiliateDetailsDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

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
      if (event.key === "Escape") {
        setClosing(true);
        setVisible(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mounted]);

  useEffect(() => {
    if (!closing) return;
    const timeout = window.setTimeout(onClose, 300);
    return () => window.clearTimeout(timeout);
  }, [closing, onClose]);

  async function decide(status: "active" | "rejected") {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/features/affiliates/${affiliate.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            data: {
              decisionAt: new Date().toISOString(),
              rejectionMessage: status === "rejected" ? rejectionMessage : "",
            },
          }),
        },
      );
      const data = (await response.json()) as AffiliateDetailsResponse;
      if (!response.ok || !data.record) {
        throw new Error(data.error || "Could not update affiliate");
      }
      onUpdated(data.record);
      setRejecting(false);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update affiliate",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;
  const pending = affiliate.status === "inactive";
  const details = [
    ["Email", affiliate.subtitle || "Not provided"],
    ["Status", affiliate.status === "inactive" ? "Pending" : affiliate.status],
    ["Referral ID", String(affiliate.data.code || "Not set")],
    ["Website", String(affiliate.data.websites || "Not provided")],
    ["Social profile", String(affiliate.data.socialLinks || "Not provided")],
    ["Location", [affiliate.data.city, affiliate.data.country].filter(Boolean).join(", ") || "Not provided"],
    ["Applied", new Date(String(affiliate.data.appliedAt || affiliate.createdAt)).toLocaleString()],
    ["Clicks", String(affiliate.data.clicksCount || 0)],
    ["Referrals", String(affiliate.data.referralsCount || 0)],
  ];

  return createPortal(
    <div
      className={`fixed inset-0 z-50 bg-[#222129]/45 backdrop-blur-[1px] transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setClosing(true);
          setVisible(false);
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`ml-auto flex h-dvh w-full max-w-[38rem] flex-col overflow-hidden border-l border-[#e5e5eb] bg-white shadow-[-22px_0_60px_rgba(25,24,31,0.16)] transition-transform duration-300 ease-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Affiliate details
            </p>
            <h2 id={titleId} className="mt-2 text-xl font-semibold">
              {affiliate.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setClosing(true);
              setVisible(false);
            }}
            className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-[#f4f4f7] hover:text-foreground"
            aria-label="Close affiliate details"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label} className="border-b border-border pb-3">
                <p className="text-xs font-medium text-muted">{label}</p>
                <p className="mt-1 break-words text-sm font-medium capitalize">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <section className="mt-6">
            <h3 className="text-sm font-semibold">About their audience</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
              {String(affiliate.data.about || "No application message provided.")}
            </p>
          </section>

          {pending && rejecting && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50/50 p-4">
              <Textarea
                label="Message to the applicant"
                value={rejectionMessage}
                onChange={(event) => setRejectionMessage(event.target.value)}
                placeholder="Explain what they can improve before resubmitting."
                required
              />
            </div>
          )}
          {error && <div className="mt-5"><Alert>{error}</Alert></div>}
        </div>

        {pending && (
          <footer className="flex flex-wrap justify-end gap-3 border-t border-border px-6 py-4">
            {rejecting ? (
              <>
                <Button type="button" variant="outline" onClick={() => setRejecting(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => void decide("rejected")} disabled={saving || !rejectionMessage.trim()}>
                  {saving ? "Rejecting…" : "Confirm rejection"}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setRejecting(true)} disabled={saving}>
                  <X size={15} /> Reject
                </Button>
                <Button type="button" onClick={() => void decide("active")} disabled={saving}>
                  <Check size={15} /> {saving ? "Approving…" : "Approve"}
                </Button>
              </>
            )}
          </footer>
        )}
      </section>
    </div>,
    document.body,
  );
}
