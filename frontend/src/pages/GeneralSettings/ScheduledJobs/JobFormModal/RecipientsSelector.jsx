import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Building2, User as UserIcon, X } from "lucide-react";
import ScheduledJobs from "@/models/scheduledJobs";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function RecipientsSelector({
  recipientType,
  selectedWorkspaceIds,
  selectedUserIds,
  onTypeChange,
  onWorkspaceIdsChange,
  onUserIdsChange,
}) {
  const { t } = useTranslation();
  const [workspaces, setWorkspaces] = useState([]);
  const [users, setUsers] = useState([]);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [pickerDialogOpen, setPickerDialogOpen] = useState(false);

  useEffect(() => {
    ScheduledJobs.availableRecipients().then(
      ({ workspaces = [], users = [] }) => {
        setWorkspaces(workspaces);
        setUsers(users);
      }
    );
  }, []);

  const chooseType = (type) => {
    onTypeChange(type);
    setTypeDialogOpen(false);
    if (type !== "none") setPickerDialogOpen(true);
  };

  const backToTypeDialog = () => {
    setPickerDialogOpen(false);
    setTypeDialogOpen(true);
  };

  const toggleWorkspace = (id) => {
    onWorkspaceIdsChange(
      selectedWorkspaceIds.includes(id)
        ? selectedWorkspaceIds.filter((x) => x !== id)
        : [...selectedWorkspaceIds, id]
    );
  };

  const toggleUser = (id) => {
    onUserIdsChange(
      selectedUserIds.includes(id)
        ? selectedUserIds.filter((x) => x !== id)
        : [...selectedUserIds, id]
    );
  };

  // Selected entries as {id, label} pairs, for both the removable chips and the
  // dialog's own "N selected" count - kept in one place so they can't drift.
  const selectedEntries = useMemo(() => {
    if (recipientType === "workspace") {
      return selectedWorkspaceIds
        .map((id) => {
          const workspace = workspaces.find((w) => w.id === id);
          return workspace ? { id, label: workspace.name } : null;
        })
        .filter(Boolean);
    }
    if (recipientType === "user") {
      return selectedUserIds
        .map((id) => {
          const user = users.find((u) => u.id === id);
          return user ? { id, label: user.username } : null;
        })
        .filter(Boolean);
    }
    return [];
  }, [recipientType, selectedWorkspaceIds, selectedUserIds, workspaces, users]);

  const removeSelected = (id) => {
    if (recipientType === "workspace") toggleWorkspace(id);
    else if (recipientType === "user") toggleUser(id);
  };

  const pickerItems = recipientType === "workspace" ? workspaces : users;
  const pickerSelectedIds =
    recipientType === "workspace" ? selectedWorkspaceIds : selectedUserIds;
  const togglePickerItem =
    recipientType === "workspace" ? toggleWorkspace : toggleUser;

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-50 light:text-slate-700">
        {t("scheduledJobs.modal.recipientsLabel", "Email results to")}
      </label>
      <p className="text-xs text-zinc-400 light:text-slate-600 mt-1 mb-3">
        {t(
          "scheduledJobs.modal.recipientsDescription",
          "Send the job's result by email when it completes successfully."
        )}
      </p>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setTypeDialogOpen(true)}
        >
          {t("scheduledJobs.modal.chooseRecipients", "Choose recipients")}
        </Button>
        <span className="text-xs text-zinc-400 light:text-slate-500">
          {recipientType === "none"
            ? t("scheduledJobs.modal.recipientType.none")
            : `${t(`scheduledJobs.modal.recipientType.${recipientType}`)} — ${t(
                "scheduledJobs.modal.recipientsSelected",
                { count: selectedEntries.length, total: pickerItems.length }
              )}`}
        </span>
      </div>

      {selectedEntries.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-zinc-800 light:bg-slate-200 flex gap-1.5 h-[26px] items-center justify-center px-3.5 py-0.5 rounded-full text-sm text-zinc-300 light:text-slate-700"
            >
              <span className="whitespace-nowrap">{entry.label}</span>
              <button
                type="button"
                onClick={() => removeSelected(entry.id)}
                aria-label={`Remove ${entry.label}`}
                className="border-none text-zinc-400 light:text-slate-500 hover:text-zinc-50 light:hover:text-slate-900 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dialog 1: pick Workspace vs User */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>
              {t("scheduledJobs.modal.recipientsLabel", "Email results to")}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => chooseType("workspace")}
              className="border-none flex flex-col items-center gap-2 rounded-lg bg-theme-settings-input-bg px-4 py-5 text-sm text-zinc-50 light:text-slate-700 hover:bg-zinc-700/60 light:hover:bg-slate-200 transition-colors"
            >
              <Building2 size={22} />
              {t("scheduledJobs.modal.recipientType.workspace")}
            </button>
            <button
              type="button"
              onClick={() => chooseType("user")}
              className="border-none flex flex-col items-center gap-2 rounded-lg bg-theme-settings-input-bg px-4 py-5 text-sm text-zinc-50 light:text-slate-700 hover:bg-zinc-700/60 light:hover:bg-slate-200 transition-colors"
            >
              <UserIcon size={22} />
              {t("scheduledJobs.modal.recipientType.user")}
            </button>
          </div>

          {recipientType !== "none" && (
            <button
              type="button"
              onClick={() => chooseType("none")}
              className="border-none text-xs text-zinc-400 light:text-slate-500 hover:text-zinc-50 light:hover:text-slate-900 underline text-center mt-1"
            >
              {t("scheduledJobs.modal.recipientsTurnOff", "Turn off emailing results")}
            </button>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog 2: pick which workspaces/users, shown after Dialog 1 */}
      <Dialog open={pickerDialogOpen} onOpenChange={setPickerDialogOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <button
              type="button"
              onClick={backToTypeDialog}
              className="border-none inline-flex items-center gap-1 text-xs text-zinc-400 light:text-slate-500 hover:text-zinc-50 light:hover:text-slate-900 mb-1 self-start"
            >
              <ArrowLeft size={12} />
              {t("scheduledJobs.modal.recipientsChangeType", "Change type")}
            </button>
            <DialogTitle>
              {recipientType === "workspace"
                ? t("scheduledJobs.modal.pickWorkspaces", "Select workspaces")
                : t("scheduledJobs.modal.pickUsers", "Select users")}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-72 overflow-y-auto rounded-lg border border-zinc-700 light:border-slate-200">
            {pickerItems.length === 0 ? (
              <p className="text-xs text-zinc-400 light:text-slate-500 px-3 py-2.5">
                {recipientType === "workspace"
                  ? t("scheduledJobs.modal.noWorkspaces", "No workspaces found")
                  : t(
                      "scheduledJobs.modal.noUsers",
                      "No users with an email on file"
                    )}
              </p>
            ) : (
              pickerItems.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center gap-3 border-b border-zinc-700 light:border-slate-200 px-3 py-2.5 transition-colors last:border-b-0 hover:bg-zinc-700/40 light:hover:bg-slate-100"
                >
                  <Checkbox
                    checked={pickerSelectedIds.includes(item.id)}
                    onCheckedChange={() => togglePickerItem(item.id)}
                  />
                  <span className="text-sm text-zinc-300 light:text-slate-700">
                    {recipientType === "user" ? (
                      <>
                        {item.username}{" "}
                        <span className="text-zinc-500 light:text-slate-400">
                          — {item.email}
                        </span>
                      </>
                    ) : (
                      item.name
                    )}
                  </span>
                </label>
              ))
            )}
          </div>

          <DialogFooter>
            <Button type="button" onClick={() => setPickerDialogOpen(false)}>
              {t("scheduledJobs.modal.recipientsDone", "Done")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
