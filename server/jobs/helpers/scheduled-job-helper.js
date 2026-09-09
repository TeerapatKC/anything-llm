const { safeJsonParse } = require("../../utils/http");
const { stripThinkingFromText } = require("./index.js");

/**
 * Maximum time in milliseconds a scheduled job can run before being terminated.
 * @type {number}
 */
const SCHEDULED_JOB_TIMEOUT_MS =
  Number(process.env.SCHEDULED_JOB_TIMEOUT_MS) || 5 * 60 * 1000;

/**
 * Create a callback function for the agent action.
 * This is for intercepting messages from the agent and storing the results or thoughts, executions, traces, etc.
 * @returns {object}
 */
function agentActionCb() {
  const thoughts = [];
  const toolCalls = [];

  // Use a container object so the reference is preserved when values are updated
  const state = {
    textResponse: "",
    metrics: {},
  };

  const handler = {
    send(jsonStr) {
      const data = safeJsonParse(jsonStr, null);
      if (!data) return;

      if (data.type === "statusResponse" && data.content) {
        thoughts.push(data.content);
        return;
      }

      if (data.type === "reportStreamEvent" && data.content) {
        const inner = data.content;
        if (inner.type === "textResponseChunk" && inner.content)
          state.textResponse += inner.content;
        if (inner.type === "fullTextResponse" && inner.content)
          state.textResponse = inner.content;
        if (inner.type === "usageMetrics" && inner.metrics)
          state.metrics = inner.metrics;
        return;
      }

      // Final message from agent (onMessage event)
      if (data.content && data.from && data.from !== "USER") {
        if (!state.textResponse) state.textResponse = data.content;
      }
    },
    close() {},
  };

  return {
    /** Handler to intercept messages from the agent */
    handler,
    /** Thoughts from the agent @type {string[]} */
    thoughts,
    /** Tool calls from the agent @type {object[]} */
    toolCalls,
    /** State container for textResponse and metrics - access via state.textResponse and state.metrics */
    state,
  };
}

/**
 * Email every configured recipient (workspace members or specific users) once a
 * scheduled job run completes successfully. Never throws - a failed notification
 * email should never fail the run it's reporting on.
 * @param {object} job - The scheduled job object.
 * @param {string} textResponse - The text response from the agent.
 * @param {function} logFn - The function to log errors.
 * @returns {Promise<void>}
 */
async function sendScheduledJobResultEmails(job, textResponse, logFn) {
  try {
    if (!job.recipientType || job.recipientType === "none") return;

    const { ScheduledJob } = require("../../models/scheduledJob.js");
    const emails = await ScheduledJob.resolveRecipientEmails(job);
    if (emails.length === 0) return;

    const {
      sendScheduledJobResultEmail,
    } = require("../../utils/smtp/index.js");
    const resultText = stripThinkingFromText(textResponse);
    const { workspaceName } = await ScheduledJob.sourceLabel(job);

    await Promise.all(
      emails.map((to) =>
        sendScheduledJobResultEmail({
          to,
          jobName: job.name,
          resultText,
          workspaceName,
        })
      )
    );
  } catch (emailError) {
    logFn(`Failed to send result email: ${emailError.message}`);
  }
}

module.exports = {
  SCHEDULED_JOB_TIMEOUT_MS,
  agentActionCb,
  sendScheduledJobResultEmails,
};
