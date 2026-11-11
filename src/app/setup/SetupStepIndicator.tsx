import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  Loading03Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import type { InitialSetupStepIndicatorProps } from "./setup.types";

export function SetupStepIndicator({
  number,
  status,
}: InitialSetupStepIndicatorProps) {
  if (status === "loading") {
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-[#8d6a00]">
        <HugeiconsIcon icon={Loading03Icon} className="animate-spin" size={18} strokeWidth={2} />
      </span>
    );
  }
  if (status === "complete") {
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
        <HugeiconsIcon icon={Tick02Icon} size={18} strokeWidth={2} />
      </span>
    );
  }
  if (status === "needs_action" || status === "error") {
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
        <HugeiconsIcon icon={AlertCircleIcon} size={19} strokeWidth={2} />
      </span>
    );
  }
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-stone-100 text-sm font-semibold text-stone-500">
      {number}
    </span>
  );
}
