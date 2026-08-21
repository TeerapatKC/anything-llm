const { v4 } = require("uuid");
const { User } = require("../../models/user");
const { EventLogs } = require("../../models/eventLogs");
const { updateENV } = require("../helpers/updateENV");

/**
 * The very first thing a fresh deployment needs is the account that owns it. That
 * account holds the `super-admin` role, and this is the *only* code path that ever
 * creates it. It can come from two places:
 *   1. `ADMIN_USERNAME`/`ADMIN_PASSWORD`/`ADMIN_EMAIL` in the environment, applied at boot.
 *      This is what makes an unattended (docker/compose) deploy usable with no clicking.
 *   2. The onboarding screen, via `POST /system/setup-admin`, for deploys that do not
 *      set those variables.
 *
 * Both paths funnel through `createInitialAdmin`, which refuses to run once any user
 * exists - so neither path can be used to mint a second owner on a live instance. After
 * first run the role moves only through an explicit ownership transfer, or the
 * break-glass recovery in ./superAdmin.js when the owner account is lost for good.
 */

/**
 * Whether the instance already has at least one account. Once true, first-run admin
 * creation is permanently closed and new accounts must be invited by an admin.
 * @returns {Promise<boolean>}
 */
async function hasAnyUser() {
  return (await User.count()) > 0;
}

/**
 * Sessions are JWT-backed, so a secret must exist before the first admin can log in.
 * Persisted to the env file so it survives restarts and tokens stay valid.
 * @returns {Promise<void>}
 */
async function ensureJWTSecret() {
  if (process.env.JWT_SECRET) return;
  await updateENV({ JWTSecret: v4() }, true);
}

/**
 * Creates the instance's owner. No-ops (with an error) if any user already exists.
 * @param {{username: string, email: string, password: string}} credentials
 * @returns {Promise<{user: Object|null, error: string|null}>}
 */
async function createInitialAdmin({ username, email, password }) {
  if (await hasAnyUser())
    return {
      user: null,
      error: "This instance has already been set up.",
    };

  await ensureJWTSecret();
  const { user, error } = await User.createSuperAdmin({
    username,
    email,
    password,
  });
  if (error || !user)
    return {
      user: null,
      error: error || "Failed to create the owner account.",
    };

  // Setup is finished the moment the instance has an owner, so it is recorded here
  // rather than by the onboarding screen. The screen used to do it from the LLM step,
  // which ran before anyone had signed in - and `POST /onboarding` requires a session, so
  // that call was quietly refused and the flag only ever appeared via the legacy boot
  // check in ./markOnboarded. Doing it here works for both routes in, the unattended
  // `ADMIN_USERNAME` bootstrap included, and cannot be refused.
  const { SystemSettings } = require("../../models/systemSettings");
  await SystemSettings.markOnboardingComplete();

  await EventLogs.logEvent("super_admin_created", { username }, user.id);
  return { user, error: null };
}

/**
 * Applies `ADMIN_USERNAME`/`ADMIN_PASSWORD`/`ADMIN_EMAIL` on boot, if they are set and
 * the instance has no accounts yet. Failures are logged rather than thrown - a bad
 * value in the environment should not stop the server from booting, since the operator
 * can still finish setup through the onboarding screen.
 * @returns {Promise<boolean>} whether an owner was created by this call
 */
async function bootstrapAdminFromEnv() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) return false;

  try {
    if (await hasAnyUser()) return false;

    const email = process.env.ADMIN_EMAIL || `${username}@example.local`;
    const { user, error } = await createInitialAdmin({
      username,
      email,
      password,
    });
    if (error || !user) {
      console.error(
        `\x1b[31m[ADMIN BOOTSTRAP]\x1b[0m Could not create the owner account from the environment: ${error}`
      );
      return false;
    }

    console.log(
      `\x1b[32m[ADMIN BOOTSTRAP]\x1b[0m Created instance owner "${user.username}" from environment variables.`
    );
    return true;
  } catch (e) {
    console.error(
      "\x1b[31m[ADMIN BOOTSTRAP]\x1b[0m Failed to bootstrap the owner account",
      e.message
    );
    return false;
  }
}

module.exports = {
  hasAnyUser,
  createInitialAdmin,
  bootstrapAdminFromEnv,
};
