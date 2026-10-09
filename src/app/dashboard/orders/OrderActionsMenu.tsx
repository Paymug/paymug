"use client";

import { DotsThree, EnvelopeSimple } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getCustomerActionsMenuPosition } from "../customers/customer-actions-menu.utils";
import type { CustomerActionsMenuPosition } from "../customers/customers.types";
import type { OrderActionsMenuProps } from "./OrderActionsMenu.types";

export function OrderActionsMenu({
  orderId,
  orderNumber,
  canResend,
}: OrderActionsMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<CustomerActionsMenuPosition>();
  const [status, setStatus] = useState<{
    kind: "sending" | "sent" | "error";
    message: string;
  }>();

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const closeOnViewportChange = () => setOpen(false);
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, [open]);

  useEffect(() => {
    if (status?.kind !== "sent") return;
    const timeout = window.setTimeout(() => setStatus(undefined), 4000);
    return () => window.clearTimeout(timeout);
  }, [status]);

  async function resendConfirmation() {
    setOpen(false);
    setStatus({ kind: "sending", message: "Sending…" });
    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(orderId)}/resend-confirmation`,
        { method: "POST" },
      );
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        to?: string;
      } | null;
      setStatus(
        response.ok
          ? { kind: "sent", message: `Sent to ${data?.to || "customer"}` }
          : {
              kind: "error",
              message: data?.error || "Could not send the email",
            },
      );
    } catch {
      setStatus({ kind: "error", message: "Could not send the email" });
    }
  }

  return (
    <div className="flex items-center gap-2">
      {status && (
        <span
          role="status"
          className={`text-xs ${
            status.kind === "error" ? "text-red-600" : "text-[#8b8ba3]"
          }`}
        >
          {status.message}
        </span>
      )}
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Actions for order ${orderNumber}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          if (!triggerRef.current) return;
          setPosition(getCustomerActionsMenuPosition(triggerRef.current));
          setOpen((current) => !current);
        }}
        className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-[#9a9aaf] transition hover:bg-[#f5f5f8] hover:text-[#2a2a33]"
      >
        <DotsThree size={20} weight="bold" aria-hidden />
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={`Actions for order ${orderNumber}`}
            style={{ left: position.left, top: position.top }}
            className="fixed z-80 w-44 rounded-xl border border-[#d7e0ea] bg-white py-2 text-left shadow-[0_20px_45px_rgba(28,39,55,0.18)]"
          >
            <button
              type="button"
              role="menuitem"
              disabled={!canResend}
              title={canResend ? undefined : "Only paid orders can be resent"}
              onClick={() => void resendConfirmation()}
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-[#f7f7f8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <EnvelopeSimple size={16} aria-hidden />
              Resend confirmation
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
