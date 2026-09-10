import { useTranslation } from "react-i18next";
import useUser from "@/hooks/useUser";
import { WORKSPACE_PERMISSIONS as WS, workspaceCan } from "@/utils/permissions";
import ScheduledJobsPage from "@/pages/GeneralSettings/ScheduledJobs";

/**
 * Scheduled jobs that belong to this workspace. Separate from the
 * instance-wide jobs at /settings/scheduled-jobs: a job created here belongs
 * to this workspace and can only email results to this workspace's own
 * members, not to arbitrary workspaces or users elsewhere on the instance.
 */
export default function WorkspaceScheduledJobs({ workspace }) {
  const { t } = useTranslation();
  const { user } = useUser();
  const canManage = workspaceCan(
    WS.SCHEDULED_JOBS_MANAGE,
    workspace?.slug,
    user
  );

  if (!workspace?.slug) return null;
  if (!canManage) {
    return (
      <p className="text-sm text-theme-text-secondary">
        {t(
          "scheduledJobs.noWorkspacePermission",
          "You don't have permission to manage scheduled jobs in this workspace."
        )}
      </p>
    );
  }

  return <ScheduledJobsPage workspace={workspace} />;
}
