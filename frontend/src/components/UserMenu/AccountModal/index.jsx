import usePfp from "@/hooks/usePfp";
import System from "@/models/system";
import Appearance from "@/models/appearance";
import { AUTH_USER } from "@/utils/constants";
import showToast from "@/utils/toast";
import { Info, Plus } from "@phosphor-icons/react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { safeJsonParse } from "@/utils/request";
import Toggle from "@/components/lib/Toggle";
import {
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_PATTERN,
} from "@/utils/username";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function AccountModal({ user, hideModal }) {
  const { pfp, setPfp } = usePfp();
  const { t } = useTranslation();

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
    <Dialog open={true} onOpenChange={(open) => !open && hideModal()}>
      <DialogContent
        scrollable={false}
        className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border p-0 overflow-hidden"
      >
        <DialogHeader sticky={false} className="p-4">
          <DialogTitle className="text-lg font-semibold">
            {t("profile_settings.edit_account")}
          </DialogTitle>
        </DialogHeader>
        <div
          className="h-full w-full overflow-y-auto thin-scrollbar"
          style={{ maxHeight: "calc(100vh - 200px)" }}
        >
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
                      <span className="text-theme-text-secondary text-opacity-80 text-xs font-semibold">
                        {t("profile_settings.profile_picture")}
                      </span>
                    </div>
                  )}
                </label>
                {pfp && (
                  <button
                    type="button"
                    onClick={handleRemovePfp}
                    className="mt-2 text-theme-text-secondary text-opacity-60 text-xs font-medium hover:underline"
                  >
                    {t("profile_settings.remove_profile_picture")}
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-y-3 px-4">
              <div>
                <Label
                  variant="field"
                  htmlFor="username"
                  className="block mb-2"
                >
                  {t("profile_settings.username")}
                </Label>
                <Input
                  variant="settings"
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
                <p className="mt-2 text-xs text-white/60">
                  {t("common.username_requirements")}
                </p>
              </div>
              <div>
                <Label
                  variant="field"
                  htmlFor="password"
                  className="block mb-2"
                >
                  {t("profile_settings.new_password")}
                </Label>
                <Input
                  variant="settings"
                  name="password"
                  type="text"
                  placeholder={`${user.username}'s new password`}
                  minLength={8}
                />
                <p className="mt-2 text-xs text-white/60">
                  {t("profile_settings.password_description")}
                </p>
              </div>
              <div>
                <Label variant="field" htmlFor="bio" className="block mb-2">
                  Bio
                </Label>
                <Textarea
                  variant="settings"
                  name="bio"
                  placeholder="Tell us about yourself..."
                  defaultValue={user.bio}
                  rows={3}
                />
              </div>
              <div className="flex gap-x-8">
                <div className="flex flex-col gap-y-3">
                  <AutoSubmitPreference />
                  <AutoSpeakPreference />
                </div>
              </div>
            </div>
            <DialogFooter className="p-4">
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  {t("profile_settings.cancel")}
                </Button>
              </DialogClose>
              <Button variant="default" type="submit">
                {t("profile_settings.update_account")}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AutoSubmitPreference() {
  const [autoSubmitSttInput, setAutoSubmitSttInput] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const settings = Appearance.getSettings();
    setAutoSubmitSttInput(settings.autoSubmitSttInput ?? true);
  }, []);

  const handleChange = (checked) => {
    setAutoSubmitSttInput(checked);
    Appearance.updateSettings({ autoSubmitSttInput: checked });
  };

  return (
    <div>
      <div className="flex items-center gap-x-1 mb-2">
        <Label variant="field" htmlFor="autoSubmit" className="block">
          {t("customization.chat.auto_submit.title")}
        </Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-pointer h-fit">
              <Info size={16} weight="bold" className="text-white" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[250px] text-xs">
            {t("customization.chat.auto_submit.description")}
          </TooltipContent>
        </Tooltip>
      </div>
      <Toggle size="lg" enabled={autoSubmitSttInput} onChange={handleChange} />
    </div>
  );
}

function AutoSpeakPreference() {
  const [autoPlayAssistantTtsResponse, setAutoPlayAssistantTtsResponse] =
    useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const settings = Appearance.getSettings();
    setAutoPlayAssistantTtsResponse(
      settings.autoPlayAssistantTtsResponse ?? false
    );
  }, []);

  const handleChange = (checked) => {
    setAutoPlayAssistantTtsResponse(checked);
    Appearance.updateSettings({ autoPlayAssistantTtsResponse: checked });
  };

  return (
    <div>
      <div className="flex items-center gap-x-1 mb-2">
        <Label variant="field" htmlFor="autoSpeak" className="block">
          {t("customization.chat.auto_speak.title")}
        </Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-pointer h-fit">
              <Info size={16} weight="bold" className="text-white" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[250px] text-xs">
            {t("customization.chat.auto_speak.description")}
          </TooltipContent>
        </Tooltip>
      </div>
      <Toggle
        size="lg"
        enabled={autoPlayAssistantTtsResponse}
        onChange={handleChange}
      />
    </div>
  );
}
