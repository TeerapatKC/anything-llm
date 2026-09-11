/* eslint-env jest, node */
const fs = require("fs");
const os = require("os");
const path = require("path");

// generic.js resolves the documents folder from STORAGE_DIR when it is required.
// Nothing here writes a document, but the path still has to exist to be resolved.
const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), "generic-routing-"));
process.env.NODE_ENV = "production";
process.env.STORAGE_DIR = storageDir;

// Only the routing decision matters here: which handler a link is sent to, and what it
// is sent with. Both handlers are stubbed so no network or converter runs.
jest.mock("../../../processLink/helpers", () => ({
  returnResult: jest.fn((result) => result),
  determineContentType: jest.fn(),
  processAsFile: jest.fn(async () => ({ success: true, documents: [] })),
}));

jest.mock("../../../utils/extensions/YoutubeTranscript", () => ({
  loadYouTubeTranscript: jest.fn(async () => ({
    success: true,
    documents: [],
  })),
}));

const {
  determineContentType,
  processAsFile,
} = require("../../../processLink/helpers");
const {
  loadYouTubeTranscript,
} = require("../../../utils/extensions/YoutubeTranscript");
const { scrapeGenericUrl } = require("../../../processLink/convert/generic");

const LINK = "https://example.com/report.pdf";
const METADATA = {
  title: "Q1 Board Report",
  docAuthor: "Finance Team",
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

afterAll(() => fs.rmSync(storageDir, { recursive: true, force: true }));

describe("scrapeGenericUrl routing", () => {
  it("passes the caller's metadata on to the file handler", async () => {
    determineContentType.mockResolvedValue({
      contentType: "application/pdf",
      processVia: "file",
    });

    await scrapeGenericUrl({ link: LINK, metadata: METADATA });

    // A link that resolves to a file is still an upload with a title and an author
    // the caller chose; dropping them here leaves the converter guessing from the
    // downloaded filename.
    expect(processAsFile).toHaveBeenCalledWith({
      uri: LINK,
      saveAsDocument: true,
      metadata: METADATA,
    });
  });

  it("passes an empty object when the caller supplied no metadata", async () => {
    determineContentType.mockResolvedValue({
      contentType: "application/pdf",
      processVia: "file",
    });

    await scrapeGenericUrl({ link: LINK, saveAsDocument: false });

    expect(processAsFile).toHaveBeenCalledWith({
      uri: LINK,
      saveAsDocument: false,
      metadata: {},
    });
  });

  it("still routes a video to the transcript loader", async () => {
    determineContentType.mockResolvedValue({
      contentType: "text/html",
      processVia: "youtube",
    });

    await scrapeGenericUrl({ link: LINK, metadata: METADATA });

    expect(processAsFile).not.toHaveBeenCalled();
    expect(loadYouTubeTranscript).toHaveBeenCalled();
  });
});
