import { AppIcon } from "./dashboard/Icon";

export default function Powered() {

  return (
    <a
      href={`https://paymug.co/?ref=${process.env.NEXT_PUBLIC_APP_URL}`}
      className="flex items-center gap-1 py-4 text-[13px] font-medium text-[#9999aa]"
    >
      <span>Powered by</span>
      <span className="font-semibold text-[#555563]">Paymug</span>
      <AppIcon size={18} />
    </a>
  );
}
