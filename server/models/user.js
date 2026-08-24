const { Prisma } = require("@prisma/client");
const prisma = require("../utils/prisma");
const { EventLogs } = require("./eventLogs");
const { Role } = require("./role");
const {
  PERMISSIONS,
  FALLBACK_ROLE,
  ADMIN_ROLE,
  SUPER_ADMIN_ROLE,
} = require("../utils/permissions");

/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} username
 * @property {string|null} email
 * @property {string} password
 * @property {boolean} requiresPasswordChange
 * @property {string} pfpFilename
 * @property {string} role
 * @property {boolean} suspended
 * @property {number|null} dailyMessageLimit
 */

const User = {
  usernameRegex: new RegExp(/^[a-z][a-z0-9._@-]*$/),
  // Deliberately permissive - we only reject shapes that cannot be an address at all.
  emailRegex: new RegExp(/^[^\s@]+@[^\s@.]+\.[^\s@]+$/),
  writable: [
    // Used for generic updates so we can validate keys in request body
    "username",
    "email",
    "password",
    "pfpFilename",
    "role",
    "suspended",
    "dailyMessageLimit",
    "bio",
  ],
  validations: {
    /**
     * Unix-style username regex:
     * - Must start with a lowercase letter
     * - Can contain lowercase letters, digits, underscores, hyphens, @ signs, and periods
     * - 2-64 characters long
     */
    username: (newValue = "") => {
      try {
        const username = String(newValue);
        if (username.length > 64)
          throw new Error("Username cannot be longer than 64 characters");
        if (username.length < 2)
          throw new Error("Username must be at least 2 characters");
        if (!User.usernameRegex.test(username))
          throw new Error(
            "Username must start with a lowercase letter and only contain lowercase letters, numbers, underscores, hyphens, and periods"
          );
        return username;
      } catch (e) {
        throw new Error(e.message);
      }
    },
    /**
     * Every user record carries an email so admins have a way to reach the account
     * holder - most importantly to hand over a generated password.
     */
    email: (newValue = "") => {
      const email = String(newValue ?? "")
        .trim()
        .toLowerCase();
      if (!email) throw new Error("Email is required");
      if (email.length > 255)
        throw new Error("Email cannot be longer than 255 characters");
      if (!User.emailRegex.test(email))
        throw new Error("Email must be a valid email address");
      return email;
    },
    // Roles live in the `roles` table so operators can define their own. The name is
    // shape-checked here; that it actually exists is checked in `validateRole`.
    role: (role = FALLBACK_ROLE) => {
      const name = String(role ?? "").trim();
      if (!name) return FALLBACK_ROLE;
      if (!Role.nameRegex.test(name))
        throw new Error(`Invalid role name: ${name}`);
      return name;
    },
    dailyMessageLimit: (dailyMessageLimit = null) => {
      if (dailyMessageLimit === null) return null;
      const limit = Number(dailyMessageLimit);
      if (isNaN(limit) || limit < 1) {
        throw new Error(
          "Daily message limit must be null or a number greater than or equal to 1"
        );
      }
      return limit;
    },
    bio: (bio = "") => {
      if (!bio || typeof bio !== "string") return "";
      if (bio.length > 1000)
        throw new Error("Bio cannot be longer than 1,000 characters");
      return String(bio);
    },
  },
  // validations for the above writable fields.
  castColumnValue: function (key, value) {
    switch (key) {
      case "suspended":
        return Number(Boolean(value));
      case "dailyMessageLimit":
        return value === null ? null : Number(value);
      default:
        return String(value);
    }
  },

  filterFields: function (user = {}) {
    const {
      password: _password,
      web_push_subscription_config: _web_push_subscription_config,
      ...rest
    } = user;
    return { ...rest };
  },

  /**
   * The safe user payload plus the permission keys their role grants. Used for the
   * session payloads the frontend caches so it can hide controls the role does not
   * unlock - the server still enforces every permission on its own.
   * @param {Object} user
   * @returns {Promise<Object>}
   */
  withPermissions: async function (user = {}) {
    return {
      ...this.filterFields(user),
      permissions: await Role.permissionsForUser(user),
    };
  },
  _identifyErrorAndFormatMessage: function (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002 is the unique constraint violation error code
      if (error.code === "P2002") {
        const target = error.meta?.target;
        return `A user with that ${target?.join(", ")} already exists`;
      }
    }
    return error.message;
  },

  /**
   * Shape-checks a role name and confirms the role actually exists.
   * @param {string} role
   * @returns {Promise<string>} the normalized role name
   */
  validateRole: async function (role) {
    const name = this.validations.role(role);
    if (!(await Role.exists(name)))
      throw new Error(`Role "${name}" does not exist.`);
    return name;
  },

  /**
   * The instance-owner guard, enforced here rather than in the endpoints because the
   * developer API, invite redemption and the admin console all reach the database
   * through this model, and only one of those three walks the admin helper checks.
   *
   * The owner role is never reachable through any user-supplied payload: it is set once
   * by `createSuperAdmin` during first-run setup and afterwards only ever moves through
   * `transferSuperAdmin`. Everything else about that account - deleting it, suspending
   * it, demoting it - is refused outright.
   *
   * @param {Object|null} existingUser - the account being changed, if any
   * @param {Object} updates - the fields being written
   * @returns {{allowed: boolean, error: string|null}}
   */
  _superAdminGuard: function (existingUser = null, updates = {}) {
    if (Role.isSuperAdminRole(updates.role))
      return {
        allowed: false,
        error:
          "The super admin role cannot be assigned. It moves only through an ownership transfer.",
      };

    if (!Role.isSuperAdmin(existingUser)) return { allowed: true, error: null };

    if (updates.hasOwnProperty("role") && updates.role !== existingUser.role)
      return {
        allowed: false,
        error:
          "The super admin cannot be moved off their role. Transfer ownership instead.",
      };

    if (
      updates.hasOwnProperty("suspended") &&
      Number(updates.suspended) !== Number(existingUser.suspended)
    )
      return {
        allowed: false,
        error: "The super admin account cannot be suspended.",
      };

    return { allowed: true, error: null };
  },

  /**
   * Creates a user. When `requiresPasswordChange` is set the account is locked out of
   * every endpoint except the change-password one until they pick their own password -
   * this is how admin-issued initial passwords are handed over safely.
   */
  create: async function ({
    username,
    email,
    password,
    role = FALLBACK_ROLE,
    dailyMessageLimit = null,
    bio = "",
    requiresPasswordChange = false,
  }) {
    const passwordCheck = this.checkPasswordComplexity(password);
    if (!passwordCheck.checkedOK) {
      return { user: null, error: passwordCheck.error };
    }

    // Checked before anything else so a request body that names the owner role cannot
    // mint a second owner, whichever endpoint it arrived through.
    const guard = this._superAdminGuard(null, { role });
    if (!guard.allowed) return { user: null, error: guard.error };

    try {
      // Validate username format (validation function handles all checks)
      const validatedUsername = this.validations.username(username);
      const validatedEmail = this.validations.email(email);

      const bcrypt = require("bcryptjs");
      const hashedPassword = bcrypt.hashSync(password, 10);
      const user = await prisma.users.create({
        data: {
          username: validatedUsername,
          email: validatedEmail,
          password: hashedPassword,
          requiresPasswordChange: Boolean(requiresPasswordChange),
          role: await this.validateRole(role),
          bio: this.validations.bio(bio),
          dailyMessageLimit:
            this.validations.dailyMessageLimit(dailyMessageLimit),
        },
      });
      return { user: this.filterFields(user), error: null };
    } catch (error) {
      console.error("FAILED TO CREATE USER.", error.message);
      return { user: null, error: this._identifyErrorAndFormatMessage(error) };
    }
  },
  // Log the changes to a user object, but omit sensitive fields
  // that are not meant to be logged.
  loggedChanges: function (updates, prev = {}) {
    const changes = {};
    const sensitiveFields = ["password"];

    Object.keys(updates).forEach((key) => {
      if (!sensitiveFields.includes(key) && updates[key] !== prev[key]) {
        changes[key] = `${prev[key]} => ${updates[key]}`;
      }
    });

    return changes;
  },

  /**
   * Read someone's personalization preferences.
   *
   * `null` on either field means the account has never touched the switch and
   * should follow the instance setting - callers resolve that through
   * `Memory.enabledForUser`, which is the only place the two layers are ANDed.
   *
   * @param {number} userId
   * @returns {Promise<{memoryEnabled: boolean|null, memoryAutoExtraction: boolean|null}>}
   */
  memoryPreferences: async function (userId) {
    try {
      const user = await prisma.users.findUnique({
        where: { id: Number(userId) },
        select: { memoryEnabled: true, memoryAutoExtraction: true },
      });
      return {
        memoryEnabled: user?.memoryEnabled ?? null,
        memoryAutoExtraction: user?.memoryAutoExtraction ?? null,
      };
    } catch (error) {
      console.error(error.message);
      return { memoryEnabled: null, memoryAutoExtraction: null };
    }
  },

  /**
   * Write someone's own personalization preferences.
   *
   * Deliberately kept off `writable` and out of the generic `update` path: this
   * is a personal preference, so it is only ever reachable from the session
   * user's own request, never from the admin user-editing screens.
   *
   * @param {number} userId
   * @param {{memoryEnabled?: boolean|null, memoryAutoExtraction?: boolean|null}} preferences
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  setMemoryPreferences: async function (userId, preferences = {}) {
    try {
      if (!userId) throw new Error("No user id provided for update");
      const data = {};
      for (const key of ["memoryEnabled", "memoryAutoExtraction"]) {
        if (!preferences.hasOwnProperty(key)) continue;
        const value = preferences[key];
        data[key] = value === null ? null : Boolean(value);
      }
      if (Object.keys(data).length === 0)
        return { success: false, error: "No preferences provided" };

      await prisma.users.update({
        where: { id: Number(userId) },
        data: { ...data, lastUpdatedAt: new Date() },
      });
      return { success: true, error: null };
    } catch (error) {
      console.error(error.message);
      return { success: false, error: error.message };
    }
  },

  update: async function (userId, updates = {}) {
    try {
      if (!userId) throw new Error("No user id provided for update");
      const currentUser = await prisma.users.findUnique({
        where: { id: parseInt(userId) },
      });
      if (!currentUser) return { success: false, error: "User not found" };

      const guard = this._superAdminGuard(currentUser, updates);
      if (!guard.allowed) return { success: false, error: guard.error };

      // We previously had more lenient username validation, but now with more strict validation
      // we dont want to break existing users by changing non-username fields.
      // If they are not explictly changing the username, do not attempt to validate it.
      if (updates.hasOwnProperty("username")) {
        if (updates.username === currentUser.username) delete updates.username;
      }

      // Same reasoning as username - accounts created before email was collected have
      // a null email, so only validate when the caller is actually setting one.
      if (updates.hasOwnProperty("email")) {
        if (updates.email === currentUser.email) delete updates.email;
      }

      // Removes non-writable fields for generic updates
      // and force-casts to the proper type;
      Object.entries(updates).forEach(([key, value]) => {
        if (this.writable.includes(key)) {
          if (this.validations.hasOwnProperty(key)) {
            updates[key] = this.validations[key](
              this.castColumnValue(key, value)
            );
          } else {
            updates[key] = this.castColumnValue(key, value);
          }
          return;
        }
        delete updates[key];
      });

      if (Object.keys(updates).length === 0)
        return { success: false, error: "No valid updates applied." };

      if (updates.hasOwnProperty("role"))
        updates.role = await this.validateRole(updates.role);

      // Handle password specific updates
      if (updates.hasOwnProperty("password")) {
        const passwordCheck = this.checkPasswordComplexity(updates.password);
        if (!passwordCheck.checkedOK) {
          return { success: false, error: passwordCheck.error };
        }
        const bcrypt = require("bcryptjs");
        updates.password = bcrypt.hashSync(updates.password, 10);
      }

      const user = await prisma.users.update({
        where: { id: parseInt(userId) },
        data: updates,
      });

      await EventLogs.logEvent(
        "user_updated",
        {
          username: user.username,
          changes: this.loggedChanges(updates, currentUser),
        },
        userId
      );
      return { success: true, error: null };
    } catch (error) {
      console.error("FAILED TO UPDATE USER.", error.message);
      return {
        success: false,
        error: this._identifyErrorAndFormatMessage(error),
      };
    }
  },

  /**
   * Explicit direct update of user object.
   * Only use this method when directly setting a key value
   * that takes no user input for the keys being modified.
   * @param {number} id - The id of the user to update.
   * @param {Object} data - The data to update the user with.
   * @returns {Promise<Object>} The updated user object.
   */
  _update: async function (id = null, data = {}) {
    if (!id) throw new Error("No user id provided for update");

    try {
      // Direct updates skip every validation above, so the owner guard is re-applied
      // here rather than trusting each caller to have thought about it. Ownership moves
      // through `transferSuperAdmin`, which writes its own transaction.
      if (data.hasOwnProperty("role") || data.hasOwnProperty("suspended")) {
        const existing = await prisma.users.findUnique({ where: { id } });
        const guard = this._superAdminGuard(existing, data);
        if (!guard.allowed) {
          console.error(`REFUSED DIRECT USER UPDATE. ${guard.error}`);
          return { user: null, message: guard.error };
        }
      }

      const user = await prisma.users.update({
        where: { id },
        data,
      });
      return { user, message: null };
    } catch (error) {
      console.error(error.message);
      return { user: null, message: error.message };
    }
  },

  /**
   * Get all users that match the given clause without filtering the fields.
   * Internal use only - do not use this method for user-input flows
   * @param {Object} clause - The clause to filter the users by.
   * @param {number|null} limit - The maximum number of users to return.
   * @returns {Promise<Array<User>>} The users that match the given clause.
   */
  _where: async function (clause = {}, limit = null) {
    try {
      const users = await prisma.users.findMany({
        where: clause,
        ...(limit !== null ? { take: limit } : {}),
      });
      return users;
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  /**
   * Returns a user object based on the clause provided.
   * @param {Object} clause - The clause to use to find the user.
   * @returns {Promise<import("@prisma/client").users|null>} The user object or null if not found.
   */
  get: async function (clause = {}) {
    try {
      const user = await prisma.users.findFirst({ where: clause });
      return user ? this.filterFields({ ...user }) : null;
    } catch (error) {
      console.error(error.message);
      return null;
    }
  },
  // Returns user object with all fields
  _get: async function (clause = {}) {
    try {
      const user = await prisma.users.findFirst({ where: clause });
      return user ? { ...user } : null;
    } catch (error) {
      console.error(error.message);
      return null;
    }
  },

  count: async function (clause = {}) {
    try {
      const count = await prisma.users.count({ where: clause });
      return count;
    } catch (error) {
      console.error(error.message);
      return 0;
    }
  },

  /**
   * Deletes every user matching the clause. Refuses outright - rather than skipping the
   * row - if the clause would take the instance owner with it, so a broad `deleteMany`
   * can never quietly orphan the deployment.
   * @param {Object} clause
   * @returns {Promise<boolean>}
   */
  delete: async function (clause = {}) {
    try {
      const owner = await Role.currentSuperAdmin();
      if (owner) {
        const targetsOwner = await prisma.users.findFirst({
          where: { AND: [clause, { id: owner.id }] },
          select: { id: true },
        });
        if (targetsOwner) {
          console.error(
            "REFUSED TO DELETE USERS. The super admin account cannot be deleted."
          );
          return false;
        }
      }

      await prisma.users.deleteMany({ where: clause });
      return true;
    } catch (error) {
      console.error(error.message);
      return false;
    }
  },

  /**
   * Moves the owner role from one account to another in a single transaction, demoting
   * the outgoing owner to Admin so the instance is never left with two owners or none.
   * The only sanctioned way the owner role ever changes hands.
   * @param {number} toUserId
   * @returns {Promise<{success: boolean, error: string|null, from: Object|null, to: Object|null}>}
   */
  transferSuperAdmin: async function (toUserId = null) {
    const failure = (error) => ({
      success: false,
      error,
      from: null,
      to: null,
    });
    try {
      const target = await prisma.users.findUnique({
        where: { id: Number(toUserId) },
      });
      if (!target) return failure("That account no longer exists.");
      if (Role.isSuperAdmin(target))
        return failure("That account already owns this instance.");
      if (Number(target.suspended) === 1)
        return failure(
          "A suspended account cannot be made the owner. Unsuspend it first."
        );
      if (!(await Role.exists(ADMIN_ROLE)))
        return failure(
          `The "${ADMIN_ROLE}" role is missing, so the outgoing owner has nowhere to land.`
        );

      const outgoing = await Role.currentSuperAdmin();
      await prisma.$transaction([
        ...(outgoing
          ? [
              prisma.users.update({
                where: { id: outgoing.id },
                data: { role: ADMIN_ROLE, lastUpdatedAt: new Date() },
              }),
            ]
          : []),
        prisma.users.update({
          where: { id: target.id },
          data: { role: SUPER_ADMIN_ROLE, lastUpdatedAt: new Date() },
        }),
      ]);

      return {
        success: true,
        error: null,
        from: outgoing ? this.filterFields(outgoing) : null,
        to: this.filterFields(target),
      };
    } catch (error) {
      console.error("FAILED TO TRANSFER OWNERSHIP.", error.message);
      return failure(this._identifyErrorAndFormatMessage(error));
    }
  },

  /**
   * Creates the instance owner. Separate from `create` on purpose: `create` can be
   * reached with a caller-supplied role, this cannot, so no request body can ever mint
   * an owner. Refuses if one already exists.
   * @param {{username: string, email: string, password: string}} credentials
   * @returns {Promise<{user: Object|null, error: string|null}>}
   */
  createSuperAdmin: async function ({ username, email, password }) {
    if (await Role.currentSuperAdmin())
      return { user: null, error: "This instance already has an owner." };

    const passwordCheck = this.checkPasswordComplexity(password);
    if (!passwordCheck.checkedOK)
      return { user: null, error: passwordCheck.error };

    try {
      const bcrypt = require("bcryptjs");
      const user = await prisma.users.create({
        data: {
          username: this.validations.username(username),
          email: this.validations.email(email),
          password: bcrypt.hashSync(password, 10),
          role: await this.validateRole(SUPER_ADMIN_ROLE),
        },
      });
      return { user: this.filterFields(user), error: null };
    } catch (error) {
      console.error("FAILED TO CREATE THE INSTANCE OWNER.", error.message);
      return { user: null, error: this._identifyErrorAndFormatMessage(error) };
    }
  },

  where: async function (clause = {}, limit = null) {
    try {
      const users = await prisma.users.findMany({
        where: clause,
        ...(limit !== null ? { take: limit } : {}),
      });
      return users.map((usr) => this.filterFields(usr));
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  /**
   * Compares a plaintext password against a user's stored hash.
   * @param {number} userId
   * @param {string} password
   * @returns {Promise<boolean>}
   */
  verifyPassword: async function (userId = null, password = "") {
    if (!userId || !password) return false;
    const user = await this._get({ id: Number(userId) });
    if (!user) return false;

    const bcrypt = require("bcryptjs");
    return bcrypt.compareSync(String(password), user.password);
  },

  /**
   * Sets a brand new password for a user and clears the forced-change flag. Used by the
   * self-service change-password flow once the current password has been verified.
   * @param {number} userId
   * @param {string} newPassword
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  changePassword: async function (userId = null, newPassword = "") {
    const password = String(newPassword ?? "").trim();
    if (!password) return { success: false, error: "Invalid password." };

    const passwordCheck = this.checkPasswordComplexity(password);
    if (!passwordCheck.checkedOK)
      return { success: false, error: passwordCheck.error };

    try {
      const bcrypt = require("bcryptjs");
      await prisma.users.update({
        where: { id: Number(userId) },
        data: {
          password: bcrypt.hashSync(password, 10),
          requiresPasswordChange: false,
        },
      });
      return { success: true, error: null };
    } catch (error) {
      console.error("FAILED TO CHANGE USER PASSWORD.", error.message);
      return {
        success: false,
        error: this._identifyErrorAndFormatMessage(error),
      };
    }
  },

  /**
   * Replaces a user's password with a freshly generated one and forces them to pick
   * their own the next time they log in. The plaintext is returned to the caller once
   * so an admin can hand it to the user - it is never recoverable afterwards.
   * @param {number} userId
   * @returns {Promise<{password: string|null, error: string|null}>}
   */
  resetPasswordToGenerated: async function (userId = null) {
    if (!userId) return { password: null, error: "No user id provided" };

    try {
      const {
        generateInitialPassword,
      } = require("../utils/PasswordRecovery/generatePassword");
      const password = generateInitialPassword();
      const bcrypt = require("bcryptjs");
      await prisma.users.update({
        where: { id: Number(userId) },
        data: {
          password: bcrypt.hashSync(password, 10),
          requiresPasswordChange: true,
        },
      });
      return { password, error: null };
    } catch (error) {
      console.error("FAILED TO RESET USER PASSWORD.", error.message);
      return {
        password: null,
        error: this._identifyErrorAndFormatMessage(error),
      };
    }
  },

  checkPasswordComplexity: function (passwordInput = "") {
    const passwordComplexity = require("joi-password-complexity");
    // Can be set via ENV variable on boot. No frontend config at this time.
    // Docs: https://www.npmjs.com/package/joi-password-complexity
    const complexityOptions = {
      min: process.env.PASSWORDMINCHAR || 8,
      max: process.env.PASSWORDMAXCHAR || 250,
      lowerCase: process.env.PASSWORDLOWERCASE || 0,
      upperCase: process.env.PASSWORDUPPERCASE || 0,
      numeric: process.env.PASSWORDNUMERIC || 0,
      symbol: process.env.PASSWORDSYMBOL || 0,
      // reqCount should be equal to how many conditions you are testing for (1-4)
      requirementCount: process.env.PASSWORDREQUIREMENTS || 0,
    };

    const complexityCheck = passwordComplexity(
      complexityOptions,
      "password"
    ).validate(passwordInput);
    if (complexityCheck.hasOwnProperty("error")) {
      let myError = "";
      let prepend = "";
      for (let i = 0; i < complexityCheck.error.details.length; i++) {
        myError += prepend + complexityCheck.error.details[i].message;
        prepend = ", ";
      }
      return { checkedOK: false, error: myError };
    }

    return { checkedOK: true, error: "No error." };
  },

  /**
   * Check if a user can send a chat based on their daily message limit.
   * This limit is system wide and not per workspace and does not apply to roles
   * granted the `chats.unlimited` permission.
   * @param {User} user The user object record.
   * @returns {Promise<boolean>} True if the user can send a chat, false otherwise.
   */
  canSendChat: async function (user) {
    if (!user || user.dailyMessageLimit === null) return true;
    if (await Role.userCan(user, PERMISSIONS.CHATS_UNLIMITED)) return true;

    const { WorkspaceChats } = require("./workspaceChats");
    const currentChatCount = await WorkspaceChats.count({
      user_id: user.id,
      createdAt: {
        gte: new Date(new Date() - 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    return currentChatCount < user.dailyMessageLimit;
  },
};

module.exports = { User };
