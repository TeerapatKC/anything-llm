import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import PromptInput, {
  PROMPT_INPUT_EVENT,
  PROMPT_INPUT_ID,
} from "@/components/WorkspaceChat/ChatContainer/PromptInput";
import DnDFileUploaderWrapper, {
  DndUploaderContext,
  DnDFileUploaderProvider,
  PASTE_ATTACHMENT_EVENT,
} from "@/components/WorkspaceChat/ChatContainer/DnDWrapper";
import { useTranslation } from "react-i18next";
import {
  LAST_VISITED_WORKSPACE,
  PENDING_HOME_MESSAGE,
} from "@/utils/constants";
import Workspace from "@/models/workspace";
import paths from "@/utils/paths";
import showToast from "@/utils/toast";
import { safeJsonParse } from "@/utils/request";
import SuggestedMessages from "@/components/lib/SuggestedMessages";
import useUser from "@/hooks/useUser";
import ChatSettingsMenu from "@/components/WorkspaceChat/ChatContainer/ChatSettingsMenu";
import { ChatSidebarProvider } from "@/components/WorkspaceChat/ChatContainer/ChatSidebar";
import { clearPromptInputDraft } from "@/hooks/usePromptInputStorage";
import MemoriesSidebar from "@/components/WorkspaceChat/ChatContainer/MemoriesSidebar";
import {
  userIsChatOnly,
  workspaceCan,
  WORKSPACE_PERMISSIONS as WS,
} from "@/utils/permissions";
import NotAMemberNotice from "@/components/WorkspaceChat/ChatContainer/NotAMemberNotice";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import NewWorkspaceModal from "@/components/Modals/NewWorkspace";

/**
 * The workspace Home opens its draft thread in. An instance operator can reach every
 * workspace but may only chat in the ones they are a member of, so a workspace they
 * can chat in is preferred over one they merely administer - landing on the latter
 * would greet them with a notice instead of an input.
 */
async function getTargetWorkspace() {
  const lastVisited = safeJsonParse(
    localStorage.getItem(LAST_VISITED_WORKSPACE)
  );
  if (lastVisited?.slug) {
    const workspace = await Workspace.bySlug(lastVisited.slug);
    if (workspace && workspaceCan(WS.CHAT, workspace.slug)) return workspace;
  }

  const workspaces = await Workspace.all();
  if (workspaces.length === 0) return null;
  return (
    workspaces.find((workspace) => workspaceCan(WS.CHAT, workspace.slug)) ??
    workspaces[0]
  );
}

