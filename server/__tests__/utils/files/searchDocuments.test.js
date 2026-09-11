const fs = require("fs");
const os = require("os");
const path = require("path");

// Search only needs the documents on disk. The pinned-workspace lookup is the one
// database call on this path, and what it returns is irrelevant to matching.
jest.mock("../../../models/documents", () => ({
  Document: { where: jest.fn(async () => []) },
}));

const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), "doc-search-"));
process.env.NODE_ENV = "production";
process.env.STORAGE_DIR = storageDir;

// Required after STORAGE_DIR is set: the module resolves its paths at load time.
const { searchDocuments } = require("../../../utils/files");

const FOLDER = "custom-documents";

/** A document shaped the way the picker requires, carrying `text` as its content. */
function writeDocument(filename, text) {
  const folder = path.join(storageDir, "documents", FOLDER);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(
    path.join(folder, filename),
    JSON.stringify({
      id: filename,
      name: filename,
      type: "file",
      url: `file://${filename}`,
      title: filename,
      docAuthor: "no author found",
      description: "no description found",
      docSource: "a test",
      chunkSource: filename,
      published: new Date().toLocaleString(),
      wordCount: text.split(" ").length,
      token_count_estimate: text.length,
      pageContent: text,
    })
  );
}

/** The titles a search returns, flattened out of their folders. */
async function titlesFor(term) {
  const results = await searchDocuments(term);
  return results
    .flatMap((folder) => folder.items.map((item) => item.title))
    .sort();
}

beforeAll(() => {
  writeDocument("quote.json", "Our price (2024) is fixed for the year.");
  writeDocument("brackets.json", "See the [pricing] table on page two.");
  writeDocument("decoy.json", "A pig in a crib, nothing about cost.");
});

afterAll(() => {
  fs.rmSync(storageDir, { recursive: true, force: true });
});

describe("searchDocuments content matching", () => {
  it("finds a term containing parentheses", async () => {
    // Without --fixed-strings ripgrep reads "(2024)" as a capture group, and a
    // document containing exactly that text matches nothing at all.
    expect(await titlesFor("price (2024)")).toEqual(["quote.json"]);
  });

  it("does not treat brackets as a character class", async () => {
    // "[pricing]" as a regex matches any one of those letters, which is every
    // document here rather than the one that contains the string.
    expect(await titlesFor("[pricing]")).toEqual(["brackets.json"]);
  });

  it("returns nothing for an unbalanced term rather than failing", async () => {
    // "a[b" is not a valid pattern; ripgrep exits 2 and the caller cannot tell a
    // broken search from an empty one.
    expect(await titlesFor("a[b")).toEqual([]);
  });

  it("still matches an ordinary term", async () => {
    expect(await titlesFor("pig")).toEqual(["decoy.json"]);
  });
});
