const { v4: uuidv4 } = require("uuid");
const {
  generateImageForWorkspace,
  isImageGenerationAvailable,
} = require("../../../ImageGenerators");
const { WorkspaceChats } = require("../../../../models/workspaceChats");

/** FLUX.1-schnell is text-to-image; it does not edit reference images. */
const generateImage = {
  name: "generate-image",
  startupConfig: { params: {} },
  plugin: function () {
    return {
      name: this.name,
      setup(aibitat) {
        aibitat.function({
          super: aibitat,
          name: this.name,
          description:
            "Generate a new image from a text description. Use when the user asks you to draw, illustrate, render, or create a picture. This skill creates images; it cannot edit an existing image.",
          examples: [
            {
              prompt: "Draw a red fox in the snow",
              call: JSON.stringify({ prompt: "a red fox in the snow" }),
            },
          ],
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description: "A detailed description of the image to create.",
              },
            },
            additionalProperties: false,
          },
          required: ["prompt"],
          handler: async function ({ prompt }) {
            if (!isImageGenerationAvailable())
              return "Image generation is unavailable on this instance.";

            const imagePrompt = String(prompt || "").trim();
            if (!imagePrompt)
              return "Provide a description of the image to create.";

            const pendingId = uuidv4();
            this.super.socket?.send?.("imageGenerationPending", {
              pendingId,
              prompt: imagePrompt,
            });

            try {
              const { storageFilename, filename, fileSize } =
                await generateImageForWorkspace({
                  prompt: imagePrompt,
                  signal: this.super.abortController?.signal ?? null,
                });
              const output = {
                type: "imageGenerationCard",
                payload: {
                  storageFilename,
                  filename,
                  fileSize,
                  prompt: imagePrompt,
                },
              };

              // The image endpoint authorizes reads from a persisted chat output.
              // Save the reference before asking the browser to load the card.
              if (
                this.super.trackedChatId &&
                !(await WorkspaceChats.appendOutput(
                  this.super.trackedChatId,
                  output
                ))
              )
                throw new Error("Could not attach the image to this chat.");

              if (!Array.isArray(this.super._pendingOutputs))
                this.super._pendingOutputs = [];
              this.super._pendingOutputs.push(output);
              this.super.socket?.send?.("imageGenerationCard", {
                pendingId,
                text: `Generated an image for: "${imagePrompt}"`,
                outputs: [output],
                chatId: this.super.trackedChatId ?? null,
              });
              return "The image has been created and shown to the user. Confirm it is ready in one short sentence.";
            } catch (error) {
              this.super.socket?.send?.("imageGenerationCard", {
                pendingId,
                text: error.message,
                failed: true,
              });
              const { isAbortError } = require("../../../helpers/abortSignals");
              if (isAbortError(error)) return "Image generation was cancelled.";
              this.super.handlerProps?.log?.(
                `generate-image failed: ${error.message}`
              );
              return `Tell the user the image could not be created: ${error.message}`;
            }
          },
        });
      },
    };
  },
};

module.exports = { generateImage };
