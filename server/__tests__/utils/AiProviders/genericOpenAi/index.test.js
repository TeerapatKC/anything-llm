const {
  GenericOpenAiLLM,
} = require("../../../../utils/AiProviders/genericOpenAi");
const GenericOpenAiProvider = require("../../../../utils/agents/aibitat/providers/genericOpenAi.js");
const modelVision = require("../../../../utils/helpers/modelVision");

jest.mock("../../../../utils/helpers/modelVision", () => ({
  ...jest.requireActual("../../../../utils/helpers/modelVision"),
  modelSupportsVision: jest.fn(async () => true),
}));

const ORIGINAL_ENV = process.env;
const IMAGE = {
  name: "image.png",
  mime: "image/png",
  contentString: "data:image/png;base64,AAAA",
};

describe("images sent to a model that cannot view them", () => {
  afterEach(() => modelVision.modelSupportsVision.mockReset());

  function chatMessages() {
    return [
      { role: "system", content: "sys" },
      {
        role: "user",
        content: [
          { type: "text", text: "describe this" },
          { type: "image_url", image_url: { url: IMAGE.contentString } },
        ],
      },
    ];
  }

  it("chat completion drops images for a text-only model", async () => {
    modelVision.modelSupportsVision.mockResolvedValue(false);
    const provider = new GenericOpenAiLLM();
    const create = jest.fn(async () => ({
      choices: [{ message: { content: "ok" } }],
      usage: {},
    }));
    provider.openai = { chat: { completions: { create } } };

    await provider.getChatCompletion(chatMessages(), {});

    const sent = create.mock.calls[0][0].messages;
    expect(modelVision.modelSupportsVision).toHaveBeenCalledWith("test-model");
    expect(sent[1].content).toBe(
      `describe this\n\n${modelVision.IMAGE_OMITTED_NOTE}`
    );
  });

  it("chat completion keeps images for a vision model", async () => {
    modelVision.modelSupportsVision.mockResolvedValue(true);
    const provider = new GenericOpenAiLLM();
    const create = jest.fn(async () => ({
      choices: [{ message: { content: "ok" } }],
      usage: {},
    }));
    provider.openai = { chat: { completions: { create } } };

    await provider.getChatCompletion(chatMessages(), {});

    expect(create.mock.calls[0][0].messages[1].content[1].type).toBe(
      "image_url"
    );
  });

  it("does not look the model up when there are no images", async () => {
    const provider = new GenericOpenAiLLM();
    const create = jest.fn(async () => ({
      choices: [{ message: { content: "ok" } }],
      usage: {},
    }));
    provider.openai = { chat: { completions: { create } } };

    await provider.getChatCompletion([{ role: "user", content: "hi" }], {});

    expect(modelVision.modelSupportsVision).not.toHaveBeenCalled();
  });

  it("agent stream drops current and replayed images for a text-only model", async () => {
    modelVision.modelSupportsVision.mockResolvedValue(false);
    const provider = new GenericOpenAiProvider({ model: "qwen3.8-27b" });
    jest.spyOn(provider, "supportsNativeToolCalling").mockResolvedValue(true);
    const sentinel = new Error("stop after capturing the request");
    const create = jest.fn(async () => {
      throw sentinel;
    });
    provider._client = { chat: { completions: { create } } };
    jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      provider.stream([
        { role: "system", content: "sys" },
        { role: "user", content: "earlier /img", attachments: [IMAGE] },
        { role: "assistant", content: "here it is" },
        { role: "user", content: "now this", attachments: [IMAGE] },
      ])
    ).rejects.toBe(sentinel);

    const sent = create.mock.calls[0][0].messages;
    expect(sent.some((m) => Array.isArray(m.content))).toBe(false);
    expect(sent[1].content).toContain(modelVision.IMAGE_OMITTED_NOTE);
    expect(sent[3].content).toContain(modelVision.IMAGE_OMITTED_NOTE);
    console.error.mockRestore();
  });
});

