import {
  Plus,
  ChatCircleDots,
  Headset,
  Binoculars,
  MagnifyingGlass,
  MagicWand,
} from "@phosphor-icons/react";

const CHAT_ICONS = {
  plus: Plus,
  chatBubble: ChatCircleDots,
  support: Headset,
  search2: Binoculars,
  search: MagnifyingGlass,
  magic: MagicWand,
};

export default function OpenButton({ settings, isOpen, toggleOpen }) {
  if (isOpen) return null;
  const ChatIcon = CHAT_ICONS.hasOwnProperty(settings?.chatIcon)
    ? CHAT_ICONS[settings.chatIcon]
    : CHAT_ICONS.plus;
  return (
    <button
      style={{ backgroundColor: settings.buttonColor }}
      id="nexus-ai-embed-chat-button"
      onClick={toggleOpen}
      className="allm-flex allm-h-12 allm-w-12 allm-items-center allm-justify-center allm-rounded-full allm-border allm-border-black/10 allm-text-xl allm-text-white allm-shadow-lg allm-transition-all hover:allm-cursor-pointer hover:allm-brightness-95 hover:allm-shadow-xl focus:allm-outline-none focus:allm-ring-2 focus:allm-ring-slate-400 focus:allm-ring-offset-2"
      aria-label="Toggle Menu"
    >
      <ChatIcon className="allm-text-white" weight="bold" />
    </button>
  );
}
