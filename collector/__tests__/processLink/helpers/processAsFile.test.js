/* eslint-env jest, node */
const fs = require("fs");
const os = require("os");
const path = require("path");

// Documents are written under STORAGE_DIR, which the collector resolves at load
// time - so point it at a throwaway folder before anything is required.
const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), "process-as-file-"));
process.env.NODE_ENV = "production";
process.env.STORAGE_DIR = storageDir;

// The download is the only part that needs the network. Everything after it - the
// converter, the metadata it is handed, the document it writes - runs for real.
jest.mock("../../../utils/downloadURIToFile", () => ({
  downloadURIToFile: jest.fn(),
}));

const { downloadURIToFile } = require("../../../utils/downloadURIToFile");
const { WATCH_DIRECTORY } = require("../../../utils/constants");
const { processAsFile } = require("../../../processLink/helpers");

const METADATA = {
  title: "Q1 Board Report",
  docAuthor: "Finance Team",
  description: "Figures presented to the board.",
  docSource: "shared by the CFO",
};

/** Stand in for a link that resolved to a file, dropped in the hotdir as the real download does. */
function givenDownloadedFile(contents = "Quarterly figures live here.") {
  const filename = `process-as-file-${Date.now()}.txt`;
  const location = path.resolve(WATCH_DIRECTORY, filename);
  fs.writeFileSync(location, contents);
  downloadURIToFile.mockResolvedValue({
    success: true,
    fileLocation: location,
  });
  return location;
}

afterEach(() => {
  jest.clearAllMocks();
  // The converter trashes the hotdir file itself; clean up only if it could not.
  for (const entry of fs.readdirSync(WATCH_DIRECTORY)) {
    if (entry.startsWith("process-as-file-"))
      fs.rmSync(path.resolve(WATCH_DIRECTORY, entry), { force: true });
  }
});

afterAll(() => fs.rmSync(storageDir, { recursive: true, force: true }));

describe("processAsFile metadata", () => {
  it("keeps the metadata the caller supplied on the stored document", async () => {
    givenDownloadedFile();

    const result = await processAsFile({
      uri: "https://example.com/report.txt",
      metadata: METADATA,
    });

    expect(result.success).toBe(true);
    const document = result.documents[0];
    // Without the metadata being threaded through, the converter falls back to the
    // downloaded filename for the title and to its own defaults for the rest.
    expect(document.title).toBe(METADATA.title);
    expect(document.docAuthor).toBe(METADATA.docAuthor);
    expect(document.description).toBe(METADATA.description);
    expect(document.docSource).toBe(METADATA.docSource);
  });

  it("falls back to the converter's own defaults when no metadata is given", async () => {
    const location = givenDownloadedFile();

    const result = await processAsFile({
      uri: "https://example.com/report.txt",
    });

    expect(result.success).toBe(true);
    expect(result.documents[0].title).toBe(path.basename(location));
  });

  it("still returns text only when the caller does not want a document", async () => {
    givenDownloadedFile("Quarterly figures live here.");

    const result = await processAsFile({
      uri: "https://example.com/report.txt",
      saveAsDocument: false,
      metadata: METADATA,
    });

    expect(result.success).toBe(true);
    expect(result.content).toContain("Quarterly figures live here.");
  });

  it("reports a failed download without touching the converter", async () => {
    downloadURIToFile.mockResolvedValue({
      success: false,
      reason: "404 Not Found",
    });

    const result = await processAsFile({ uri: "https://example.com/gone.txt" });
    expect(result.success).toBe(false);
    expect(result.reason).toBe("404 Not Found");
    expect(result.documents).toEqual([]);
  });
});
