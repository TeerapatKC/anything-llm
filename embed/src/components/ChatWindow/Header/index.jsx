import NexusAIIcon from "@/assets/nexus-ai-icon.png";
import ChatService from "@/models/chatService";
import {
  ArrowCounterClockwise,
  Check,
  Copy,
  DotsThreeOutlineVertical,
  Envelope,
  X,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export default function ChatWindowHeader({
  sessionId,
  settings = {},
  iconUrl = null,
  closeChat,
  setChatHistory,
}) {
  const [showingOptions, setShowOptions] = useState(false);
  const menuRef = useRef();
  const buttonRef = useRef();

  const handleChatReset = async () => {
    await ChatService.resetEmbedChatSession(settings, sessionId);
    setChatHistory([]);
    setShowOptions(false);
  };
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowOptions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  return (
    <div
      className="allm-relative allm-flex allm-h-16 allm-shrink-0 allm-items-center allm-border-b allm-border-slate-200 allm-bg-white allm-px-4 allm-md:px-5"
      id="nexus-ai-header"
    >
      <div className="allm-flex allm-w-full allm-items-center allm-justify-start allm-pr-20">
        <img
          style={{ maxWidth: 28, maxHeight: 28 }}
          src={iconUrl ?? NexusAIIcon}
          alt={iconUrl ? "Brand" : "Nexus AI Logo"}
          className="allm-block allm-rounded-md allm-object-contain"
        />
      </div>
      <div className="allm-absolute allm-right-3 allm-flex allm-items-center allm-gap-1">
        {settings.loaded && (
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setShowOptions(!showingOptions)}
            className="allm-inline-flex allm-h-8 allm-w-8 allm-items-center allm-justify-center allm-rounded-md allm-border-none allm-bg-transparent allm-text-slate-500 allm-transition-colors hover:allm-cursor-pointer hover:allm-bg-slate-100 hover:allm-text-slate-900 focus:allm-outline-none focus:allm-ring-2 focus:allm-ring-slate-300"
            aria-label="Options"
          >
            <DotsThreeOutlineVertical size={20} weight="fill" />
          </button>
        )}
        <button
          type="button"
          onClick={closeChat}
          className="allm-inline-flex allm-h-8 allm-w-8 allm-items-center allm-justify-center allm-rounded-md allm-border-none allm-bg-transparent allm-text-slate-500 allm-transition-colors hover:allm-cursor-pointer hover:allm-bg-slate-100 hover:allm-text-slate-900 focus:allm-outline-none focus:allm-ring-2 focus:allm-ring-slate-300"
          aria-label="Close"
        >
          <X size={20} weight="bold" />
        </button>
      </div>
      <OptionsMenu
        settings={settings}
        showing={showingOptions}
        resetChat={handleChatReset}
        sessionId={sessionId}
        menuRef={menuRef}
      />
    </div>
  );
}

function OptionsMenu({ settings, showing, resetChat, sessionId, menuRef }) {
  if (!showing) return null;
  const { t } = useTranslation();

  return (
    <div
      ref={menuRef}
      className="allm-absolute allm-right-3 allm-top-14 allm-z-20 allm-flex allm-min-w-[190px] allm-flex-col allm-gap-1 allm-rounded-md allm-border allm-border-slate-200 allm-bg-white allm-p-1 allm-shadow-lg"
    >
      <button
        onClick={resetChat}
        className="allm-flex allm-w-full allm-items-center allm-gap-2 allm-rounded-sm allm-border-none allm-bg-white allm-px-2 allm-py-1.5 allm-text-left allm-text-sm allm-font-medium allm-text-slate-700 hover:allm-cursor-pointer hover:allm-bg-slate-100 hover:allm-text-slate-950"
      >
        <ArrowCounterClockwise size={24} />
        <span>{t("chat.reset-chat")}</span>
      </button>
      <ContactSupport email={settings.supportEmail} />
      <SessionID sessionId={sessionId} />
    </div>
  );
}

function SessionID({ sessionId }) {
  if (!sessionId) return null;
  const { t } = useTranslation();
  const [sessionIdCopied, setSessionIdCopied] = useState(false);

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    setSessionIdCopied(true);
    setTimeout(() => setSessionIdCopied(false), 1000);
  };

  if (sessionIdCopied) {
    return (
      <div className="allm-flex allm-w-full allm-items-center allm-gap-2 allm-rounded-sm allm-bg-slate-50 allm-px-2 allm-py-1.5 allm-text-sm allm-font-medium allm-text-slate-700">
        <Check size={24} />
        <span className="allm-font-sans">{t("chat.message-copied")}</span>
      </div>
    );
  }

  return (
    <button
      onClick={copySessionId}
      className="allm-flex allm-w-full allm-items-center allm-gap-2 allm-rounded-sm allm-border-none allm-bg-white allm-px-2 allm-py-1.5 allm-text-left allm-text-sm allm-font-medium allm-text-slate-700 hover:allm-cursor-pointer hover:allm-bg-slate-100 hover:allm-text-slate-950"
    >
      <Copy size={24} />
      <span>{t("chat.session-id")}</span>
    </button>
  );
}

function ContactSupport({ email = null }) {
  if (!email) return null;
  const { t } = useTranslation();
  const subject = `Inquiry from ${window.location.origin}`;
  return (
    <a
      href={`mailto:${email}?Subject=${encodeURIComponent(subject)}`}
      className="allm-flex allm-w-full allm-items-center allm-gap-2 allm-rounded-sm allm-bg-white allm-px-2 allm-py-1.5 allm-text-sm allm-font-medium allm-text-slate-700 allm-no-underline hover:allm-cursor-pointer hover:allm-bg-slate-100 hover:allm-text-slate-950"
    >
      <Envelope size={24} />
      <span className="allm-font-sans">{t("chat.email-support")}</span>
    </a>
  );
}
