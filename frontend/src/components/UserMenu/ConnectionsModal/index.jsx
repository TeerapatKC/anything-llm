import TelegramConnection from "../TelegramConnection";
import LineConnection from "../LineConnection";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

/**
 * The messaging accounts this account is connected to.
 *
 * One section per platform - Telegram today, others as they are added - rather
 * than one menu entry each, which would grow the profile menu by a row per
 * platform. Each section stands on its own: connecting completes elsewhere
 * (in the app being linked), so there is nothing here for a Save button to do.
 */
export default function ConnectionsModal({ user, open, onClose }) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {t("profile_settings.connections.title")}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-y-4">
          <TelegramConnection user={user} />
          <LineConnection user={user} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
