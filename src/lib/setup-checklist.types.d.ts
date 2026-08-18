export interface SetupChecklistSubcheck {
  id: string;
  label: string;
  description: string;
  complete: boolean;
}

export interface SetupChecklistItem {
  id: string;
  title: string;
  description: string;
  complete: boolean;
  required: boolean;
  actionLabel?: string;
  href?: string;
  external?: boolean;
  checks?: SetupChecklistSubcheck[];
}

export interface SetupChecklistGroup {
  id: "store" | "payments" | "testing" | "platform";
  title: string;
  description: string;
  items: SetupChecklistItem[];
}

export interface SetupChecklist {
  groups: SetupChecklistGroup[];
  completedRequired: number;
  totalRequired: number;
  progress: number;
}
