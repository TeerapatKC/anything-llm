import { useTranslation } from "react-i18next";
import Workspace from "@/models/workspace";
import paths from "@/utils/paths";
import { SquarePen, Trash2 } from "lucide-react";
import { forwardRef, useEffect, useState } from "react";
import ThreadItem from "./ThreadItem";
import { Link, useNavigate, useParams } from "react-router-dom";
import useHoverMetaKey from "./hooks";
import {
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { THREAD_RENAME_EVENT, THREAD_FORK_EVENT } from "./constants";

export { THREAD_RENAME_EVENT, THREAD_FORK_EVENT };

export default function ThreadContainer({
  workspace,
  isVirtualThread = false,
}) {
  const navigate = useNavigate();
  const { threadSlug = null } = useParams();
  const [threads, setThreads] = useState([]);
  const [defaultThreadHasChats, setDefaultThreadHasChats] = useState(false);
  const [loading, setLoading] = useState(true);
  const { containerRef, ctrlPressed } = useHoverMetaKey(setThreads, !loading);

  useEffect(() => {
    const chatHandler = (event) => {
      const { threadSlug, newName } = event.detail;
      setThreads((prevThreads) =>
        prevThreads.map((thread) => {
          if (thread.slug === threadSlug) {
            return { ...thread, name: newName };
          }
          return thread;
        })
      );
    };

    window.addEventListener(THREAD_RENAME_EVENT, chatHandler);

    return () => {
      window.removeEventListener(THREAD_RENAME_EVENT, chatHandler);
    };
  }, []);

  // Handle new fork events from chat actions. Forking navigates via the router
  // now, so a blocked/cancelled navigation would otherwise leave the new thread
  // missing from this list until the next refetch.
  useEffect(() => {
    const forkHandler = () => {
      if (!workspace?.slug) return;
      Workspace.threads
        .all(workspace.slug)
        .then(({ threads }) => setThreads(threads))
        .catch((e) => console.error(e));
    };

    window.addEventListener(THREAD_FORK_EVENT, forkHandler);
    return () => {
      window.removeEventListener(THREAD_FORK_EVENT, forkHandler);
    };
  }, [workspace?.slug]);

  useEffect(() => {
    async function fetchThreads() {
      if (!workspace.slug) return;
      const { threads, defaultThreadChatCount } = await Workspace.threads.all(
        workspace.slug
      );
      setLoading(false);
      setThreads(threads);
      setDefaultThreadHasChats(defaultThreadChatCount > 0);
    }
    fetchThreads();
  }, [workspace.slug, threadSlug]);

  const toggleForDeletion = (id) => {
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        return { ...t, deleted: !t.deleted };
      })
    );
  };

  const handleDeleteAll = async () => {
    const slugs = threads.filter((t) => t.deleted === true).map((t) => t.slug);
    await Workspace.threads.deleteBulk(workspace.slug, slugs);
    setThreads((prev) => prev.filter((t) => !t.deleted));

    // Only redirect if current thread is being deleted. Use router navigation
    // so ActiveGenerationGuard can intercept if a response is generating.
    if (slugs.includes(threadSlug)) {
      navigate(paths.workspace.chat(workspace.slug));
    }
  };

  function removeThread(threadId) {
    setThreads((prev) =>
      prev.map((_t) => {
        if (_t.id !== threadId) return _t;
        return { ..._t, deleted: true };
      })
    );

    // Show thread was deleted, but then remove from threads entirely so it will
    // not appear in bulk-selection.
    setTimeout(() => {
      setThreads((prev) => prev.filter((t) => !t.deleted));
    }, 500);
  }

  if (loading) {
    return (
      <ThreadList>
        {Array.from({ length: 3 }).map((_, i) => (
          <SidebarMenuSubItem key={i} className="flex h-7 items-center px-2">
            <Skeleton className="h-3 w-full" />
          </SidebarMenuSubItem>
        ))}
      </ThreadList>
    );
  }

  // The new-thread action represents the virtual draft shown on Home. No
  // persisted thread is created until the first message is submitted.
  const newThreadIsActive =
    isVirtualThread || (!threadSlug && !defaultThreadHasChats);
  const defaultThreadIsActive =
    defaultThreadHasChats && !threadSlug && !newThreadIsActive;

  return (
    <ThreadList ref={containerRef}>
      <NewThreadButton workspace={workspace} isActive={newThreadIsActive} />
      {defaultThreadHasChats && (
        <ThreadItem
          isActive={defaultThreadIsActive}
          workspace={workspace}
          thread={{ slug: null, name: "default" }}
        />
      )}
      {threads.map((thread) => (
        <ThreadItem
          key={thread.slug}
          ctrlPressed={ctrlPressed}
          toggleMarkForDeletion={toggleForDeletion}
          isActive={!newThreadIsActive && thread.slug === threadSlug}
          workspace={workspace}
          onRemove={removeThread}
          thread={thread}
        />
      ))}
      <DeleteAllThreadButton
        ctrlPressed={ctrlPressed}
        threads={threads}
        onDelete={handleDeleteAll}
      />
    </ThreadList>
  );
}

/**
 * Threads sit as a flat, indented list under their workspace. The stock
 * `SidebarMenuSub` rule is dropped - the indent alone carries the nesting.
 * forwardRef because useHoverMetaKey attaches its listeners to this element.
 */
const ThreadList = forwardRef(({ children, ...props }, ref) => (
  <SidebarMenuSub
    ref={ref}
    aria-label="Threads"
    // pl-8 lines the thread rows up under the workspace label, which starts
    // after the row's p-2 + 18px monogram + gap-2.
    className="mx-0 gap-0.5 border-l-0 px-0 pb-1 pl-9 pr-0"
    {...props}
  >
    {children}
  </SidebarMenuSub>
));
ThreadList.displayName = "ThreadList";

function NewThreadButton({ workspace, isActive }) {
  const { t } = useTranslation();
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        isActive={isActive}
        className="h-9 text-sm text-sidebar-foreground/70"
        render={
          <Link
            to={paths.home()}
            aria-label={`Start a new thread in ${workspace.name}`}
            aria-current={isActive ? "page" : ""}
          />
        }
      >
        <SquarePen />
        <span>{t("ui.new-thread")}</span>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

function DeleteAllThreadButton({ ctrlPressed, threads, onDelete }) {
  const { t } = useTranslation();
  if (!ctrlPressed || threads.filter((t) => t.deleted).length === 0)
    return null;
  return (
    <SidebarMenuSubItem>
      {/* Deliberately not a SidebarMenuSubButton: that variant paints its own
          icon colour via `[&>svg]`, which ties with any override on source
          order rather than losing to it. */}
      <button
        type="button"
        onClick={onDelete}
        className="flex h-9 w-full min-w-0 items-center gap-2 rounded-md px-2 text-sm text-destructive outline-none ring-sidebar-ring hover:bg-destructive/10 focus-visible:ring-2"
      >
        <Trash2 className="size-4 shrink-0" />
        <span className="truncate">{t("ui.delete-selected")}</span>
      </button>
    </SidebarMenuSubItem>
  );
}
