import React, { memo, forwardRef, useState } from "react";
import { Warning, CaretDown } from "@phosphor-icons/react";
import renderMarkdown from "@/utils/chat/markdown";
import DOMPurify from "@/utils/chat/purify";
import { embedderSettings } from "@/main";
import { v4 } from "uuid";
import NexusAIIcon from "@/assets/nexus-ai-icon.png";
import { formatDate } from "@/utils/date";

const ThoughtBubble = ({ thought }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!thought || !embedderSettings.settings.showThoughts) return null;

  return (
    <div className="allm-mb-2 allm-rounded-md allm-border allm-border-slate-200 allm-bg-white allm-p-2">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="allm-flex allm-cursor-pointer allm-items-center allm-gap-x-1.5 allm-text-slate-500 hover:allm-text-slate-900"
      >
        <CaretDown
          size={14}
          weight="bold"
          className={`allm-transition-transform ${isExpanded ? "allm-rotate-180" : ""}`}
        />
        <span className="allm-text-xs allm-font-medium">View thoughts</span>
      </div>
      {isExpanded && (
        <div className="allm-mt-2 allm-border-l-2 allm-border-slate-200 allm-pl-3">
          <div className="allm-whitespace-pre-wrap allm-font-mono allm-text-xs allm-text-slate-600">
            {thought.trim()}
          </div>
        </div>
      )}
    </div>
  );
};

const HistoricalMessage = forwardRef(
  (
    {
      uuid = v4(),
      message,
      role,
      sources = [],
      error = false,
      errorMsg = null,
      sentAt,
    },
    ref
  ) => {
    const textSize = !!embedderSettings.settings.textSize
      ? `allm-text-[${embedderSettings.settings.textSize}px]`
      : "allm-text-sm";
    if (error) console.error(`NEXUS_AI_CHAT_WIDGET_ERROR: ${error}`);

    // Extract content between think tags if they exist
    const thinkMatches = message?.match(/<think>([\s\S]*?)<\/think>/g) || [];
    const thoughts = thinkMatches.map((match) =>
      match.replace(/<think>|<\/think>/g, "").trim()
    );

    // Get the response content without the think tags
    const responseContent = message
      ?.replace(/<think>[\s\S]*?<\/think>/g, "")
      .trim();

    return (
      <div className="allm-py-1">
        {role === "assistant" && (
          <div className="allm-mb-1.5 allm-ml-11 allm-mr-6 allm-text-left allm-font-sans allm-text-xs allm-font-medium allm-text-slate-500">
            {embedderSettings.settings.assistantName ||
              "Nexus AI Chat Assistant"}
          </div>
        )}
        <div
          key={uuid}
          ref={ref}
          className={`allm-flex allm-items-start allm-w-full allm-h-fit ${
            role === "user" ? "allm-justify-end" : "allm-justify-start"
          }`}
        >
          {role === "assistant" && (
            <img
              src={embedderSettings.settings.assistantIcon || NexusAIIcon}
              alt="Nexus AI Icon"
              className="allm-h-8 allm-w-8 allm-flex-shrink-0 allm-rounded-full allm-border-2 allm-border-slate-300 allm-bg-white allm-object-cover allm-p-0.5 allm-shadow-sm"
              id="nexus-ai-icon"
            />
          )}
          <div
            style={{
              wordBreak: "break-word",
              backgroundColor:
                role === "user"
                  ? embedderSettings.USER_STYLES.msgBg
                  : embedderSettings.ASSISTANT_STYLES.msgBg,
            }}
            className={`allm-flex allm-flex-col allm-px-3 allm-py-2.5 allm-font-sans ${
              error
                ? "allm-ml-2 allm-mr-10 allm-max-w-[calc(100%-3.5rem)] allm-rounded-xl allm-border allm-border-red-200 allm-bg-red-50 allm-text-red-700"
                : role === "user"
                  ? `${embedderSettings.USER_STYLES.base} allm-nexus-ai-user-message`
                  : `${embedderSettings.ASSISTANT_STYLES.base} allm-nexus-ai-assistant-message allm-border allm-border-slate-200`
            } allm-shadow-sm`}
          >
            <div className="allm-flex allm-flex-col">
              {error ? (
                <div className="allm-text-red-700">
                  <span className="allm-inline-block">
                    <Warning className="allm-h-4 allm-w-4 allm-mb-1 allm-inline-block" />{" "}
                    Could not respond to message.
                  </span>
                  <p className="allm-mt-2 allm-rounded-md allm-bg-red-100 allm-p-2 allm-font-mono allm-text-xs">
                    {errorMsg || "Server error"}
                  </p>
                </div>
              ) : (
                <>
                  {role === "assistant" && thoughts.length > 0 && (
                    <ThoughtBubble thought={thoughts.join("\n\n")} />
                  )}
                  <span
                    className={`allm-whitespace-pre-line allm-flex allm-flex-col allm-gap-y-1 ${textSize} allm-leading-[20px]`}
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(
                        renderMarkdown(responseContent || message)
                      ),
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {sentAt && (
          <div
            className={`allm-mt-1.5 allm-font-sans allm-text-[10px] allm-text-slate-400 ${role === "user" ? "allm-mr-1 allm-text-right" : "allm-ml-11 allm-text-left"}`}
          >
            {formatDate(sentAt)}
          </div>
        )}
      </div>
    );
  }
);

export default memo(HistoricalMessage);
