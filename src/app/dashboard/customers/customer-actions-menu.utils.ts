import type { CustomerActionsMenuPosition } from "./customers.types";

export function getCustomerActionsMenuPosition(
  trigger: HTMLElement,
): CustomerActionsMenuPosition {
  const rect = trigger.getBoundingClientRect();
  const menuWidth = 184;
  const estimatedMenuHeight = 96;
  const viewportGap = 8;
  const left = Math.max(
    viewportGap,
    Math.min(
      rect.right - menuWidth,
      window.innerWidth - menuWidth - viewportGap,
    ),
  );
  const top =
    rect.bottom + viewportGap + estimatedMenuHeight <= window.innerHeight
      ? rect.bottom + viewportGap
      : Math.max(viewportGap, rect.top - estimatedMenuHeight - viewportGap);
  return { left, top };
}
