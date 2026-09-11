const fs = require("fs/promises");
const path = require("path");
const { isSendingEnabled, sendSystemMail } = require("../../../smtp");
const { humanFileSize } = require("../../../helpers");
const filesystem = require("./filesystem/lib.js");
const createFilesLib = require("./create-files/lib.js");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SELF_ALIASES = new Set(["me", "myself", "my email", "my own email"]);

// Kept comfortably under the ~25MB most SMTP relays cap a message at once
// base64 encoding inflates the raw bytes by roughly a third.
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 20 * 1024 * 1024;

/**
 * The signed-in chat user's own email, so "send this to me" can be resolved
 * without asking the user to type their own address. `handlerProps.invocation`
 * only carries a `user_id` for a real logged-in chat session - ephemeral agents
 * (scheduled jobs, the developer API, Telegram/LINE) have no user, so this
 * returns null there and the handler falls back to asking for an address.
 * @param {object} aibitat
 * @returns {Promise<string|null>}
 */
async function resolveCurrentUserEmail(aibitat) {
  try {
    const userId = aibitat?.handlerProps?.invocation?.user_id;
    if (!userId) return null;
    const { User } = require("../../../../models/user");
    const user = await User.get({ id: Number(userId) });
    return user?.email || null;
  } catch {
    return null;
  }
}

/**
 * Resolves one attachment reference to an actual, existence-checked file. Two
 * sources are supported so the model can attach either kind of file it has
 * access to:
 *  - a generated-file reference handed back by create-files-agent, e.g.
 *    "pdf-<uuid>.pdf" - resolved (and format-validated) via createFilesLib.
 *  - a path inside the filesystem-agent's storage/nexusai-fs sandbox -
 *    resolved (and boundary-checked) via the same validatePath the
 *    filesystem skills use, so this can never read outside that sandbox.
 * @param {string} reference
 * @returns {Promise<{filename: string, size: number, path?: string, content?: Buffer}|null>}
 */
async function resolveAttachment(reference) {
  const generated = await createFilesLib.getGeneratedFile(reference);
  if (generated) {
    return {
      filename: path.basename(generated.storagePath),
      content: generated.buffer,
      size: generated.buffer.length,
    };
  }

  try {
    const validated = await filesystem.validatePath(reference);
    const stat = await fs.stat(validated);
    if (!stat.isFile()) return null;
    return { filename: path.basename(validated), path: validated, size: stat.size };
  } catch {
    return null;
  }
}

