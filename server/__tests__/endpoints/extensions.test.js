const mockForwardExtensionRequest = jest.fn();
const mockWorkspaceGet = jest.fn();
const mockWorkspaceCan = jest.fn();
const mockCreateFolder = jest.fn();

jest.mock("../../utils/collectorApi", () => ({
  CollectorApi: jest.fn().mockImplementation(() => ({
    forwardExtensionRequest: mockForwardExtensionRequest,
  })),
}));
jest.mock("../../utils/http", () => ({
  reqBody: (request) => request.body,
  userFromSession: async () => ({ id: 7, role: "default" }),
}));
jest.mock("../../models/workspace", () => ({
  Workspace: { get: (...args) => mockWorkspaceGet(...args) },
}));
jest.mock("../../models/workspaceRole", () => ({
  WorkspaceRole: {
    userCanAnyInWorkspace: (...args) => mockWorkspaceCan(...args),
  },
}));
jest.mock("../../models/documentFolders", () => ({
  DocumentFolder: {
    VISIBILITY: { PRIVATE: "private" },
    create: (...args) => mockCreateFolder(...args),
  },
}));
jest.mock("../../utils/middleware/validatedRequest", () => ({
  validatedRequest: (_request, _response, next) => next(),
}));
const { extensionEndpoints } = require("../../endpoints/extensions");
const { WORKSPACE_PERMISSIONS: WS } = require("../../utils/permissions");

function route(path) {
  const routes = new Map();
  extensionEndpoints({
    post: (name, middleware, handler) =>
      routes.set(name, { middleware, handler }),
  });
  return routes.get(path);
}

function response() {
  const res = {
    locals: {},
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    sendStatus: jest.fn(() => res),
    end: jest.fn(() => res),
  };
  return res;
}

it("registers only website and YouTube connector routes", () => {
  const routes = [];
  extensionEndpoints({ post: (path) => routes.push(path) });
  expect(routes).toEqual(["/ext/youtube/transcript", "/ext/website-depth"]);
});

beforeEach(() => {
  jest.clearAllMocks();
  mockWorkspaceGet.mockResolvedValue({ id: 3, slug: "mine", type: "personal" });
  mockWorkspaceCan.mockResolvedValue(true);
  mockCreateFolder.mockResolvedValue({ folder: { id: 1 }, error: null });
  mockForwardExtensionRequest.mockResolvedValue({ success: true, data: [] });
});

it.each([
  ["/ext/website-depth", WS.DATA_CONNECTORS_WEB],
  ["/ext/youtube/transcript", WS.DATA_CONNECTORS_YOUTUBE],
])("scopes %s to the requested private workspace", async (path, permission) => {
  const { middleware, handler } = route(path);
  const req = { body: { workspaceSlug: "mine", url: "https://example.com" } };
  const res = response();
  const next = jest.fn();

  await middleware[1](req, res, next);
  expect(next).toHaveBeenCalledTimes(1);
  expect(mockWorkspaceCan).toHaveBeenCalledWith({ id: 7, role: "default" }, 3, [
    permission,
    WS.DATA_CONNECTORS,
  ]);
  await handler(req, res);
  const { destination } = mockForwardExtensionRequest.mock.calls[0][0].body;
  expect(destination).toMatch(/^private-connector-3-[a-f0-9-]+$/);
  expect(mockCreateFolder).toHaveBeenCalledWith({
    name: destination,
    ownerId: 7,
    workspaceId: 3,
    visibility: "private",
  });
});

it("rejects a connector request without permission in that workspace", async () => {
  mockWorkspaceCan.mockResolvedValue(false);
  const { middleware } = route("/ext/website-depth");
  const res = response();
  const next = jest.fn();
  await middleware[1]({ body: { workspaceSlug: "mine" } }, res, next);
  expect(res.sendStatus).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
  expect(mockForwardExtensionRequest).not.toHaveBeenCalled();
});

it("keeps imports in a shared workspace in their normal destination", async () => {
  mockWorkspaceGet.mockResolvedValue({ id: 4, slug: "team", type: "shared" });
  const { middleware, handler } = route("/ext/website-depth");
  const req = { body: { workspaceSlug: "team", url: "https://example.com" } };
  const res = response();
  const next = jest.fn();

  await middleware[1](req, res, next);
  await handler(req, res);
  expect(next).toHaveBeenCalledTimes(1);
  expect(mockCreateFolder).not.toHaveBeenCalled();
  expect(mockForwardExtensionRequest.mock.calls[0][0].body.destination).toBe(
    null
  );
});

it("keeps a single-page import private for an upload-only role", async () => {
  mockWorkspaceGet.mockResolvedValue({ id: 4, slug: "team", type: "shared" });
  mockWorkspaceCan.mockImplementation(async (_user, _id, permissions) =>
    permissions.includes(WS.DOCUMENTS_UPLOAD)
  );
  const { middleware, handler } = route("/ext/website-depth");
  const req = {
    body: {
      workspaceSlug: "team",
      url: "https://example.com",
      depth: 0,
      maxLinks: 1,
    },
  };
  const res = response();
  const next = jest.fn();

  await middleware[1](req, res, next);
  expect(next).toHaveBeenCalledTimes(1);
  expect(mockWorkspaceCan).toHaveBeenCalledWith({ id: 7, role: "default" }, 4, [
    WS.DATA_CONNECTORS_WEB,
    WS.DATA_CONNECTORS,
    WS.DOCUMENTS_UPLOAD,
  ]);
  await handler(req, res);
  const { destination } = mockForwardExtensionRequest.mock.calls[0][0].body;
  expect(destination).toMatch(/^private-connector-4-[a-f0-9-]+$/);
  expect(mockCreateFolder).toHaveBeenCalledWith({
    name: destination,
    ownerId: 7,
    workspaceId: 4,
    visibility: "private",
  });

  mockForwardExtensionRequest.mockClear();
  const crawlResponse = response();
  const crawlNext = jest.fn();
  await middleware[1](
    { body: { ...req.body, depth: 1, maxLinks: 20 } },
    crawlResponse,
    crawlNext
  );
  expect(crawlResponse.sendStatus).toHaveBeenCalledWith(401);
  expect(crawlNext).not.toHaveBeenCalled();
  expect(mockForwardExtensionRequest).not.toHaveBeenCalled();
});
