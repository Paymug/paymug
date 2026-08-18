"use client";

import { DownloadSimple, ShareNetwork } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { AreaChart } from "@/components/dashboard/charts";
import { AppIcon } from "@/components/dashboard/Icon";
import { DashboardModal } from "@/components/dashboard/DashboardModal";
import { Alert, Button } from "@/components/ui";
import { dashboardGraphShareBackgrounds } from "./dashboard-graph-share.config";
import {
  createDashboardGraphShareImage,
  downloadDashboardGraphShareImage,
} from "./dashboard-graph-share.utils";
import { formatDashboardMetricValue } from "./dashboard-metric-chart.utils";
import type { DashboardGraphShareModalProps } from "./dashboard-graph-share.types";

export function DashboardGraphShareModal({
  metric,
  currency,
  onClose,
}: DashboardGraphShareModalProps) {
  const [backgroundId, setBackgroundId] = useState(
    dashboardGraphShareBackgrounds[0].id,
  );
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const background =
    dashboardGraphShareBackgrounds.find(
      (candidate) => candidate.id === backgroundId,
    ) || dashboardGraphShareBackgrounds[0];

  async function createImage() {
    setExporting(true);
    setError(null);
    try {
      const chartCanvas = cardRef.current?.querySelector("canvas");
      const iconSvg = iconRef.current?.querySelector("svg");
      if (!cardRef.current || !chartCanvas || !iconSvg) {
        throw new Error("The graph is not ready to share yet");
      }
      return await createDashboardGraphShareImage({
        metric,
        currency,
        background,
        chartCanvas,
        iconSvg,
        fontFamily: window.getComputedStyle(cardRef.current).fontFamily,
      });
    } catch (imageError) {
      setError(
        imageError instanceof Error
          ? imageError.message
          : "Could not create the graph image",
      );
      return null;
    } finally {
      setExporting(false);
    }
  }

  async function downloadImage() {
    const blob = await createImage();
    if (blob) downloadDashboardGraphShareImage(blob, metric.label);
  }

  async function shareImage() {
    const blob = await createImage();
    if (!blob) return;
    const file = new File([blob], "paymug-graph.png", { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: `${metric.label} on Paymug`,
          text: `My ${metric.label} graph from Paymug`,
          files: [file],
        });
        return;
      } catch (shareError) {
        if (
          shareError instanceof DOMException &&
          shareError.name === "AbortError"
        ) {
          return;
        }
      }
    }
    downloadDashboardGraphShareImage(blob, metric.label);
  }

  return (
    <DashboardModal title={`Share ${metric.label}`} onClose={onClose}>
      <div className="h-86 overflow-x-auto overflow-y-hidden">
        <div
          ref={cardRef}
          className="h-170 w-[1200px] origin-top-left scale-50 overflow-hidden p-18 shadow-sm pointer-events-none"
          style={{ background: background.css, color: background.textColor }}
        >
          <div className="flex h-full flex-col">
            <div className="flex flex-row justify-between items-start">
              <div>
                <p className="text-3xl font-normal">{metric.label}</p>
                <div className="mt-6 flex flex-wrap items-end gap-3">
                  <p className="text-7xl font-bold tracking-[-0.04em]">
                    {formatDashboardMetricValue(
                      metric.value,
                      metric.format,
                      currency,
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-3xl border border-[#e8e8ee] bg-white px-8 pb-10 pt-4 mt-8">
              <AreaChart
                data={metric.data}
                comparisonData={metric.comparisonData}
                height={264}
                color="#f5c518"
                comparisonColor="#a3a3ad"
                fillOpacity={0.05}
                showAxis={false}
                currency={currency}
                valueFormat={metric.format}
                emptyLabel=""
                title={metric.label}
                trendPercent={metric.delta}
                showGrid
                endpointLabelFontSize={21}
                className="bg-transparent!"
              />
            </div>

            <div className="flex items-center gap-3 text-3xl font-normal mx-auto mt-10">
              <span>Paymug</span>
              <span ref={iconRef} className="inline-flex" aria-hidden>
                <AppIcon size={36} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="flex flex-row items-center gap-2 mt-5">
        {/* <p className="text-sm font-medium text-[#333]">Background</p> */}

        {dashboardGraphShareBackgrounds.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setBackgroundId(option.id)}
            className={`w-8 h-8 rounded-full border-2 overflow-hidden ${
              option.id === background.id
                ? "border-black"
                : "border-transparent"
            }`}
            aria-label={`Use ${option.label} background`}
            aria-pressed={option.id === background.id}
          >
            <span
              className="block h-full w-full rounded-lg"
              style={{ background: option.css }}
            />
          </button>
        ))}
        <span className="flex-1" />
        <Button type="button" onClick={downloadImage}>
          <DownloadSimple size={17} weight="bold" />
          {/* {exporting ? "Creating…" : "Share"} */}
          Download
        </Button>
      </div>
    </DashboardModal>
  );
}
