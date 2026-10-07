export interface DataTableColumn {
  id: string;
  label: string;
  /** Default width in px. */
  width: number;
  minWidth?: number;
  align?: "left" | "right";
}
