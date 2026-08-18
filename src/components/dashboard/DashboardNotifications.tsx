"use client";

import { BellSimple } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import {
  formatNotificationAge,
  getNotificationAccentClass,
  markNotificationsRead,
} from "./dashboard-notifications.utils";
import type { DashboardNotificationsProps } from "./DashboardNotifications.types";

export function DashboardNotifications({
  initialNotifications,
  initialHasUnread,
}: DashboardNotificationsProps) {
  const [open, setOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(initialHasUnread);
  const [notifications, setNotifications] = useState(initialNotifications);

  async function toggleNotifications() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && hasUnread && (await markNotificationsRead())) {
      setHasUnread(false);
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          readAt: notification.readAt || readAt,
        }))
      );
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleNotifications}
        className="relative grid h-9 w-9 place-items-center text-[#8b8ba3] transition hover:text-accent-hover"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <BellSimple size={20} weight="regular" aria-hidden />
        {hasUnread && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-[#f14e76]" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#e8e8ee] bg-white shadow-[0_18px_45px_rgb(42_38_63/16%)]">
          <div className="flex items-center justify-between border-b border-[#e8e8ee] px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {notifications.length > 0 && (
              <span className="text-sm text-[#85859d]">
                {notifications.length} recent
              </span>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="mt-1 text-sm text-[#85859d]">
                New store activity will appear here.
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.href || "/dashboard"}
                  onClick={() => setOpen(false)}
                  className={`flex gap-3 border-b border-[#f0f0f4] px-4 py-3 transition last:border-b-0 hover:bg-accent-soft ${
                    !notification.readAt ? "bg-accent-soft" : "bg-white"
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${getNotificationAccentClass(notification.type)}`}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {notification.title}
                    </span>
                    {notification.message && (
                      <span className="mt-0.5 block text-sm leading-relaxed text-[#74748f]">
                        {notification.message}
                      </span>
                    )}
                    <span className="mt-1 block text-sm text-[#9a9aab]">
                      {formatNotificationAge(notification.createdAt)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
