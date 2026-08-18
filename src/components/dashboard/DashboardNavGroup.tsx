"use client";

import { CaretDown, CaretUp } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  isDashboardNavGroupActive,
  isDashboardNavItemActive,
} from "../dashboard-nav.utils";
import type { DashboardNavGroupProps } from "./DashboardNavGroup.types";

export function DashboardNavGroup({
  group,
  icon,
  pathname,
}: DashboardNavGroupProps) {
  const groupIsActive = isDashboardNavGroupActive(pathname, group);
  const [isOpen, setIsOpen] = useState(
    Boolean(group.defaultOpen || groupIsActive)
  );
  const panelId = `dashboard-nav-${group.id}`;

  useEffect(() => {
    if (groupIsActive) setIsOpen(true);
  }, [groupIsActive, pathname]);

  return (
    <div className="mb-2">
      <button
        type="button"
        className="flex min-h-9 w-full cursor-pointer items-center gap-3 rounded-xl bg-transparent px-3.5 text-left text-sm font-medium text-[#333] transition hover:bg-[#f7f7f8] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent [&>svg:first-child]:text-[#9191aa]"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
      >
        {icon}
        <span>{group.label}</span>
        {isOpen ? (
          <CaretUp
            size={14}
            weight="bold"
            className="ml-auto text-[#9191aa]"
            aria-hidden
          />
        ) : (
          <CaretDown
            size={12}
            weight="bold"
            className="ml-auto text-[#9191aa]"
            aria-hidden
          />
        )}
      </button>

      {isOpen && (
        <div
          id={panelId}
          className="relative grid before:absolute before:bottom-4 before:left-2 before:top-4 before:w-px before:bg-[#e8e8ee] before:ml-3"
        >
          {group.items.map((item) => {
            const isActive = isDashboardNavItemActive(pathname, item);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative pl-11 flex min-h-9 items-center rounded-xl px-2.5 text-sm transition before:absolute before:left-[17.5px] before:h-1.5 before:w-1.5 before:rounded-full  ${
                  isActive
                    ? "bg-[#f7f7f8] before:bg-accent"
                    : "text-[#74748f] before:bg-[#e8e8ee] hover:bg-[#f7f7f8]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
