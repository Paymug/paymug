import type { ReactNode } from "react";

export interface DashboardModalProps {
  title: string;
  children: ReactNode;
  onClose(): void;
}
