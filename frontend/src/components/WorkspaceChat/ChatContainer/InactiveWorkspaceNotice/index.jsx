import { Ban } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Stands in for the prompt input when a workspace has been switched off. The server
 * refuses these chats regardless, so the box is replaced rather than merely disabled -
 * a greyed-out input invites people to keep trying.
 */
export default function InactiveWorkspaceNotice() {
  const { t } = useTranslation();
  return (
    <div className="w-full flex justify-center px-4 pb-6">
      <div className="w-full md:max-w-[800px] flex items-center gap-x-3 rounded-lg border border-theme-modal-border bg-theme-bg-secondary px-4 py-3">
        <Ban className="h-4 w-4 shrink-0 text-theme-text-secondary" />
        <p className="text-sm text-theme-text-secondary">
          {t("general.status.chat-disabled")}
        </p>
      </div>
    </div>
  );
}
