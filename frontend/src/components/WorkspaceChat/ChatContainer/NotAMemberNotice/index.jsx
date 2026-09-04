import { useTranslation } from "react-i18next";
import ChatUnavailableNotice from "../ChatUnavailableNotice";

/**
 * Stands in for the prompt input when the viewer can reach this workspace but may not
 * hold a conversation in it - an instance operator who manages every workspace but is
 * a member of none. Chatting is deliberately reserved to actual members on the server
 * (`WORKSPACE_USAGE_PERMISSION_KEYS`), so reading a workspace's embedded documents
 * always leaves a membership behind it; the box would only ever be refused.
 */
export default function NotAMemberNotice() {
  const { t } = useTranslation();
  return (
    <ChatUnavailableNotice message={t("general.status.chat-not-a-member")} />
  );
}
