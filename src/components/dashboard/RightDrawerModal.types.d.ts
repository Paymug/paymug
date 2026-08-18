import type { ReactNode } from "react";

export interface RightDrawerModalHandle {
  close(): void;
}

export interface RightDrawerModalProps {
  eyebrow?: string;
  title: string;
  description?: string;
  footer?: ReactNode;
  onClose(): void;
  children: ReactNode;
}