export default function Home() {
  const { user } = useUser();
  const [workspace, setWorkspace] = useState(null);
  const [threadSlug, setThreadSlug] = useState(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const pendingFilesRef = useRef([]);

  useEffect(() => {
    async function init() {
      const ws = await getTargetWorkspace();
      if (ws) {
        const [suggestedMessages, { showAgentCommand }] = await Promise.all([
          Workspace.getSuggestedMessages(ws.slug),
          Workspace.agentCommandAvailable(ws.slug),
        ]);
        setWorkspace({
          ...ws,
          suggestedMessages,
          showAgentCommand,
        });
      }
      setWorkspaceLoading(false);
    }
    init();
  }, []);

  // When workspace/thread becomes available and we have pending files, trigger upload
  useEffect(() => {
    if (workspace && threadSlug && pendingFilesRef.current.length > 0) {
      const files = pendingFilesRef.current;
      pendingFilesRef.current = [];
      window.dispatchEvent(
        new CustomEvent(PASTE_ATTACHMENT_EVENT, { detail: { files } })
      );
    }
  }, [workspace, threadSlug]);

  // Handle paste events when no thread exists yet
  useEffect(() => {
    if (threadSlug) return;

    async function handlePaste(e) {
      const files = e.detail?.files;
      if (!files?.length) return;

      pendingFilesRef.current = files;
      if (!workspace) return;
      const { thread } = await Workspace.threads.new(workspace.slug);
      if (thread) setThreadSlug(thread.slug);
    }

    window.addEventListener(PASTE_ATTACHMENT_EVENT, handlePaste);
    return () =>
      window.removeEventListener(PASTE_ATTACHMENT_EVENT, handlePaste);
  }, [workspace, threadSlug]);

  async function handleDropWithWorkspace(acceptedFiles) {
    setDragging(false);
    pendingFilesRef.current = acceptedFiles;
    const { thread } = await Workspace.threads.new(workspace.slug);
    if (thread) setThreadSlug(thread.slug);
  }

  if (workspaceLoading) {
    return (
      <div
        style={{ height: "100%" }}
        className="transition-all duration-500 relative bg-zinc-900 light:bg-white w-full h-full overflow-hidden"
      />
    );
  }

  // Nothing to chat into. Members who cannot create workspaces are told to ask an
  // admin; everyone else is pointed at the button that makes one. Either way the prompt
  // box below is never rendered without a workspace behind it, which is what used to
  // cause a "My Workspace" to appear out of nowhere on someone's first message.
  if (!workspace) {
    return userIsChatOnly(user) ? <NoWorkspacesAssigned /> : <NoWorkspaceYet />;
  }

  if (workspace && threadSlug) {
    return (
      <DnDFileUploaderProvider workspace={workspace} threadSlug={threadSlug}>
        <HomeContent
          workspace={workspace}
          threadSlug={threadSlug}
          setThreadSlug={setThreadSlug}
        />
      </DnDFileUploaderProvider>
    );
  }

  return (
    <DndUploaderContext.Provider
      value={{
        files: [],
        ready: true,
        dragging,
        setDragging,
        onDrop: handleDropWithWorkspace,
        parseAttachments: () => [],
      }}
    >
      <HomeContent
        workspace={workspace}
        threadSlug={null}
        setThreadSlug={setThreadSlug}
      />
    </DndUploaderContext.Provider>
  );
}

function HomeContent({ workspace, threadSlug, setThreadSlug }) {
  const { t } = useTranslation();
  const { user } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { files, parseAttachments } = useContext(DndUploaderContext);

  // Home writes into a workspace, so it inherits that workspace's chat permission -
  // which an instance operator only holds where they are an actual member.
  const canChat = workspaceCan(WS.CHAT, workspace?.slug, user);

  useEffect(() => {
    if (!threadSlug) {
      window.dispatchEvent(
        new CustomEvent(PROMPT_INPUT_EVENT, {
          detail: { messageContent: "", writeMode: "replace" },
        })
      );
    }
  }, []);

  async function submitMessage(message, attachments = []) {
    if (!message || loading) return;
    setLoading(true);
    try {
      const targetWorkspace = workspace;
      let targetThread = threadSlug;

      if (!targetThread) {
        const { thread } = await Workspace.threads.new(targetWorkspace.slug);
        targetThread = thread?.slug;
        if (thread) setThreadSlug(thread.slug);
      }

      sessionStorage.setItem(
        PENDING_HOME_MESSAGE,
        JSON.stringify({ message, attachments })
      );

      // The message is replayed via PENDING_HOME_MESSAGE on the thread route -
      // drop the local draft so the sent text cannot be restored later.
      if (threadSlug || workspace?.slug)
        clearPromptInputDraft(threadSlug ?? workspace.slug);

      if (targetThread) {
        navigate(paths.workspace.thread(targetWorkspace.slug, targetThread));
      } else {
        navigate(paths.workspace.chat(targetWorkspace.slug));
      }
    } catch (error) {
      console.error("Error submitting message:", error);
      showToast("Failed to send message", "error");
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const currentMessage =
      document.getElementById(PROMPT_INPUT_ID)?.value?.trim() || "";
    await submitMessage(currentMessage, parseAttachments());
  }

  function sendCommand({
    text = "",
    autoSubmit = false,
    writeMode = "replace",
  }) {
    if (autoSubmit) {
      if (writeMode === "append") {
        const currentText =
          document.getElementById(PROMPT_INPUT_ID)?.value ?? "";
        text = currentText + text;
      }
      if (!text.trim()) return;
      submitMessage(text.trim());
      return;
    }
    window.dispatchEvent(
      new CustomEvent(PROMPT_INPUT_EVENT, {
        detail: { messageContent: text, writeMode },
      })
    );
  }

  return (
    <ChatSidebarProvider>
      <div
        style={{ height: "100%" }}
        className="relative flex w-full h-full z-2"
      >
        <div className="flex-1 min-w-0 transition-all duration-500 relative bg-zinc-900 light:bg-white w-full h-full overflow-hidden border-none light:border-solid light:border light:border-theme-modal-border">
          <div className="absolute z-30 hidden min-[1100px]:flex items-center justify-end top-2 left-3 right-3">
            <ChatSettingsMenu />
          </div>
          <DnDFileUploaderWrapper>
            {/* `min-h-full` rather than `h-full` so the inner column grows past the
                viewport instead of letting `justify-center` push content out of both
                ends of an unscrollable box - which clipped it beyond reach. */}
            <div className="h-full w-full overflow-y-auto">
              <div className="flex flex-col min-h-full w-full items-center justify-center py-6">
                <div className="flex flex-col items-center w-full max-w-[750px]">
                  <h1 className="text-theme-text-primary text-xl md:text-2xl mb-11 text-center">
                    {t("main-page.greeting")}
                  </h1>
                  {canChat ? (
                    <PromptInput
                      workspace={workspace}
                      submit={handleSubmit}
                      isStreaming={loading}
                      sendCommand={sendCommand}
                      attachments={files}
                      centered={true}
                      workspaceSlug={workspace?.slug}
                      threadSlug={threadSlug}
                    />
                  ) : (
                    <NotAMemberNotice />
                  )}
                </div>
                {canChat && (
                  <SuggestedMessages
                    suggestedMessages={workspace?.suggestedMessages}
                    sendCommand={sendCommand}
                  />
                )}
              </div>
            </div>
          </DnDFileUploaderWrapper>
        </div>
        <MemoriesSidebar workspace={workspace} />
      </div>
    </ChatSidebarProvider>
  );
}

/**
 * Shown to someone who can create workspaces but has none. The home screen used to
 * quietly create one called "My Workspace" the first time they typed; now the choice -
 * and the name - is theirs.
 */
function NoWorkspaceYet() {
  const { t } = useTranslation();
  const [showing, setShowing] = useState(false);

  return (
    <div
      style={{ height: "100%" }}
      className="transition-all duration-500 relative bg-zinc-900 light:bg-white w-full h-full overflow-hidden"
    >
      <div className="h-full w-full overflow-y-auto">
        <div className="flex flex-col min-h-full w-full items-center justify-center gap-y-4 p-6">
          <p className="text-theme-text-secondary text-sm text-center whitespace-pre-line">
            {t("home.noWorkspaces")}
          </p>
          <Button type="button" onClick={() => setShowing(true)}>
            <Plus className="h-4 w-4" />
            {t("new-workspace.title")}
          </Button>
        </div>
      </div>
      {showing && <NewWorkspaceModal hideModal={() => setShowing(false)} />}
    </div>
  );
}

function NoWorkspacesAssigned() {
  const { t } = useTranslation();
  return (
    <div
      style={{ height: "100%" }}
      className="transition-all duration-500 relative bg-zinc-900 light:bg-white w-full h-full overflow-hidden"
    >
      <div className="h-full w-full overflow-y-auto">
        <div className="flex flex-col min-h-full w-full items-center justify-center p-6">
          <p className="text-theme-text-secondary text-sm text-center whitespace-pre-line">
            {t("home.notAssigned")}
          </p>
        </div>
      </div>
    </div>
  );
}
