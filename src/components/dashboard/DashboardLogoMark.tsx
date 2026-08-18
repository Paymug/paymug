import Link from "next/link";
import { AppIcon } from "./Icon";

export function DashboardLogoMark() {
  const petalClass =
    "absolute left-[0.74rem] top-[0.68rem] h-[0.42rem] w-[0.92rem] origin-[-0.22rem_50%] rounded-[999px_999px_999px_0] bg-[#ffbf2f]";

  return (
    <Link
      href="/dashboard"
      className="relative block h-7 w-7 pl-2"
      aria-label="Paymug dashboard"
    >
      <AppIcon size={36} />
    </Link>
  );
}
