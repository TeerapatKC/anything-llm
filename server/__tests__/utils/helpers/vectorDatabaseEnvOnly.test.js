const mockResetAllVectorStores = jest.fn();

jest.mock("../../../utils/vectorStore/resetAllVectorStores", () => ({
  resetAllVectorStores: mockResetAllVectorStores,
}));

const { updateENV } = require("../../../utils/helpers/updateENV");

describe("environment-managed vector database settings", () => {
  const originalVectorDB = process.env.VECTOR_DB;
  const originalChromaEndpoint = process.env.CHROMA_ENDPOINT;
  const originalGenericMaxTokens = process.env.GENERIC_OPEN_AI_MAX_TOKENS;

  beforeEach(() => {
    process.env.VECTOR_DB = "lancedb";
    process.env.CHROMA_ENDPOINT = "http://existing-chroma:8000";
    process.env.GENERIC_OPEN_AI_MAX_TOKENS = "256";
    mockResetAllVectorStores.mockClear();
  });

  afterAll(() => {
    if (originalVectorDB === undefined) delete process.env.VECTOR_DB;
    else process.env.VECTOR_DB = originalVectorDB;
    if (originalChromaEndpoint === undefined)
      delete process.env.CHROMA_ENDPOINT;
    else process.env.CHROMA_ENDPOINT = originalChromaEndpoint;
    if (originalGenericMaxTokens === undefined)
      delete process.env.GENERIC_OPEN_AI_MAX_TOKENS;
    else process.env.GENERIC_OPEN_AI_MAX_TOKENS = originalGenericMaxTokens;
  });

  it("rejects provider changes and leaves other submitted settings untouched", async () => {
    const result = await updateENV({
      VectorDB: "chroma",
      GenericOpenAiMaxTokens: "512",
    });

    expect(result).toEqual({
      newValues: {},
      error: expect.stringMatching(/environment variables/),
    });
    expect(process.env.VECTOR_DB).toBe("lancedb");
    expect(process.env.GENERIC_OPEN_AI_MAX_TOKENS).toBe("256");
    expect(mockResetAllVectorStores).not.toHaveBeenCalled();
  });

  it("rejects connection changes even when force mode is requested", async () => {
    const result = await updateENV(
      { ChromaEndpoint: "http://another-chroma:8000" },
      true
    );

    expect(result.error).toMatch(/environment variables/);
    expect(process.env.CHROMA_ENDPOINT).toBe("http://existing-chroma:8000");
  });
});
