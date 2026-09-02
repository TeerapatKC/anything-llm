import { formatDateTimeAsMoment } from "@/utils/directories";
import { formatDuration, numberWithCommas } from "@/utils/numbers";
import React, { useEffect, useState, useContext } from "react";
import { isMobile } from "react-device-detect";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
const MetricsContext = React.createContext();
const SHOW_METRICS_KEY = "anythingllm_show_chat_metrics";
const SHOW_METRICS_EVENT = "anythingllm_show_metrics_change";

/**
 * Format the output TPS to a string
 * @param {number} outputTps - output TPS
 * @returns {string}
 */
function formatTps(outputTps) {
  try {
    return outputTps < 1000
      ? outputTps.toFixed(2)
      : numberWithCommas(outputTps.toFixed(0));
  } catch {
    return "";
  }
}

/**
 * Get the show metrics setting from localStorage `anythingllm_show_chat_metrics` key
 * @returns {boolean}
 */
function getAutoShowMetrics() {
  return window?.localStorage?.getItem(SHOW_METRICS_KEY) === "true";
}

/**
 * Shorten a model identifier to the part that identifies it.
 *
 * A local model arrives as a file path - the directory says nothing the reader
 * needs and the extension even less, while the length is enough to crowd out
 * the buttons next to it. Hosted model ids have neither and pass through.
 * @param {string} [model]
 * @returns {string}
 */
function modelLabel(model) {
  if (!model) return "";
  const basename = String(model).split(/[\\/]/).pop();
  return basename.replace(/\.(gguf|bin|safetensors|pt|onnx)$/i, "");
}

/**
 * Build the metrics string for a given metrics object
 * - Model name
 * - Duration and output TPS
 * - Timestamp
 * @param {metrics: {duration:number, outputTps: number, model?: string, timestamp?: number}} metrics
 * @returns {string}
 */
function buildMetricsString(metrics = {}) {
  return [
    modelLabel(metrics?.model),
    `${formatDuration(metrics.duration)} (${formatTps(metrics.outputTps)} tok/s)`,
    metrics?.timestamp
      ? formatDateTimeAsMoment(metrics.timestamp, "MMM D, h:mm A")
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Toggle the show metrics setting in localStorage `anythingllm_show_chat_metrics` key
 * @returns {void}
 */
function toggleAutoShowMetrics() {
  const currentValue = getAutoShowMetrics() || false;
  window?.localStorage?.setItem(SHOW_METRICS_KEY, !currentValue);
  window.dispatchEvent(
    new CustomEvent(SHOW_METRICS_EVENT, {
      detail: { showMetricsAutomatically: !currentValue },
    })
  );
  return !currentValue;
}

/**
 * Provider for the metrics context that controls the visibility of the metrics
 * per-chat based on the user's preference.
 * @param {React.ReactNode} children
 * @returns {React.ReactNode}
 */
export function MetricsProvider({ children }) {
  const [showMetricsAutomatically, setShowMetricsAutomatically] =
    useState(getAutoShowMetrics());

  useEffect(() => {
    function handleShowingMetricsEvent(e) {
      if (!e?.detail?.hasOwnProperty("showMetricsAutomatically")) return;
      setShowMetricsAutomatically(e.detail.showMetricsAutomatically);
    }
    console.log("Adding event listener for metrics visibility");
    window.addEventListener(SHOW_METRICS_EVENT, handleShowingMetricsEvent);
    return () =>
      window.removeEventListener(SHOW_METRICS_EVENT, handleShowingMetricsEvent);
  }, []);

  return (
    <MetricsContext.Provider
      value={{ showMetricsAutomatically, setShowMetricsAutomatically }}
    >
      {children}
    </MetricsContext.Provider>
  );
}

/**
 * Render the metrics for a given chat, if available
 * @param {metrics: {duration:number, outputTps: number, model: string, timestamp: number}} props
 * @returns
 */
export default function RenderMetrics({ metrics = {} }) {
  // Inherit the showMetricsAutomatically state from the MetricsProvider so the state is shared across all chats
  const { showMetricsAutomatically, setShowMetricsAutomatically } =
    useContext(MetricsContext);
  if (!metrics?.duration || !metrics?.outputTps || isMobile) return null;

  const metricsString = buildMetricsString(metrics);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={() => setShowMetricsAutomatically(toggleAutoShowMetrics())}
            // min-w-0 is what lets the label truncate instead of pushing itself
            // left over the action buttons when the model name is long.
            className={`border-none flex md:justify-end items-center gap-x-[8px] min-w-0 max-w-full ${showMetricsAutomatically ? "opacity-100" : "opacity-0"} md:group-hover:opacity-100 transition-all duration-300`}
          />
        }
      >
        <p className="cursor-pointer truncate text-xs font-mono text-zinc-400 light:text-slate-500">
          {metricsString}
        </p>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[250px] text-xs">
        {/* Repeated here because the line itself may be truncated. */}
        <span className="block font-mono break-words">{metricsString}</span>
        <span className="mt-1 block">
          {showMetricsAutomatically
            ? "Click to only show metrics when hovering"
            : "Click to show metrics as soon as they are available"}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}
