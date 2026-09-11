const {
  formatMessagesForTools,
  formatFunctionsToTools,
} = require("../../../../../../utils/agents/aibitat/providers/helpers/tooled.js");

describe("formatMessagesForTools attachment content (native tool path)", () => {
  it("sends audio attachments as input_audio and keeps images as image_url", () => {
    const [formatted] = formatMessagesForTools([
      {
        role: "user",
        content: "transcribe this",
        attachments: [
          {
            name: "clip.mp3",
            mime: "audio/mpeg",
            contentString: "data:audio/mpeg;base64,BBBB",
          },
          {
            name: "image.png",
            mime: "image/png",
            contentString: "data:image/png;base64,AAAA",
          },
        ],
      },
    ]);

    expect(formatted.content[1]).toEqual({
      type: "input_audio",
      input_audio: { data: "BBBB", format: "mp3" },
    });
    expect(formatted.content[2]).toEqual({
      type: "image_url",
      image_url: { url: "data:image/png;base64,AAAA" },
    });
  });

  it("detects audio from the data URI when mime is absent", () => {
    const [formatted] = formatMessagesForTools([
      {
        role: "user",
        content: "hi",
        attachments: [{ contentString: "data:audio/wav;base64,DDDD" }],
      },
    ]);

    expect(formatted.content[1]).toEqual({
      type: "input_audio",
      input_audio: { data: "DDDD", format: "wav" },
    });
  });
});

describe("formatFunctionsToTools parameter schemas", () => {
  const schemaWithPatterns = {
    type: "object",
    properties: {
      user: {
        type: "object",
        properties: {
          email: {
            type: "string",
            format: "email",
            pattern: "^(?!\\.)[A-Za-z0-9._]+@([A-Za-z0-9-]+\\.)+[A-Za-z]{2,}$",
            description: "Email address",
          },
          tags: {
            type: "array",
            items: { type: "string", pattern: "^[a-z]+$" },
          },
        },
        required: ["email"],
      },
    },
    required: ["user"],
  };

  it("strips every `pattern` a self-hosted backend would compile into a grammar", () => {
    const [tool] = formatFunctionsToTools([
      {
        name: "create_user_profile",
        description: "Creates a user profile",
        parameters: schemaWithPatterns,
      },
    ]);

    const { email, tags } = tool.function.parameters.properties.user.properties;
    expect(email.pattern).toBeUndefined();
    expect(tags.items.pattern).toBeUndefined();
    // Everything the model actually needs survives.
    expect(email.format).toBe("email");
    expect(email.description).toBe("Email address");
    expect(tool.function.parameters.properties.user.required).toEqual([
      "email",
    ]);
    expect(tool.function.parameters.required).toEqual(["user"]);
  });

  it("leaves the caller's schema untouched", () => {
    formatFunctionsToTools([
      { name: "t", description: "d", parameters: schemaWithPatterns },
    ]);
    expect(
      schemaWithPatterns.properties.user.properties.email.pattern
    ).toBeDefined();
  });
});
