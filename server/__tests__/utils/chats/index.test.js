/* eslint-env jest, node */
const { grepCommand, grepAllSlashCommands } = require("../../../utils/chats");
const { SlashCommandPresets } = require("../../../models/slashCommandsPresets");

jest.mock("../../../models/slashCommandsPresets");

// Helper to shape preset rows the way the model returns them.
const preset = (command, prompt) => ({ command, prompt });
const workspace = { id: 7 };

describe("grepCommand", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the built-in command when the message starts with it", async () => {
    SlashCommandPresets.forWorkspace.mockResolvedValue([]);
    expect(await grepCommand("/reset", workspace)).toBe("/reset");
    expect(await grepCommand("/RESET now", workspace)).toBe("/reset"); // case-insensitive
  });

  it("returns the message unchanged when no command matches", async () => {
    SlashCommandPresets.forWorkspace.mockResolvedValue([]);
    expect(await grepCommand("hello there", workspace)).toBe("hello there");
  });

  describe("preset expansion", () => {
    beforeEach(() => {
      SlashCommandPresets.forWorkspace.mockResolvedValue([
        preset("/weather", "what is the weather?"),
      ]);
    });

    it("expands a command at the start of the message", async () => {
      expect(await grepCommand("/weather", workspace)).toBe(
        "what is the weather?"
      );
    });

    it("expands a command that follows other text and a space", async () => {
      expect(await grepCommand("ok, /weather", workspace)).toBe(
        "ok, what is the weather?"
      );
    });

    it("expands a command with trailing punctuation", async () => {
      expect(await grepCommand("/weather?", workspace)).toBe(
        "what is the weather??"
      );
    });

    it("does not expand a command that is part of a longer word", async () => {
      expect(await grepCommand("/weatherman", workspace)).toBe("/weatherman");
    });

    it("does not expand a command glued to the end of a word", async () => {
      expect(await grepCommand("foo/weather", workspace)).toBe("foo/weather");
    });
  });

  it("expands multiple presets in a single message", async () => {
    SlashCommandPresets.forWorkspace.mockResolvedValue([
      preset("/weather", "the weather"),
      preset("/time", "the time"),
    ]);
    expect(await grepCommand("/weather and /time", workspace)).toBe(
      "the weather and the time"
    );
  });

  it("scopes preset lookup to the workspace being chatted in", async () => {
    SlashCommandPresets.forWorkspace.mockResolvedValue([]);
    await grepCommand("hi", workspace);
    expect(SlashCommandPresets.forWorkspace).toHaveBeenCalledWith(7);
  });

  it("expands nothing when there is no workspace in context", async () => {
    SlashCommandPresets.forWorkspace.mockResolvedValue([]);
    expect(await grepCommand("/weather", null)).toBe("/weather");
    expect(SlashCommandPresets.forWorkspace).toHaveBeenCalledWith(undefined);
  });
});

describe("grepAllSlashCommands", () => {
  beforeEach(() => jest.clearAllMocks());

  it("expands presets available to the workspace the API call targets", async () => {
    SlashCommandPresets.forWorkspace.mockResolvedValue([
      preset("/weather", "what is the weather?"),
    ]);
    expect(await grepAllSlashCommands("ok, /weather?", workspace)).toBe(
      "ok, what is the weather??"
    );
    expect(SlashCommandPresets.forWorkspace).toHaveBeenCalledWith(7);
  });

  it("does not expand a command that is part of a longer word", async () => {
    SlashCommandPresets.forWorkspace.mockResolvedValue([
      preset("/weather", "what is the weather?"),
    ]);
    expect(await grepAllSlashCommands("/weatherman", workspace)).toBe(
      "/weatherman"
    );
  });

  it("expands multiple presets in a single message", async () => {
    SlashCommandPresets.forWorkspace.mockResolvedValue([
      preset("/weather", "the weather"),
      preset("/time", "the time"),
    ]);
    expect(await grepAllSlashCommands("/weather and /time", workspace)).toBe(
      "the weather and the time"
    );
  });
});
