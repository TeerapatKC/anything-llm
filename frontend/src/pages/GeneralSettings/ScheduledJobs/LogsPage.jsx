import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import ConfirmDialog from "@/components/ConfirmDialog";
import useQuery from "@/hooks/useQuery";
import ScheduledJobs from "@/models/scheduledJobs";
import showToast from "@/utils/toast";
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

export default function ScheduledJobLogsPage() {
  const { t } = useTranslation();
  const query = useQuery();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [offset, setOffset] = useState(Number(query.get("offset") || 0));
  const [canNext, setCanNext] = useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      const { logs: _logs, hasPages = false } =
        await ScheduledJobs.allLogs(offset);
      setLogs(_logs || []);
      setCanNext(hasPages);
      setLoading(false);
    }
    fetchLogs();
  }, [offset]);

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

  return (
    <SettingsLayout>
      <PageHeader
        title={t("scheduledJobs.logs.title")}
        description={t("scheduledJobs.logs.description")}
        actions={
          <Button
            type="button"
            size="lg"
            variant="destructive"
            disabled={loading || logs.length === 0}
            onClick={handleClearLogs}
          >
            {t("scheduledJobs.logs.clear")}
          </Button>
        }
      />
      <div className="overflow-x-auto mt-6">
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
                {t("scheduledJobs.logs.table.recipient")}
              </TableHead>
              <TableHead scope="col">
                {t("scheduledJobs.logs.table.occurred")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableLoadingRow colSpan={5} />
            ) : logs.length === 0 ? (
              <TableEmptyRow colSpan={5}>
                {t("scheduledJobs.logs.empty")}
              </TableEmptyRow>
            ) : (
              logs.map((log) => <LogRow key={log.id} log={log} t={t} />)
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
    </SettingsLayout>
  );
}

function LogRow({ log, t }) {
  const sent = log.event === "scheduled_job_email_sent";
  const colorTheme = sent
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
    : "bg-red-500/15 text-red-700 dark:text-red-300";

  return (
    <TableRow>
      <TableCell className="font-medium">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorTheme}`}
        >
          {sent
            ? t("scheduledJobs.logs.sent")
            : t("scheduledJobs.logs.failed")}
        </span>
      </TableCell>
      <TableCell className="text-theme-text-primary">
        {log.metadata?.jobName || "--"}
      </TableCell>
      <TableCell className="text-theme-text-secondary">
        {log.metadata?.workspaceName
          ? t("scheduledJobs.logs.sourceWorkspace", {
              name: log.metadata.workspaceName,
            })
          : t("scheduledJobs.logs.sourceSystem")}
      </TableCell>
      <TableCell className="text-theme-text-secondary">
        <div className="flex flex-col">
          <span>{log.metadata?.to || "--"}</span>
          {!sent && log.metadata?.reason && (
            <span className="text-xs text-red-400 light:text-red-600">
              {log.metadata.reason}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-theme-text-secondary">
        {log.occurredAt}
      </TableCell>
    </TableRow>
  );
}
