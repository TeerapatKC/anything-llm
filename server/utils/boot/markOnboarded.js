const { SystemSettings } = require("../../models/systemSettings");

/**
 * Keeps the `onboarding_complete` flag honest on every boot.
 *
 * The flag is newer than the app, so instances that predate it have to be recognised and
 * marked onboarded rather than dumped back on the setup screen. That check used to be made
 * from the environment - `LLM_PROVIDER`, `VECTOR_DB` or `JWT_SECRET` being set was taken as
 * proof of a completed setup. Every docker deployment sets all three before it ever boots
 * (the first two ship in `.env.example`, and `JWT_SECRET` is generated on first boot when
 * unset), so a brand-new instance was marked onboarded on its very first start. With no
 * account yet created, and `ADMIN_USERNAME`/`ADMIN_PASSWORD` unset, that left the deploy
 * stranded on a login screen that no password could open and no onboarding screen to
 * escape to.
 *
 * So the flag now follows the database, which is the only thing that can actually attest to
 * a prior setup, and it is corrected in both directions - instances stranded by the old
 * heuristic heal themselves on their next restart.
 */
async function markOnboarded() {
  try {
    const setUpBefore = await hasPriorSetup();
    const onboardingStatus = await SystemSettings.isOnboardingComplete();

    if (onboardingStatus === true) {
      if (setUpBefore) return;

      // Marked onboarded with nothing to show for it: the instance cannot have finished
      // setup, so the flag came from the old environment heuristic and is locking an
      // empty instance out of its own onboarding screen.
      console.log(
        "\x1b[33m[ONBOARDING PATCH]\x1b[0m Instance is marked onboarded but has no users or workspaces - reopening onboarding so an owner account can be created."
      );
      await SystemSettings.markOnboardingIncomplete();
      return false;
    }

    if (setUpBefore) {
      console.log(
        "\x1b[33m[ONBOARDING PATCH]\x1b[0m Legacy instance is already onboarded, marking onboarding as complete. You will not see this message again."
      );
      await SystemSettings.markOnboardingComplete();
      return true;
    }
    return false;
  } catch (e) {
    console.error(
      "\x1b[31m[ONBOARDING PATCH]\x1b[0m Error marking onboarding as complete",
      e.message,
      e
    );
    return false;
  }
}

/**
 * Whether this instance has been set up before, judged only on what is in the database.
 *
 * Accounts cover instances that ran in multi-user mode. Workspaces cover the legacy
 * single-user mode, which held no user rows at all but could not be used without creating
 * a workspace first. A database that has neither has never been set up by anyone.
 *
 * Environment variables are deliberately not consulted: they describe how the server is
 * configured, not whether a human ever finished setting it up, and treating them as proof
 * is what stranded fresh deployments on an unopenable login screen.
 * @returns {Promise<boolean>}
 */
async function hasPriorSetup() {
  const { User } = require("../../models/user");
  if ((await User.count()) > 0) return true;

  const { Workspace } = require("../../models/workspace");
  const anyWorkspace = await Workspace.where({}, 1);
  return anyWorkspace.length > 0;
}

module.exports = markOnboarded;
