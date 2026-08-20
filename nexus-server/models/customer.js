const prisma = require("../utils/prisma");
const slugifyModule = require("slugify");
const { v4: uuidv4 } = require("uuid");

/**
 * A Customer groups a set of workspaces + users under one external customer
 * (Hosted Customer Trial, V.1.5) - fully isolated from every other customer.
 * Mirrors Workspace's slugify-with-collision-suffix and archive/restore
 * patterns rather than inventing new ones.
 */
const Customer = {
  VALID_STATUSES: ["active", "suspended", "archived"],

  slugify: function (...args) {
    return slugifyModule(...args);
  },

  new: async function (name = null, trialExpiresAt = null) {
    if (!name) return { customer: null, message: "name cannot be null" };
    var slug = this.slugify(name, { lower: true });
    slug = slug || uuidv4();

    const existingBySlug = await this.get({ slug });
    if (existingBySlug !== null) {
      const slugSeed = Math.floor(10000000 + Math.random() * 90000000);
      slug = this.slugify(`${name}-${slugSeed}`, { lower: true });
    }

    try {
      const customer = await prisma.customers.create({
        data: {
          name: String(name),
          slug,
          trialExpiresAt: trialExpiresAt ? new Date(trialExpiresAt) : null,
        },
      });
      return { customer, message: null };
    } catch (error) {
      console.error(error.message);
      return { customer: null, message: error.message };
    }
  },

  get: async function (clause = {}) {
    try {
      return await prisma.customers.findFirst({ where: clause });
    } catch (error) {
      console.error(error.message);
      return null;
    }
  },

  where: async function (clause = {}, limit = null, orderBy = null) {
    try {
      return await prisma.customers.findMany({
        where: clause,
        ...(limit !== null ? { take: limit } : {}),
        ...(orderBy !== null ? { orderBy } : {}),
      });
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  _update: async function (id = null, data = {}) {
    if (!id) throw new Error("No customer id provided for update");
    try {
      const customer = await prisma.customers.update({ where: { id: Number(id) }, data });
      return { customer, message: null };
    } catch (error) {
      console.error(error.message);
      return { customer: null, message: error.message };
    }
  },

  update: async function (id = null, updates = {}) {
    const data = {};
    if (updates.name) data.name = String(updates.name);
    if (updates.status && this.VALID_STATUSES.includes(updates.status))
      data.status = updates.status;
    if (updates.hasOwnProperty("trialExpiresAt"))
      data.trialExpiresAt = updates.trialExpiresAt ? new Date(updates.trialExpiresAt) : null;
    if (Object.keys(data).length === 0)
      return { customer: null, message: "No valid updates provided" };
    return this._update(id, data);
  },

  archive: async function (id = null, userId = null) {
    if (!id) throw new Error("No customer id provided to archive");
    const result = await this._update(id, {
      status: "archived",
      archivedAt: new Date(),
    });
    if (result.customer) {
      const { EventLogs } = require("./eventLogs");
      await EventLogs.logEvent(
        "customer_archived",
        { customerName: result.customer.name, customerId: id },
        userId
      );
    }
    return result;
  },

  restore: async function (id = null, userId = null) {
    if (!id) throw new Error("No customer id provided to restore");
    const result = await this._update(id, {
      status: "active",
      archivedAt: null,
    });
    if (result.customer) {
      const { EventLogs } = require("./eventLogs");
      await EventLogs.logEvent(
        "customer_restored",
        { customerName: result.customer.name, customerId: id },
        userId
      );
    }
    return result;
  },

  /**
   * Count how many customer_admin accounts a customer currently has - used by
   * the last-Customer-Admin lockout guard (mirrors the instance-admin and
   * workspace-admin lockout guards already in the codebase).
   * @param {number} customerId
   * @returns {Promise<number>}
   */
  countAdmins: async function (customerId) {
    try {
      return await prisma.users.count({
        where: { customer_id: Number(customerId), role: "customer_admin", suspended: 0 },
      });
    } catch (error) {
      console.error(error.message);
      return 0;
    }
  },

  /**
   * Whether every user under this customer should be blocked from logging in
   * / continuing their session - "suspended"/"archived" status, OR a trial
   * that has passed its expiry. Checked lazily against the current time
   * rather than a background job flipping the status column, so it takes
   * effect immediately and can't drift out of sync.
   * @param {{status: string, trialExpiresAt: Date|string|null}|null} customer
   * @returns {boolean}
   */
  isBlocked: function (customer) {
    if (!customer) return false;
    if (customer.status === "suspended" || customer.status === "archived") return true;
    if (customer.trialExpiresAt && new Date(customer.trialExpiresAt) < new Date()) return true;
    return false;
  },
};

module.exports = { Customer };
