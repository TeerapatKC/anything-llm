import { useTranslation } from "react-i18next";
import paths from "@/utils/paths";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function UnauthenticatedHubModal({ show, onClose }) {
  const { t } = useTranslation();
  if (!show) return null;

  return (
    <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[400px] bg-theme-bg-primary border-theme-modal-border">
        <DialogHeader className="p-0">
          <DialogTitle className="text-sm font-semibold text-center">
            {t("community_hub.publish.generic.unauthenticated.title")}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center gap-y-4">
          <p className="text-sm text-theme-text-primary text-center max-w-[300px]">
            {t("community_hub.publish.generic.unauthenticated.description")}
          </p>
          <Link
            to={paths.communityHub.authentication()}
            className="w-[265px] bg-theme-bg-secondary hover:bg-theme-sidebar-item-hover text-theme-text-primary py-2 px-4 rounded-lg transition-colors mt-4 text-sm font-semibold text-center"
          >
            {t("community_hub.publish.generic.unauthenticated.button")}
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
