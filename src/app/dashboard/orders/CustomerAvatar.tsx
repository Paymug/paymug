import { getCustomerInitials } from "./orders.utils";

export function CustomerAvatar({
  name,
  email,
  avatarUrl,
  size = "md",
}: {
  name: string;
  email: string;
  avatarUrl?: string;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const s = sizes[size]

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`${s.cls} shrink-0 rounded-full object-cover ring-1 ring-[#ececf1]`}
      />
    );
  }

  return (
    <span
      className={`${s.cls} grid shrink-0 place-items-center rounded-full bg-[#f0f0f5] font-semibold text-[#6f6f84] ring-1 ring-[#ececf1]`}
      aria-hidden
    >
      {getCustomerInitials(name, email)}
    </span>
  );
}

const sizes = {
  xs: {
    cls: 'h-6 w-6 text-xs'
  },
  sm: {
    cls: "h-8 w-8 text-[11px]"
  },
  lg: {
    cls: "h-11 w-11 text-sm"
  },
  md: {
    cls: "h-9 w-9 text-xs"
  },
}