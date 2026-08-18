export interface RowSelectionState {
  selectedIds: Set<string>;
  hasSelection: boolean;
  isSelected(id: string): boolean;
  toggle(id: string, index: number, shiftKey: boolean): void;
  toggleAll(): void;
  beginDrag(id: string): void;
  enterDrag(id: string): void;
}
