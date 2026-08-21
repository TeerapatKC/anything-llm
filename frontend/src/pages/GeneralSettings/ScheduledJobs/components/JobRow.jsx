import { useNavigate } from "react-router-dom";
import { Pencil, Play, X } from "lucide-react";
import paths from "@/utils/paths";
import { humanizeCron } from "../utils/cron";
import { useTranslation } from "react-i18next";
import { SimpleToggleSwitch } from "@/components/lib/Toggle";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

// One row of the scheduled-jobs list. Clicking the name navigates to the
// run history; CRUD callbacks come from the parent.
export default function JobRow({ job, onTrigger, onToggle, onEdit, onDelete }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  // A job has at most one in-flight run; disable "Run now" while it's queued
  // or running so users get visible feedback that their click registered and
  // so the backend dedup never has to drop a manual trigger silently.
  const inFlight =
    job.latestRun?.status === "running" || job.latestRun?.status === "queued";

  const statusText = job.latestRun
    ? t(`scheduledJobs.status.${job.latestRun.status}`, job.latestRun.status)
    : t("scheduledJobs.row.neverRun");

  const stop = (handler) => (e) => {
    e.stopPropagation();
    handler();
  };

  return (
    <TableRow
      role="button"
      tabIndex={0}
      onClick={() => navigate(paths.settings.scheduledJobRuns(job.id))}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(paths.settings.scheduledJobRuns(job.id));
        }
      }}
      className="cursor-pointer"
      title={t("scheduledJobs.row.viewRuns")}
    >
      <TableCell className="font-medium text-theme-text-primary">
        {job.name}
      </TableCell>
      <TableCell className="text-theme-text-secondary">
        {humanizeCron(job.schedule, i18n.language)}
      </TableCell>
      <TableCell className="text-theme-text-secondary">
        {statusText}
      </TableCell>
      <TableCell className="text-theme-text-secondary">
        {job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : "—"}
      </TableCell>
      <TableCell className="text-theme-text-secondary">
        {job.enabled && job.nextRunAt
          ? new Date(job.nextRunAt).toLocaleString()
          : "—"}
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={stop(() => onDelete(job.id))}
            title={t("scheduledJobs.row.delete")}
            className="text-theme-text-secondary hover:text-destructive hover:bg-destructive/10"
          >
            <X className="h-4 w-4 shrink-0" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={stop(() => onEdit(job))}
            title={t("scheduledJobs.row.edit")}
            className="text-theme-text-secondary"
          >
            <Pencil className="h-4 w-4 shrink-0" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={stop(() => onTrigger(job.id))}
            disabled={inFlight}
            title={t("scheduledJobs.row.runNow")}
            className="text-theme-text-secondary"
          >
            <Play className="h-4 w-4 shrink-0" />
          </Button>
          <SimpleToggleSwitch
            size="sm"
            enabled={job.enabled}
            onChange={() => onToggle(job.id)}
            aria-label={
              job.enabled
                ? t("scheduledJobs.row.disable")
                : t("scheduledJobs.row.enable")
            }
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
