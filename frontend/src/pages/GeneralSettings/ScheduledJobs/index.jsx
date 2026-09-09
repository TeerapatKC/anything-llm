import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import ScheduledJobs from "@/models/scheduledJobs";
import usePolling from "@/hooks/usePolling";
import JobFormModal from "./JobFormModal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useModal } from "@/hooks/useModal";
import showToast from "@/utils/toast";
import JobRow from "./components/JobRow";
import { Mail, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import paths from "@/utils/paths";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableEmptyRow,
  TableLoadingRow,
} from "@/components/ui/table";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function ScheduledJobsPage() {
  const { t } = useTranslation();
  const { isOpen, openModal, closeModal } = useModal();
  // null = still checking, true/false = known
  const [smtpReady, setSmtpReady] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [editingJob, setEditingJob] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const fetchJobs = async () => {
    const { jobs: foundJobs } = await ScheduledJobs.list();
    setJobs(foundJobs || []);
    setLoading(false);
  };

  useEffect(() => {
    ScheduledJobs.smtpStatus().then(({ ready }) => setSmtpReady(!!ready));
  }, []);

  useEffect(() => {
    if (!smtpReady) return;
    fetchJobs();
  }, [smtpReady]);

  // Poll every 5s while tab is visible so status badges and run timestamps stay in sync.
  usePolling(fetchJobs, 5000, !!smtpReady);

  const handleDelete = async (id) => {
    setConfirm({
      title: t("scheduledJobs.confirmDelete"),
      confirmText: t("common.delete", "Delete"),
      variant: "destructive",
      onConfirm: async () => {
        await ScheduledJobs.delete(id);
        showToast(t("scheduledJobs.toast.deleted"), "success", { clear: true });
        fetchJobs();
      },
    });
  };

  const handleToggle = async (id) => {
    const result = await ScheduledJobs.toggle(id);
    if (result?.error) showToast(result.error, "error", { clear: true });
    fetchJobs();
  };

  const handleTrigger = async (id) => {
    const { success, skipped, error } = await ScheduledJobs.trigger(id);
    if (!success) {
      showToast(error || t("scheduledJobs.toast.triggerFailed"), "error", {
        clear: true,
      });
    } else if (skipped) {
      showToast(
        t(
          "scheduledJobs.toast.triggerSkipped",
          "A run is already in progress for this job"
        ),
        "info",
        { clear: true }
      );
    } else {
      showToast(t("scheduledJobs.toast.triggered"), "success", { clear: true });
    }
    fetchJobs();
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    openModal();
  };

  const handleCreate = () => {
    setEditingJob(null);
    openModal();
  };

  return (
    <SettingsLayout>
      <PageHeader
        title={t("scheduledJobs.title")}
        description={t("scheduledJobs.description")}
        actions={
          smtpReady ? (
            <Button size="lg" onClick={handleCreate} disabled={loading}>
              <Plus className="h-4 w-4" />
              {t("scheduledJobs.newJob")}
            </Button>
          ) : null
        }
      />

      {smtpReady === false ? (
        <SmtpRequiredNotice />
      ) : (
        <div className="overflow-x-auto mt-6">
          <Table className="text-left min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead scope="col">{t("scheduledJobs.table.name")}</TableHead>
                <TableHead scope="col">{t("scheduledJobs.table.schedule")}</TableHead>
                <TableHead scope="col">{t("scheduledJobs.table.status")}</TableHead>
                <TableHead scope="col">{t("scheduledJobs.table.lastRun")}</TableHead>
                <TableHead scope="col">{t("scheduledJobs.table.nextRun")}</TableHead>
                <TableHead scope="col" className="text-right">
                  {t("scheduledJobs.table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {smtpReady === null || loading ? (
                <TableLoadingRow colSpan={6} />
              ) : jobs.length === 0 ? (
                <TableEmptyRow
                  colSpan={6}
                  description={t("scheduledJobs.emptySubtitle")}
                  action={
                    <Button onClick={handleCreate}>
                      <Plus className="h-4 w-4" />
                      {t("scheduledJobs.newJob")}
                    </Button>
                  }
                >
                  {t("scheduledJobs.emptyTitle")}
                </TableEmptyRow>
              ) : (
                jobs.map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    onTrigger={handleTrigger}
                    onToggle={handleToggle}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={isOpen}
        onOpenChange={(open) => (open ? openModal() : closeModal())}
      >
        <DialogContent>
          <JobFormModal
            job={editingJob}
            onSaved={() => {
              closeModal();
              fetchJobs();
            }}
          />
        </DialogContent>
      </Dialog>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </SettingsLayout>
  );
}

function SmtpRequiredNotice() {
  const { t } = useTranslation();
  return (
    <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-zinc-700 light:border-slate-200 px-6 py-12 text-center">
      <Mail size={28} className="text-zinc-400 light:text-slate-400" />
      <p className="text-sm font-medium text-zinc-50 light:text-slate-700">
        {t(
          "scheduledJobs.smtpRequiredTitle",
          "SMTP email must be configured first"
        )}
      </p>
      <p className="max-w-md text-xs text-zinc-400 light:text-slate-500">
        {t(
          "scheduledJobs.smtpRequiredDescription",
          "Scheduled Jobs delivers its results by email, so it stays unavailable until outbound email is set up and enabled."
        )}
      </p>
      <Button
        size="sm"
        render={<a href={paths.settings.smtp()} />}
        className="mt-1"
      >
        {t("scheduledJobs.smtpRequiredCta", "Go to SMTP settings")}
      </Button>
    </div>
  );
}
