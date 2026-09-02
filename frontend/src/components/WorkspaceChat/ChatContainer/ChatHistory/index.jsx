import {
  useMemo,
  useCallback,
  forwardRef,
  cloneElement,
  isValidElement,
} from "react";
import HistoricalMessage from "./HistoricalMessage";
import PromptReply from "./PromptReply";
import StatusResponse from "./StatusResponse";
import ToolApprovalRequest from "./ToolApprovalRequest";
import ClarifyingQuestionCard from "./ClarifyingQuestion";
import FileDownloadCard from "./FileDownloadCard";
import ImageGenerationPending from "./ImageGenerationPending";
import ScheduledJobCreatedCard from "./ScheduledJobCreatedCard";
import { useManageWorkspaceModal } from "../../../Modals/ManageWorkspace";
import ManageWorkspace from "../../../Modals/ManageWorkspace";
import { ArrowDown } from "lucide-react";
import Chartable from "./Chartable";
import ModelRouteNotification from "./ModelRouteNotification";
import Workspace from "@/models/workspace";
import { useNavigate, useParams } from "react-router-dom";
import paths from "@/utils/paths";
import { THREAD_FORK_EVENT } from "@/components/Sidebar/ActiveWorkspaces/ThreadContainer/constants";
import Appearance from "@/models/appearance";
import useTextSize from "@/hooks/useTextSize";
import useAutoScroll from "@/hooks/useAutoScroll";
import {
  ThoughtExpansionProvider,
  THOUGHT_REGEX_OPEN,
  THOUGHT_REGEX_CLOSE,
} from "./ThoughtContainer";
import { MessageActionsProvider } from "./MessageActionsContext";

