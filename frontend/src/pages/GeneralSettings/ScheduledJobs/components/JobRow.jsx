import { useNavigate } from "react-router-dom";
import { Pencil, Play, Trash2 } from "lucide-react";
import { humanizeCron } from "../utils/cron";
import { useTranslation } from "react-i18next";
import { SimpleToggleSwitch } from "@/components/lib/Toggle";
import { TableCell, TableRow } from "@/components/ui/table";
import TableRowActions from "@/components/lib/TableRowActions";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// One row of the scheduled-jobs list. Clicking the name navigates to the
// run history (global or workspace-scoped, per `runsPath`); CRUD callbacks
// come from the parent.
export default function JobRow({
  job,
  smtpReady,
  runsPath,
  onTrigger,
  onToggle,
  onEdit,
  onDelete,
}) {
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

  const runAction = (handler) => (event) => {
    event.stopPropagation();
    handler();
  };

  return (
    <TableRow
      role="button"
      tabIndex={0}
      onClick={() => navigate(runsPath)}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === "Enter" || e.key === " ")
        ) {
          e.preventDefault();
          navigate(runsPath);
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
      <TableCell className="text-theme-text-secondary">{statusText}</TableCell>
      <TableCell className="text-theme-text-secondary">
        {job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : "—"}
      </TableCell>
      <TableCell className="text-theme-text-secondary">
        {job.enabled && smtpReady && job.nextRunAt
          ? new Date(job.nextRunAt).toLocaleString()
          : "—"}
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-2">
          <TableRowActions>
            <DropdownMenuItem
              disabled={inFlight || !smtpReady}
              onClick={runAction(() => onTrigger(job.id))}
            >
              <Play className="size-4" />
              {t("scheduledJobs.row.runNow")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={runAction(() => onEdit(job))}>
              <Pencil className="size-4" />
              {t("scheduledJobs.row.edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={runAction(() => onDelete(job.id))}
            >
              <Trash2 className="size-4" />
              {t("scheduledJobs.row.delete")}
            </DropdownMenuItem>
          </TableRowActions>
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
