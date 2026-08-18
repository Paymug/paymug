"use client";

import {
  MagnifyingGlass,
  Plus,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardNotifications } from "./DashboardNotifications";
import { getDashboardTopbarTitle } from "./dashboard-topbar.utils";
import type { DashboardTopbarProps } from "./DashboardNotifications.types";

export function DashboardTopbar({
  initialNotifications,
  initialHasUnread,
}: DashboardTopbarProps) {
  const pathname = usePathname();
  const title = getDashboardTopbarTitle(pathname);

  return (
    <header className="row-start-2 flex min-w-0 items-center justify-between gap-4 px-4 py-4 sm:px-8 lg:col-start-2 lg:row-start-1 lg:px-10 lg:py-0">
      <h1 className="text-2xl font-medium tracking-[-0.035em] text-[#333]">
        {title}
      </h1>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="relative grid h-9 w-9 place-items-center text-[#8b8ba3] transition hover:text-accent-hover"
          aria-label="Search"
        >
          <MagnifyingGlass size={20} weight="regular" aria-hidden />
        </button>
        <DashboardNotifications
          initialNotifications={initialNotifications}
          initialHasUnread={initialHasUnread}
        />
        <Link
          href="/dashboard/products/new"
          className="ml-1 grid h-10 w-10 place-items-center rounded-full bg-accent text-dark transition hover:-translate-y-px hover:bg-accent-hover"
          aria-label="Create a new product"
        >
          <Plus size={22} weight="regular" aria-hidden />
        </Link>
      </div>
    </header>
  );
}
