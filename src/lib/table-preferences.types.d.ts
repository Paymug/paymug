export interface TablePreference {
  hidden: string[];
  widths: Record<string, number>;
}

export type TablePreferences = Record<string, TablePreference>;
