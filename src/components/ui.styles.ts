export const buttonBaseClass =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border-0 px-4 py-2.5 text-sm font-semibold leading-tight no-underline transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55";

export const buttonVariantClasses = {
  primary: "bg-accent text-dark hover:bg-accent-hover",
  dark: "bg-dark text-white hover:bg-[#2a2620]",
  outline:
    "border border-border bg-transparent text-foreground hover:border-[#d4cfc4] hover:bg-white",
  ghost: "bg-transparent text-foreground hover:bg-black/4",
  danger: "bg-red-50 text-danger hover:bg-red-100",
} as const;

export const inputClass =
  "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-stone-400 focus:border-accent focus:ring-3 focus:ring-accent/25";

export const labelClass =
  "mb-1.5 block text-sm font-medium text-foreground";

export const cardClass =
  "rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(20,18,11,0.04)]";

export const badgeBaseClass =
  "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium";

export const badgeVariantClasses = {
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-accent-soft text-amber-800",
  muted: "bg-stone-100 text-stone-600",
  danger: "bg-red-100 text-red-800",
} as const;

export const payPalButtonClass =
  "flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded bg-[#ffc439] text-sm font-bold tracking-[0.01em] text-[#003087] transition hover:brightness-[0.97] active:scale-[0.99]";
