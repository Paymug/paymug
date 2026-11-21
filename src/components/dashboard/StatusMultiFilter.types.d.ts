export interface StatusMultiFilterOption {
  value: string;
  label: string;
}

export interface StatusMultiFilterProps {
  values: string[];
  options: StatusMultiFilterOption[];
  allLabel: string;
  ariaLabel: string;
  onChange(values: string[]): void;
}
