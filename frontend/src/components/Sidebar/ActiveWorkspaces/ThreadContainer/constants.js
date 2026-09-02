/**
 * Fired when a thread is renamed - either by the chat auto-namer or from the
 * thread's own options menu. ThreadContainer listens and updates its list.
 *
 * Lives here rather than in ThreadContainer/index.jsx so ThreadItem can import
 * it without forming an import cycle with its own parent.
 */
export const THREAD_RENAME_EVENT = "renameThread";

/**
 * Fired after a chat is forked into a brand new thread. ThreadContainer
 * listens and refetches so the new thread shows up immediately - forking
 * navigates through the router now, and a navigation the
 * ActiveGenerationGuard blocks would otherwise leave the thread missing
 * from the sidebar until the next refetch.
 *
 * Lives here rather than in ThreadContainer/index.jsx so ChatHistory can
 * import it without pulling the whole sidebar tree in.
 */
export const THREAD_FORK_EVENT = "forkToThread";
