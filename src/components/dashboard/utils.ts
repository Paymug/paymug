import type { Plugin } from "chart.js";
import { formatMoney } from "@/lib/format";
import type {
  ChartPoint,
  ChartTrendDirection,
  ChartValueFormat,
} from "./charts.types";

export function formatChartValue(
  value: number,
  format: ChartValueFormat,
  currency?: string
) {
  if (format === "money" && currency) {
    return formatMoney(value, currency);
  }
  if (format === "percent") {
    return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function createDashedGridPlugin(step: number): Plugin<"line"> {
  return {
    id: "paymugDashedVerticalGrid",
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      const xScale = scales.x;
      const labelCount = chart.data.labels?.length || 0;
      if (!chartArea || !xScale || labelCount === 0) return;

      ctx.save();
      ctx.strokeStyle = "#d2d3dc";
      ctx.lineWidth = 1;
      ctx.lineCap = "butt";
      ctx.setLineDash([5, 7]);
      for (let index = 0; index < labelCount; index += step) {
        const xPosition = xScale.getPixelForValue(index);
        ctx.beginPath();
        ctx.moveTo(xPosition, chartArea.top);
        ctx.lineTo(xPosition, chartArea.bottom);
        ctx.stroke();
      }
      ctx.restore();
    },
  };
}

export function getChartGridStep(
  pointCount: number,
  preferredStep?: number,
  maximumTicks = 7
) {
  const minimumStep = Math.max(
    1,
    Math.ceil(pointCount / Math.max(1, maximumTicks))
  );
  return Math.max(minimumStep, preferredStep || 1);
}

export function createEndpointLabelsPlugin(
  startLabel: string,
  endLabel: string,
  fontSize: number
): Plugin<"line"> {
  return {
    id: "paymugEndpointLabels",
    afterDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;

      ctx.save();
      ctx.fillStyle = "#696b82";
      ctx.font = `${fontSize}px Inter, ui-sans-serif, system-ui, -apple-system, sans-serif`;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillText(startLabel, chartArea.left, chartArea.bottom + 12);
      ctx.textAlign = "right";
      ctx.fillText(endLabel, chartArea.right, chartArea.bottom + 12);
      ctx.restore();
    },
  };
}

export function toChartColorWithAlpha(color: string, alpha: number) {
  const normalized = color.replace("#", "");
  const hex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => `${character}${character}`)
          .join("")
      : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return color;
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function calculateChartTrend(
  data: ChartPoint[],
  comparisonData: ChartPoint[]
) {
  const currentTotal = data.reduce(
    (total, point) => total + point.value,
    0
  );
  const previousTotal = comparisonData.reduce(
    (total, point) => total + point.value,
    0
  );
  if (previousTotal === 0) return currentTotal === 0 ? 0 : 100;
  return ((currentTotal - previousTotal) / previousTotal) * 100;
}

export function getChartTrendDirection(
  trend: number
): ChartTrendDirection {
  return trend > 0 ? "positive" : trend < 0 ? "negative" : "neutral";
}

export function getChartTrendArrow(trend: number) {
  return trend > 0 ? "↑" : trend < 0 ? "↓" : "→";
}

export function parseChartDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00Z`);
  }
  return new Date(value);
}

export function formatChartPointDate(
  point: ChartPoint,
  formatter: Intl.DateTimeFormat
) {
  if (!point.date) return point.label;
  const date = parseChartDate(point.date);
  return Number.isNaN(date.getTime()) ? point.label : formatter.format(date);
}

export function setChartTooltipText(
  tooltip: HTMLElement,
  role: string,
  value: string
) {
  const element = tooltip.querySelector<HTMLElement>(
    `[data-tooltip-role="${role}"]`
  );
  if (element) element.textContent = value;
}

export function positionExternalChartTooltip(
  container: HTMLElement,
  tooltip: HTMLElement,
  canvas: HTMLCanvasElement,
  caretX: number,
  caretY: number
) {
  const containerRect = container.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const canvasLeft = canvasRect.left - containerRect.left;
  const canvasTop = canvasRect.top - containerRect.top;
  const padding = 10;
  const desiredLeft = canvasLeft + caretX + 14;
  const desiredTop = canvasTop + caretY - tooltip.offsetHeight / 2;
  const maximumLeft = containerRect.width - tooltip.offsetWidth - padding;
  const maximumTop = containerRect.height - tooltip.offsetHeight - padding;
  const left = Math.max(padding, Math.min(desiredLeft, maximumLeft));
  const top = Math.max(padding, Math.min(desiredTop, maximumTop));
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}
