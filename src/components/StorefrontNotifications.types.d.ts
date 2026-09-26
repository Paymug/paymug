import type { NotificationRecord } from "@/lib/notifications.types";

export interface StorefrontNotificationsProps {
  userId: string;
  environment: NotificationRecord["environment"];
  className?: string;
}
