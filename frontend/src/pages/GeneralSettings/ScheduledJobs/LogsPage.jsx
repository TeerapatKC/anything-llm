import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import moment from "moment";
import { saveAs } from "file-saver";
import { ArrowLeft, Circle, Square } from "lucide-react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import ConfirmDialog from "@/components/ConfirmDialog";
import ExportLogsControl from "@/components/ExportLogsControl";
import ScheduledJobs from "@/models/scheduledJobs";
import usePolling from "@/hooks/usePolling";
import showToast from "@/utils/toast";
import paths from "@/utils/paths";
import { formatDuration } from "@/utils/numbers";
import StatusBadge from "./components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmptyRow,
  TableLoadingRow,
} from "@/components/ui/table";

function formatRunDuration(run) {
  if (!run.completedAt || !run.startedAt) return "—";
  const duration = moment.duration(
    moment(run.completedAt).diff(moment(run.startedAt))
  );
  return formatDuration(duration.asSeconds());
}

// The merged run + email delivery log - replaces the old per-job "Run History"
// page. Every scheduled job run (status/duration/error) is listed here, each
// with its result-email delivery attempts summarized; pass ?jobId= to filter
// to a single job (used by the "View Runs" link from the jobs list). Slug-aware
// so the same component serves both the instance-wide and workspace-owned pages.
export default function ScheduledJobLogsPage() {
  const { t } = useTranslation();
  const { slug = null } = useParams();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("jobId");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [offset, setOffset] = useState(0);
  const [canNext, setCanNext] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const hasInFlight = logs.some(
    (l) => l.status === "queued" || l.status === "running"
  );

  const fetchLogs = async () => {
    const { logs: _logs, hasPages = false } = slug
      ? await ScheduledJobs.workspace.allLogs(slug, offset, jobId)
      : await ScheduledJobs.allLogs(offset, jobId);
    setLogs(_logs || []);
    setCanNext(hasPages);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, jobId, slug]);

  // Poll while any listed run is still in flight so status/duration update live.
  usePolling(fetchLogs, 5000, hasInFlight);

  const handleClearLogs = () => {
    setConfirm({
      title: t("scheduledJobs.logs.clearTitle"),
      description: t("scheduledJobs.logs.clearDescription"),
      confirmText: t("scheduledJobs.logs.clearConfirm"),
      variant: "destructive",
      onConfirm: async () => {
        const { success, error } = await ScheduledJobs.clearLogs();
        if (success) {
          showToast(t("scheduledJobs.logs.clearSuccess"), "success");
          setLogs([]);
          setCanNext(false);
          setOffset(0);
        } else {
          showToast(
            t("scheduledJobs.logs.clearFailed", { error }),
            "error"
          );
        }
      },
    });
  };

  const handleExportLogs = async (format, startDate, endDate) => {
    const data = slug
      ? await ScheduledJobs.workspace.exportLogs(
          slug,
          format,
          startDate,
          endDate,
          jobId
        )
      : await ScheduledJobs.exportLogs(format, startDate, endDate, jobId);
    if (!data) {
      showToast(t("scheduledJobs.logs.exportFailed"), "error");
      return;
    }
    const mimeType = format === "json" ? "application/json" : "text/csv";
    const blob = new Blob([data], { type: mimeType });
    saveAs(
      blob,
      `nexusai-schedule-logs-${new Date().toISOString().slice(0, 10)}.${format}`
    );
    showToast(
      t("scheduledJobs.logs.exportSuccess", { format: format.toUpperCase() }),
      "success"
    );
  };

  const jobsPath = slug
    ? paths.workspace.settings.scheduledJobs(slug)
    : paths.settings.scheduledJobs();

  const content = (
    <>
      <PageHeader
        title={t("scheduledJobs.logs.title")}
        description={t("scheduledJobs.logs.description")}
        actions={
          !slug ? (
            <Button
              type="button"
              size="lg"
              variant="destructive"
              disabled={loading || logs.length === 0}
              onClick={handleClearLogs}
            >
              {t("scheduledJobs.logs.clear")}
            </Button>
          ) : null
        }
      >
        {jobId ? (
          <button
            type="button"
            onClick={() => navigate(jobsPath)}
            className="border-none flex items-center gap-2 text-zinc-400 light:text-slate-600 hover:text-zinc-50 light:hover:text-slate-950 text-sm transition-colors w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("scheduledJobs.logs.backToJobs")}
          </button>
        ) : null}
      </PageHeader>
      <div className="mt-3 flex w-full flex-wrap justify-end gap-2">
        <ExportLogsControl
          onExport={handleExportLogs}
          disabled={loading}
          labels={{
            from: t("scheduledJobs.logs.exportFrom"),
            to: t("scheduledJobs.logs.exportTo"),
            export: t("scheduledJobs.logs.export"),
          }}
        />
      </div>
      <div className="overflow-x-auto mt-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">
                {t("scheduledJobs.logs.table.status")}
              </TableHead>
              <TableHead scope="col">
                {t("scheduledJobs.logs.table.job")}
              </TableHead>
              <TableHead scope="col">
                {t("scheduledJobs.logs.table.source")}
              </TableHead>
              <TableHead scope="col">
                {t("scheduledJobs.logs.table.started")}
              </TableHead>
              <TableHead scope="col">
                {t("scheduledJobs.logs.table.duration")}
              </TableHead>
              <TableHead scope="col">
                {t("scheduledJobs.logs.table.error")}
              </TableHead>
              <TableHead scope="col">
                {t("scheduledJobs.logs.table.email")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableLoadingRow colSpan={7} />
            ) : logs.length === 0 ? (
              <TableEmptyRow colSpan={7}>
                {t("scheduledJobs.logs.empty")}
              </TableEmptyRow>
            ) : (
              logs.map((log) => (
                <LogRow
                  key={log.id}
                  log={log}
                  slug={slug}
                  t={t}
                  onKilled={fetchLogs}
                />
              ))
            )}
          </TableBody>
        </Table>
        {!loading && (
          <div className="flex w-full justify-between items-center mt-6">
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={() => setOffset(Math.max(offset - 1, 0))}
              className="disabled:invisible"
              disabled={offset === 0}
            >
              {t("common.previous")}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={() => setOffset(offset + 1)}
              className="disabled:invisible"
              disabled={!canNext}
            >
              {t("common.next")}
            </Button>
          </div>
        )}
      </div>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );

  if (slug) return <div className="w-full max-w-5xl mx-auto px-4 py-10">{content}</div>;
  return <SettingsLayout>{content}</SettingsLayout>;
}

