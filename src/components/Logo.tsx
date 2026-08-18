import Link from "next/link";
import { AppIcon } from "./dashboard/Icon";

export function Logo({
  href = "/",
  light = false,
  size = "md",
  label = true
}: {
  href?: string;
  light?: boolean;
  size?: "sm" | "md" | "lg";
  label?: boolean | string
}) {
  const text =
    size === "sm" ? "text-lg" : size === "lg" ? "text-2xl" : "text-xl";
  const lemon =
    size === "sm" ? "h-6 w-6" : size === "lg" ? "h-9 w-9" : "h-7 w-7";

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-3 font-bold tracking-tight ${text} ${light ? "text-white" : "text-foreground"}`}
    >
      <AppIcon size={28} />
      {typeof label === "string" ? label : label ?  "Paymug" : undefined}
    </Link>
  );
}
