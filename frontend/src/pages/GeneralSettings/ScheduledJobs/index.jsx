import { useCallback, useEffect, useMemo, useState } from "react";
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

/**
 * Builds the set of API calls this page and its children use, bound to either
 * the instance-wide endpoints or the ones owned by a single workspace -
 * mirrors AgentBuilder's `flowsApi` split on the presence of a workspace.
 * @param {{slug: string}|null} workspace
 */
function buildJobsApi(workspace) {
  const slug = workspace?.slug || null;
  if (!slug) {
    return {
      smtpStatus: () => ScheduledJobs.smtpStatus(),
      list: () => ScheduledJobs.list(),
      create: (data) => ScheduledJobs.create(data),
      update: (id, data) => ScheduledJobs.update(id, data),
      delete: (id) => ScheduledJobs.delete(id),
      toggle: (id) => ScheduledJobs.toggle(id),
      trigger: (id) => ScheduledJobs.trigger(id),
      availableTools: () => ScheduledJobs.availableTools(),
      availableRecipients: () => ScheduledJobs.availableRecipients(),
      runsPath: (jobId) => paths.settings.scheduledJobLogs(jobId),
    };
  }
  return {
    smtpStatus: () => ScheduledJobs.workspace.smtpStatus(slug),
    list: () => ScheduledJobs.workspace.list(slug),
    create: (data) => ScheduledJobs.workspace.create(slug, data),
    update: (id, data) => ScheduledJobs.workspace.update(slug, id, data),
    delete: (id) => ScheduledJobs.workspace.delete(slug, id),
    toggle: (id) => ScheduledJobs.workspace.toggle(slug, id),
    trigger: (id) => ScheduledJobs.workspace.trigger(slug, id),
    availableTools: () => ScheduledJobs.workspace.availableTools(slug),
    // Adapted to the same {workspaces, users} shape as the global endpoint so
    // RecipientsSelector doesn't need to know which scope it's in.
    availableRecipients: () =>
      ScheduledJobs.workspace
        .members(slug)
        .then(({ members }) => ({ workspaces: [], users: members || [] })),
    runsPath: (jobId) => paths.workspace.settings.scheduledJobLogs(slug, jobId),
  };
}

export default function ScheduledJobsPage({ workspace = null }) {
  const { t } = useTranslation();
  const isWorkspaceScoped = !!workspace?.slug;
  const jobsApi = useMemo(() => buildJobsApi(workspace), [workspace?.slug]);
  const { isOpen, openModal, closeModal } = useModal();
  // null = still checking, true/false = known
  const [smtpReady, setSmtpReady] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [editingJob, setEditingJob] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const refresh = useCallback(async () => {
    const [{ jobs: foundJobs }, { ready }] = await Promise.all([
      jobsApi.list(),
      jobsApi.smtpStatus(),
    ]);
    setJobs(foundJobs || []);
    setSmtpReady(!!ready);
    setLoading(false);
  }, [jobsApi]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll every 5s while tab is visible so status badges and run timestamps stay in sync.
  usePolling(refresh, 5000);

  const handleDelete = async (id) => {
    setConfirm({
      title: t("scheduledJobs.confirmDelete"),
      confirmText: t("common.delete", "Delete"),
      variant: "destructive",
      onConfirm: async () => {
        await jobsApi.delete(id);
        showToast(t("scheduledJobs.toast.deleted"), "success", { clear: true });
        refresh();
      },
    });
  };

  const handleToggle = async (id) => {
    const result = await jobsApi.toggle(id);
    if (result?.error) showToast(result.error, "error", { clear: true });
    refresh();
  };

  const handleTrigger = async (id) => {
    const { success, skipped, error } = await jobsApi.trigger(id);
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
    refresh();
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    openModal();
  };

  const handleCreate = () => {
    setEditingJob(null);
    openModal();
  };

  const content = (
    <>
      <PageHeader
        title={t("scheduledJobs.title")}
        description={t("scheduledJobs.description")}
        actions={
          <Button size="lg" onClick={handleCreate} disabled={loading}>
            <Plus className="h-4 w-4" />
            {t("scheduledJobs.newJob")}
          </Button>
        }
      />

      {smtpReady === false && (
        <SmtpRequiredNotice showSettingsLink={!isWorkspaceScoped} />
      )}
      <div className="overflow-x-auto mt-6">
        <Table className="text-left min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{t("scheduledJobs.table.name")}</TableHead>
              <TableHead scope="col">
                {t("scheduledJobs.table.schedule")}
              </TableHead>
              <TableHead scope="col">
                {t("scheduledJobs.table.status")}
              </TableHead>
              <TableHead scope="col">
                {t("scheduledJobs.table.lastRun")}
              </TableHead>
              <TableHead scope="col">
                {t("scheduledJobs.table.nextRun")}
              </TableHead>
              <TableHead scope="col" className="text-right">
                {t("scheduledJobs.table.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
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
                  smtpReady={smtpReady}
                  runsPath={jobsApi.runsPath(job.id)}
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

      <Dialog
        open={isOpen}
        onOpenChange={(open) => (open ? openModal() : closeModal())}
      >
        <DialogContent>
          <JobFormModal
            job={editingJob}
            jobsApi={jobsApi}
            workspaceSlug={workspace?.slug || null}
            onSaved={() => {
              closeModal();
              refresh();
            }}
          />
        </DialogContent>
      </Dialog>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );

  if (isWorkspaceScoped) return content;
  return <SettingsLayout>{content}</SettingsLayout>;
}

function SmtpRequiredNotice({ showSettingsLink }) {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4"
    >
      <div className="flex items-start gap-3">
        <Mail size={20} className="mt-0.5 shrink-0 text-amber-500" />
        <div>
          <p className="text-sm font-semibold text-theme-text-primary">
            {t("scheduledJobs.smtpRequiredTitle")}
          </p>
          <p className="mt-1 text-xs text-theme-text-secondary">
            {t("scheduledJobs.smtpRequiredDescription")}
          </p>
        </div>
      </div>
      {showSettingsLink && (
        <Button
          size="sm"
          render={<a href={paths.settings.smtp()} />}
          className="mt-3"
        >
          {t("scheduledJobs.smtpRequiredCta")}
        </Button>
      )}
    </div>
  );
}
