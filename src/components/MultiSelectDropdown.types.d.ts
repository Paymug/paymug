import type { ReactNode } from "react";

export interface MultiSelectDropdownOption {
  value: string;
  label: string;
}

export interface MultiSelectDropdownProps {
  label: string;
  name: string;
  values: string[];
  options: MultiSelectDropdownOption[];
  placeholder: string;
  menuFooter?: ReactNode;
  onChange(values: string[]): void;
}
