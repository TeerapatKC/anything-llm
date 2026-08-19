import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import ConfirmDialog from "@/components/ConfirmDialog";
import useQuery from "@/hooks/useQuery";
import System from "@/models/system";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import LogRow from "./LogRow";
import showToast from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminLogs() {
  const query = useQuery();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [offset, setOffset] = useState(Number(query.get("offset") || 0));
  const [canNext, setCanNext] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    async function fetchLogs() {
      const { logs: _logs, hasPages = false } = await System.eventLogs(offset);
      setLogs(_logs);
      setCanNext(hasPages);
      setLoading(false);
    }
    fetchLogs();
  }, [offset]);

  const handleResetLogs = async () => {
    setConfirm({
      title: "Clear all event logs?",
      description: "This action is irreversible.",
      confirmText: "Clear logs",
      variant: "destructive",
      onConfirm: async () => {
        const { success, error } = await System.clearEventLogs();
        if (success) {
          showToast("Event logs cleared successfully.", "success");
          setLogs([]);
          setCanNext(false);
          setOffset(0);
        } else {
          showToast(`Failed to clear logs: ${error}`, "error");
        }
      },
    });
  };

  const handlePrevious = () => {
    setOffset(Math.max(offset - 1, 0));
  };

  const handleNext = () => {
    setOffset(offset + 1);
  };

  return (
    <SettingsLayout>
      <PageHeader
        title={t("event.title")}
        description={t("event.description")}
      />
      <div className="w-full justify-end flex">
        <Button
          size="lg"
          onClick={handleResetLogs}
          className="mt-3 mr-0 mb-4 md:-mb-14 z-10"
        >
          {t("event.clear")}
        </Button>
      </div>
      <div className="overflow-x-auto mt-6">
        <LogsContainer
          loading={loading}
          logs={logs}
          offset={offset}
          canNext={canNext}
          handleNext={handleNext}
          handlePrevious={handlePrevious}
        />
      </div>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </SettingsLayout>
  );
}

function LogsContainer({
  loading,
  logs,
  offset,
  canNext,
  handleNext,
  handlePrevious,
}) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <Skeleton
        height="80vh"
        width="100%"
        highlightColor="var(--theme-bg-primary)"
        baseColor="var(--theme-bg-secondary)"
        count={1}
        className="w-full p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm"
        containerClassName="flex w-full"
      />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className="px-6 py-3 rounded-tl-lg">
              {t("event.table.type")}
            </TableHead>
            <TableHead scope="col" className="px-6 py-3">
              {t("event.table.user")}
            </TableHead>
            <TableHead scope="col" className="px-6 py-3">
              {t("event.table.occurred")}
            </TableHead>
            <TableHead scope="col" className="px-6 py-3 rounded-tr-lg">
              {" "}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!!logs && logs.map((log) => <LogRow key={log.id} log={log} />)}
        </TableBody>
      </Table>
      <div className="flex w-full justify-between items-center mt-6">
        <button
          onClick={handlePrevious}
          className="px-4 py-2 rounded-lg border border-slate-200 text-slate-200 light:text-theme-text-secondary light:border-theme-sidebar-border text-sm items-center flex gap-x-2 hover:bg-slate-200 hover:text-slate-800 disabled:invisible"
          disabled={offset === 0}
        >
          {t("common.previous")}
        </button>
        <button
          onClick={handleNext}
          className="px-4 py-2 rounded-lg border border-slate-200 text-slate-200 light:text-theme-text-secondary light:border-theme-sidebar-border text-sm items-center flex gap-x-2 hover:bg-slate-200 hover:text-slate-800 disabled:invisible"
          disabled={!canNext}
        >
          {t("common.next")}
        </button>
      </div>
    </>
  );
}
