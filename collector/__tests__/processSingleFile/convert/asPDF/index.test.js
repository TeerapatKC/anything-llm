/* eslint-env jest, node */

// The loader is the only thing that touches a real PDF; these tests are about what
// asPdf does with the pages it gets back.
jest.mock("../../../../processSingleFile/convert/asPDF/PDFLoader", () =>
  jest.fn().mockImplementation(() => ({
    load: async () => global.__PDF_PAGES__,
  }))
);

jest.mock("../../../../utils/files", () => ({
  createdDate: () => "1/1/2024, 12:00:00 AM",
  trashFile: jest.fn(),
  // Hand the stored document straight back so a test can read what was written.
  writeToServerDocuments: jest.fn(({ data }) => data),
}));

jest.mock("../../../../utils/tokenizer", () => ({
  tokenizeString: (text) => text.length,
}));

const asPdf = require("../../../../processSingleFile/convert/asPDF");

/** Stand in for the pages PDFLoader returns, already trimmed as it trims them. */
function givenPages(...pages) {
  global.__PDF_PAGES__ = pages.map((pageContent, index) => ({
    pageContent,
    metadata: { loc: { pageNumber: index + 1 } },
  }));
}

async function contentFor(...pages) {
  givenPages(...pages);
  const result = await asPdf({
    fullFilePath: "/tmp/report.pdf",
    filename: "report.pdf",
    options: { absolutePath: true },
  });
  expect(result.success).toBe(true);
  return result.documents[0].pageContent;
}

describe("asPdf page boundaries", () => {
  it("keeps a sentence that runs across a page break readable", async () => {
    // PDFLoader trims every page, so joining on "" would leave no boundary at all
    // and store "grew to$4.2 million" as one token.
    const content = await contentFor(
      "In the first quarter the revenue grew to",
      "$4.2 million in 2024, ahead of plan."
    );

    expect(content).not.toContain("to$4.2");
    expect(content).toContain("grew to\n\n$4.2 million");
  });

  it("does not fuse a page footer into the next page's heading", async () => {
    const content = await contentFor("Some closing text.\n12", "Chapter 3");

    expect(content).not.toContain("12Chapter");
    expect(content).toContain("12\n\nChapter 3");
  });

  it("leaves a single-page document untouched", async () => {
    const content = await contentFor("The whole document on one page.");
    expect(content).toBe("The whole document on one page.");
  });

  it("still reports an empty PDF as a failure", async () => {
    givenPages();
    const result = await asPdf({
      fullFilePath: "/tmp/empty.pdf",
      filename: "empty.pdf",
      options: { absolutePath: true },
    });
    expect(result.success).toBe(false);
    expect(result.documents).toEqual([]);
  });
});
