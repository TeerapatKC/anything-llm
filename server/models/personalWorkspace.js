const crypto = require("crypto");
const prisma = require("../utils/prisma");
const { Workspace } = require("./workspace");
const { WorkspaceRole } = require("./workspaceRole");
const {
  PrivateWorkspaceProfile,
  WORKSPACE_TYPES,
} = require("./privateWorkspaceProfile");
const { EventLogs } = require("./eventLogs");
const { PERSONAL_OWNER_WORKSPACE_ROLE } = require("../utils/permissions");

/** What an operator may do with the private workspaces a policy change puts over quota. */
const RECONCILE_ACTIONS = {
  /** Leave everything exactly as it is. The owners simply cannot create more. */
  SKIP: "skip",
  /** Close them for chatting but keep every document, chat and member. Reversible. */
  DEACTIVATE: "deactivate",
  /** Delete them and their embeddings. Permanent. */
  DELETE: "delete",
};

/** How long an operator has to answer the review dialog before the token goes stale. */
const REVIEW_TTL_MS = 15 * 60 * 1000;

/**
 * Private, per-user workspaces.
 *
 * A private workspace belongs to exactly one person: nobody else sees it in their
 * sidebar, it has no settings screen, and what its owner may do inside it comes from
 * one workspace role an operator controls (`personal-owner` by default). Everything
 * about how they are handed out - whether at all, how many, what they are called, what
 * the agent may do in them - lives in the instance's private workspace profile.
 *
 * The one rule worth stating plainly: **changing the policy never destroys anything on
 * its own.** Turning the feature off, or lowering the quota, opens a review the
 * operator has to answer (`openReview` then `resolveReview`), and only the answer they
 * give can deactivate or delete a workspace someone is using.
 */