export default forwardRef(function (
  {
    history = [],
    workspace,
    sendCommand,
    updateHistory,
    regenerateAssistantMessage,
    websocket = null,
  },
  ref
) {
  const { chatHistoryRef, isAtBottom, scrollToBottom, scrollHandlers } =
    useAutoScroll(history, ref);
  const navigate = useNavigate();
  const { threadSlug = null } = useParams();
  const { showing, hideModal } = useManageWorkspaceModal();
  const { showScrollbar } = Appearance.getSettings();
  const { textSizeClass } = useTextSize();

  const saveEditedMessage = useCallback(
    async ({
      editedMessage,
      messageKey,
      chatId,
      role,
      attachments = [],
      saveOnly = false,
    }) => {
      if (!editedMessage) return;

      // A turn whose answer failed or was stopped was never written, so it has no
      // chatId and none of the database calls below apply to it. Editing the prompt
      // there is purely local: trim the history back to it and replay. "Save only"
      // has nothing to save against, so it always resubmits.
      if (!chatId) {
        const targetIdx = history.findIndex((msg) => msg.uuid === messageKey);
        if (targetIdx < 0 || role !== "user") return;
        const updatedHistory = history.slice(0, targetIdx + 1);
        updatedHistory[targetIdx] = {
          ...updatedHistory[targetIdx],
          content: editedMessage,
        };
        sendCommand({
          text: editedMessage,
          autoSubmit: true,
          history: updatedHistory,
          attachments,
        });
        return;
      }

      if (role === "user" && saveOnly) {
        const updatedHistory = [...history];
        const targetIdx = history.findIndex((msg) => msg.chatId === chatId);
        if (targetIdx < 0) return;
        updatedHistory[targetIdx].content = editedMessage;
        updateHistory(updatedHistory);
        await Workspace.updateChat(
          workspace.slug,
          threadSlug,
          chatId,
          editedMessage,
          "user"
        );
        return;
      }

      if (role === "user") {
        const updatedHistory = history.slice(
          0,
          history.findIndex((msg) => msg.chatId === chatId) + 1
        );
        updatedHistory[updatedHistory.length - 1].content = editedMessage;
        await Workspace.deleteEditedChats(workspace.slug, threadSlug, chatId);
        sendCommand({
          text: editedMessage,
          autoSubmit: true,
          history: updatedHistory,
          attachments,
        });
        return;
      }

      if (role === "assistant") {
        const updatedHistory = [...history];
        const targetIdx = history.findIndex(
          (msg) => msg.chatId === chatId && msg.role === role
        );
        if (targetIdx < 0) return;
        updatedHistory[targetIdx].content = editedMessage;
        updateHistory(updatedHistory);
        await Workspace.updateChat(
          workspace.slug,
          threadSlug,
          chatId,
          editedMessage
        );
        return;
      }
    },
    [workspace.slug, threadSlug, updateHistory, history, sendCommand]
  );

  const forkThread = useCallback(
    async (chatId) => {
      const newThreadSlug = await Workspace.forkThread(
        workspace.slug,
        threadSlug,
        chatId
      );
      // Surface the fork in the sidebar first - if the navigation below gets
      // blocked (ActiveGenerationGuard) and cancelled, the new thread still
      // exists and stays reachable. Router navigation so the guard can
      // intercept while a response is generating.
      window.dispatchEvent(
        new CustomEvent(THREAD_FORK_EVENT, {
          detail: { threadSlug: newThreadSlug },
        })
      );
      navigate(paths.workspace.thread(workspace.slug, newThreadSlug));
    },
    [workspace.slug, threadSlug, navigate]
  );

  const lastMessageInfo = useMemo(() => getLastMessageInfo(history), [history]);

  // A run is live while its agent socket is open or the last message is still
  // streaming. Reasoning that never received its closing tag - the run died
  // mid-thought - cannot tell "still thinking" from "stopped thinking" on its
  // own, and would sit on "Thinking" forever beside the error that ended it.
  const runIsLive = !!websocket || !!lastMessageInfo.isAnimating;

  const compiledHistory = useMemo(
    () =>
      buildMessages({
        workspace,
        history,
        regenerateAssistantMessage,
        saveEditedMessage,
        forkThread,
        websocket,
        runIsLive,
      }),
    [
      workspace,
      history,
      regenerateAssistantMessage,
      saveEditedMessage,
      forkThread,
      websocket,
      runIsLive,
    ]
  );
  const renderStatusResponse = useCallback(
    (item, index) => {
      // Anything after this group means the agent has moved on to its actual reply, so
      // the running commentary has served its purpose and takes itself off screen.
      const hasSubsequentMessages = index < compiledHistory.length - 1;
      return (
        <StatusResponse
          key={`status-group-${index}`}
          messages={item}
          isThinking={!hasSubsequentMessages && runIsLive}
          isComplete={hasSubsequentMessages}
          // A trailing group whose run is over is commentary on work that has
          // stopped, however it stopped.
          isStopped={
            item.some((message) => message.stopped) ||
            (!hasSubsequentMessages && !runIsLive)
          }
        />
      );
    },
    [compiledHistory.length, runIsLive]
  );

  return (
    <MessageActionsProvider>
      <ThoughtExpansionProvider>
        <div
          className={`markdown text-white/80 light:text-theme-text-primary font-light ${textSizeClass} h-full md:h-[83%] pb-[100px] pt-6 md:pt-0 md:pb-20 md:mx-0 overflow-y-scroll flex flex-col items-center justify-start ${showScrollbar ? "show-scrollbar" : "no-scroll"}`}
          id="chat-history"
          ref={chatHistoryRef}
          {...scrollHandlers}
        >
          <div className="w-full max-w-[750px]">
            {compiledHistory.map((item, index) =>
              Array.isArray(item) ? renderStatusResponse(item, index) : item
            )}
          </div>
          {showing && (
            <ManageWorkspace
              hideModal={hideModal}
              providedSlug={workspace.slug}
            />
          )}
        </div>
        {!isAtBottom && (
          <div className="absolute bottom-40 right-10 z-50 cursor-pointer animate-pulse">
            <div className="flex flex-col items-center">
              <div
                className="p-1 rounded-full border border-theme-sidebar-border bg-white/10 hover:bg-white/20 hover:text-white"
                onClick={() => scrollToBottom(true)}
              >
                <ArrowDown className="text-theme-text-secondary w-5 h-5" />
              </div>
            </div>
          </div>
        )}
      </ThoughtExpansionProvider>
    </MessageActionsProvider>
  );
});

/**
 * The agent's step commentary and the model's reasoning are one "still working"
 * state, and each draws the same disclosure row - so a turn carrying both showed
 * two rows, identical apart from their icon, both labelled "Thinking".
 *
 * Only a trailing status group is ever on screen: StatusResponse hides itself the
 * moment anything follows it. So the rule is - if the list ends with a status
 * group, hand it to the nearest message above that is still showing an open
 * reasoning chain, and drop the standalone group. This runs after the reduce
 * rather than inside it because the two arrive in either order: live, the status
 * group precedes the streaming reply; replayed from the database, it can follow
 * the answer it belonged to.
 *
 * When nothing above is reasoning, the group is left exactly as it was - which is
 * still one row.
 *
 * @param {Array} compiled - The compiled history, elements and status groups.
 * @returns {Array} The same list with at most one activity row.
 */
export function foldActivityIntoOneRow(compiled) {
  const lastIdx = compiled.length - 1;
  const statusGroup = compiled[lastIdx];
  if (!Array.isArray(statusGroup)) return compiled;

  for (let i = lastIdx - 1; i >= 0; i--) {
    const element = compiled[i];
    if (!isValidElement(element)) continue;

    // Reaching the prompt means this turn's answer is not reasoning.
    if (element.props?.role === "user") break;

    // Both states bail out before they reach the reasoning row, so folding into
    // one would take the commentary down with it.
    if (element.props?.pending || element.props?.error) continue;

    const content = element.props?.reply ?? element.props?.message;
    if (typeof content !== "string") continue;
    if (!THOUGHT_REGEX_OPEN.test(content) || THOUGHT_REGEX_CLOSE.test(content))
      continue;

    const folded = [...compiled];
    folded[i] = cloneElement(element, { statusMessages: statusGroup });
    folded.splice(lastIdx, 1);
    return folded;
  }

  return compiled;
}

