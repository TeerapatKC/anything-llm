/**
 * Fired when a thread is renamed - either by the chat auto-namer or from the
 * thread's own options menu. ThreadContainer listens and updates its list.
 *
 * Lives here rather than in ThreadContainer/index.jsx so ThreadItem can import
 * it without forming an import cycle with its own parent.
 */
export const THREAD_RENAME_EVENT = "renameThread";
