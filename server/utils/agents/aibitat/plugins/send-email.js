const { isSendingEnabled, sendSystemMail } = require("../../../smtp");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SELF_ALIASES = new Set(["me", "myself", "my email", "my own email"]);

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
            'Send an email through the instance\'s configured SMTP server. Use only when the user explicitly asks you to send or email something to someone. If the user asks you to send something to themselves (e.g. "email me", "send this to my email"), pass the literal word "me" as the recipient instead of asking them for their address - it resolves to their own account email automatically.',
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
            },
            required: ["to", "subject", "message"],
            additionalProperties: false,
          },
          handler: async function ({ to, subject, message }) {
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

              if (this.super.requestToolApproval) {
                const approval = await this.super.requestToolApproval({
                  skillName: this.name,
                  payload: {
                    to: recipients.join(", "),
                    subject: subject.trim(),
                  },
                  description: `Send an email to ${recipients.join(", ")} - "${subject.trim()}"`,
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
