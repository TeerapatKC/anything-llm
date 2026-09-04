import { useTranslation } from "react-i18next";
import ChatUnavailableNotice from "../ChatUnavailableNotice";

/**
 * Stands in for the prompt input when a workspace has been switched off. The server
 * refuses these chats regardless, so the box is replaced rather than merely disabled -
 * a greyed-out input invites people to keep trying.
 */
export default function InactiveWorkspaceNotice() {
  const { t } = useTranslation();
  return <ChatUnavailableNotice message={t("general.status.chat-disabled")} />;
}
