const mockWhere = jest.fn();
const mockCreate = jest.fn();
const mockCanActivate = jest.fn();
const mockAddScheduledJob = jest.fn();
const mockEnqueueScheduledJob = jest.fn();
const mockIsSendingEnabled = jest.fn();
const mockLogEvent = jest.fn();

jest.mock("../../models/scheduledJob", () => ({
  ScheduledJob: {
    where: (...args) => mockWhere(...args),
    create: (...args) => mockCreate(...args),
    canActivate: (...args) => mockCanActivate(...args),
    isValidCron: () => true,
    isValidRecipientType: () => true,
  },
}));
jest.mock("../../models/scheduledJobRun", () => ({ ScheduledJobRun: {} }));
jest.mock("../../models/scheduledJobLog", () => ({ ScheduledJobLog: {} }));
jest.mock("../../models/eventLogs", () => ({
  EventLogs: { logEvent: (...args) => mockLogEvent(...args) },
}));
jest.mock("../../utils/BackgroundWorkers", () => ({
  BackgroundService: jest.fn().mockImplementation(() => ({
    addScheduledJob: (...args) => mockAddScheduledJob(...args),
    enqueueScheduledJob: (...args) => mockEnqueueScheduledJob(...args),
  })),
}));
jest.mock("../../utils/middleware/validatedRequest", () => ({
  validatedRequest: (_request, _response, next) => next(),
}));
jest.mock("../../utils/middleware/authorizedRequest", () => ({
  userPermissionValid: () => (_request, _response, next) => next(),
}));
jest.mock("../../utils/http", () => ({
  reqBody: (request) => request.body,
  userFromSession: async () => ({ id: 7 }),
  safeJsonParse: (value) => JSON.parse(value),
}));
jest.mock("../../utils/smtp", () => ({
  isSendingEnabled: () => mockIsSendingEnabled(),
  requireSmtpReady: (_request, response, next) =>
    mockIsSendingEnabled()
      ? next()
      : response.status(403).json({ error: "smtp_not_configured" }),
}));

const { scheduledJobEndpoints } = require("../../endpoints/scheduledJobs");

const routes = new Map();
scheduledJobEndpoints({
  get: (path, middleware, handler) =>
    routes.set(`GET ${path}`, { middleware, handler }),
  post: (path, middleware, handler) =>
    routes.set(`POST ${path}`, { middleware, handler }),
  put: (path, middleware, handler) =>
    routes.set(`PUT ${path}`, { middleware, handler }),
  delete: (path, middleware, handler) =>
    routes.set(`DELETE ${path}`, { middleware, handler }),
});

async function request(method, path, body = {}) {
  const { middleware, handler } = routes.get(`${method} ${path}`);
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
  };
  const req = { body };
  for (const check of middleware) {
    let allowed = false;
    await check(req, response, () => {
      allowed = true;
    });
    if (!allowed) return response;
  }
  await handler(req, response);
  return response;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsSendingEnabled.mockReturnValue(false);
  mockWhere.mockResolvedValue([]);
  mockCanActivate.mockResolvedValue({ allowed: true });
  mockCreate.mockResolvedValue({
    job: { id: 3, name: "Daily digest", schedule: "0 9 * * *" },
    error: null,
  });
});

it("lists and creates jobs while SMTP is unavailable", async () => {
  const list = await request("GET", "/scheduled-jobs");
  expect(list.status).toHaveBeenCalledWith(200);
  expect(list.json).toHaveBeenCalledWith({ jobs: [] });

  const created = await request("POST", "/scheduled-jobs/new", {
    name: "Daily digest",
    prompt: "Summarize the news",
    schedule: "0 9 * * *",
  });
  expect(created.status).toHaveBeenCalledWith(201);
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(mockAddScheduledJob).toHaveBeenCalledWith(
    expect.objectContaining({ id: 3 })
  );
});

it("keeps manual runs blocked while SMTP is unavailable", async () => {
  const trigger = await request("POST", "/scheduled-jobs/:id/trigger");
  expect(trigger.status).toHaveBeenCalledWith(403);
  expect(trigger.json).toHaveBeenCalledWith({ error: "smtp_not_configured" });
  expect(mockEnqueueScheduledJob).not.toHaveBeenCalled();
});
