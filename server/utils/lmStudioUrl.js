function parseLMStudioBasePath(providedBasePath = "", apiVersion = "legacy") {
  try {
    const baseURL = new URL(providedBasePath);
    let basePath = baseURL.origin;
    if (apiVersion === "legacy") basePath += "/v1";
    if (apiVersion === "v1") basePath += "/api/v1";
    return basePath;
  } catch {
    return providedBasePath;
  }
}

module.exports = { parseLMStudioBasePath };
