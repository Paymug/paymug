import type { ReactNode } from "react";

export interface CustomSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  id?: string;
  name?: string;
  label?: string;
  error?: string;
  value: string;
  options: CustomSelectOption[];
  onValueChange(value: string): void;
  ariaLabel?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  menuFooter?: ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  onOpenChange?(open: boolean): void;
  variant?: "field" | "plain";
}
