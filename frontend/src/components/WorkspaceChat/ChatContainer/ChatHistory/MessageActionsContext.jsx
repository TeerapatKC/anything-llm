import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const EDIT_EVENT = "toggle-message-edit";
const DELETE_EVENT = "delete-message";

const MessageActionsContext = createContext(null);

/**
 * Provider that centralizes edit/delete event listeners for all messages.
 * Instead of each message registering its own window listener (O(n) listeners),
 * this provider registers just 2 listeners total and dispatches to messages via context.
 *
 * Messages are addressed by `messageKey`, not by `chatId`: a prompt has no chatId
 * until its answer completes and the pair is written, so keying on chatId left every
 * message of an in-flight or failed turn sharing the same `null` identity.
 */
export function MessageActionsProvider({ children }) {
  const [editingMessage, setEditingMessage] = useState(null);
  const [deletedMessages, setDeletedMessages] = useState(new Set());

  useEffect(() => {
    function handleEditEvent(e) {
      const { messageKey, role } = e.detail;
      if (!messageKey || !role) return;

      setEditingMessage((prev) => {
        if (prev?.messageKey === messageKey && prev?.role === role) {
          return null;
        }
        return { messageKey, role };
      });
    }

    function handleDeleteEvent(e) {
      const { chatId } = e.detail;
      if (!chatId) return;

      setDeletedMessages((prev) => {
        const next = new Set(prev);
        next.add(chatId);
        return next;
      });
    }

    window.addEventListener(EDIT_EVENT, handleEditEvent);
    window.addEventListener(DELETE_EVENT, handleDeleteEvent);

    return () => {
      window.removeEventListener(EDIT_EVENT, handleEditEvent);
      window.removeEventListener(DELETE_EVENT, handleDeleteEvent);
    };
  }, []);

  const isEditing = useCallback(
    (messageKey, role) => {
      if (!messageKey) return false;
      return (
        editingMessage?.messageKey === messageKey &&
        editingMessage?.role === role
      );
    },
    [editingMessage]
  );

  const isDeleted = useCallback(
    (chatId) => {
      return deletedMessages.has(chatId);
    },
    [deletedMessages]
  );

  const clearEditing = useCallback(() => {
    setEditingMessage(null);
  }, []);

  return (
    <MessageActionsContext.Provider
      value={{ editingMessage, isEditing, isDeleted, clearEditing }}
    >
      {children}
    </MessageActionsContext.Provider>
  );
}

export function useMessageActionsContext() {
  return useContext(MessageActionsContext);
}

export { EDIT_EVENT, DELETE_EVENT };
