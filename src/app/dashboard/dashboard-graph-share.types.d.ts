import type { DashboardMetricSeries } from "./dashboard-overview.types";

export interface DashboardGraphShareBackground {
  id: string;
  label: string;
  css: string;
  colors: [string, string, string];
  textColor: string;
  mutedColor: string;
  lineColor: string;
}

export interface DashboardGraphShareModalProps {
  metric: DashboardMetricSeries;
  currency: string;
  onClose(): void;
}

export interface DashboardGraphShareButtonProps {
  metric: DashboardMetricSeries;
  currency: string;
  className?: string;
}

export interface CreateDashboardGraphShareImageInput {
  metric: DashboardMetricSeries;
  currency: string;
  background: DashboardGraphShareBackground;
  chartCanvas: HTMLCanvasElement;
  iconSvg: SVGSVGElement;
  fontFamily: string;
}
