#!/usr/bin/env node
/**
 * Break-glass owner recovery, run from the host.
 *
 * The `super-admin` account cannot be deleted, suspended, demoted or edited from inside
 * the application - that is the guarantee. The cost of that guarantee is that losing the
 * account would otherwise brick the deployment, so this script is the escape hatch.
 *
 * It requires shell access to the machine running NexusAI, which is a level of
 * control that already implies ownership. Nothing here is reachable over HTTP.
 *
 *   node utils/boot/breakGlass.js whoami
 *   node utils/boot/breakGlass.js transfer <username>
 *   node utils/boot/breakGlass.js reset-password <username> <new-password>
 *
 * The environment-variable equivalents (`SUPER_ADMIN_TRANSFER_TO`,
 * `SUPER_ADMIN_RESET_PASSWORD`) live in ./superAdmin.js and are applied at boot, for
 * container deployments where running a one-off command is awkward.
 */

process.env.NODE_ENV === "development"
  ? require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` })
  : require("dotenv").config();

const { User } = require("../../models/user");
const { Role } = require("../../models/role");
const { EventLogs } = require("../../models/eventLogs");

const USAGE = `
Owner recovery for this NexusAI instance.

  whoami                                  Show which account currently owns the instance
  transfer <username>                     Make <username> the owner; the current owner becomes an Admin
  reset-password <username> <password>    Reset the owner's password and clear any suspension

The account named by 'reset-password' must be the current owner - use 'transfer' first
if ownership needs to move as well.
`.trim();

async function whoami() {
  const owner = await Role.currentSuperAdmin();
  if (!owner) {
    console.log(
      "No account owns this instance yet. Finish onboarding, or restart the server to have the earliest administrator promoted."
    );
    return 0;
  }
  console.log(
    `Owner: ${owner.username} (id ${owner.id}, ${owner.email ?? "no email"})`
  );
  return 0;
}

async function transfer(username) {
  if (!username) {
    console.error("Usage: breakGlass.js transfer <username>");
    return 1;
  }

  const target = await User._get({ username: String(username) });
  if (!target) {
    console.error(`No account named "${username}" exists on this instance.`);
    return 1;
  }

  const { success, error, from, to } = await User.transferSuperAdmin(target.id);
  if (!success) {
    console.error(`Transfer failed: ${error}`);
    return 1;
  }

  await EventLogs.logEvent(
    "super_admin_transferred",
    { from: from?.username ?? null, to: to.username, via: "breakGlass.js" },
    to.id
  );
  console.log(
    `"${to.username}" now owns this instance${from ? `. "${from.username}" was demoted to Admin.` : "."
    }`
  );
  return 0;
}

async function resetPassword(username, password) {
  if (!username || !password) {
    console.error("Usage: breakGlass.js reset-password <username> <password>");
    return 1;
  }

  const owner = await Role.currentSuperAdmin();
  if (!owner) {
    console.error("This instance has no owner yet - nothing to recover.");
    return 1;
  }
  if (owner.username !== String(username)) {
    console.error(
      `"${username}" does not own this instance ("${owner.username}" does). Run 'transfer' first if that is what you meant.`
    );
    return 1;
  }

  const complexity = User.checkPasswordComplexity(String(password));
  if (!complexity.checkedOK) {
    console.error(`Password rejected: ${complexity.error}`);
    return 1;
  }

  const bcrypt = require("bcryptjs");
  const prisma = require("../prisma");
  await prisma.users.update({
    where: { id: owner.id },
    data: {
      password: bcrypt.hashSync(String(password), 10),
      suspended: 0,
      requiresPasswordChange: true,
      lastUpdatedAt: new Date(),
    },
  });

  await EventLogs.logEvent(
    "super_admin_password_recovered",
    { username: owner.username, via: "breakGlass.js" },
    owner.id
  );
  console.log(
    `Password reset for "${owner.username}". They will be asked to choose a new one at next login.`
  );
  return 0;
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  switch (command) {
    case "whoami":
      return whoami();
    case "transfer":
      return transfer(args[0]);
    case "reset-password":
      return resetPassword(args[0], args[1]);
    default:
      console.log(USAGE);
      return command ? 1 : 0;
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
