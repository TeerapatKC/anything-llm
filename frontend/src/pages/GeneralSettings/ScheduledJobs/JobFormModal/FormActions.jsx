import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";

export default function FormActions({ isEditing, saving }) {
  const { t } = useTranslation();

  return (
    <DialogFooter className="p-0 sm:justify-between">
      <DialogClose render={<Button variant="outline" type="button" />}>
        {t("scheduledJobs.modal.cancel")}
      </DialogClose>
      <Button variant="default" type="submit" disabled={saving}>
        {saving
          ? t("scheduledJobs.modal.saving")
          : isEditing
            ? t("scheduledJobs.modal.updateJob")
            : t("scheduledJobs.modal.createJob")}
      </Button>
    </DialogFooter>
  );
}