function userContent(messages) {
  return messages.find((m) => m.role === "user").content;
}

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    GENERIC_OPEN_AI_BASE_PATH: "http://localhost:8080/v1",
    GENERIC_OPEN_AI_MODEL_PREF: "test-model",
  };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe("GenericOpenAiLLM attachment content", () => {
  /** @type {GenericOpenAiLLM} */
  let provider;
  beforeEach(() => (provider = new GenericOpenAiLLM()));

  it("returns plain string when no attachments", () => {
    const messages = provider.constructPrompt({ userPrompt: "hello" });
    expect(userContent(messages)).toBe("hello");
  });

  it("keeps image attachments as image_url (backward compatible)", () => {
    const messages = provider.constructPrompt({
      userPrompt: "describe this",
      attachments: [
        {
          name: "image.png",
          mime: "image/png",
          contentString: "data:image/png;base64,AAAA",
        },
      ],
    });
    expect(userContent(messages)).toEqual([
      { type: "text", text: "describe this" },
      {
        type: "image_url",
        image_url: { url: "data:image/png;base64,AAAA", detail: "high" },
      },
    ]);
  });

  it("formats audio attachments as input_audio with raw base64 + format", () => {
    const messages = provider.constructPrompt({
      userPrompt: "transcribe this",
      attachments: [
        {
          name: "clip.mp3",
          mime: "audio/mpeg",
          contentString: "data:audio/mpeg;base64,BBBB",
        },
        {
          name: "clip.wav",
          mime: "audio/wav",
          contentString: "data:audio/wav;base64,CCCC",
        },
      ],
    });
    expect(userContent(messages)).toEqual([
      { type: "text", text: "transcribe this" },
      { type: "input_audio", input_audio: { data: "BBBB", format: "mp3" } },
      { type: "input_audio", input_audio: { data: "CCCC", format: "wav" } },
    ]);
  });

  it("preserves attachment order when mixing audio and images", () => {
    const messages = provider.constructPrompt({
      userPrompt: "what is in these",
      attachments: [
        { mime: "audio/mpeg", contentString: "data:audio/mpeg;base64,BBBB" },
        { mime: "image/png", contentString: "data:image/png;base64,AAAA" },
        { mime: "audio/wav", contentString: "data:audio/wav;base64,CCCC" },
      ],
    });
    expect(userContent(messages).map((c) => c.type)).toEqual([
      "text",
      "input_audio",
      "image_url",
      "input_audio",
    ]);
  });

  it("detects audio from data URI when mime is absent", () => {
    const messages = provider.constructPrompt({
      userPrompt: "hi",
      attachments: [{ contentString: "data:audio/wav;base64,DDDD" }],
    });
    expect(userContent(messages)[1]).toEqual({
      type: "input_audio",
      input_audio: { data: "DDDD", format: "wav" },
    });
  });

  it("treats non-audio, non-image attachments as image_url (existing behavior)", () => {
    const messages = provider.constructPrompt({
      userPrompt: "hi",
      attachments: [
        {
          mime: "application/pdf",
          contentString: "data:application/pdf;base64,FFFF",
        },
      ],
    });
    expect(userContent(messages)[1].type).toBe("image_url");
  });
});

describe("GenericOpenAiProvider (agent) attachment content", () => {
  /** @type {GenericOpenAiProvider} */
  let provider;
  beforeEach(
    () => (provider = new GenericOpenAiProvider({ model: "test-model" }))
  );

  it("returns the message untouched when there are no attachments", () => {
    const message = { role: "user", content: "hello" };
    expect(provider.formatMessageWithAttachments(message)).toEqual(message);
    expect(
      provider.formatMessageWithAttachments({ ...message, attachments: [] })
    ).toEqual({ ...message, attachments: [] });
  });

  it("sends audio attachments as input_audio on the agent path", () => {
    const formatted = provider.formatMessageWithAttachments({
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
    });
    expect(formatted).toEqual({
      role: "user",
      content: [
        { type: "text", text: "transcribe this" },
        { type: "input_audio", input_audio: { data: "BBBB", format: "mp3" } },
        {
          type: "image_url",
          image_url: { url: "data:image/png;base64,AAAA" },
        },
      ],
    });
    expect(formatted).not.toHaveProperty("attachments");
  });

  it("detects audio from data URI when mime is absent", () => {
    const formatted = provider.formatMessageWithAttachments({
      role: "user",
      content: "hi",
      attachments: [{ contentString: "data:audio/wav;base64,DDDD" }],
    });
    expect(formatted.content[1]).toEqual({
      type: "input_audio",
      input_audio: { data: "DDDD", format: "wav" },
    });
  });
});
