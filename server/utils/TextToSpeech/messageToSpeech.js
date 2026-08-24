const { stripThinkingFromText } = require("../helpers");

/**
 * Convert a stored chat response into plain text suitable for a TTS engine.
 *
 * What we persist for an assistant message is the *raw* model output: any
 * reasoning the model emitted wrapped in `<think>` tags, plus Markdown. The
 * chat UI hides the reasoning block and renders the Markdown, but the TTS
 * endpoints used to hand that raw string straight to the provider - so the
 * engine read the (usually English) reasoning aloud before the actual answer,
 * which sounds like the message being spoken twice, and read Markdown markers
 * such as `**` literally.
 *
 * This mirrors `frontend/src/utils/chat/messageToSpeech.js`, which does the
 * same cleanup for the browser-native and Piper paths that speak on the client.
 * Keep the two in sync.
 *
 * @param {string} message - The raw stored message body.
 * @returns {string} A plain-text string suitable for TTS.
 */
function messageToSpeech(message = "") {
  if (typeof message !== "string" || message.length === 0) return "";

  // Reasoning blocks are internal model output and never part of the answer.
  // `stripThinkingFromText` handles the complete `<think>`/`<thought>`/... tags -
  // an unterminated block (an interrupted stream) is dropped here too.
  let text = stripThinkingFromText(message);
  text = text.replace(
    /<(?:think|thinking|thought|thought_chain)>[\s\S]*$/gi,
    " "
  );

  // Fenced code blocks: reading code aloud is rarely useful.
  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/~~~[\s\S]*?~~~/g, " ");

  // Strip inline code wrappers but keep the text inside.
  text = text.replace(/`([^`]*)`/g, "$1");

  // Images: drop entirely - there's nothing useful to speak.
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");

  // Links: keep the visible label, drop the URL.
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

  // Reference-style link definitions: drop the URL line entirely.
  text = text.replace(/^\s*\[[^\]]+\]:\s*\S+.*$/gm, "");

  // Heading markers (`#`, `##`, ...): keep the heading text only.
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, "");

  // Blockquote markers (`>`): drop the leading marker.
  text = text.replace(/^\s{0,3}>\s?/gm, "");

  // List markers (`-`, `*`, `+`, `1.`, `12)`): keep the item text.
  text = text.replace(/^\s*[-*+]\s+/gm, "");
  text = text.replace(/^\s*\d+[.)]\s+/gm, "");

  // Horizontal rules: drop entirely.
  text = text.replace(/^\s{0,3}(?:[-*_]\s*){3,}\s*$/gm, " ");

  // Emphasis - longer markers first so no marker is ever read aloud.
  text = text.replace(/(\*\*\*|___)([^*_]+)\1/g, "$2");
  text = text.replace(/(\*\*|__)([^*_]+)\1/g, "$2");
  text = text.replace(/(\*|_)([^*_\n]+)\1/g, "$2");
  text = text.replace(/~~([^~]+)~~/g, "$1");

  // Tables: pipes become commas so rows read naturally, alignment row dropped.
  text = text.replace(/^\s*\|?\s*[:\-\s|]+\|[:\-\s|]+\s*$/gm, "");
  text = text.replace(/\|/g, ", ");

  // HTML tags: strip but keep their text content.
  text = text.replace(/<\/?[^>]+>/g, " ");

  // Emoji and other pictographs: engines either name them out loud
  // ("smiling face") or choke on them - neither is wanted in speech.
  text = text.replace(
    /[\p{Extended_Pictographic}\p{Regional_Indicator}](?:\uFE0F|\u200D[\p{Extended_Pictographic}\p{Regional_Indicator}]|\p{Emoji_Modifier})*/gu,
    " "
  );

  // Collapse repeated whitespace (newlines and spaces) to single spaces.
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

module.exports = { messageToSpeech };
