import { Heart } from "@phosphor-icons/react/ssr";

export function PayWhatYouWantBadge() {
  return (
    <span
      className="group/pwyw relative inline-flex shrink-0 text-accent"
      aria-label="Pay what you want"
    >
      <Heart size={17} weight="fill" aria-hidden />
      <span
        role="tooltip"
        aria-hidden="true"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-sm transition-opacity group-hover/pwyw:opacity-100"
      >
        Pay what you want
      </span>
    </span>
  );
}
