const fs = require("fs");
const path = require("path");
const { marked } = require("marked");

const FONTS_DIR = path.join(__dirname, "fonts");

/**
 * Resolve a Chromium/Chrome binary. Docker sets CHROME_PATH / PUPPETEER_EXECUTABLE_PATH;
 * local Mac/Linux installs are probed as a fallback so PDF export still works in yarn dev.
 * @returns {string|null}
 */
function resolveChromePath() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    "/app/chrome-linux/chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * Load puppeteer-core from the server install, or the collector's full puppeteer
 * package that already ships with the Docker image.
 */
function loadPuppeteer() {
  const tries = [
    () => require("puppeteer-core"),
    () => require("puppeteer"),
    () => require(path.join(__dirname, "../../../collector/node_modules/puppeteer")),
    () => require("/app/collector/node_modules/puppeteer"),
  ];
  for (const load of tries) {
    try {
      return load();
    } catch {
      // try next
    }
  }
  return null;
}

function fontDataUri(filename) {
  const filePath = path.join(FONTS_DIR, filename);
  const bytes = fs.readFileSync(filePath);
  return `data:font/ttf;base64,${bytes.toString("base64")}`;
}

/**
 * Build a print-ready HTML document. Sarabun is embedded so Thai (and Latin) glyphs
 * render even when the host OS has no Thai fonts - which is why mdpdf produced tofu
 * boxes: its Typst bundle only ships Libertinus + CJK Noto fonts.
 * @param {string} markdown
 * @returns {string}
 */
function markdownToHtmlDocument(markdown = "") {
  const body = marked.parse(String(markdown || ""), { async: false });
  const regular = fontDataUri("Sarabun-Regular.ttf");
  const bold = fontDataUri("Sarabun-Bold.ttf");
  const italic = fontDataUri("Sarabun-Italic.ttf");
  const boldItalic = fontDataUri("Sarabun-BoldItalic.ttf");

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <style>
    @font-face {
      font-family: "Sarabun";
      src: url("${regular}") format("truetype");
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: "Sarabun";
      src: url("${bold}") format("truetype");
      font-weight: 700;
      font-style: normal;
    }
    @font-face {
      font-family: "Sarabun";
      src: url("${italic}") format("truetype");
      font-weight: 400;
      font-style: italic;
    }
    @font-face {
      font-family: "Sarabun";
      src: url("${boldItalic}") format("truetype");
      font-weight: 700;
      font-style: italic;
    }
    * { box-sizing: border-box; }
    body {
      font-family: "Sarabun", "Noto Sans Thai", "Thonburi", "Ayuthaya", "Noto Sans", sans-serif;
      font-size: 13px;
      line-height: 1.55;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }
    h1, h2, h3, h4, h5, h6 {
      font-weight: 700;
      line-height: 1.3;
      margin: 1.1em 0 0.45em;
    }
    h1 { font-size: 1.6em; }
    h2 { font-size: 1.35em; }
    h3 { font-size: 1.15em; }
    p { margin: 0.55em 0; }
    hr {
      border: none;
      border-top: 1px solid #d4d4d8;
      margin: 1.25em 0;
    }
    ul, ol { margin: 0.55em 0; padding-left: 1.4em; }
    li { margin: 0.2em 0; }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.9em;
      background: #f4f4f5;
      padding: 0.1em 0.35em;
      border-radius: 3px;
    }
    pre {
      background: #f4f4f5;
      padding: 0.85em 1em;
      border-radius: 6px;
      overflow-x: auto;
    }
    pre code { background: transparent; padding: 0; }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 0.85em 0;
      font-size: 0.95em;
    }
    th, td {
      border: 1px solid #d4d4d8;
      padding: 0.4em 0.6em;
      text-align: left;
    }
    th { background: #f4f4f5; font-weight: 700; }
    blockquote {
      margin: 0.85em 0;
      padding: 0.2em 0 0.2em 0.9em;
      border-left: 3px solid #a1a1aa;
      color: #3f3f46;
    }
    img { max-width: 100%; height: auto; }
    strong { font-weight: 700; }
    em { font-style: italic; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

/**
 * Render markdown to a PDF buffer with Unicode (incl. Thai) support via Chromium.
 * Falls back to @mintplex-labs/mdpdf when no Chrome binary is available.
 * @param {string} markdown
 * @returns {Promise<Buffer>}
 */
async function markdownToPdfBuffer(markdown = "") {
  const puppeteer = loadPuppeteer();
  const executablePath = resolveChromePath();

  if (puppeteer && executablePath) {
    const browser = await puppeteer.launch({
      executablePath,
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--font-render-hinting=none",
      ],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(markdownToHtmlDocument(markdown), {
        waitUntil: "networkidle0",
      });
      const pdf = await page.pdf({
        format: "Letter",
        printBackground: true,
        margin: {
          top: "0.75in",
          right: "0.75in",
          bottom: "0.9in",
          left: "0.75in",
        },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close().catch(() => null);
    }
  }

  // Legacy path: Latin + CJK only (no Thai glyphs in the bundled Typst fonts).
  const { markdownToPdf } = await import("@mintplex-labs/mdpdf");
  return Buffer.from(await markdownToPdf(markdown));
}

module.exports = {
  markdownToPdfBuffer,
  markdownToHtmlDocument,
  resolveChromePath,
};