const sendEmail = {
  name: "send-email",
  startupConfig: {
    params: {},
  },
  plugin: function () {
    return {
      name: this.name,
      setup(aibitat) {
        aibitat.function({
          super: aibitat,
          name: this.name,
          description:
            'Send an email through the instance\'s configured SMTP server, optionally with file attachments. Use only when the user explicitly asks you to send or email something to someone. If the user asks you to send something to themselves (e.g. "email me", "send this to my email"), pass the literal word "me" as the recipient instead of asking them for their address - it resolves to their own account email automatically. To attach a file, use the exact attachment reference a previous tool call gave you: create-files-agent tools return one after generating a document (e.g. "pdf-<uuid>.pdf"), or use a path a filesystem-agent tool already showed you. Never guess a reference.',
          examples: [
            {
              prompt: "Email jane@example.com and tell her the report is ready",
              call: JSON.stringify({
                to: "jane@example.com",
                subject: "Report is ready",
                message: "Hi Jane,\n\nThe report is ready for review.\n",
              }),
            },
            {
              prompt: "Summarize this chat and email it to me",
              call: JSON.stringify({
                to: "me",
                subject: "Chat summary",
                message: "Hi,\n\nHere is the summary...\n",
              }),
            },
            {
              prompt:
                'Create a PDF of this report and email it to jane@example.com (after a create-files-agent tool returned reference "pdf-1a2b3c4d.pdf")',
              call: JSON.stringify({
                to: "jane@example.com",
                subject: "Your report",
                message: "Hi Jane,\n\nPlease find the report attached.\n",
                attachments: [
                  { reference: "pdf-1a2b3c4d.pdf", filename: "report.pdf" },
                ],
              }),
            },
          ],
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              to: {
                type: "string",
                description:
                  'Recipient email address. Multiple recipients may be comma-separated. Use the literal word "me" to mean the current user\'s own email.',
              },
              subject: {
                type: "string",
                description: "The email's subject line.",
              },
              message: {
                type: "string",
                description: "The plain-text body of the email.",
              },
              attachments: {
                type: "array",
                description:
                  "Optional files to attach. Each item's `reference` must be the exact string a previous tool call gave you - either a create-files-agent attachment reference (e.g. \"pdf-<uuid>.pdf\") or a filesystem-agent path. Never invent a reference that wasn't returned by an earlier tool call.",
                items: {
                  type: "object",
                  properties: {
                    reference: {
                      type: "string",
                      description:
                        "The exact attachment reference or filesystem path from a previous tool call.",
                    },
                    filename: {
                      type: "string",
                      description:
                        "Optional friendlier filename to show the recipient instead of the raw reference.",
                    },
                  },
                  required: ["reference"],
                  additionalProperties: false,
                },
              },
            },
            required: ["to", "subject", "message"],
            additionalProperties: false,
          },
          handler: async function ({ to, subject, message, attachments = [] }) {
            try {
              if (!isSendingEnabled())
                return "Email sending is unavailable - SMTP has not been configured and enabled for this instance. Let the user know an admin needs to set it up first in Settings.";

              const rawRecipients = String(to || "")
                .split(",")
                .map((email) => email.trim())
                .filter(Boolean);
              if (rawRecipients.length === 0)
                return "No recipient email address was provided.";

              let myEmail; // resolved lazily - only looked up if "me" is actually used
              const resolved = [];
              for (const raw of rawRecipients) {
                if (!SELF_ALIASES.has(raw.toLowerCase())) {
                  resolved.push(raw);
                  continue;
                }
                if (myEmail === undefined)
                  myEmail = await resolveCurrentUserEmail(this.super);
                if (!myEmail)
                  return "I don't have an email address on file for the current user. Ask them for the email address to send this to.";
                resolved.push(myEmail);
              }
              const recipients = [...new Set(resolved)];

              const invalid = recipients.filter(
                (email) => !EMAIL_PATTERN.test(email)
              );
              if (invalid.length > 0)
                return `"${invalid.join(", ")}" is not a valid email address. Confirm the recipient's address with the user.`;

              if (!subject || !String(subject).trim())
                return "An email subject is required.";
              if (!message || !String(message).trim())
                return "An email body is required.";

              const mailAttachments = [];
              if (Array.isArray(attachments) && attachments.length > 0) {
                const missing = [];
                let totalSize = 0;
                for (const item of attachments) {
                  const reference =
                    typeof item === "string" ? item : item?.reference;
                  if (!reference) continue;

                  const file = await resolveAttachment(reference);
                  if (!file) {
                    missing.push(reference);
                    continue;
                  }
                  if (file.size > MAX_ATTACHMENT_BYTES)
                    return `"${reference}" is ${humanFileSize(file.size)}, which is over the ${humanFileSize(MAX_ATTACHMENT_BYTES)} per-file attachment limit.`;

                  totalSize += file.size;
                  if (totalSize > MAX_TOTAL_ATTACHMENT_BYTES)
                    return `The attachments together are over the ${humanFileSize(MAX_TOTAL_ATTACHMENT_BYTES)} combined limit. Attach fewer or smaller files.`;

                  const filename =
                    (typeof item === "object" && item?.filename) ||
                    file.filename;
                  mailAttachments.push({
                    filename,
                    ...(file.path
                      ? { path: file.path }
                      : { content: file.content }),
                  });
                }
                if (missing.length > 0)
                  return `Could not find attachment(s): ${missing.join(", ")}. Use the exact reference a previous tool call gave you.`;
              }

              if (this.super.requestToolApproval) {
                const approval = await this.super.requestToolApproval({
                  skillName: this.name,
                  payload: {
                    to: recipients.join(", "),
                    subject: subject.trim(),
                    ...(mailAttachments.length > 0 && {
                      attachments: mailAttachments
                        .map((a) => a.filename)
                        .join(", "),
                    }),
                  },
                  description: `Send an email to ${recipients.join(", ")} - "${subject.trim()}"${mailAttachments.length > 0 ? ` with ${mailAttachments.length} attachment(s)` : ""}`,
                });
                if (!approval.approved) {
                  this.super.introspect(
                    `${this.caller}: User rejected the ${this.name} request.`
                  );
                  return approval.message;
                }
              }

              this.super.introspect(
                `${this.caller}: Sending an email to ${recipients.join(", ")}`
              );
              const results = await Promise.all(
                recipients.map((recipient) =>
                  sendSystemMail({
                    to: recipient,
                    subject: subject.trim(),
                    text: message,
                    attachments: mailAttachments,
                  })
                )
              );

              const failed = recipients.filter((_, i) => !results[i].sent);
              if (failed.length === recipients.length) {
                const reason = results[0]?.reason || "unknown error";
                this.super.introspect(
                  `${this.caller}: Failed to send email - ${reason}`
                );
                return `Failed to send the email: ${reason}`;
              }
              if (failed.length > 0) {
                const sent = recipients.filter((r) => !failed.includes(r));
                return `Email sent to ${sent.join(", ")}. Failed to send to: ${failed.join(", ")}.`;
              }
              return `Email sent successfully to ${recipients.join(", ")}.`;
            } catch (error) {
              const errorMessage = error?.message ?? JSON.stringify(error);
              this.super.handlerProps.log(`Send Email Error: ${errorMessage}`);
              this.super.introspect(
                `${this.caller}: Send Email Error: ${errorMessage}`
              );
              return `There was an error while sending the email: ${errorMessage}`;
            }
          },
        });
      },
    };
  },
};

module.exports = {
  sendEmail,
};
