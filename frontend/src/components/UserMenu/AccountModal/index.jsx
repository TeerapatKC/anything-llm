import usePfp from "@/hooks/usePfp";
import System from "@/models/system";
import { AUTH_USER } from "@/utils/constants";
import showToast from "@/utils/toast";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { useState } from "react";
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

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return false;

    const formData = new FormData();
    formData.append("file", file);
    const { success, error } = await System.uploadPfp(formData);
    if (!success) {
      showToast(t("profile_settings.failed_upload", { error }), "error");
      return;
    }

    const pfpUrl = await System.fetchPfp(user.id);
    setPfp(pfpUrl);
    showToast(t("profile_settings.upload_success"), "success");
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

    const data = {};
    const form = new FormData(e.target);
    for (var [key, value] of form.entries()) {
      if (!value || value === null) continue;
      data[key] = value;
    }

    const { success, error } = await System.updateUser(data);
    if (success) {
      let storedUser = safeJsonParse(localStorage.getItem(AUTH_USER), null);
      if (storedUser) {
        storedUser.username = data.username;
        storedUser.email = data.email;
        storedUser.bio = data.bio;
        localStorage.setItem(AUTH_USER, JSON.stringify(storedUser));
      }
      showToast(t("profile_settings.profile_updated"), "success", {
        clear: true,
      });
      hideModal();
    } else {
      showToast(t("profile_settings.failed_update_user", { error }), "error");
    }
  };
  return (
    <>
      <Dialog
        open={!showChangePassword}
        onOpenChange={(open) => {
          if (!open && !showChangePassword) hideModal();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {t("profile_settings.edit_account")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <div className="flex flex-col items-center">
                <label className="group w-24 h-24 flex flex-col items-center justify-center bg-theme-bg-primary hover:bg-theme-bg-secondary transition-colors duration-300 rounded-full border-2 border-dashed border-white light:border-[#686C6F] light:bg-[#E0F2FE] light:hover:bg-transparent cursor-pointer hover:opacity-60">
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  {pfp ? (
                    <img
                      src={pfp}
                      alt="User profile picture"
                      className="w-24 h-24 rounded-full object-cover bg-white"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-1">
                      <Plus className="w-5 h-5 text-theme-text-secondary" />
                      <span className="text-theme-text-secondary/80 text-xs font-semibold">
                        {t("profile_settings.profile_picture")}
                      </span>
                    </div>
                  )}
                </label>
                {pfp && (
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
