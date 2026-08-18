import type { ProductActionsMenuPosition } from "./ProductActionsMenu.types";

export function getProductActionsMenuPosition(
  trigger: HTMLElement,
): ProductActionsMenuPosition {
  const rect = trigger.getBoundingClientRect();
  const menuWidth = 208;
  const estimatedMenuHeight = 190;
  const viewportGap = 8;
  const left = Math.max(
    viewportGap,
    Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - viewportGap),
  );
  const top =
    rect.bottom + viewportGap + estimatedMenuHeight <= window.innerHeight
      ? rect.bottom + viewportGap
      : Math.max(viewportGap, rect.top - estimatedMenuHeight - viewportGap);
  return { left, top };
}
