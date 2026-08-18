"use client";

import {
  useCallback,
  useMemo,
  useRef,
  type CSSProperties,
} from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
  type Plugin,
} from "chart.js";
import { Line } from "react-chartjs-2";
import styles from "./charts.module.css";
import type {
  ChartPoint,
  ChartProps,
  ChartTooltipContext,
} from "./charts.types";
import {
  calculateChartTrend,
  createDashedGridPlugin,
  createEndpointLabelsPlugin,
  formatChartPointDate,
  formatChartValue,
  getChartGridStep,
  getChartTrendArrow,
  getChartTrendDirection,
  positionExternalChartTooltip,
  setChartTooltipText,
  toChartColorWithAlpha,
} from "./utils";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip
);

export type { ChartPoint } from "./charts.types";

export function AreaChart({
  data,
  comparisonData = [],
  height = 220,
  color = "#f5c518",
  comparisonColor = "#a3a3ad",
  fillOpacity = 0.035,
  currency,
  valueFormat = currency ? "money" : "number",
  showAxis = false,
  emptyLabel = "No data in this period",
  title = "Metric",
  trendPercent,
  locale = "en-US",
  gridEvery,
  showGrid = true,
  endpointLabelFontSize,
  className = "",
}: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const compact = height < 200;
  const startLabel = data[0]?.label || "";
  const endLabel = data[data.length - 1]?.label || "";
  const trend =
    trendPercent ?? calculateChartTrend(data, comparisonData);
  const trendDirection = getChartTrendDirection(trend);
  const trendArrow = getChartTrendArrow(trend);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
    [locale]
  );

  const chartData = useMemo<ChartData<"line", number[], string>>(
    () => ({
      labels: data.map((_, index) => String(index)),
      datasets: [
        {
          label: "Current",
          data: data.map((point) => point.value),
          borderColor: color,
          backgroundColor: toChartColorWithAlpha(color, fillOpacity),
          borderWidth: compact ? 2 : 3,
          pointRadius: 0,
          pointHoverRadius: compact ? 4 : 6,
          pointHoverBackgroundColor: "#ffffff",
          pointHoverBorderColor: color,
          pointHoverBorderWidth: compact ? 2 : 3,
          tension: 0,
          fill: "origin",
          borderCapStyle: "butt",
          borderJoinStyle: "miter",
        },
        {
          label: "Previous",
          data: data.map(
            (_, index) => comparisonData[index]?.value ?? 0
          ),
          borderColor: comparisonColor,
          backgroundColor: toChartColorWithAlpha(
            comparisonColor,
            fillOpacity
          ),
          borderWidth: compact ? 2 : 3,
          borderDash: compact ? [5, 4] : [7, 5],
          pointRadius: 0,
          pointHoverRadius: compact ? 4 : 6,
          pointHoverBackgroundColor: "#ffffff",
          pointHoverBorderColor: comparisonColor,
          pointHoverBorderWidth: compact ? 2 : 3,
          tension: 0,
          fill: false,
          borderCapStyle: "butt",
          borderJoinStyle: "miter",
        },
      ],
    }),
    [
      color,
      compact,
      comparisonColor,
      comparisonData,
      data,
      fillOpacity,
    ]
  );

  const externalTooltipHandler = useCallback(
    ({ chart, tooltip }: ChartTooltipContext) => {
      const tooltipElement = tooltipRef.current;
      const containerElement = containerRef.current;
      if (!tooltipElement || !containerElement) return;

      if (tooltip.opacity === 0) {
        tooltipElement.dataset.visible = "false";
        return;
      }

      const dataIndex = tooltip.dataPoints?.[0]?.dataIndex;
      const currentPoint =
        dataIndex === undefined ? undefined : data[dataIndex];
      if (dataIndex === undefined || !currentPoint) {
        tooltipElement.dataset.visible = "false";
        return;
      }
      const previousPoint: ChartPoint = comparisonData[dataIndex] || {
        label: currentPoint.label,
        value: 0,
        date: currentPoint.date,
      };

      setChartTooltipText(
        tooltipElement,
        "current-value",
        formatChartValue(currentPoint.value, valueFormat, currency)
      );
      setChartTooltipText(
        tooltipElement,
        "previous-value",
        formatChartValue(previousPoint.value, valueFormat, currency)
      );
      setChartTooltipText(
        tooltipElement,
        "current-date",
        formatChartPointDate(currentPoint, dateFormatter)
      );
      setChartTooltipText(
        tooltipElement,
        "previous-date",
        formatChartPointDate(previousPoint, dateFormatter)
      );

      tooltipElement.dataset.visible = "true";
      positionExternalChartTooltip(
        containerElement,
        tooltipElement,
        chart.canvas,
        tooltip.caretX,
        tooltip.caretY
      );
    },
    [comparisonData, currency, data, dateFormatter, valueFormat]
  );

  const options = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      normalized: true,
      layout: {
        padding: {
          top: compact ? 5 : 10,
          right: compact ? 2 : 6,
          bottom: compact ? 26 : 32,
          left: compact ? 2 : 6,
        },
      },
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: false,
          position: "nearest",
          external: externalTooltipHandler,
        },
      },
      scales: {
        x: {
          offset: false,
          border: {
            display: false,
          },
          ticks: {
            display: false,
            autoSkip: false,
          },
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          border: {
            display: false,
          },
          ticks: {
            display: showAxis,
          },
          grid: {
            display: false,
          },
        },
      },
    }),
    [compact, externalTooltipHandler, showAxis]
  );

  const plugins = useMemo<Plugin<"line">[]>(
    () => [
      ...(showGrid
        ? [
            createDashedGridPlugin(
              getChartGridStep(data.length, gridEvery)
            ),
          ]
        : []),
      createEndpointLabelsPlugin(
        startLabel,
        endLabel,
        endpointLabelFontSize ?? (compact ? 10 : 12)
      ),
    ],
    [
      compact,
      data.length,
      endLabel,
      endpointLabelFontSize,
      gridEvery,
      showGrid,
      startLabel,
    ]
  );

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted"
        style={{ height }}
      >
        {emptyLabel}
      </div>
    );
  }

  const containerStyle: CSSProperties = { height };
  const trendClass =
    trendDirection === "positive"
      ? styles.trendPositive
      : trendDirection === "negative"
        ? styles.trendNegative
        : styles.trendNeutral;

  return (
    <div
      ref={containerRef}
      className={`${styles.chart} ${className}`}
      style={containerStyle}
    >
      <Line data={chartData} options={options} plugins={plugins} />

      <div
        ref={tooltipRef}
        className={`${styles.tooltip} ${compact ? styles.compactTooltip : ""}`}
        data-visible="false"
        role="tooltip"
        aria-hidden="true"
      >
        <div className={styles.tooltipHeader}>
          <div className={styles.tooltipTitle}>{title}</div>
          <div className={`${styles.tooltipTrend} ${trendClass}`}>
            <span className={styles.tooltipArrow}>{trendArrow}</span>
            <span>{Math.round(Math.abs(trend))}%</span>
          </div>
        </div>

        <div className={styles.tooltipDivider} />

        <div className={styles.tooltipBody}>
          <div className={`${styles.tooltipRow} ${styles.rowCurrent}`}>
            <span className={styles.tooltipDot} />
            <span
              className={styles.tooltipValue}
              data-tooltip-role="current-value"
            />
            <span
              className={styles.tooltipDate}
              data-tooltip-role="current-date"
            />
          </div>
          <div className={`${styles.tooltipRow} ${styles.rowPrevious}`}>
            <span className={styles.tooltipDot} />
            <span
              className={styles.tooltipValue}
              data-tooltip-role="previous-value"
            />
            <span
              className={styles.tooltipDate}
              data-tooltip-role="previous-date"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
