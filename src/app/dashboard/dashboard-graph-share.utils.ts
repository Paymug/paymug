import { formatDashboardMetricValue } from "./dashboard-metric-chart.utils";
import type { CreateDashboardGraphShareImageInput } from "./dashboard-graph-share.types";

const SHARE_WIDTH = 1200;
const SHARE_HEIGHT = 680;
const GRAPH_CARD_X = 72;
const GRAPH_CARD_Y = 236;
const GRAPH_CARD_WIDTH = 1056;
const GRAPH_CARD_HEIGHT = 322;
const GRAPH_CARD_RADIUS = 24;

function drawDashboardGraphShareCard(context: CanvasRenderingContext2D) {
  const right = GRAPH_CARD_X + GRAPH_CARD_WIDTH;
  const bottom = GRAPH_CARD_Y + GRAPH_CARD_HEIGHT;
  context.beginPath();
  context.moveTo(GRAPH_CARD_X + GRAPH_CARD_RADIUS, GRAPH_CARD_Y);
  context.lineTo(right - GRAPH_CARD_RADIUS, GRAPH_CARD_Y);
  context.quadraticCurveTo(
    right,
    GRAPH_CARD_Y,
    right,
    GRAPH_CARD_Y + GRAPH_CARD_RADIUS,
  );
  context.lineTo(right, bottom - GRAPH_CARD_RADIUS);
  context.quadraticCurveTo(right, bottom, right - GRAPH_CARD_RADIUS, bottom);
  context.lineTo(GRAPH_CARD_X + GRAPH_CARD_RADIUS, bottom);
  context.quadraticCurveTo(
    GRAPH_CARD_X,
    bottom,
    GRAPH_CARD_X,
    bottom - GRAPH_CARD_RADIUS,
  );
  context.lineTo(GRAPH_CARD_X, GRAPH_CARD_Y + GRAPH_CARD_RADIUS);
  context.quadraticCurveTo(
    GRAPH_CARD_X,
    GRAPH_CARD_Y,
    GRAPH_CARD_X + GRAPH_CARD_RADIUS,
    GRAPH_CARD_Y,
  );
  context.closePath();
  context.fillStyle = "#ffffff";
  context.fill();
  context.strokeStyle = "#e8e8ee";
  context.lineWidth = 1;
  context.stroke();
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not create the graph image"));
    }, "image/png");
  });
}

function loadDashboardGraphShareIcon(
  iconSvg: SVGSVGElement
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const serializedIcon = iconSvg.cloneNode(true) as SVGSVGElement;
    serializedIcon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const iconUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      new XMLSerializer().serializeToString(serializedIcon)
    )}`;
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Could not render the Paymug app icon"));
    image.src = iconUrl;
  });
}

export async function createDashboardGraphShareImage({
  metric,
  currency,
  background,
  chartCanvas,
  iconSvg,
  fontFamily,
}: CreateDashboardGraphShareImageInput) {
  const canvas = document.createElement("canvas");
  canvas.width = SHARE_WIDTH;
  canvas.height = SHARE_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image export is unavailable");

  const gradient = context.createLinearGradient(0, 0, SHARE_WIDTH, SHARE_HEIGHT);
  gradient.addColorStop(0, background.colors[0]);
  gradient.addColorStop(0.52, background.colors[1]);
  gradient.addColorStop(1, background.colors[2]);
  context.fillStyle = gradient;
  context.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT);

  context.fillStyle = background.textColor;
  context.font = `400 30px ${fontFamily}`;
  context.fillText(metric.label, 72, 102);
  context.font = `700 72px ${fontFamily}`;
  context.letterSpacing = "-0.04em";
  context.fillText(
    formatDashboardMetricValue(metric.value, metric.format, currency),
    72,
    198,
  );
  context.letterSpacing = "0px";
  drawDashboardGraphShareCard(context);
  context.drawImage(chartCanvas, 105, 253, 990, 264);

  const icon = await loadDashboardGraphShareIcon(iconSvg);
  context.font = `400 30px ${fontFamily}`;
  const brandLabel = "Paymug";
  const brandGap = 12;
  const iconSize = 36;
  const labelWidth = context.measureText(brandLabel).width;
  const brandWidth = labelWidth + brandGap + iconSize;
  const brandX = (SHARE_WIDTH - brandWidth) / 2;
  context.fillStyle = background.textColor;
  context.fillText(brandLabel, brandX, 630);
  context.drawImage(
    icon,
    brandX + labelWidth + brandGap,
    598,
    iconSize,
    iconSize,
  );

  return canvasToBlob(canvas);
}

export function downloadDashboardGraphShareImage(
  blob: Blob,
  metricLabel: string
) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${
    metricLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "paymug-graph"
  }.png`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
