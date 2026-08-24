/* eslint-env jest */
const {
  messageToSpeech,
} = require("../../../utils/TextToSpeech/messageToSpeech");

describe("messageToSpeech", () => {
  test("drops the reasoning block a model prepends to its answer", () => {
    const raw =
      '<think>The user sent "ทดสอบ" which is Thai for "test". I should reply in Thai.</think>สวัสดีครับ';
    expect(messageToSpeech(raw)).toBe("สวัสดีครับ");
  });

  test("drops other thought tag variants and unterminated blocks", () => {
    expect(messageToSpeech("<thinking>internal</thinking>answer")).toBe(
      "answer"
    );
    expect(messageToSpeech("answer<think>stream cut off here")).toBe("answer");
  });

  test("strips markdown emphasis, links and emoji", () => {
    const raw =
      "ผมคือ **Qwen** ครับ\n\n- ดูได้ที่ [เว็บไซต์](https://qwen.ai)\n\nมีอะไรให้ช่วยไหมครับ? 😊";
    expect(messageToSpeech(raw)).toBe(
      "ผมคือ Qwen ครับ ดูได้ที่ เว็บไซต์ มีอะไรให้ช่วยไหมครับ?"
    );
  });

  test("drops code blocks but keeps inline code content", () => {
    expect(messageToSpeech("Run ```const a = 1;``` now")).toBe("Run now");
    expect(messageToSpeech("Use `npm run dev` today")).toBe(
      "Use npm run dev today"
    );
  });

  test.each([
    ["", ""],
    [null, ""],
    [undefined, ""],
    ["<think>only reasoning</think>", ""],
  ])("returns an empty string for %p", (input, expected) => {
    expect(messageToSpeech(input)).toBe(expected);
  });
});
