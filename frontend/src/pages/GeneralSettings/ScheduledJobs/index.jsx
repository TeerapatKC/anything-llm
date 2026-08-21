import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import ScheduledJobs from "@/models/scheduledJobs";
import { subscribeToPushNotifications } from "@/hooks/useWebPushNotifications";
import useWebPushNotifications from "@/hooks/useWebPushNotifications";
import usePolling from "@/hooks/usePolling";
import JobFormModal from "./JobFormModal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useModal } from "@/hooks/useModal";
import showToast from "@/utils/toast";
import JobRow from "./components/JobRow";
import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableEmptyRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function ScheduledJobsPage() {
  const { t } = useTranslation();
  const { updateAvailable, applyUpdate, dismissUpdate } =
    useWebPushNotifications(false);
  const { isOpen, openModal, closeModal } = useModal();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [editingJob, setEditingJob] = useState(null);
  const [confirm, setConfirm] = useState(null);

  // A newer build of the app finished installing in the background - ask before
  // reloading so the user does not lose what they are in the middle of.
  useEffect(() => {
    if (!updateAvailable) return;
    setConfirm({
      title: "A new version is available",
      description: "Reload now to update?",
      confirmText: "Reload",
      cancelText: "Not now",
      variant: "default",
      onConfirm: applyUpdate,
    });
  }, [updateAvailable]);

  const fetchJobs = async () => {
    const { jobs: foundJobs } = await ScheduledJobs.list();
    setJobs(foundJobs || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Poll every 5s while tab is visible so status badges and run timestamps stay in sync.
  usePolling(fetchJobs, 5000);

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
          <div className="flex items-center gap-x-2 shrink-0">
            <NotificationBellButton />
            <Button size="lg" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              {t("scheduledJobs.newJob")}
            </Button>
          </div>
        }
      />

      <div className="overflow-x-auto mt-6">
        {loading ? (
          <Skeleton
            height="80vh"
            width="100%"
            highlightColor="var(--theme-bg-primary)"
            baseColor="var(--theme-bg-secondary)"
            count={1}
            className="w-full p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm"
            containerClassName="flex w-full"
          />
        ) : (
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
              {jobs.length === 0 ? (
                <TableEmptyRow
                  colSpan="6"
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
        )}
      </div>

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
      <ConfirmDialog
        config={confirm}
        onClose={() => {
          setConfirm(null);
          dismissUpdate();
        }}
      />
    </SettingsLayout>
  );
}

function NotificationBellButton() {
  const { t } = useTranslation();
  const [permissionState, setPermissionState] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    permissionState === "granted"
  ) {
    return null;
  }

  const handleClick = async () => {
    await subscribeToPushNotifications();
    setPermissionState(Notification.permission);
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClick}
          />
        }
      >
        <Bell size={20} className="text-orange-400" />
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[250px] text-xs">
        {t(
          "scheduledJobs.enableNotifications",
          "Enable browser notifications for job results"
        )}
      </TooltipContent>
    </Tooltip>
  );
}
