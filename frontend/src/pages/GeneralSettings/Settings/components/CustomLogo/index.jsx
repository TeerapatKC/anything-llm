import useLogo from "@/hooks/useLogo";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export default function CustomLogo() {
  const { t } = useTranslation();
  const { logo: _initLogo, setLogo: _setLogo } = useLogo();
  const [logo, setLogo] = useState("");
  const [isDefaultLogo, setIsDefaultLogo] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function logoInit() {
      setLogo(_initLogo || "");
      const _isDefaultLogo = await System.isDefaultLogo();
      setIsDefaultLogo(_isDefaultLogo);
    }
    logoInit();
  }, [_initLogo]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return false;

    const objectURL = URL.createObjectURL(file);
    setLogo(objectURL);

    const formData = new FormData();
    formData.append("logo", file);
    const { success, error } = await System.uploadLogo(formData);
    if (!success) {
      showToast(`Failed to upload logo: ${error}`, "error");
      setLogo(_initLogo);
      return;
    }

    const { logoURL } = await System.fetchLogo();
    _setLogo(logoURL);

    showToast("Image uploaded successfully.", "success");
    setIsDefaultLogo(false);
  };

  const handleRemoveLogo = async () => {
    setLogo("");
    setIsDefaultLogo(true);

    const { success, error } = await System.removeCustomLogo();
    if (!success) {
      console.error("Failed to remove logo:", error);
      showToast(`Failed to remove logo: ${error}`, "error");
      const { logoURL } = await System.fetchLogo();
      setLogo(logoURL);
      setIsDefaultLogo(false);
      return;
    }

    const { logoURL } = await System.fetchLogo();
    _setLogo(logoURL);

    showToast("Image successfully removed.", "success");
  };

  const triggerFileInputClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col gap-y-0.5 my-4">
      <p className="text-sm leading-6 font-semibold text-theme-text-primary">
        {t("customization.items.logo.title")}
      </p>
      <p className="text-xs text-theme-text-secondary">
        {t("customization.items.logo.description")}
      </p>
      {isDefaultLogo ? (
        <div className="flex flex-col items-start md:flex-row md:items-center">
          <div className="flex flex-row gap-x-8">
            <label
              className="mt-3 transition-all duration-300 hover:opacity-80"
              hidden={!isDefaultLogo}
            >
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div
                className="w-80 py-4 bg-theme-settings-input-bg rounded-2xl border-2 border-dashed border-theme-sidebar-border justify-center items-center inline-flex cursor-pointer hover:border-theme-text-secondary transition-colors"
                htmlFor="logo-upload"
              >
                <div className="flex flex-col items-center justify-center">
                  <div className="rounded-full bg-theme-bg-secondary p-2">
                    <Plus className="w-5 h-5 text-theme-text-primary" />
                  </div>
                  <div className="text-theme-text-primary text-sm font-semibold py-1">
                    {t("customization.items.logo.add")}
                  </div>
                  <div className="text-theme-text-secondary text-xs font-medium py-1">
                    {t("customization.items.logo.recommended")}
                  </div>
                </div>
              </div>
            </label>
          </div>
        </div>
      ) : (
        <div className="relative flex flex-col items-start md:flex-row md:items-center">
          <div className="group w-80 h-[130px] mt-3 overflow-hidden rounded-2xl relative">
            <img
              src={logo}
              alt="Uploaded Logo"
              className="w-full h-full object-cover border border-theme-sidebar-border p-1 rounded-2xl"
            />

            <div className="absolute inset-0 flex items-center justify-center gap-x-2 rounded-2xl bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={triggerFileInputClick}
              >
                {t("customization.items.logo.replace")}
              </Button>

              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
                ref={fileInputRef}
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemoveLogo}
              >
                {t("customization.items.logo.remove")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
