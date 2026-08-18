const { User } = require("../../models/user");
const { decodeJWT } = require("../http");
const { UserMetaCache } = require("../userLocale");

// The only endpoints a user with a pending forced password change may reach. Everything
// else is refused until they replace the password an admin generated for them.
// `refresh-user` and `check-token` are session-keepalive calls the app makes on every
// boot - refusing them logs the user straight back out to /login (AuthContext treats a
// failed refresh as a dead session) and they could never reach the change form.
const PASSWORD_CHANGE_ALLOWED_PATHS = [
  "/system/user/change-password",
  "/system/check-token",
  "/system/refresh-user",
];

/**
 * Resolve the session user for a request. A request without a valid user-bound
 * JWT never reaches a handler.
 * @param {import("express").Request} request
 * @param {import("express").Response} response
 * @param {import("express").NextFunction} next
 */
async function validatedRequest(request, response, next) {
  const auth = request.header("Authorization");
  const token = auth ? auth.split(" ")[1] : null;

  if (!token) {
    response.status(401).json({
      error: "No auth token found.",
    });
    return;
  }

  const valid = decodeJWT(token);
  if (!valid || !valid.id) {
    response.status(401).json({
      error: "Invalid auth token.",
    });
    return;
  }

  const user = await User.get({ id: valid.id });
  if (!user) {
    response.status(401).json({
      error: "Invalid auth for user.",
    });
    return;
  }

  if (user.suspended) {
    response.status(401).json({
      error: "User is suspended from system",
    });
    return;
  }

  // Users holding an admin-generated password are frozen out of the rest of the app
  // until they set their own. The frontend surfaces the change-password screen off the
  // same flag, but this is what actually enforces it.
  if (
    user.requiresPasswordChange &&
    !PASSWORD_CHANGE_ALLOWED_PATHS.includes(request.path)
  ) {
    response.status(403).json({
      error: "You must change your password before continuing.",
      requiresPasswordChange: true,
    });
    return;
  }

  response.locals.user = user;
  UserMetaCache.setFromRequest(request, user.id);
  next();
}

module.exports = {
  validatedRequest,
};
