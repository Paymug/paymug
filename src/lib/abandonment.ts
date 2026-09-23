export const DEFAULT_ABANDONMENT_QUESTION = "Why are you leaving?";
export const DEFAULT_ABANDONMENT_OPTIONS = [
  "The price is too high",
  "I found a better option",
  "Not ready to buy yet",
  "Just browsing",
];

const MAX_OPTIONS = 20;
const MAX_OPTION_LENGTH = 160;

function normalizeOptionList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const options: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim().slice(0, MAX_OPTION_LENGTH);
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    options.push(trimmed);
    if (options.length >= MAX_OPTIONS) break;
  }
  return options;
}

export function parseAbandonmentOptions(
  value: string | null | undefined,
): string[] {
  if (!value) return [];
  try {
    return normalizeOptionList(JSON.parse(value));
  } catch {
    return [];
  }
}

export function normalizeAbandonmentOptions(value: unknown): string[] {
  return normalizeOptionList(value);
}