function LogRow({ log, slug, t, onKilled }) {
  const navigate = useNavigate();
  const [killing, setKilling] = useState(false);
  const isKillable = ["running", "queued"].includes(log.status);
  const unreadAndTerminal = !log.readAt && !isKillable;

  const detailPath = slug
    ? paths.workspace.settings.scheduledJobRunDetail(slug, log.jobId, log.id)
    : paths.settings.scheduledJobRunDetail(log.jobId, log.id);

  const handleKill = async (e) => {
    e.stopPropagation();
    setKilling(true);
    const { success, error } = slug
      ? await ScheduledJobs.workspace.killRun(slug, log.id)
      : await ScheduledJobs.killRun(log.id);
    setKilling(false);

    if (!success) {
      showToast(error || t("scheduledJobs.toast.killFailed"), "error");
      return;
    }
    showToast(t("scheduledJobs.toast.killed"), "success");
    onKilled?.();
  };

  const emailLogs = log.emailLogs || [];
  const failedCount = emailLogs.filter(
    (l) => l.event === "scheduled_job_email_failed"
  ).length;
  const sentCount = emailLogs.length - failedCount;

  return (
    <TableRow className="cursor-pointer" onClick={() => navigate(detailPath)}>
      <TableCell>
        <div className="flex items-center gap-2">
          {unreadAndTerminal && (
            <Circle className="h-2 w-2 text-blue-400 light:text-blue-600 fill-current shrink-0" />
          )}
          {isKillable && (
            <button
              type="button"
              onClick={handleKill}
              disabled={killing}
              title={t("scheduledJobs.runDetail.stopJob")}
              className="border-none p-1 rounded bg-red-500/20 text-red-400 light:bg-red-100 light:text-red-600 hover:bg-red-500/30 light:hover:bg-red-200 transition-colors disabled:opacity-50 shrink-0"
            >
              <Square className="h-3 w-3" />
            </button>
          )}
          <StatusBadge status={log.status} />
        </div>
      </TableCell>
      <TableCell className="text-theme-text-primary">
        {log.jobName || "--"}
      </TableCell>
      <TableCell className="text-theme-text-secondary">
        {log.workspaceName
          ? t("scheduledJobs.logs.sourceWorkspace", {
              name: log.workspaceName,
            })
          : t("scheduledJobs.logs.sourceSystem")}
      </TableCell>
      <TableCell className="text-theme-text-secondary">
        {new Date(log.startedAt).toLocaleString()}
      </TableCell>
      <TableCell className="text-theme-text-secondary">
        {formatRunDuration(log)}
      </TableCell>
      <TableCell
        className={
          log.error
            ? "text-red-400 light:text-red-600 italic"
            : "text-theme-text-secondary"
        }
      >
        {log.error || "—"}
      </TableCell>
      <TableCell>
        {emailLogs.length === 0 ? (
          <span className="text-theme-text-secondary text-xs">—</span>
        ) : failedCount > 0 ? (
          <span className="text-red-400 light:text-red-600 text-xs">
            {t("scheduledJobs.logs.emailFailedCount", {
              count: failedCount,
              total: emailLogs.length,
            })}
          </span>
        ) : (
          <span className="text-emerald-400 light:text-emerald-600 text-xs">
            {t("scheduledJobs.logs.emailSentCount", { count: sentCount })}
          </span>
        )}
      </TableCell>
    </TableRow>
  );
}
