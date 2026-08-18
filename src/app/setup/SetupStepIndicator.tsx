import {
  Check,
  CircleNotch,
  WarningCircle,
} from "@phosphor-icons/react";
import type { InitialSetupStepIndicatorProps } from "./setup.types";

export function SetupStepIndicator({
  number,
  status,
}: InitialSetupStepIndicatorProps) {
  if (status === "loading") {
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-[#8d6a00]">
        <CircleNotch className="animate-spin" size={18} weight="bold" />
      </span>
    );
  }
  if (status === "complete") {
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
        <Check size={18} weight="bold" />
      </span>
    );
  }
  if (status === "needs_action" || status === "error") {
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
        <WarningCircle size={19} weight="bold" />
      </span>
    );
  }
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-stone-100 text-sm font-semibold text-stone-500">
      {number}
    </span>
  );
}
