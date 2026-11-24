"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { NotificationRecord } from "@/lib/notifications.types";
import { useTimeZone } from "./TimeZoneProvider";
import {
  fetchNotificationsPage,
  formatNotificationAge,
  getNotificationAccentClass,
} from "./dashboard-notifications.utils";

export function NotificationHistory({ onClose }: { onClose: () => void }) {
  const timeZone = useTimeZone();
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  const loadMore = useCallback(async () => {
    if (busy.current || done) return;
    busy.current = true;
    setLoading(true);
    setError(false);
    try {
      const page = await fetchNotificationsPage(cursor);
      setItems((current) => [...current, ...page.items]);
      setCursor(page.nextCursor);
      if (!page.nextCursor) setDone(true);
    } catch {
      setError(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [cursor, done]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || error) return;
    const observer = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && loadMore(),
      { rootMargin: "120px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, error]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Notification history"
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[#e8e8ee] bg-white shadow-[0_18px_45px_rgb(42_38_63/16%)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#e8e8ee] px-4 py-3">
          <p className="text-sm font-semibold">All notifications</p>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[#85859d] transition hover:text-accent-hover"
          >
            Close
          </button>
        </div>
        <div className="overflow-y-auto">
          {items.map((notification) => (
            <Link
              key={notification.id}
              href={notification.href || "/dashboard"}
              onClick={onClose}
              className={`flex gap-3 border-b border-[#f0f0f4] px-4 py-3 transition hover:bg-accent-soft ${
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
                  {formatNotificationAge(notification.createdAt, timeZone)}
                </span>
              </span>
            </Link>
          ))}
          <div ref={sentinel} className="px-4 py-3 text-center text-sm text-[#85859d]">
            {loading && "Loading…"}
            {error && (
              <button type="button" onClick={loadMore} className="underline">
                Failed to load. Retry
              </button>
            )}
            {done && items.length === 0 && "No notifications yet"}
            {done && items.length > 0 && "End of history"}
          </div>
        </div>
      </div>
    </div>
  );
}
