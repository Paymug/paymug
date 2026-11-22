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
  transparentBackground?: boolean;
  className?: string;
  /** Optional secondary series (for example orders/revenue bars) shown in the tooltip. */
  commerceSeries?: ChartCommerceSeries[];
  /** Centers category points within their slots (aligns with overlaid bars). */
  categoryOffset?: boolean;
  /** Draw only the `line` series from `commerceSeries`, not the current/previous lines. */
  hideBaseSeries?: boolean;
}

export interface ChartCommerceSeries {
  label: string;
  color: string;
  data: ChartPoint[];
  format: ChartValueFormat;
  currency?: string;
  /** Also draw this series as a line on the chart. */
  line?: boolean;
}

export interface ChartTooltipContext {
  chart: ChartJS<"line">;
  tooltip: TooltipModel<"line">;
}

export type ChartTrendDirection = "positive" | "negative" | "neutral";
