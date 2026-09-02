import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Check, Copy, Mail } from "lucide-react";
import Admin from "@/models/admin";
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import paths from "@/utils/paths";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function NewInviteModal({ onSuccess }) {
  const { t } = useTranslation();
  const [invite, setInvite] = useState(null);
  const [emailSent, setEmailSent] = useState(false);
  const [emailReason, setEmailReason] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState([]);
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [pickedUserId, setPickedUserId] = useState("");

  const handleCreate = async (e) => {
    setError(null);
    e.preventDefault();

    const {
      invite: newInvite,
      emailSent: sent,
      emailReason: reason,
      error,
    } = await Admin.newInvite({
      role: null,
      workspaceIds: selectedWorkspaceIds,
      email: email.trim(),
    });
    if (!!newInvite) {
      setInvite(newInvite);
      setEmailSent(!!sent);
      setEmailReason(reason || null);
      onSuccess();
    }
    setError(error);
  };

  const handlePickUser = (userId) => {
    setPickedUserId(userId);
    const picked = users.find((u) => String(u.id) === userId);
    if (picked?.email) setEmail(picked.email);
  };

  const copyInviteLink = () => {
    if (!invite) return false;
    window.navigator.clipboard.writeText(
      `${window.location.origin}/accept-invite/${invite.code}`
    );
    setCopied(true);
    showToast(t("admin-invites.modal.link-copied"), "success", {
      clear: true,
    });
  };

  const handleWorkspaceSelection = (workspaceId) => {
    if (selectedWorkspaceIds.includes(workspaceId)) {
      const updated = selectedWorkspaceIds.filter((id) => id !== workspaceId);
      setSelectedWorkspaceIds(updated);
      return;
    }
    setSelectedWorkspaceIds([...selectedWorkspaceIds, workspaceId]);
  };

  useEffect(() => {
    function resetStatus() {
      if (!copied) return false;
      setTimeout(() => {
        setCopied(false);
      }, 3000);
    }
    resetStatus();
  }, [copied]);

  useEffect(() => {
    async function fetchWorkspaces() {
      Workspace.all()
        .then((workspaces) => setWorkspaces(workspaces))
        .catch(() => setWorkspaces([]));
    }
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    async function fetchUsers() {
      Admin.users()
        .then((users) => setUsers(users))
        .catch(() => setUsers([]));
    }
    fetchUsers();
  }, []);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("admin-invites.modal.title")}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleCreate}>
        <div className="space-y-4">
          {error && (
            <p className="text-red-400 text-sm">
              {t("admin-invites.modal.error", { error })}
            </p>
          )}
          {invite && (
            <div className="relative">
              <input
                type="url"
                defaultValue={`${window.location.origin}/accept-invite/${invite.code}`}
                disabled={true}
                className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg outline-none block w-full p-2.5 pr-10"
              />
              <button
                type="button"
                onClick={copyInviteLink}
                disabled={copied}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-theme-modal-border transition-all duration-300"
              >
                {copied ? (
                  <Check size={20} className="text-green-400" />
                ) : (
                  <Copy size={20} className="text-theme-text-primary" />
                )}
              </button>
            </div>
          )}
          {invite ? (
            email && (
              <Alert
                className={
                  emailSent
                    ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400"
                    : ""
                }
              >
                <Mail />
                <AlertDescription
                  className={`text-xs ${emailSent ? "!text-green-700/90 dark:!text-green-400/90" : ""}`}
                >
                  {emailSent ? (
                    <Trans
                      i18nKey="admin-invites.modal.emailed-to"
                      values={{ email }}
                      components={{
                        b: <b className="text-theme-text-primary" />,
                      }}
                    />
                  ) : emailReason === "disabled" ? (
                    <Trans
                      i18nKey="admin-invites.modal.not-emailed-disabled"
                      components={{
                        a: (
                          <a
                            href={paths.settings.smtp()}
                            className="text-primary-button underline"
                          />
                        ),
                      }}
                    />
                  ) : (
                    t("admin-invites.modal.not-emailed-failed", {
                      reason: emailReason ? `: ${emailReason}` : "",
                    })
                  )}
                </AlertDescription>
              </Alert>
            )
          ) : (
            <p className="text-muted-foreground text-xs md:text-sm">
              <Trans
                i18nKey="admin-invites.modal.helper"
                components={{ b: <b /> }}
              />
            </p>
          )}
        </div>

        {!invite && (
          <div className="mt-6 space-y-2">
            <Label htmlFor="invite-email" className="block">
              {t("admin-invites.modal.email-label")}
            </Label>
            <p className="text-muted-foreground text-xs">
              {t("admin-invites.modal.email-help")}
            </p>
            {users.length > 0 && (
              <Select value={pickedUserId} onValueChange={handlePickUser}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("admin-invites.modal.pick-user")}>
                    {(value) =>
                      !value
                        ? t("admin-invites.modal.pick-user")
                        : users.find((u) => String(u.id) === value)?.username ||
                          value
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((u) => !!u.email)
                    .map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.username} — {u.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setPickedUserId("");
              }}
              placeholder={t("admin-invites.modal.email-placeholder")}
              autoComplete="off"
            />
          </div>
        )}

        {workspaces.length > 0 && !invite && (
          <div className="mt-6 space-y-2">
            <div className="flex items-baseline justify-between gap-4">
              <Label>{t("admin-invites.modal.workspaces-label")}</Label>
              {selectedWorkspaceIds.length > 0 && (
                <span className="text-muted-foreground text-xs">
                  {t("admin-invites.modal.workspaces-selected", {
                    count: selectedWorkspaceIds.length,
                    total: workspaces.length,
                  })}
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              {t("admin-invites.modal.workspaces-help")}
            </p>

            <div className="max-h-56 overflow-y-auto rounded-lg border">
              {workspaces.map((workspace) => (
                <WorkspaceOption
                  key={workspace.id}
                  workspace={workspace}
                  selected={selectedWorkspaceIds.includes(workspace.id)}
                  toggleSelection={handleWorkspaceSelection}
                />
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          {!invite ? (
            <>
              <DialogClose render={<Button variant="outline" type="button" />}>
                {t("admin-invites.modal.cancel")}
              </DialogClose>
              <Button variant="default" type="submit">
                {t("admin-invites.modal.create")}
              </Button>
            </>
          ) : (
            <DialogClose render={<Button variant="outline" type="button" />}>
              {t("admin-invites.modal.close")}
            </DialogClose>
          )}
        </DialogFooter>
      </form>
    </>
  );
}

/**
 * One selectable workspace. This used to be a <button> holding a hidden
 * `type="radio"` input — the wrong control for a multi-select, and React warns
 * about a `checked` prop with no `onChange`. It is a labelled checkbox now, so
 * the whole row is the click target and the state is announced correctly.
 */
function WorkspaceOption({ workspace, selected, toggleSelection }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 border-b px-3 py-2.5 transition-colors last:border-b-0 hover:bg-muted/50 has-data-checked:bg-muted/50">
      <Checkbox
        checked={selected}
        onCheckedChange={() => toggleSelection(workspace.id)}
      />
      <span className="text-sm font-medium">{workspace.name}</span>
    </label>
  );
}
