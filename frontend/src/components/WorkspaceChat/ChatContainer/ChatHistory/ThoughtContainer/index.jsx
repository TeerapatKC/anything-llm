import { useTranslation } from "react-i18next";
import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  createContext,
  useContext,
  useCallback,
} from "react";
import renderMarkdown from "@/utils/chat/markdown";
import { ChevronDown, CircleStop } from "lucide-react";
import DOMPurify from "dompurify";
import ThinkingAnimation from "@/media/animations/thinking-animation.webm";
import ThinkingStatic from "@/media/animations/thinking-static.png";

/**
 * Context to persist thought expansion state across component transitions
 * (e.g., from PromptReply to HistoricalMessage)
 */
const ThoughtExpansionContext = createContext(null);

export function ThoughtExpansionProvider({ children }) {
  const [expansionStates, setExpansionStates] = useState({});

  const getExpanded = useCallback(
    (messageId) => {
      if (!messageId) return false;
      return expansionStates[messageId] ?? false;
    },
    [expansionStates]
  );

  const setExpanded = useCallback((messageId, expanded) => {
    if (!messageId) return;
    setExpansionStates((prev) => ({
      ...prev,
      [messageId]: expanded,
    }));
  }, []);

  return (
    <ThoughtExpansionContext.Provider value={{ getExpanded, setExpanded }}>
      {children}
    </ThoughtExpansionContext.Provider>
  );
}

export function useThoughtExpansion(messageId) {
  const context = useContext(ThoughtExpansionContext);
  if (!context) {
    // Fallback when used outside provider - use local state only
    return { expanded: false, setExpanded: () => {} };
  }
  return {
    expanded: context.getExpanded(messageId),
    setExpanded: (value) => context.setExpanded(messageId, value),
  };
}

const THOUGHT_KEYWORDS = ["thought", "thinking", "think", "thought_chain"];
const CLOSING_TAGS = [...THOUGHT_KEYWORDS, "response", "answer"];
export const THOUGHT_REGEX_OPEN = new RegExp(
  THOUGHT_KEYWORDS.map((keyword) => `<${keyword}\\s*(?:[^>]*?)?\\s*>`).join("|")
);
export const THOUGHT_REGEX_CLOSE = new RegExp(
  CLOSING_TAGS.map((keyword) => `</${keyword}\\s*(?:[^>]*?)?>`).join("|")
);
export const THOUGHT_REGEX_COMPLETE = new RegExp(
  THOUGHT_KEYWORDS.map(
    (keyword) =>
      `<${keyword}\\s*(?:[^>]*?)?\\s*>[\\s\\S]*?<\\/${keyword}\\s*(?:[^>]*?)?>`
  ).join("|")
);
/**
 * Checks if the content has readable content.
 * @param {string} content - The content to check.
 * @returns {boolean} - Whether the content has readable content.
 */
function contentIsNotEmpty(content = "") {
  return (
    content
      ?.trim()
      ?.replace(THOUGHT_REGEX_OPEN, "")
      ?.replace(THOUGHT_REGEX_CLOSE, "")
      ?.replace(/[\n\s]/g, "")?.length > 0
  );
}

/**
 * Component to render a thought chain.
 * @param {string} content - The content of the thought chain.
 * @param {string} messageId - The unique ID for this message (used to persist expansion state).
 * @returns {JSX.Element}
 */
export const ThoughtChainComponent = forwardRef(
  (
    {
      content: initialContent,
      messageId,
      allowAnimation = false,
      stopped = false,
    },
    ref
  ) => {
    const { t } = useTranslation();
    const [content, setContent] = useState(initialContent);
    const [hasReadableContent, setHasReadableContent] = useState(
      contentIsNotEmpty(initialContent)
    );
    const { expanded: persistedExpanded, setExpanded: setPersistedExpanded } =
      useThoughtExpansion(messageId);
    const [localExpanded, setLocalExpanded] = useState(false);

    // Use persisted state if messageId is provided, otherwise use local state
    const isExpanded = messageId ? persistedExpanded : localExpanded;
    const setIsExpanded = messageId ? setPersistedExpanded : setLocalExpanded;

    // Sync content state with prop changes (for streaming through HistoricalMessage)
    useEffect(() => {
      if (initialContent !== content) {
        setContent(initialContent);
        setHasReadableContent(contentIsNotEmpty(initialContent));
      }
    }, [initialContent]);

    useImperativeHandle(ref, () => ({
      updateContent: (newContent) => {
        setContent(newContent);
        setHasReadableContent(contentIsNotEmpty(newContent));
      },
    }));

    const isThinking =
      allowAnimation &&
      content.match(THOUGHT_REGEX_OPEN) &&
      !content.match(THOUGHT_REGEX_CLOSE);
    const isComplete =
      content.match(THOUGHT_REGEX_COMPLETE) ||
      content.match(THOUGHT_REGEX_CLOSE);
    const tagStrippedContent = content
      .replace(THOUGHT_REGEX_OPEN, "")
      .replace(THOUGHT_REGEX_CLOSE, "");
    const canExpand = tagStrippedContent.trim().length > 0;
    if (!content || !content.length || !hasReadableContent) return null;

    // Once the model has closed its thought and moved on to the answer, the reasoning
    // has served its purpose - the reply below it is what there is to read. Same rule the
    // agent's status commentary follows, so the two behave alike.
    if (!isThinking && isComplete) return null;

    const dimText = "text-white/40 light:text-slate-900/40";

    return (
      <div className="flex justify-center w-full">
        <div className="w-full flex flex-col">
          <button
            type="button"
            onClick={() => canExpand && setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            className={`flex w-full items-center gap-x-2.5 py-2 text-left ${canExpand ? "cursor-pointer" : "cursor-default"}`}
          >
            <span className="size-[18px] shrink-0 opacity-50">
              {stopped ? (
                <CircleStop
                  className="size-[17px]"
                  aria-label="Response stopped"
                />
              ) : isThinking ? (
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="size-[18px] scale-[115%] light:invert"
                  aria-label={t("ui.model-thinking")}
                >
                  <source src={ThinkingAnimation} type="video/webm" />
                </video>
              ) : (
                <img
                  src={ThinkingStatic}
                  alt="Thinking"
                  className="size-[18px] light:invert"
                  aria-label={t("ui.model-thinking")}
                />
              )}
            </span>

            <span
              className={`min-w-0 flex-1 font-mono text-sm leading-[18px] ${
                isThinking && !stopped ? "text-shimmer" : dimText
              }`}
            >
              {stopped ? "Stopped" : "Thinking"}
            </span>

            {canExpand && (
              <ChevronDown
                className={`size-4 shrink-0 transform ${dimText} transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
              />
            )}
          </button>

          {canExpand && (
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div
                  className={`pb-2 pl-7 font-mono text-sm leading-5 [&_p]:m-0 ${dimText}`}
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(
                      renderMarkdown(tagStrippedContent)
                    ),
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);
ThoughtChainComponent.displayName = "ThoughtChainComponent";
