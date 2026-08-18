import type {
  Chart as ChartJS,
  TooltipModel,
} from "chart.js";

export interface ChartPoint {
  label: string;
  value: number;
  date?: string;
}

export type ChartValueFormat = "money" | "number" | "percent";

export interface ChartProps {
  data: ChartPoint[];
  comparisonData?: ChartPoint[];
  height?: number;
  color?: string;
  comparisonColor?: string;
  fillOpacity?: number;
  currency?: string;
  valueFormat?: ChartValueFormat;
  showAxis?: boolean;
  variant?: "area" | "bar";
  emptyLabel?: string;
  title?: string;
  trendPercent?: number | null;
  locale?: string;
  gridEvery?: number;
  showGrid?: boolean;
  endpointLabelFontSize?: number;
  className?: string;
}

export interface ChartTooltipContext {
  chart: ChartJS<"line">;
  tooltip: TooltipModel<"line">;
}

export type ChartTrendDirection = "positive" | "negative" | "neutral";
