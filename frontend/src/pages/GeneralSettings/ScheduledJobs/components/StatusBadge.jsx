import { useTranslation } from "react-i18next";

/**
 * Per-status pill coloring - each of the 5 run statuses gets its own
 * background/border/text tint so they're distinguishable at a glance in the
 * Schedule Job Logs table:
 * - queued → zinc (waiting, neutral)
 * - running → blue (active)
 * - completed → emerald (success)
 * - failed → red (error)
 * - timed_out → amber (distinct from failed - it didn't error, it ran out of time)
 * @param {Function} t - The i18next translation function.
 */
function getStatusesMap(t) {
  return {
    queued: {
      text: t("scheduledJobs.status.queued"),
      style:
        "bg-zinc-500/15 border-zinc-500/30 text-zinc-400 light:bg-slate-200 light:border-slate-300 light:text-slate-600",
    },
    running: {
      text: t("scheduledJobs.status.running"),
      style:
        "bg-blue-500/15 border-blue-500/30 text-blue-400 light:bg-blue-100 light:border-blue-300 light:text-blue-600",
    },
    completed: {
      text: t("scheduledJobs.status.completed"),
      style:
        "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 light:bg-emerald-100 light:border-emerald-300 light:text-emerald-600",
    },
    failed: {
      text: t("scheduledJobs.status.failed"),
      style:
        "bg-red-500/15 border-red-500/30 text-red-400 light:bg-red-100 light:border-red-300 light:text-red-600",
    },
    timed_out: {
      text: t("scheduledJobs.status.timed_out"),
      style:
        "bg-amber-500/15 border-amber-500/30 text-amber-400 light:bg-amber-100 light:border-amber-300 light:text-amber-600",
    },
    default: {
      text: "—",
      style:
        "bg-zinc-500/15 border-zinc-500/30 text-zinc-400 light:bg-slate-200 light:border-slate-300 light:text-slate-600",
    },
  };
}

/**
 * Colored, bordered status pill shown in the Schedule Job Logs table.
 * @param {string} status - The status of the run.
 */
export default function StatusBadge({ status }) {
  const { t } = useTranslation();
  const statusesMap = getStatusesMap(t);
  const { text, style } = statusesMap[status] || statusesMap.default;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style}`}
    >
      {text}
    </span>
  );
}
