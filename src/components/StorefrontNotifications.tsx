import clsx from "clsx";
import { DashboardNotifications } from "./dashboard/DashboardNotifications";
import { countUnreadNotifications, listNotifications } from "@/lib/notifications";
import type { StorefrontNotificationsProps } from "./StorefrontNotifications.types";

export async function StorefrontNotifications({
  userId,
  environment,
  className,
}: StorefrontNotificationsProps) {
  const [notifications, unreadCount] = await Promise.all([
    listNotifications(userId, 12, environment),
    countUnreadNotifications(userId, environment),
  ]);

  return (
    <div className={clsx("z-20", className)}>
      <DashboardNotifications
        initialNotifications={notifications}
        initialHasUnread={unreadCount > 0}
        initialUnreadCount={unreadCount}
      />
    </div>
  );
}
