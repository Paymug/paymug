"use client";

import { Copy, DotsThree, Eye } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getCustomerActionsMenuPosition } from "./customer-actions-menu.utils";
import type {
  CustomerActionsMenuPosition,
  CustomerActionsMenuProps,
} from "./customers.types";

export function CustomerActionsMenu({
  customer,
  onView,
}: CustomerActionsMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<CustomerActionsMenuPosition>();
  const [copied, setCopied] = useState(false);

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
    if (open) setCopied(false);
  }, [open]);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(customer.email);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Actions for ${customer.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          if (!triggerRef.current) return;
          setPosition(getCustomerActionsMenuPosition(triggerRef.current));
          setOpen((current) => !current);
        }}
        className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-[#77778e] transition hover:bg-[#f7f7f8] hover:text-foreground"
      >
        <DotsThree size={20} weight="bold" aria-hidden />
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={`Actions for ${customer.name}`}
            style={{ left: position.left, top: position.top }}
            onClick={(event) => event.stopPropagation()}
            className="fixed z-80 w-44 rounded-xl border border-[#d7e0ea] bg-white py-2 text-left shadow-[0_20px_45px_rgba(28,39,55,0.18)]"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onView();
              }}
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-[#f7f7f8]"
            >
              <Eye size={16} aria-hidden />
              View details
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => void copyEmail()}
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-[#f7f7f8]"
            >
              <Copy size={16} aria-hidden />
              {copied ? "Copied" : "Copy email"}
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
