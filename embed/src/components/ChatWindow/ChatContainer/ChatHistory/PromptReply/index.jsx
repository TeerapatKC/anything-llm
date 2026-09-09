import { forwardRef, memo, useState } from "react";
import { Warning, CircleNotch, CaretDown } from "@phosphor-icons/react";
import renderMarkdown from "@/utils/chat/markdown";
import { embedderSettings } from "@/main";
import NexusAIIcon from "@/assets/nexus-ai-icon.png";
import { formatDate } from "@/utils/date";

const ThinkingIndicator = ({ hasThought }) => {
  if (hasThought) {
    return (
      <div className="allm-flex allm-items-center allm-gap-x-2 allm-text-slate-500">
        <CircleNotch size={16} className="allm-animate-spin" />
        <span className="allm-text-sm">Thinking...</span>
      </div>
    );
  }
  return <div className="allm-mx-4 allm-my-1 allm-dot-falling"></div>;
};

const ThoughtBubble = ({ thought }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!thought || !embedderSettings.settings.showThoughts) return null;

  const cleanThought = thought.replace(/<\/?think>/g, "").trim();

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
            {cleanThought}
          </div>
        </div>
      )}
    </div>
  );
};

const PromptReply = forwardRef(
  ({ uuid, reply, pending, error, sources = [], sentAt }, ref) => {
    if (!reply && sources.length === 0 && !pending && !error) return null;
    if (error) console.error(`NEXUS_AI_CHAT_WIDGET_ERROR: ${error}`);

    // Extract content between think tags if they exist
    const thinkMatches = reply?.match(/<think>([\s\S]*?)<\/think>/g) || [];
    const thoughts = thinkMatches.map((match) =>
      match.replace(/<\/?think>/g, "").trim()
    );

    const hasIncompleteThinkTag =
      reply?.includes("<think>") && !reply?.includes("</think>");

    // For incomplete think tags during streaming, extract the content after the opening tag
    const streamingThought = hasIncompleteThinkTag
      ? reply
          ?.split("<think>")
          .pop()
          ?.replace(/<\/?think>/g, "")
          .trim()
      : null;

    const lastThought = streamingThought || thoughts[thoughts.length - 1];
    const isThinking = hasIncompleteThinkTag || pending;

    // Get the response content without the think tags - clean more aggressively
    const responseContent = reply
      ?.replace(/<think>[\s\S]*?<\/think>/g, "") // Remove complete think blocks
      .replace(/<think>.*$/g, "") // Remove any incomplete think blocks at the end
      .replace(/<\/?think>/g, "") // Remove any stray think tags
      .trim();

    if (isThinking) {
      return (
        <div className="allm-py-1">
          <div className="allm-mb-1.5 allm-ml-11 allm-mr-6 allm-text-left allm-font-sans allm-text-xs allm-font-medium allm-text-slate-500">
            {embedderSettings.settings.assistantName ||
              "Nexus AI Chat Assistant"}
          </div>
          <div className="allm-flex allm-items-start allm-w-full allm-h-fit allm-justify-start">
            <img
              src={embedderSettings.settings.assistantIcon || NexusAIIcon}
              alt="Nexus AI Icon"
              className="allm-h-8 allm-w-8 allm-flex-shrink-0 allm-rounded-full allm-border-2 allm-border-slate-300 allm-bg-white allm-object-cover allm-p-0.5 allm-shadow-sm"
            />
            <div
              style={{
                wordBreak: "break-word",
                backgroundColor: embedderSettings.ASSISTANT_STYLES.msgBg,
              }}
              className={`allm-flex allm-flex-col allm-border allm-border-slate-200 allm-px-3 allm-py-2.5 allm-shadow-sm ${embedderSettings.ASSISTANT_STYLES.base}`}
            >
              {hasIncompleteThinkTag && streamingThought && (
                <ThoughtBubble thought={streamingThought} />
              )}
              <ThinkingIndicator hasThought={hasIncompleteThinkTag} />
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="allm-py-1">
          <div className="allm-mb-1.5 allm-ml-11 allm-mr-6 allm-text-left allm-font-sans allm-text-xs allm-font-medium allm-text-slate-500">
            {embedderSettings.settings.assistantName ||
              "Nexus AI Chat Assistant"}
          </div>
          <div className="allm-flex allm-items-start allm-w-full allm-h-fit allm-justify-start">
            <img
              src={embedderSettings.settings.assistantIcon || NexusAIIcon}
              alt="Nexus AI Icon"
              className="allm-h-8 allm-w-8 allm-flex-shrink-0 allm-rounded-full allm-border-2 allm-border-slate-300 allm-bg-white allm-object-cover allm-p-0.5 allm-shadow-sm"
            />
            <div className="allm-ml-2 allm-mr-10 allm-flex allm-max-w-[calc(100%-3.5rem)] allm-flex-col allm-rounded-xl allm-border allm-border-red-200 allm-bg-red-50 allm-px-3 allm-py-2.5 allm-text-red-700 allm-shadow-sm">
              <div className="allm-flex allm-gap-x-5">
                <span className="allm-inline-block">
                  <Warning className="allm-h-4 allm-w-4 allm-mb-1 allm-inline-block" />{" "}
                  Could not respond to message.
                  <span className="allm-ml-1 allm-text-xs">Server error</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="allm-py-1">
        <div className="allm-mb-1.5 allm-ml-11 allm-mr-6 allm-text-left allm-font-sans allm-text-xs allm-font-medium allm-text-slate-500">
          {embedderSettings.settings.assistantName || "Nexus AI Chat Assistant"}
        </div>
        <div
          key={uuid}
          ref={ref}
          className="allm-flex allm-items-start allm-w-full allm-h-fit allm-justify-start"
        >
          <img
            src={embedderSettings.settings.assistantIcon || NexusAIIcon}
            alt="Nexus AI Icon"
            className="allm-h-8 allm-w-8 allm-flex-shrink-0 allm-rounded-full allm-border-2 allm-border-slate-300 allm-bg-white allm-object-cover allm-p-0.5 allm-shadow-sm"
          />
          <div
            style={{
              wordBreak: "break-word",
              backgroundColor: embedderSettings.ASSISTANT_STYLES.msgBg,
            }}
            className={`allm-flex allm-flex-col allm-border allm-border-slate-200 allm-px-3 allm-py-2.5 allm-shadow-sm ${embedderSettings.ASSISTANT_STYLES.base}`}
          >
            {thoughts.length > 0 && (
              <ThoughtBubble thought={thoughts.join("\n\n")} />
            )}
            <div className="allm-flex allm-gap-x-5">
              <span
                className="allm-font-sans allm-reply allm-whitespace-pre-line allm-font-normal allm-text-sm allm-md:text-sm allm-flex allm-flex-col allm-gap-y-1"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(responseContent || ""),
                }}
              />
            </div>
          </div>
        </div>
        {sentAt && (
          <div className="allm-ml-11 allm-mr-6 allm-mt-1.5 allm-text-left allm-font-sans allm-text-[10px] allm-text-slate-400">
            {formatDate(sentAt)}
          </div>
        )}
      </div>
    );
  }
);

export default memo(PromptReply);
