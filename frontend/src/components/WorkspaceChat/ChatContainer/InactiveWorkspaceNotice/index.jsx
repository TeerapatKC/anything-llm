import { Ban } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
      <Alert className="w-full items-center px-4 py-3 md:max-w-[800px]">
        <Ban />
        <AlertDescription>{t("general.status.chat-disabled")}</AlertDescription>
      </Alert>
    </div>
  );
}
