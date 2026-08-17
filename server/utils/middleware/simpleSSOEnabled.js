/**
 * Checks if simple SSO is enabled for issuance of temporary auth tokens.
 * Note: This middleware must be called after `validApiKey`.
 * @param {import("express").Request} request
 * @param {import("express").Response} response
 * @param {import("express").NextFunction} next
 * @returns {void}
 */
async function simpleSSOEnabled(_, response, next) {
  if (!("SIMPLE_SSO_ENABLED" in process.env)) {
    return response
      .status(403)
      .send(
        "Simple SSO is not enabled. It must be enabled to validate or issue temporary auth tokens."
      );
  }

  next();
}

/**
 * Checks if simple SSO login is disabled by checking if the
 * SIMPLE_SSO_NO_LOGIN environment variable is set as well as
 * SIMPLE_SSO_ENABLED is set.
 * @returns {boolean}
 */
function simpleSSOLoginDisabled() {
  return (
    "SIMPLE_SSO_ENABLED" in process.env && "SIMPLE_SSO_NO_LOGIN" in process.env
  );
}

/**
 * Middleware that checks if simple SSO login is disabled by checking if the
 * SIMPLE_SSO_NO_LOGIN environment variable is set as well as
 * SIMPLE_SSO_ENABLED is set.
 *
 * This middleware will 403 if SSO is enabled and no login is allowed.
 * Otherwise, it will call next.
 *
 * @param {import("express").Request} request
 * @param {import("express").Response} response
 * @param {import("express").NextFunction} next
 * @returns {void}
 */
async function simpleSSOLoginDisabledMiddleware(_, response, next) {
  if (simpleSSOLoginDisabled()) {
    response.status(403).json({
      success: false,
      error: "Login via credentials has been disabled by the administrator.",
    });
    return;
  }
  next();
}

module.exports = {
  simpleSSOEnabled,
  simpleSSOLoginDisabled,
  simpleSSOLoginDisabledMiddleware,
};
