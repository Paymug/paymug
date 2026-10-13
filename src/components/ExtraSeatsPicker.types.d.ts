export interface ExtraSeatsPickerProps {
  extraSeats: number;
  label?: string;
  /** Fewest seats the picker can go down to. */
  min?: number;
  /** Most seats the picker can go up to. */
  max?: number;
  /** Controlled mode: called instead of updating the page URL. */
  onChange?(seats: number): void;
}
