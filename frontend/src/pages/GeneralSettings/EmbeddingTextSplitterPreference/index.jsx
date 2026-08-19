import React, { useEffect, useState } from "react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { SpinnerBlock } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import Admin from "@/models/admin";
import showToast from "@/utils/toast";
import { numberWithCommas } from "@/utils/numbers";
import { useTranslation } from "react-i18next";
import { useModal } from "@/hooks/useModal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ChangeWarningModal from "@/components/ChangeWarning";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

function isNullOrNaN(value) {
  if (value === null) return true;
  return isNaN(value);
}

export default function EmbeddingTextSplitterPreference() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { isOpen, openModal, closeModal } = useModal();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);

    if (
      Number(form.get("text_splitter_chunk_overlap")) >=
      Number(form.get("text_splitter_chunk_size"))
    ) {
      showToast(
        "Chunk overlap cannot be larger or equal to chunk size.",
        "error"
      );
      return;
    }

    openModal();
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const form = new FormData(
        document.getElementById("text-splitter-chunking-form")
      );
      await Admin.updateSystemPreferences({
        text_splitter_chunk_size: isNullOrNaN(
          form.get("text_splitter_chunk_size")
        )
          ? 1000
          : Number(form.get("text_splitter_chunk_size")),
        text_splitter_chunk_overlap: isNullOrNaN(
          form.get("text_splitter_chunk_overlap")
        )
          ? 1000
          : Number(form.get("text_splitter_chunk_overlap")),
      });
      setHasChanges(false);
      closeModal();
      showToast("Text chunking strategy settings saved.", "success");
    } catch {
      showToast("Failed to save text chunking strategy settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    async function fetchSettings() {
      const _settings = (
        await Admin.systemPreferencesByFields([
          "text_splitter_chunk_size",
          "text_splitter_chunk_overlap",
          "max_embed_chunk_size",
        ])
      )?.settings;
      setSettings(_settings ?? {});
      setLoading(false);
    }
    fetchSettings();
  }, []);

  return (
    <SettingsLayout>
      {loading ? (
        <SpinnerBlock className="min-h-[60vh]" />
      ) : (
        <form
          onSubmit={handleSubmit}
          onChange={() => setHasChanges(true)}
          className="flex flex-col w-full"
          id="text-splitter-chunking-form"
        >
          <PageHeader
            title={t("text.title")}
            description={
              <>
                {t("text.desc-start")}
                <br />
                {t("text.desc-end")}
              </>
            }
          />
          <div className="w-full justify-end flex">
            {hasChanges && (
              <Button size="lg" type="submit" className="mt-3 mr-0 -mb-14 z-10">
                {saving ? t("common.saving") : t("common.save")}
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-y-4 mt-8">
            <div className="flex flex-col max-w-[300px]">
              <div className="flex flex-col gap-y-2 mb-4">
                <Label className="block">{t("text.size.title")}</Label>
                <p className="text-xs text-theme-text-secondary">
                  {t("text.size.description")}
                </p>
              </div>
              <Input
                type="number"
                name="text_splitter_chunk_size"
                min={1}
                max={settings?.max_embed_chunk_size || 1000}
                onWheel={(e) => e?.currentTarget?.blur()}
                placeholder="maximum length of vectorized text"
                defaultValue={
                  isNullOrNaN(settings?.text_splitter_chunk_size)
                    ? 1000
                    : Number(settings?.text_splitter_chunk_size)
                }
                required={true}
                autoComplete="off"
              />
              <p className="text-xs text-white/40 mt-2">
                {t("text.size.recommend")}{" "}
                {numberWithCommas(settings?.max_embed_chunk_size || 1000)}.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-y-4 mt-8">
            <div className="flex flex-col max-w-[300px]">
              <div className="flex flex-col gap-y-2 mb-4">
                <Label className="block">{t("text.overlap.title")}</Label>
                <p className="text-xs text-theme-text-secondary">
                  {t("text.overlap.description")}
                </p>
              </div>
              <Input
                type="number"
                name="text_splitter_chunk_overlap"
                min={0}
                onWheel={(e) => e?.currentTarget?.blur()}
                placeholder="maximum length of vectorized text"
                defaultValue={
                  isNullOrNaN(settings?.text_splitter_chunk_overlap)
                    ? 20
                    : Number(settings?.text_splitter_chunk_overlap)
                }
                required={true}
                autoComplete="off"
              />
            </div>
          </div>
        </form>
      )}

      <Dialog
        open={isOpen}
        onOpenChange={(open) => (open ? openModal() : closeModal())}
      >
        <DialogContent className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border">
          <ChangeWarningModal
            warningText="Changing text splitter settings will clear any previously cached documents.\n\nThese new settings will be applied to all documents when embedding them into a workspace."
            onClose={closeModal}
            onConfirm={handleSaveSettings}
          />
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
}
