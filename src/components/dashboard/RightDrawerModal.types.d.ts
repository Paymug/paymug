import type { ReactNode } from "react";

export interface RightDrawerModalHandle {
  close(): void;
}

export interface RightDrawerModalProps {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Rendered on the description line, aligned right under the close button. */
  descriptionAction?: ReactNode;
  footer?: ReactNode;
  onClose(): void;
  children: ReactNode;
}
