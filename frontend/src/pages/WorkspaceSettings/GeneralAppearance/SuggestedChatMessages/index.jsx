import PreLoader from "@/components/Preloader";
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";

export default function SuggestedChatMessages({ slug }) {
  const [suggestedMessages, setSuggestedMessages] = useState([]);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [newMessage, setNewMessage] = useState({ heading: "", message: "" });
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  useEffect(() => {
    async function fetchWorkspace() {
      if (!slug) return;
      const suggestedMessages = await Workspace.getSuggestedMessages(slug);
      setSuggestedMessages(suggestedMessages);
      setLoading(false);
    }
    fetchWorkspace();
  }, [slug]);

  const handleSaveSuggestedMessages = async () => {
    const validMessages = suggestedMessages.filter(
      (msg) => msg?.message?.trim()?.length > 0
    );
    const { success, error } = await Workspace.setSuggestedMessages(
      slug,
      validMessages
    );
    if (!success) {
      showToast(`Failed to update suggested chat messages: ${error}`, "error");
      return;
    }
    setSuggestedMessages(validMessages);
    setEditingIndex(-1);
    setHasChanges(false);
  };

  const addMessage = () => {
    setEditingIndex(-1);
    if (suggestedMessages.length >= 4) {
      showToast("Maximum of 4 messages allowed.", "warning");
      return;
    }
    const defaultMessage = {
      heading: "",
      message: `${t("general.message.heading")} ${t("general.message.body")}`,
    };
    setNewMessage(defaultMessage);
    setSuggestedMessages([...suggestedMessages, { ...defaultMessage }]);
    setHasChanges(true);
  };

  const removeMessage = (index) => {
    const messages = [...suggestedMessages];
    messages.splice(index, 1);
    setSuggestedMessages(messages);
    setHasChanges(true);
  };

  const startEditing = (e, index) => {
    e.preventDefault();
    setEditingIndex(index);
    const suggestion = suggestedMessages[index];
    // Legacy messages may have a separate heading field. Merge it into the message
    // on edit so the user can manage everything in a single input going forward.
    if (suggestion.heading) {
      const merged = {
        heading: "",
        message: `${suggestion.heading} ${suggestion.message}`,
      };
      setNewMessage(merged);
      setSuggestedMessages(
        suggestedMessages.map((msg, i) => (i === index ? merged : msg))
      );
    } else {
      setNewMessage({ ...suggestion });
    }
  };

  const handleRemoveMessage = (index) => {
    removeMessage(index);
    setEditingIndex(-1);
  };

  const onEditChange = (e) => {
    const updatedNewMessage = {
      ...newMessage,
      [e.target.name]: e.target.value,
    };
    setNewMessage(updatedNewMessage);
    const updatedMessages = suggestedMessages.map((message, index) => {
      if (index === editingIndex) {
        return { ...message, [e.target.name]: e.target.value };
      }
      return message;
    });

    setSuggestedMessages(updatedMessages);
    setHasChanges(true);
  };

  if (loading)
    return (
      <div className="flex flex-col gap-y-[8px]">
        <label className="block input-label">
          {t("general.message.title")}
        </label>
        <p className="text-theme-text-primary/60 text-xs font-medium py-1.5">
          {t("general.message.description")}
        </p>
        <div className="text-theme-text-primary/60 text-sm font-medium">
          <PreLoader size="4" />
        </div>
      </div>
    );

  return (
    <div className="w-full flex flex-col gap-y-[8px]">
      <div className="flex flex-col gap-y-[8px]">
        <label className="block input-label">
          {t("general.message.title")}
        </label>
        <p className="text-theme-text-primary/60 text-xs font-medium">
          {t("general.message.description")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-theme-text-secondary text-xs w-full justify-center max-w-[600px]">
        {suggestedMessages.map((suggestion, index) => (
          <div key={index} className="relative w-full">
            <button
              className="transition-all duration-300 absolute z-10 text-neutral-700 bg-white rounded-full hover:bg-zinc-600 hover:border-zinc-600 hover:text-white border-transparent border shadow-lg ml-2"
              style={{
                top: -8,
                left: 265,
              }}
              onClick={() => handleRemoveMessage(index)}
            >
              <X className="m-px" size={20} />
            </button>
            <button
              key={index}
              onClick={(e) => startEditing(e, index)}
              className={`text-left p-2.5 border rounded-xl w-full border-white/20 bg-theme-settings-input-bg hover:bg-theme-sidebar-item-selected-gradient ${
                editingIndex === index ? "border-sky-400" : ""
              }`}
            >
              <p className="line-clamp-2 text-theme-text-primary">
                {suggestion?.heading ? `${suggestion.heading} ` : ""}
                {suggestion?.message ?? ""}
              </p>
            </button>
          </div>
        ))}
      </div>
      {editingIndex >= 0 && (
        <div className="flex flex-col gap-y-4 mr-2">
          <div className="w-1/2">
            <Label className="block mb-2">Message</Label>
            <input
              placeholder="Message"
              className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-white/20 text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block p-2.5 w-full"
              value={newMessage.message}
              name="message"
              onChange={onEditChange}
            />
          </div>
        </div>
      )}
      {suggestedMessages.length < 4 && (
        <button
          type="button"
          onClick={addMessage}
          className="flex gap-x-2 items-center justify-start text-theme-text-primary text-sm hover:text-sky-400 transition-all duration-300"
        >
          {t("general.message.add")} <Plus className="fill-current" size={24} />
        </button>
      )}

      {hasChanges && (
        <div className="flex justify-start">
          <button
            type="button"
            className="transition-all duration-300 border border-slate-200 px-4 py-2 rounded-lg text-theme-text-primary text-sm items-center flex gap-x-2 hover:bg-slate-200 hover:text-slate-800 focus:ring-gray-800"
            onClick={handleSaveSuggestedMessages}
          >
            {t("general.message.save")}
          </button>
        </div>
      )}
    </div>
  );
}
