/**
 * In-chat memory capture.
 *
 * The background extractor (`jobs/extract-memories.js`) mines conversations on
 * a schedule, which is right for facts a person mentions in passing but wrong
 * for the one case where they say "remember that I'm called Bhumi": the model
 * answers "saved!", nothing is written, and the memory only appears hours
 * later, if at all. This module closes that gap by writing the memory during
 * the turn the person asked for it.
 *
 * It is deliberately narrow. A cheap keyword gate runs first, so the extra LLM
 * call only happens on turns that actually look like a request to remember or
 * forget something - every other turn costs nothing. The model that follows
 * still gets to say "no", so the gate can afford to be generous.
 */
const { Memory } = require("../../models/memory");
const { resolveMemoryLLM } = require("./llm");

/**
 * Turns that look like an explicit instruction to remember or forget.
 *
 * Written per language rather than as one clever pattern, because the phrasings
 * do not line up: English leads with a verb, Thai wraps the object inside
 * `จำ...ไว้`, Japanese puts the verb last. A false positive here costs one
 * model call that returns "don't save"; a false negative silently drops the
 * feature, so these lean permissive.
 */
const CAPTURE_INTENT_PATTERNS = [
  /\b(remember|memorize|keep in mind|make a note|take note|note that|don'?t forget|do not forget|forget (that|about)|stop remembering)\b/i,
  /จดจำ|จำไว้|จำเอาไว้|จำ.{0,10}ไว้|จำว่า|บันทึกไว้|อย่าลืม|ลืมว่า|เลิกจำ/,
  /覚え(て|と)|記憶し|忘れないで|忘れて/,
];

const CAPTURE_SYSTEM_PROMPT = `You decide whether a chat message contains an explicit instruction from the user to remember a fact about themselves.

Save ONLY when the user directly asked to be remembered - "remember that...", "keep in mind...", "don't forget...". Do not save facts the user merely mentioned in passing; a separate background process handles those.

When you do save:
- Write the memory as one short third-person sentence stating the fact, not the request. "The user's name is Bhumi", never "Remember that my name is Bhumi".
- Write it in the same language the user used.
- Choose GLOBAL if the fact would help in any workspace (their name, role, language, communication preferences). Choose WORKSPACE if it only matters for this project.
- Do not restate anything already listed under existing memories.

Do NOT save when the user asked you to FORGET something, when the request is about the assistant's behaviour rather than a fact about the user, or when nothing was actually stated.

You MUST call the capture-memory tool exactly once, with save set to false if none of the above applies.`;

/**
 * True when the message is worth spending a model call on.
 * @param {string} message
 * @returns {boolean}
 */
function looksLikeCaptureRequest(message) {
  if (typeof message !== "string" || message.trim().length === 0) return false;
  return CAPTURE_INTENT_PATTERNS.some((re) => re.test(message));
}

/**
 * Ask the model whether this turn should produce a memory, and what it says.
 * Returns null when the tool was never called, which is how a model that
 * cannot make tool calls at all shows up here.
 * @returns {Promise<{save: boolean, content: string, scope: "WORKSPACE"|"GLOBAL"}|null>}
 */
async function askForMemory({ provider, model, userMessage }) {
  const AIbitat = require("../agents/aibitat/index.js");
  let decision = null;
  const aibitat = new AIbitat({ provider, model, maxRounds: 3 });

  aibitat
    .function({
      name: "capture-memory",
      description:
        "Record the outcome of reviewing this turn. Always call this exactly once.",
      parameters: {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "object",
        properties: {
          save: {
            type: "boolean",
            description:
              "true only when the user explicitly asked to remember a fact about themselves.",
          },
          content: {
            type: "string",
            description:
              "The memory as one short third-person sentence. Empty string when save is false.",
          },
          scope: {
            type: "string",
            enum: ["WORKSPACE", "GLOBAL"],
            description:
              "GLOBAL for facts useful in any workspace, WORKSPACE for project-specific facts.",
          },
        },
        required: ["save", "content", "scope"],
        additionalProperties: false,
      },
      handler: function (args) {
        if (
          typeof args?.save === "boolean" &&
          typeof args?.content === "string" &&
          ["WORKSPACE", "GLOBAL"].includes(args?.scope)
        )
          decision = args;
        aibitat.skipHandleExecution = true;
        return "Reviewed.";
      },
    })
    .agent("USER", { role: "Provides one chat turn for review." })
    .agent("CAPTURE", {
      role: CAPTURE_SYSTEM_PROMPT,
      functions: ["capture-memory"],
    });

  await aibitat.start({ from: "USER", to: "CAPTURE", content: userMessage });
  return decision;
}

/**
 * Build the review message: what the user said, plus what is already remembered
 * so the model does not write the same fact twice.
 */
function buildCaptureMessage({ prompt, globalMemories, workspaceMemories }) {
  const list = (memories) =>
    memories.length === 0
      ? "None."
      : memories.map((m) => `- ${m.content}`).join("\n");

  return [
    `User: ${prompt}`,
    `Existing GLOBAL memories:\n${list(globalMemories)}`,
    `Existing WORKSPACE memories:\n${list(workspaceMemories)}`,
  ].join("\n\n");
}

/**
 * Write a memory for a turn where the user asked to be remembered.
 *
 * Safe to start before the chat answer is generated and await afterwards - the
 * decision only reads the user's own message, so it runs alongside retrieval
 * and generation instead of adding its round trip to the end of the turn.
 *
 * Never throws: a failure here must not take down the chat turn that triggered
 * it, so every path resolves to false and logs instead.
 *
 * @param {Object} params
 * @param {Object|null} params.user - the requesting user, carrying their preferences
 * @param {import("@prisma/client").workspaces} params.workspace
 * @param {string} params.prompt - what the user said this turn
 * @returns {Promise<boolean>} whether a memory was actually written
 */
async function captureMemoryFromTurn({ user, workspace, prompt }) {
  try {
    if (!workspace?.id) return false;
    if (!looksLikeCaptureRequest(prompt)) return false;

    // Only the instance policy and the person's own preference gate this. The
    // automatic-extraction switch deliberately does not: that one governs
    // background mining of things said in passing, and someone who turned it
    // off to stop the LLM spend still means it when they say "remember this".
    if (!(await Memory.enabledForUser(user))) return false;

    const llm = resolveMemoryLLM(workspace);
    if (!llm) return false;

    const userId = user?.id ?? null;
    const [globalMemories, workspaceMemories] = await Promise.all([
      Memory.globalForUser(userId),
      Memory.forUserWorkspace(userId, workspace.id),
    ]);

    const decision = await askForMemory({
      ...llm,
      userMessage: buildCaptureMessage({
        prompt,
        globalMemories,
        workspaceMemories,
      }),
    });
    // Logged rather than returned quietly: "the model said no" and "the model
    // never called the tool" produce the same empty result here, and without a
    // line saying which, a turn that should have been remembered looks
    // identical to one the feature was never asked about.
    if (!decision) {
      console.log(
        `[Memory Capture] ${llm.model} did not call the tool for: "${prompt}"`
      );
      return false;
    }
    if (!decision.save || decision.content.trim().length === 0) {
      console.log(`[Memory Capture] Declined to save: "${prompt}"`);
      return false;
    }

    const scope = decision.scope === "GLOBAL" ? "global" : "workspace";
    const { memory, message } = await Memory.create({
      userId,
      workspaceId: scope === "global" ? null : workspace.id,
      scope,
      content: decision.content.trim(),
    });

    if (!memory) {
      console.log(`[Memory Capture] Not saved: ${message}`);
      return false;
    }
    console.log(`[Memory Capture] Saved ${scope} memory: "${memory.content}"`);
    return true;
  } catch (error) {
    console.error("[Memory Capture] Error:", error.message);
    return false;
  }
}

module.exports = { captureMemoryFromTurn, looksLikeCaptureRequest };
