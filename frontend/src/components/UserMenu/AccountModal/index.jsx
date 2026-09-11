import usePfp from "@/hooks/usePfp";
import System from "@/models/system";
import { AUTH_USER } from "@/utils/constants";
import showToast from "@/utils/toast";
import { Camera } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { safeJsonParse } from "@/utils/request";
import {
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_PATTERN,
} from "@/utils/username";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ChangePasswordModal from "@/components/Modals/ChangePassword";

export default function AccountModal({ user, hideModal }) {
  const { pfp, setPfp } = usePfp();
  const { t } = useTranslation();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pendingPfp, setPendingPfp] = useState(null);
  const [pfpPreview, setPfpPreview] = useState(null);
  const profilePicture = pfpPreview || pfp;

  useEffect(
    () => () => {
      if (pfpPreview) URL.revokeObjectURL(pfpPreview);
    },
    [pfpPreview]
  );

  const handleFileSelection = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setPendingPfp(file);
    setPfpPreview(URL.createObjectURL(file));
  };

  const handleRemovePfp = async () => {
    const { success, error } = await System.removePfp();
    if (!success) {
      showToast(t("profile_settings.failed_remove", { error }), "error");
      return;
    }

    setPfp(null);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    const form = new FormData(e.target);
    const submittedProfile = {
      username: form.get("username") ?? "",
      email: form.get("email") ?? "",
      bio: form.get("bio") ?? "",
    };
    const data = Object.fromEntries(
      Object.entries(submittedProfile).filter(
        ([key, value]) => value !== (user[key] ?? "")
      )
    );

    if (Object.keys(data).length > 0) {
      const { success, error } = await System.updateUser(data);
      if (!success) {
        showToast(t("profile_settings.failed_update_user", { error }), "error");
        return;
      }
    }

    if (pendingPfp) {
      const formData = new FormData();
      formData.append("file", pendingPfp);
      const { success: uploaded, error: uploadError } =
        await System.uploadPfp(formData);
      if (!uploaded) {
        showToast(
          t("profile_settings.failed_upload", { error: uploadError }),
          "error"
        );
        return;
      }

      const pfpUrl = await System.fetchPfp(user.id);
      setPfp(pfpUrl);
      showToast(t("profile_settings.upload_success"), "success");
    }

    let storedUser = safeJsonParse(localStorage.getItem(AUTH_USER), null);
    if (storedUser) {
      Object.assign(storedUser, data);
      localStorage.setItem(AUTH_USER, JSON.stringify(storedUser));
    }
    showToast(t("profile_settings.profile_updated"), "success", {
      clear: true,
    });
    hideModal();
  };
  return (
    <>
      <Dialog
        open={!showChangePassword}
        onOpenChange={(open) => {
          if (!open && !showChangePassword) hideModal();
        }}
      >
        <DialogContent onInteractOutside={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {t("profile_settings.edit_account")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <div className="flex flex-col items-center">
                <label
                  className="group relative flex size-28 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-sky-400/70 bg-theme-bg-secondary shadow-sm transition-all duration-200 hover:ring-2 hover:ring-sky-400/60 light:bg-sky-50"
                  style={{ borderStyle: "dashed" }}
                >
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelection}
                  />
                  {profilePicture ? (
                    <img
                      src={profilePicture}
                      alt="User profile picture"
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 p-2 text-center">
                      <Camera className="size-5 text-sky-500" />
                      <span className="text-theme-text-secondary text-xs font-medium">
                        {t("profile_settings.profile_picture")}
                      </span>
                    </div>
                  )}
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 text-xs font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                    <Camera className="size-5" />
                    {t("profile_settings.profile_picture")}
                  </span>
                </label>
                {pfp && !pfpPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePfp}
                    className="mt-2 text-theme-text-secondary/60 text-xs font-medium hover:underline"
                  >
                    {t("profile_settings.remove_profile_picture")}
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-y-3">
              <div>
                <Label htmlFor="username" className="block mb-2">
                  {t("profile_settings.username")}
                </Label>
                <Input
                  name="username"
                  type="text"
                  placeholder="User's username"
                  minLength={USERNAME_MIN_LENGTH}
                  maxLength={USERNAME_MAX_LENGTH}
                  pattern={USERNAME_PATTERN}
                  defaultValue={user.username}
                  required
                  autoComplete="off"
                />
                <p className="mt-2 text-xs text-theme-text-secondary">
                  {t("common.username_requirements")}
                </p>
              </div>
              <div>
                <Label htmlFor="email" className="block mb-2">
                  {t("profile_settings.email")}
                </Label>
                <Input
                  name="email"
                  type="email"
                  placeholder="user@example.com"
                  defaultValue={user.email ?? ""}
                  maxLength={255}
                  required
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="bio" className="block mb-2">
                  Bio
                </Label>
                <Textarea
                  name="bio"
                  placeholder="Tell us about yourself..."
                  defaultValue={user.bio}
                  rows={3}
                />
              </div>
              {/* Last: changing a password leaves this form for another
                  dialog, so it does not belong between fields being edited. */}
              <div>
                <Label className="block mb-2">
                  {t("profile_settings.password")}
                </Label>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setShowChangePassword(true)}
                >
                  {t("password_change.title")}
                </Button>
                <p className="mt-2 text-xs text-theme-text-secondary">
                  {t("profile_settings.password_description")}
                </p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>
                {t("profile_settings.cancel")}
              </DialogClose>
              <Button variant="default" type="submit">
                {t("profile_settings.update_account")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ChangePasswordModal
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </>
  );
}
