"use client";

import { DotsThree } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { DataTableColumn } from "./data-table.types";
import type { DataTableState } from "./use-data-table";

const stickyCellClass =
  "sticky right-0 z-10 bg-white group-hover/row:bg-[#fafafd]";

export function DataTableColgroup({ table }: { table: DataTableState }) {
  return (
    <colgroup>
      {table.leadingWidth > 0 && (
        <col style={{ width: table.leadingWidth }} />
      )}
      {table.visibleColumns.map((column) => (
        <col key={column.id} style={{ width: table.getWidth(column) }} />
      ))}
      <col />
    </colgroup>
  );
}

export function DataTableHeadCell({
  table,
  column,
}: {
  table: DataTableState;
  column: DataTableColumn;
}) {
  function startResize(event: React.PointerEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = table.getWidth(column);
    const minWidth = column.minWidth ?? 60;
    const move = (moveEvent: PointerEvent) => {
      table.previewWidth(
        column.id,
        Math.max(minWidth, Math.round(startWidth + moveEvent.clientX - startX)),
      );
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      table.commitWidths();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  }

  return (
    <th
      className={`relative truncate px-4 py-3 font-medium ${
        column.align === "right" ? "text-right" : ""
      }`}
    >
      {column.label}
      <span
        role="separator"
        aria-orientation="vertical"
        aria-label={`Resize ${column.label} column`}
        onPointerDown={startResize}
        onClick={(event) => event.stopPropagation()}
        className="absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize touch-none select-none after:absolute after:right-0 after:top-2 after:h-[calc(100%-1rem)] after:w-px after:bg-transparent hover:after:bg-border"
      />
    </th>
  );
}

export function DataTableSettingsHeadCell({
  table,
}: {
  table: DataTableState;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      const target = event.target as Node;
      if (
        menuRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeOnScroll = () => setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("scroll", closeOnScroll, true);
    window.addEventListener("resize", closeOnScroll);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("resize", closeOnScroll);
    };
  }, [open]);

  function toggle() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({
        top: rect.bottom + 6,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    }
    setOpen((current) => !current);
  }

  const onlyOneVisible = table.visibleColumns.length <= 1;

  return (
    <th className={`${stickyCellClass} px-2 py-2 text-right font-medium`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label="Choose visible columns"
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-grid h-8 w-8 place-items-center rounded-lg text-[#8b8ba3] transition hover:bg-[#f4f4f8] hover:text-[#2a2a33]"
      >
        <DotsThree size={20} weight="bold" aria-hidden />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: position.top, right: position.right }}
            className="fixed z-[70] w-56 rounded-xl border border-[#e8e8ee] bg-white p-1.5 text-left text-sm font-normal text-[#2a2a33] shadow-[0_18px_45px_rgb(42_38_63/16%)]"
          >
            <p className="px-2.5 py-1.5 text-xs font-medium text-[#85859d]">
              Columns
            </p>
            {table.columns.map((column) => {
              const checked = table.isVisible(column.id);
              return (
                <label
                  key={column.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-[#f4f4f8]"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#d8ad00]"
                    checked={checked}
                    disabled={checked && onlyOneVisible}
                    onChange={() => table.toggleColumn(column.id)}
                  />
                  {column.label}
                </label>
              );
            })}
            <button
              type="button"
              onClick={table.resetColumns}
              className="mt-1 w-full rounded-lg border-t border-[#e8e8ee] px-2.5 py-2 text-left text-[#85859d] hover:bg-[#f4f4f8]"
            >
              Reset columns
            </button>
          </div>,
          document.body,
        )}
    </th>
  );
}

export function DataTableSettingsCell({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <td className={`${stickyCellClass} px-2 py-3 text-right`}>{children}</td>
  );
}
