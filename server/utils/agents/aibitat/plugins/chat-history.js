const { WorkspaceChats } = require("../../../../models/workspaceChats");
const { WorkspaceThread } = require("../../../../models/workspaceThread");

/**
 * Plugin to save chat history to NexusAI DB.
 */
const chatHistory = {
  name: "chat-history",
  startupConfig: {
    params: {},
  },
  plugin: function () {
    return {
      name: this.name,
      setup: function (aibitat) {
        // If the agent is aborted (e.g. user sent /reset mid-response), skip
        // the pending save so a completing in-flight response doesn't reappear.
        aibitat.onAbort(() => {
          aibitat._aborted = true;
          this._revealPrompt(aibitat);
        });

        // A run that throws never reaches `_store`, so without this its prompt
        // stays behind `include: false` forever.
        aibitat.onError(() => this._revealPrompt(aibitat));

        // pre-register a workspace chat ID to secure it in the DB
        aibitat.onMessage(async (message) => {
          if (message.from !== "USER") return;

          /**
           * If we don't have a tracked chat ID, we need to create a new one so we can upsert the response later.
           * Normally, if this was a totally fresh chat from the user, we can assume that the message from the socket is
           * the message we want to store for the prompt. However, if this is a regeneration of a previous message and that message
           * called tools the history could include intermediate messages so need to search backwards to find the most recent user message
           * as that is actually the prompt.
           */
          if (!aibitat.trackedChatId) {
            let userMessage = message.content;
            if (userMessage.startsWith("@agent:")) {
              const lastUserMsgIndex = aibitat._chats.findLastIndex(
                (c) => c.from === "USER" && !c.content.startsWith("@agent:")
              );

              // When regenerating a message, we need to use the last user message as the prompt.
              // Also prune the chats array to only include the messages before target prompt to re-run
              // or else tool call results from the previous run will be included in the history and the model will not re-call tools
              // that previously worked for the to-be-regenerated prompt.
              if (lastUserMsgIndex !== -1) {
                userMessage = aibitat._chats[lastUserMsgIndex].content;
                aibitat._chats = aibitat._chats.slice(0, lastUserMsgIndex + 1);
              }
            }

            const { chat } = await WorkspaceChats.new({
              workspaceId: Number(aibitat.handlerProps.invocation.workspace_id),
              user: { id: aibitat.handlerProps.invocation.user_id || null },
              threadId: aibitat.handlerProps.invocation.thread_id || null,
              include: false,
              prompt: userMessage,
              response: {},
            });
            if (chat) aibitat.registerChatId(chat.id);
          }
        });

        aibitat.onMessage(async () => {
          try {
            if (aibitat._aborted) return;
            const lastResponses = aibitat.chats.slice(-2);
            if (lastResponses.length !== 2) return;
            const [prev, last] = lastResponses;

            // We need a full conversation reply with prev being from
            // the USER and the last being from anyone other than the user.
            if (prev.from !== "USER" || last.from === "USER") return;

            // Extract attachments from user message if present
            const attachments = prev.attachments || [];

            // If we have a post-reply flow we should save the chat using this special flow
            // so that post save cleanup and other unique properties can be run as opposed to regular chat.
            if (aibitat.hasOwnProperty("_replySpecialAttributes")) {
              await this._storeSpecial(aibitat, {
                prompt: prev.content,
                response: last.content,
                attachments,
                options: aibitat._replySpecialAttributes,
              });
              delete aibitat._replySpecialAttributes;
              return;
            }

            await this._store(aibitat, {
              prompt: prev.content,
              response: last.content,
              attachments,
            });
          } catch {}
        });
      },
      _store: async function (
        aibitat,
        { prompt, response, attachments = [] } = {}
      ) {
        const invocation = aibitat.handlerProps.invocation;
        const metrics = aibitat.providerInstance?.getCumulativeUsage?.() ?? {};
        const citations = aibitat._pendingCitations ?? [];
        const outputs = aibitat._pendingOutputs ?? [];
        const clarifyingQuestions =
          aibitat._pendingClarifyingQuestionSurveys ?? [];
        await WorkspaceChats.upsert(aibitat.trackedChatId, {
          workspaceId: Number(invocation.workspace_id),
          prompt,
          response: {
            text: response,
            sources: citations,
            type: "chat",
            attachments,
            metrics,
            ...(outputs.length > 0 ? { outputs } : {}),
            ...(clarifyingQuestions.length > 0 ? { clarifyingQuestions } : {}),
          },
          user: { id: invocation?.user_id || null },
          threadId: invocation?.thread_id || null,
          include: true,
        });

        if (!aibitat._threadRenamed) {
          aibitat._threadRenamed = await this._autoRenameThread(
            aibitat,
            prompt
          );
        }
        this._cleanup(aibitat);
      },
      _storeSpecial: async function (
        aibitat,
        { prompt, response, attachments = [], options = {} } = {}
      ) {
        const invocation = aibitat.handlerProps.invocation;
        const metrics = aibitat.providerInstance?.getCumulativeUsage?.() ?? {};
        const citations = aibitat._pendingCitations ?? [];
        const outputs = aibitat._pendingOutputs ?? [];
        const clarifyingQuestions =
          aibitat._pendingClarifyingQuestionSurveys ?? [];
        const existingSources = options?.sources ?? [];
        await WorkspaceChats.upsert(aibitat.trackedChatId, {
          workspaceId: Number(invocation.workspace_id),
          prompt,
          response: {
            sources: [...existingSources, ...citations],
            // when we have a _storeSpecial called the options param can include a storedResponse() function
            // that will override the text property to store extra information in, depending on the special type of chat.
            text: options.hasOwnProperty("storedResponse")
              ? options.storedResponse(response)
              : response,
            type: options?.saveAsType ?? "chat",
            attachments,
            metrics,
            ...(outputs.length > 0 ? { outputs } : {}),
            ...(clarifyingQuestions.length > 0 ? { clarifyingQuestions } : {}),
          },
          user: { id: invocation?.user_id || null },
          threadId: invocation?.thread_id || null,
          include: true,
        });

        if (!aibitat._threadRenamed) {
          aibitat._threadRenamed = await this._autoRenameThread(
            aibitat,
            prompt
          );
        }
        options?.postSave();
        this._cleanup(aibitat);
      },

      /**
       * Make the pre-registered prompt visible even though the run never produced
       * a reply.
       *
       * The row is written the moment the prompt arrives, but with
       * `include: false` - at that point it is only a placeholder holding an id
       * for the reply to be upserted onto, and both the thread history and the
       * LLM context query filter it out. A run that errors, is stopped, or loses
       * its socket never reaches `_store`, so that placeholder stayed hidden and
       * the prompt looked lost on the way back to the thread.
       *
       * The tracked id is deliberately left in place: if a reply does still land
       * afterwards, `_store` upserts onto this same row and replaces what is
       * written here.
       *
       * @param {import("../index").default} aibitat
       */
      _revealPrompt: async function (aibitat) {
        const chatId = aibitat.trackedChatId;
        if (!chatId || aibitat._promptRevealed) return;
        aibitat._promptRevealed = true;

        const invocation = aibitat.handlerProps?.invocation;
        if (!invocation) return;

        // Whatever the agent managed to say before it stopped, if anything.
        const partialReply = [...(aibitat.chats ?? [])]
          .reverse()
          .find((chat) => chat.from !== "USER" && !!chat.content);

        try {
          await WorkspaceChats.upsert(chatId, {
            workspaceId: Number(invocation.workspace_id),
            response: {
              text: partialReply?.content ?? "",
              sources: aibitat._pendingCitations ?? [],
              type: "chat",
              attachments: [],
              metrics: aibitat.providerInstance?.getCumulativeUsage?.() ?? {},
            },
            user: { id: invocation?.user_id || null },
            threadId: invocation?.thread_id || null,
            include: true,
          });
        } catch (error) {
          console.error(
            `[chat-history] could not reveal an unanswered prompt: ${error.message}`
          );
        }
      },

      _autoRenameThread: async function (aibitat, prompt) {
        const invocation = aibitat.handlerProps.invocation;
        if (!invocation?.thread_id) return true;

        const thread = await WorkspaceThread.get({ id: invocation.thread_id });
        if (!thread) return true;

        const { Workspace } = require("../../../../models/workspace");
        const workspace = await Workspace.get({ id: invocation.workspace_id });
        if (!workspace) return true;

        await WorkspaceThread.autoRenameThread({
          thread,
          workspace,
          user: invocation.user_id ? { id: invocation.user_id } : null,
          prompt,
          onRename: (updatedThread) => {
            aibitat.socket?.send("rename_thread", {
              slug: updatedThread.slug,
              name: updatedThread.name,
            });
          },
        });
        return true;
      },

      _cleanup: function (aibitat) {
        aibitat.clearCitations?.();
        aibitat._pendingOutputs = [];
        aibitat.clearClarifyingQuestionSurveys?.();
        aibitat.clearTrackedChatId();
      },
    };
  },
};

module.exports = { chatHistory };