const PersonalWorkspace = {
  TYPE: WORKSPACE_TYPES.PERSONAL,
  RECONCILE_ACTIONS,
  REVIEW_TTL_MS,

  /**
   * Reviews waiting on an answer, keyed by the token handed to the client. In-process
   * on purpose: a lost token is not a failure mode worth a table, it just means the
   * operator is asked to review again.
   * @type {Map<string, {actorId: number, pending: object, ids: number[], expiresAt: number}>}
   */
  _reviews: new Map(),

  /**
   * @param {{type?: string}|null} workspace
   * @returns {boolean}
   */
  isPersonal: function (workspace = null) {
    return workspace?.type === WORKSPACE_TYPES.PERSONAL;
  },

  /** The instance's private workspace policy. */
  profile: async function () {
    return await PrivateWorkspaceProfile.get();
  },

  /**
   * Every private workspace one person owns, oldest first - which is also the order the
   * quota is counted in, so the workspace someone has had longest is never the one a
   * lowered quota puts at risk.
   * @param {number} userId
   * @returns {Promise<import("@prisma/client").workspaces[]>}
   */
  listFor: async function (userId) {
    if (!userId) return [];
    try {
      return await prisma.workspaces.findMany({
        where: { type: WORKSPACE_TYPES.PERSONAL, ownerId: Number(userId) },
        orderBy: { createdAt: "asc" },
      });
    } catch (error) {
      console.error("PersonalWorkspace.listFor error:", error.message);
      return [];
    }
  },

  countFor: async function (userId) {
    if (!userId) return 0;
    try {
      return await prisma.workspaces.count({
        where: { type: WORKSPACE_TYPES.PERSONAL, ownerId: Number(userId) },
      });
    } catch (error) {
      console.error("PersonalWorkspace.countFor error:", error.message);
      return 0;
    }
  },

  /** Every private workspace on the instance, oldest first. */
  all: async function () {
    try {
      return await prisma.workspaces.findMany({
        where: { type: WORKSPACE_TYPES.PERSONAL },
        orderBy: [{ ownerId: "asc" }, { createdAt: "asc" }],
      });
    } catch (error) {
      console.error("PersonalWorkspace.all error:", error.message);
      return [];
    }
  },

  /**
   * The workspace role a private workspace's owner is given. Falls back to the
   * `personal-owner` system role when an operator has not chosen one, and to the
   * instance default role if even that is missing, so provisioning can never leave
   * somebody locked out of their own workspace.
   * @param {object|null} profile
   * @returns {Promise<number|null>}
   */
  ownerRoleId: async function (profile = null) {
    const resolved = profile ?? (await this.profile());
    if (resolved.ownerRoleId) {
      const chosen = await WorkspaceRole.get({ id: resolved.ownerRoleId });
      if (chosen) return chosen.id;
    }
    const fallback = await WorkspaceRole.get({
      name: PERSONAL_OWNER_WORKSPACE_ROLE,
      workspace_id: null,
    });
    return fallback?.id ?? null;
  },

  /**
   * Render the configured name template for a user. `{username}`, `{email}` and
   * `{name}` are substituted; anything else is left alone.
   * @param {{username?: string, email?: string}} user
   * @param {string} template
   * @returns {string}
   */
  nameFor: function (user, template) {
    const username = user?.username || user?.email?.split("@")[0] || "user";
    return String(template)
      .replaceAll("{username}", username)
      .replaceAll("{email}", user?.email ?? username)
      .replaceAll("{name}", username)
      .trim()
      .slice(0, 255);
  },

  /**
   * Give a user the private workspace they are entitled to, if they have none yet.
   *
   * Idempotent and cheap enough to call on every workspace listing, which is how
   * accounts that predate the feature - and accounts created through SSO, invites or
   * the developer API - get theirs without a migration or a boot-time sweep. Only ever
   * creates the *first* one; any further ones are created by the user, up to the quota.
   *
   * @param {{id: number, username?: string, email?: string}|null} user
   * @returns {Promise<import("@prisma/client").workspaces|null>} the workspace it created, if any
   */
  provisionFor: async function (user = null) {
    if (!user?.id) return null;
    const profile = await this.profile();
    if (!profile.enabled || profile.quotaPerUser < 1) return null;
    if ((await this.countFor(user.id)) > 0) return null;

    const { workspace, message } = await this._create(user, profile);
    if (!workspace) {
      console.error(
        `Failed to provision a private workspace for user ${user.id}: ${message}`
      );
      return null;
    }

    await EventLogs.logEvent(
      "personal_workspace_provisioned",
      { workspaceName: workspace.name, workspaceId: workspace.id },
      user.id
    );
    return workspace;
  },

  /**
   * Create another private workspace for a user who asked for one, refusing once they
   * are at quota. The quota is checked here rather than at the route so every caller -
   * the UI, the developer API, anything added later - is held to it.
   * @param {{id: number, username?: string, email?: string}} user
   * @param {string|null} name
   * @returns {Promise<{workspace: object|null, message: string|null}>}
   */
  create: async function (user, name = null) {
    if (!user?.id) return { workspace: null, message: "No user provided" };
    const profile = await this.profile();
    if (!profile.enabled)
      return {
        workspace: null,
        message: "Private workspaces are turned off on this instance.",
      };

    const owned = await this.countFor(user.id);
    if (owned >= profile.quotaPerUser)
      return {
        workspace: null,
        message:
          profile.quotaPerUser === 0
            ? "This instance does not allow creating private workspaces."
            : `You already have the maximum of ${profile.quotaPerUser} private workspace(s).`,
      };

    const result = await this._create(user, profile, name);
    if (result.workspace)
      await EventLogs.logEvent(
        "personal_workspace_created",
        { workspaceName: result.workspace.name },
        user.id
      );
    return result;
  },

  /**
   * The actual creation, shared by provisioning and by the user-facing create. Nothing
   * outside this model should build a personal workspace - it is what guarantees the
   * owner, the type and the owner's role always arrive together.
   * @private
   */
  _create: async function (user, profile, name = null) {
    const owned = await this.countFor(user.id);
    const base = this.nameFor(user, profile.nameTemplate);
    const resolvedName =
      (typeof name === "string" && name.trim()) ||
      (owned > 0 ? `${base} ${owned + 1}` : base);

    return await Workspace.new(
      resolvedName,
      user.id,
      await PrivateWorkspaceProfile.newWorkspaceFields(),
      {
        type: WORKSPACE_TYPES.PERSONAL,
        ownerId: user.id,
        workspaceRoleId: await this.ownerRoleId(profile),
      }
    );
  },

  /**
   * Remove every private workspace a deleted account owned. `ownerId` is deliberately
   * not a foreign key (see the schema), so this is what keeps the table honest.
   * @param {number} userId
   */
  purgeForUser: async function (userId) {
    if (!userId) return;
    for (const workspace of await this.listFor(userId))
      await Workspace.purge(workspace);
  },

  // --------------------------------------------------------------- policy review

  /**
   * Which private workspaces a proposed policy would put outside it.
   *
   * Turning the feature off puts every private workspace outside it. Lowering the quota
   * puts each owner's newest ones outside it, keeping the oldest `quotaPerUser`.
   * Nothing else is destructive, so nothing else produces a list.
   *
   * @param {object} updates - the pending changes to the personal profile
   * @returns {Promise<{disabling: boolean, quotaReduced: boolean, affected: object[]}>}
   */
  impactOf: async function (updates = {}) {
    const current = await this.profile();
    const next = PrivateWorkspaceProfile.normalize({
      ...current,
      ...updates,
    });

    const disabling = current.enabled && !next.enabled;
    const quotaReduced = next.quotaPerUser < current.quotaPerUser;
    if (!disabling && !quotaReduced)
      return { disabling: false, quotaReduced: false, affected: [] };

    const workspaces = await this.all();
    const byOwner = new Map();
    for (const workspace of workspaces) {
      const list = byOwner.get(workspace.ownerId) ?? [];
      list.push(workspace);
      byOwner.set(workspace.ownerId, list);
    }

    const overQuota = [];
    for (const list of byOwner.values())
      overQuota.push(...list.slice(next.quotaPerUser));
    const overQuotaIds = new Set(overQuota.map((workspace) => workspace.id));

    // Disabling the feature affects every private workspace, not only the ones over
    // quota - there is no quota left to be under.
    const affected = disabling ? workspaces : overQuota;
    return {
      disabling,
      quotaReduced,
      affected: await Promise.all(
        affected.map((workspace) =>
          this._describe(workspace, disabling || overQuotaIds.has(workspace.id))
        )
      ),
    };
  },

  /**
   * Everything the review dialog needs to make an informed choice about one workspace.
   * @private
   */
  _describe: async function (workspace, suggested = false) {
    const { User } = require("./user");
    const owner = workspace.ownerId
      ? await User.get({ id: Number(workspace.ownerId) })
      : null;
    const [documentCount, chatCount, lastChat] = await Promise.all([
      prisma.workspace_documents.count({
        where: { workspaceId: workspace.id },
      }),
      prisma.workspace_chats.count({ where: { workspaceId: workspace.id } }),
      prisma.workspace_chats.findFirst({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      active: workspace.active,
      createdAt: workspace.createdAt,
      ownerId: workspace.ownerId,
      ownerUsername: owner?.username ?? "deleted user",
      documentCount,
      chatCount,
      lastActivityAt: lastChat?.createdAt ?? null,
      // Ticked when the dialog opens. The operator is free to untick it: this is a
      // recommendation, never a decision already taken.
      suggested,
    };
  },

  /**
   * Hold a destructive policy change until the operator says what should happen to the
   * workspaces it affects. Returns null when nothing is affected, which is the caller's
   * signal to just save.
   * @param {{id: number}} actor
   * @param {object} updates
   * @returns {Promise<{token: string, affected: object[], disabling: boolean, quotaReduced: boolean}|null>}
   */
  openReview: async function (actor, updates = {}) {
    const impact = await this.impactOf(updates);
    if (impact.affected.length === 0) return null;

    this._pruneReviews();
    const token = crypto.randomBytes(24).toString("hex");
    this._reviews.set(token, {
      actorId: Number(actor?.id) || null,
      pending: updates,
      ids: impact.affected
        .map((workspace) => workspace.id)
        .sort((a, b) => a - b),
      expiresAt: Date.now() + REVIEW_TTL_MS,
    });
    return { token, ...impact };
  },

  /**
   * Answer a review: act on the workspaces the operator picked, then save the policy
   * change that was held back.
   *
   * The stored id set is re-checked against what the same change would affect right
   * now, so a private workspace created while the dialog sat open cannot be swept up in
   * an answer given before it existed.
   *
   * @param {{id: number}} actor
   * @param {{token: string, action: string, workspaceIds?: number[]}} answer
   * @returns {Promise<{success: boolean, error: string|null, profile?: object, acted?: number[]}>}
   */
  resolveReview: async function (actor, { token, action, workspaceIds = [] }) {
    this._pruneReviews();
    const review = this._reviews.get(token);
    if (!review)
      return {
        success: false,
        error: "This review expired. Save the change again to see it afresh.",
      };
    if (review.actorId && review.actorId !== Number(actor?.id))
      return { success: false, error: "This review belongs to someone else." };
    if (!Object.values(RECONCILE_ACTIONS).includes(action))
      return { success: false, error: `Unknown action "${action}".` };

    const impact = await this.impactOf(review.pending);
    const currentIds = impact.affected
      .map((workspace) => workspace.id)
      .sort((a, b) => a - b);
    if (currentIds.join(",") !== review.ids.join(",")) {
      this._reviews.delete(token);
      return {
        success: false,
        error:
          "The private workspaces on this instance changed while you were reviewing. Save the change again to see the current list.",
      };
    }

    // Only ever act on workspaces the review itself named. A request naming anything
    // else is answering a question that was not asked.
    const permitted = new Set(review.ids);
    const selected =
      action === RECONCILE_ACTIONS.SKIP
        ? []
        : workspaceIds.map(Number).filter((id) => permitted.has(id));

    for (const id of selected) {
      const workspace = await Workspace.get({ id });
      if (!workspace) continue;
      if (action === RECONCILE_ACTIONS.DELETE) {
        await Workspace.purge(workspace);
        await EventLogs.logEvent(
          "personal_workspace_deleted_by_policy",
          {
            workspaceName: workspace.name,
            ownerId: workspace.ownerId,
          },
          actor?.id
        );
        continue;
      }
      await Workspace._update(workspace.id, { active: false });
      await EventLogs.logEvent(
        "personal_workspace_deactivated_by_policy",
        { workspaceName: workspace.name, ownerId: workspace.ownerId },
        actor?.id
      );
    }

    const { profile, error } = await PrivateWorkspaceProfile.update(
      review.pending
    );
    this._reviews.delete(token);
    if (error) return { success: false, error };

    await EventLogs.logEvent(
      "personal_workspace_policy_changed",
      {
        enabled: profile.enabled,
        quotaPerUser: profile.quotaPerUser,
        reviewed: review.ids.length,
        action,
        actedOn: selected.length,
      },
      actor?.id
    );
    return { success: true, error: null, profile, acted: selected };
  },

  /** @private */
  _pruneReviews: function () {
    const now = Date.now();
    for (const [token, review] of this._reviews.entries())
      if (review.expiresAt <= now) this._reviews.delete(token);
  },
};

module.exports = { PersonalWorkspace, RECONCILE_ACTIONS };
