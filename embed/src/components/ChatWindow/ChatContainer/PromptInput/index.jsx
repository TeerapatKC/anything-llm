import { CircleNotch, PaperPlaneRight } from "@phosphor-icons/react";
import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function PromptInput({
  settings,
  message,
  submit,
  onChange,
  inputDisabled,
  buttonDisabled,
}) {
  const { t } = useTranslation();
  const formRef = useRef(null);
  const textareaRef = useRef(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!inputDisabled && textareaRef.current) {
      textareaRef.current.focus();
    }
    resetTextAreaHeight();
  }, [inputDisabled]);

  const handleSubmit = (e) => {
    setFocused(false);
    submit(e);
  };

  const resetTextAreaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const captureEnter = (event) => {
    if (event.keyCode == 13) {
      if (!event.shiftKey) {
        submit(event);
      }
    }
  };

  const adjustTextArea = (event) => {
    const element = event.target;
    element.style.height = "auto";
    element.style.height =
      event.target.value.length !== 0 ? element.scrollHeight + "px" : "auto";
  };

  return (
    <div className="allm-sticky allm-bottom-0 allm-z-10 allm-flex allm-w-full allm-min-w-0 allm-items-center allm-justify-center allm-overflow-visible allm-bg-white allm-px-4 allm-py-2 allm-md:px-5">
      <form
        onSubmit={handleSubmit}
        className="allm-flex allm-w-full allm-min-w-0 allm-items-center allm-justify-center"
      >
        <div className="allm-flex allm-w-full allm-min-w-0 allm-items-center">
          <div className="allm-flex allm-w-full allm-min-w-0 allm-flex-col">
            <div
              className={`allm-flex allm-w-full allm-items-end allm-rounded-xl allm-border allm-bg-white allm-p-1 allm-shadow-sm allm-transition ${
                focused
                  ? "allm-border-slate-400 allm-ring-2 allm-ring-slate-200"
                  : "allm-border-slate-200 hover:allm-border-slate-300"
              }`}
            >
              <textarea
                ref={textareaRef}
                rows={1}
                onKeyUp={adjustTextArea}
                onKeyDown={captureEnter}
                onChange={onChange}
                required={true}
                disabled={inputDisabled}
                onFocus={() => setFocused(true)}
                onBlur={(e) => {
                  setFocused(false);
                  adjustTextArea(e);
                }}
                value={message}
                className="allm-box-border allm-max-h-[100px] allm-min-h-[38px] allm-w-full allm-flex-grow allm-resize-none allm-border-none allm-bg-transparent allm-px-2 allm-py-2 allm-font-sans allm-text-sm allm-leading-5 allm-text-slate-950 placeholder:allm-text-slate-400 focus:allm-outline-none disabled:allm-cursor-not-allowed disabled:allm-opacity-50"
                placeholder={settings.sendMessageText || t("chat.send-message")}
                id="message-input"
              />
              <button
                ref={formRef}
                type="submit"
                disabled={buttonDisabled || !message.trim()}
                className="allm-group allm-inline-flex allm-h-8 allm-w-8 allm-shrink-0 allm-items-center allm-justify-center allm-rounded-lg allm-border-none allm-bg-slate-900 allm-text-white allm-transition-colors hover:allm-cursor-pointer hover:allm-bg-slate-800 focus:allm-outline-none focus:allm-ring-2 focus:allm-ring-slate-400 focus:allm-ring-offset-1 disabled:allm-cursor-not-allowed disabled:allm-bg-slate-100 disabled:allm-text-slate-400"
                id="send-message-button"
                aria-label="Send message"
              >
                {buttonDisabled ? (
                  <CircleNotch className="allm-h-4 allm-w-4 allm-animate-spin" />
                ) : (
                  <PaperPlaneRight
                    size={24}
                    className="allm-text-current"
                    weight="fill"
                  />
                )}
                <span className="allm-sr-only">Send message</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
