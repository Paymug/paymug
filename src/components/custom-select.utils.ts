import type { CustomSelectOption } from "./CustomSelect.types";

export function getCustomSelectOptionIndex(
  options: CustomSelectOption[],
  value: string
) {
  const index = options.findIndex((option) => option.value === value);
  return index >= 0 ? index : options.length > 0 ? 0 : -1;
}

export function getNextCustomSelectOptionIndex(
  options: CustomSelectOption[],
  currentIndex: number,
  direction: 1 | -1
) {
  if (options.length === 0) return -1;
  let nextIndex =
    currentIndex >= 0 ? currentIndex : direction === 1 ? -1 : 0;
  for (let count = 0; count < options.length; count += 1) {
    nextIndex = (nextIndex + direction + options.length) % options.length;
    if (!options[nextIndex]?.disabled) return nextIndex;
  }
  return currentIndex;
}

export function filterCustomSelectOptions(
  options: CustomSelectOption[],
  query: string,
): CustomSelectOption[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return options;
  return options.filter((option) =>
    option.label.toLowerCase().includes(normalizedQuery),
  );
}
