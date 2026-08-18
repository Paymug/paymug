"use client";

import {
  Check,
  DotsThree,
  Copy,
  File,
  GlobeSimple,
  Trash,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getProductActionsMenuPosition } from "./product-actions-menu.utils";
import type {
  ProductActionResponse,
  ProductActionsMenuPosition,
  ProductActionsMenuProps,
} from "./ProductActionsMenu.types";
import type { ProductStatus } from "@/lib/types";

export function ProductActionsMenu({
  id,
  name,
  status,
}: ProductActionsMenuProps) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<ProductActionsMenuPosition>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function changeStatus(nextStatus: ProductStatus) {
    if (nextStatus === status) {
      setOpen(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = (await response.json()) as ProductActionResponse;
      if (!response.ok) {
        throw new Error(data.error || "Could not update product status");
      }
      setOpen(false);
      router.refresh();
    } catch (changeError) {
      setError(
        changeError instanceof Error
          ? changeError.message
          : "Could not update product status",
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct() {
    if (!confirm(`Delete “${name}”?`)) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as ProductActionResponse;
      if (!response.ok) throw new Error(data.error || "Could not delete product");
      setOpen(false);
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete product",
      );
    } finally {
      setLoading(false);
    }
  }

  async function duplicateProduct() {
    const duplicatedName = window.prompt(
      "Product name for the duplicate",
      `${name} copy`,
    );
    if (duplicatedName === null) return;
    const nextName = duplicatedName.trim();
    if (!nextName) {
      setError("Enter a name for the duplicate product");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/products/${id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      });
      const data = (await response.json()) as ProductActionResponse;
      if (!response.ok) {
        throw new Error(data.error || "Could not duplicate product");
      }
      setOpen(false);
      router.refresh();
    } catch (duplicateError) {
      setError(
        duplicateError instanceof Error
          ? duplicateError.message
          : "Could not duplicate product",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={loading}
        aria-label={`More actions for ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          if (!triggerRef.current) return;
          setPosition(getProductActionsMenuPosition(triggerRef.current));
          setError(null);
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-[#77778e] transition hover:bg-[#f7f7f8] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-55"
      >
        <DotsThree size={20} weight="bold" aria-hidden />
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={`Actions for ${name}`}
            style={{ left: position.left, top: position.top }}
            className="fixed z-80 w-52 rounded-xl border border-[#d7e0ea] bg-white py-2 text-left shadow-[0_20px_45px_rgba(28,39,55,0.18)]"
          >
            <p className="px-4 pb-1.5 pt-1 text-xs font-medium text-muted">
              Change status
            </p>
            <button
              type="button"
              role="menuitem"
              disabled={loading}
              onClick={() => void changeStatus("published")}
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-[#f7f7f8] disabled:cursor-not-allowed disabled:opacity-55"
            >
              <GlobeSimple size={16} aria-hidden />
              <span className="flex-1 text-left">Published</span>
              {status === "published" && (
                <Check size={15} weight="bold" className="text-accent-hover" aria-hidden />
              )}
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={loading}
              onClick={() => void changeStatus("draft")}
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-[#f7f7f8] disabled:cursor-not-allowed disabled:opacity-55"
            >
              <File size={16} aria-hidden />
              <span className="flex-1 text-left">Draft</span>
              {status === "draft" && (
                <Check size={15} weight="bold" className="text-accent-hover" aria-hidden />
              )}
            </button>
            <div className="mt-2 border-t border-[#e8e8ee] pt-2">
              <button
                type="button"
                role="menuitem"
                disabled={loading}
                onClick={() => void duplicateProduct()}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-[#f7f7f8] disabled:cursor-not-allowed disabled:opacity-55"
              >
                <Copy size={16} aria-hidden />
                Duplicate
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={loading}
                onClick={() => void deleteProduct()}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm font-medium text-danger transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-55"
              >
                <Trash size={16} aria-hidden />
                {loading ? "Working…" : "Delete"}
              </button>
            </div>
            {error && (
              <p className="px-4 pb-1 pt-2 text-xs leading-5 text-danger">
                {error}
              </p>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
