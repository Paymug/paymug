export interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
  invertDelta?: boolean;
}
