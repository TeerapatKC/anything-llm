import ChatService from "@/models/chatService";
import { useTranslation } from "react-i18next";

export default function ResetChat({
  setChatHistory,
  settings,
  sessionId,
  closeChat,
}) {
  const { t } = useTranslation();

  const handleChatReset = async () => {
    await ChatService.resetEmbedChatSession(settings, sessionId);
    setChatHistory([]);
  };

  return (
    <div className="allm-flex allm-w-full allm-justify-center allm-gap-x-1 allm-p-0">
      <button
        className="allm-h-fit allm-rounded-md allm-border-none allm-bg-transparent allm-px-2 allm-py-1 allm-text-xs allm-font-medium allm-text-slate-500 hover:allm-cursor-pointer hover:allm-bg-slate-100 hover:allm-text-slate-900"
        onClick={() => handleChatReset()}
      >
        {settings.resetChatText || t("chat.reset-chat")}
      </button>
      {settings.noHeader && (
        <>
          <p className="allm-m-0 allm-h-fit allm-self-center allm-text-xs allm-text-slate-300">
            |
          </p>
          <button
            type="button"
            className="allm-h-fit allm-rounded-md allm-border-none allm-bg-transparent allm-px-2 allm-py-1 allm-text-xs allm-font-medium allm-text-slate-500 hover:allm-cursor-pointer hover:allm-bg-slate-100 hover:allm-text-slate-900"
            onClick={closeChat}
          >
            {t("chat.close-chat")}
          </button>
        </>
      )}
    </div>
  );
}
