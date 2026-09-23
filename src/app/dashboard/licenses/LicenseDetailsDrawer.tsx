"use client";

import { Check, Copy, X } from "@phosphor-icons/react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { CustomerAvatar } from "@/components/CustomerAvatar";
import { Button, Input } from "@/components/ui";
import { CustomerLicenseActivations } from "../customers/CustomerLicenseActivations";
import { formatCustomerDate } from "../customers/customers.utils";
import type { LicenseDetailsDrawerProps, LicenseRow } from "./licenses.types";

function toDateInputValue(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function LicenseDetailsDrawer({
  license,
  onClose,
  onUpdated,
}: LicenseDetailsDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [seatLimitInput, setSeatLimitInput] = useState(
    license.seatLimit === null ? "" : String(license.seatLimit),
  );
  const [expiryInput, setExpiryInput] = useState(
    toDateInputValue(license.expiry),
  );
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>();
  const titleId = useId();

  const expiryField = license.perpetual ? "updatesExpireAt" : "expiresAt";
  const disabled = license.status === "revoked";

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

  if (!mounted) return null;

  const close = () => {
    setClosing(true);
    setVisible(false);
  };

  async function saveControls() {
    setSaving(true);
    setError(undefined);
    const seatLimit = seatLimitInput.trim()
      ? Math.max(1, Number(seatLimitInput))
      : null;
    const expiry = expiryInput
      ? new Date(`${expiryInput}T12:00:00.000Z`).toISOString()
      : null;
    try {
      const response = await fetch(`/api/features/licenses/${license.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { seatLimit, [expiryField]: expiry } }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not save changes");
      const updated: LicenseRow = {
        ...license,
        seatLimit,
        [expiryField]: expiry ?? undefined,
        expiry: expiry ?? undefined,
      };
      onUpdated(updated);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not save changes",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleDisabled() {
    setToggling(true);
    setError(undefined);
    const nextStatus = disabled ? "active" : "revoked";
    try {
      const response = await fetch(`/api/features/licenses/${license.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not update key");
      onUpdated({ ...license, status: nextStatus });
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Could not update key",
      );
    } finally {
      setToggling(false);
    }
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(license.key);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-50 bg-[#222129]/45 backdrop-blur-[1px] transition-opacity duration-200 ${
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
        className={`ml-auto flex h-dvh w-full max-w-[30rem] flex-col overflow-hidden border-l border-[#e5e5eb] bg-white shadow-[-22px_0_60px_rgba(25,24,31,0.16)] transition-transform duration-300 ease-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="shrink-0 border-b border-border px-6 pb-5 pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
                License
              </p>
              <div className="mt-1 flex items-center gap-2">
                <h2
                  id={titleId}
                  className="min-w-0 break-all font-mono text-base font-semibold"
                >
                  {license.key}
                </h2>
                <button
                  type="button"
                  onClick={() => void copyKey()}
                  className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-[#8b8ba3] transition hover:bg-[#f4f4f7] hover:text-accent-hover"
                  aria-label="Copy license key"
                  title={copied ? "Copied" : "Copy license key"}
                >
                  {copied ? (
                    <Check size={16} weight="bold" className="text-emerald-600" />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
              <p className="mt-1 truncate text-sm text-muted">
                {license.product}
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-[#f4f4f7] hover:text-foreground"
              aria-label="Close license details"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="flex items-center gap-3 rounded-xl border border-[#ececf1] px-3.5 py-3">
            <CustomerAvatar
              name={license.customerName}
              email={license.customerEmail}
              avatarUrl={license.customerAvatarUrl}
              size="md"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {license.customerName}
              </p>
              <p className="truncate text-xs text-muted">
                {license.customerEmail}
              </p>
            </div>
          </div>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Issued</dt>
              <dd className="tabular-nums">
                {formatCustomerDate(license.issuedAt)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Status</dt>
              <dd className="capitalize">{license.status}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Activations</dt>
              <dd className="tabular-nums">
                {license.activeSeats}/
                {license.seatLimit === null ? "∞" : license.seatLimit}
              </dd>
            </div>
          </dl>

          <div className="mt-6 border-t border-[#f0f0f4] pt-6">
            <h3 className="text-sm font-semibold">Manage</h3>

            <div className="mt-4">
              <Input
                label="Activation limit"
                type="number"
                min="1"
                value={seatLimitInput}
                onChange={(event) => setSeatLimitInput(event.target.value)}
                placeholder="Unlimited"
              />
              <p className="mt-1 text-xs text-muted">
                Leave empty for unlimited devices.
              </p>
            </div>

            <div className="mt-4">
              <Input
                label={
                  license.perpetual ? "Updates expire" : "License expiration"
                }
                type="date"
                value={expiryInput}
                onChange={(event) => setExpiryInput(event.target.value)}
              />
              <p className="mt-1 text-xs text-muted">
                Leave empty for no expiration.
              </p>
            </div>

            {error && (
              <p className="mt-3 text-xs leading-5 text-red-600">{error}</p>
            )}

            <Button
              type="button"
              className="mt-4 w-full"
              disabled={saving}
              onClick={() => void saveControls()}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>

            <button
              type="button"
              disabled={toggling}
              onClick={() => void toggleDisabled()}
              className={`mt-3 w-full cursor-pointer rounded-lg border px-3.5 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-55 ${
                disabled
                  ? "border-[#dddde7] text-foreground hover:bg-[#f7f7f8]"
                  : "border-red-200 text-red-600 hover:bg-red-50"
              }`}
            >
              {toggling
                ? "Working…"
                : disabled
                  ? "Enable key"
                  : "Disable key"}
            </button>
          </div>

          <div className="mt-6 border-t border-[#f0f0f4] pt-6">
            <h3 className="text-sm font-semibold">Devices</h3>
            <CustomerLicenseActivations
              licenseId={license.id}
              seatLimit={license.seatLimit}
              initialActivations={license.activations}
            />
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