const getLastMessageInfo = (history) => {
  const lastMessage = history?.[history.length - 1] || {};
  return {
    isAnimating: lastMessage?.animate,
    isStatusResponse: lastMessage?.type === "statusResponse",
  };
};

/**
 * Builds the history of messages for the chat.
 * This is mostly useful for rendering the history in a way that is easy to understand.
 * as well as compensating for agent thinking and other messages that are not part of the history, but
 * are still part of the chat.
 *
 * @param {Object} param0 - The parameters for building the messages.
 * @param {Array} param0.history - The history of messages.
 * @param {Object} param0.workspace - The workspace object.
 * @param {Function} param0.regenerateAssistantMessage - The function to regenerate the assistant message.
 * @param {Function} param0.saveEditedMessage - The function to save the edited message.
 * @param {Function} param0.forkThread - The function to fork the thread.
 * @param {WebSocket} param0.websocket - The active websocket connection for agent communication.
 * @returns {Array} The compiled history of messages.
 */
function buildMessages({
  history,
  workspace,
  regenerateAssistantMessage,
  saveEditedMessage,
  forkThread,
  websocket,
  runIsLive = true,
}) {
  const compiled = history.reduce((acc, props, index) => {
    const isLastBotReply =
      index === history.length - 1 && props.role === "assistant";

    if (props?.type === "statusResponse" && !!props.content) {
      if (acc.length > 0 && Array.isArray(acc[acc.length - 1])) {
        acc[acc.length - 1].push(props);
      } else {
        acc.push([props]);
      }
      return acc;
    }

    if (props.type === "modelRouteNotification") {
      const lastMsg = history[history.length - 1];
      const isLast =
        index === history.length - 1 ||
        (index === history.length - 2 &&
          (lastMsg?.animate || lastMsg?.pending));
      const isStreaming =
        isLast &&
        (index === history.length - 1 || lastMsg?.animate || lastMsg?.pending);
      acc.push(
        <ModelRouteNotification
          key={`route-${props.uuid}`}
          routedTo={props.routedTo}
          isStreaming={isStreaming}
        />
      );
      return acc;
    }

    if (props.type === "toolApprovalRequest") {
      acc.push(
        <ToolApprovalRequest
          key={`tool-approval-${props.requestId}`}
          requestId={props.requestId}
          skillName={props.skillName}
          payload={props.payload}
          description={props.description}
          timeoutMs={props.timeoutMs}
          websocket={websocket}
        />
      );
      return acc;
    }

    if (props.type === "clarifyingQuestion") {
      acc.push(
        <ClarifyingQuestionCard
          key={`clarify-${props.requestId}`}
          requestId={props.requestId}
          questions={props.questions}
          allowSkip={props.allowSkip}
          timeoutMs={props.timeoutMs}
          websocket={websocket}
        />
      );
      return acc;
    }

    if (props.type === "rechartVisualize" && !!props.content) {
      acc.push(<Chartable key={props.uuid} props={props} />);
    } else if (props.type === "fileDownloadCard" && !!props.content) {
      acc.push(<FileDownloadCard key={props.uuid} props={props} />);
    } else if (props.type === "scheduledJobCreated" && !!props.content) {
      acc.push(<ScheduledJobCreatedCard key={props.uuid} props={props} />);
    } else if (props.type === "imageGenerationPending") {
      acc.push(
        <ImageGenerationPending
          key={`img-pending-${props.uuid || index}`}
          aborted={props.closed}
        />
      );
    } else if (isLastBotReply && props.animate) {
      acc.push(
        <PromptReply
          key={`prompt-reply-${props.uuid || index}`}
          uuid={props.uuid}
          reply={props.content}
          pending={props.pending}
          sources={props.sources}
          error={props.error}
          closed={props.closed}
          runIsLive={runIsLive}
        />
      );
    } else {
      acc.push(
        <HistoricalMessage
          key={index}
          uuid={props.uuid}
          message={props.content}
          role={props.role}
          workspace={workspace}
          sources={props.sources}
          feedbackScore={props.feedbackScore}
          chatId={props.chatId}
          error={props.error}
          attachments={props.attachments}
          regenerateMessage={regenerateAssistantMessage}
          isLastMessage={isLastBotReply}
          saveEditedMessage={saveEditedMessage}
          forkThread={forkThread}
          metrics={props.metrics}
          outputs={props.outputs}
          clarifyingQuestions={props.clarifyingQuestions}
          stopped={props.stopped}
          runIsLive={runIsLive}
        />
      );
    }
    return acc;
  }, []);

  return foldActivityIntoOneRow(compiled);
}
