const webpush = require("web-push");
const fs = require("fs");
const path = require("path");
const { User } = require("../../models/user");
const { Role } = require("../../models/role");
const { safeJsonParse } = require("../http");

/**
 * For more options, see:
 * https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification#options
 * @typedef {Object} PushNotificationPayload
 * @property {string} title - The title of the notification.
 * @property {string} body - The message of the notification.
 * @property {Object} data - Unstructured data for the notification. Use this for anything non-standard.
 * @property {string} [data.onClickUrl] - The URL to open when the notification is clicked. Note: Can be relative or absolute.
 * @property {Object[]} actions - The actions for the notification.
 * @property {string} [actions[].action] - The action to perform when the notification is clicked. Handled in the service worker.
 * @property {string} [actions[].title] - The title of the action to show in the Options dropdown
 * @property {string} image - A string containing the URL of an image to be displayed in the notification.
 */

class PushNotifications {
  static mailTo = "anythingllm@localhost";
  /**
   * @type {PushNotifications}
   */
  static instance = null;

  /**
   * The VAPID keys for the push notification service.
   * @type {{publicKey: string | null, privateKey: string | null}}
   */
  #vapidKeys = {
    publicKey: null,
    privateKey: null,
  };

  /**
   * The subscriptions for the push notification service.
   * @type {Map<string, Object>}
   */
  #subscriptions = new Map();

  constructor() {
    if (PushNotifications.instance) return PushNotifications.instance;
    PushNotifications.instance = this;
  }

  #log(text, ...args) {
    console.log(`\x1b[36m[PushNotifications]\x1b[0m ${text}`, ...args);
  }

  get pushService() {
    try {
      const vapidKeys = this.existingVapidKeys;
      if (!vapidKeys.publicKey || !vapidKeys.privateKey)
        throw new Error(
          "VAPID keys not found. Make sure they are generated in the main process first."
        );
      webpush.setVapidDetails(
        `mailto:${this.mailTo}`,
        vapidKeys.publicKey,
        vapidKeys.privateKey
      );
      return webpush;
    } catch (e) {
      console.error("Failed to set VAPID details", e);
      return null;
    }
  }

  get storagePath() {
    return process.env.NODE_ENV === "development"
      ? path.resolve(__dirname, `../../storage`, "push-notifications")
      : path.resolve(process.env.STORAGE_DIR, "push-notifications");
  }

  get existingVapidKeys() {
    // Already loaded and binded to the instance
    if (this.#vapidKeys.publicKey && this.#vapidKeys.privateKey)
      return this.#vapidKeys;

    const vapidKeysPath = path.resolve(this.storagePath, `vapid-keys.json`);
    if (!fs.existsSync(vapidKeysPath))
      return { publicKey: null, privateKey: null };

    const existingVapidKeys = JSON.parse(
      fs.readFileSync(vapidKeysPath, "utf8")
    );
    this.#log(`Loaded existing VAPID keys!`);
    this.#vapidKeys.publicKey = existingVapidKeys.publicKey;
    this.#vapidKeys.privateKey = existingVapidKeys.privateKey;
    return this.#vapidKeys;
  }

  get publicVapidKey() {
    return this.existingVapidKeys.publicKey;
  }

  /**
   * Load the subscriptions for the push notification service. Subscriptions live on the
   * user record, so the map is always keyed by user id.
   * @returns {Promise<void>}
   */
  async loadSubscriptions() {
    const users = await User._where({
      web_push_subscription_config: { not: null },
    });
    for (const user of users) {
      const subscription = safeJsonParse(
        user.web_push_subscription_config,
        null
      );
      if (subscription) this.#subscriptions.set(user.id, subscription);
    }
    this.#log(`Loaded ${this.#subscriptions.size} existing subscriptions.`);
  }

  /**
   * Register a new subscription for a user.
   * @param {Object} user - The user to register the subscription for.
   * @param {Object} subscription - The subscription to register.
   * @returns {Promise<PushNotifications>}
   */
  async registerSubscription(user = null, subscription) {
    if (!user?.id) {
      this.#log(".registerSubscription() - No user to register subscription");
      return this;
    }

    this.#subscriptions.set(user.id, subscription);
    await User._update(user.id, {
      web_push_subscription_config: JSON.stringify(subscription),
    });
    this.#log(`Registered or updated subscription for user - ${user.id}`);
    return this;
  }

  /**
   * Send a push notification to a single subscribed user.
   * @param {Object} options - The options for the notification.
   * @param {number} [options.to] - The id of the user to notify.
   * @param {PushNotificationPayload} [options.payload] - The payload to send to the clients.
   * @returns {Promise<void>}
   */
  sendNotification({ to = null, payload = {} } = {}) {
    if (this.#subscriptions.size === 0)
      return this.#log(".sendNotification() - No subscriptions found");
    if (!this.#subscriptions.has(to))
      return this.#log(
        `.sendNotification() - Subscription for user ${to} not found`
      );
    this.#log(`.sendNotification() - Sending notification to user ${to}`);
    return this.pushService
      .sendNotification(this.#subscriptions.get(to), JSON.stringify(payload))
      .then((res) => {
        this.#log(`.sendNotification() - Delivered (status: ${res.statusCode})`);
      })
      .catch((err) => {
        this.#log(`.sendNotification() - Failed: ${err.message}`);
      });
  }

  /**
   * Notify every subscribed system administrator. Used by instance-wide background work
   * (scheduled jobs) that is configured by admins and has no single owning user.
   * @param {PushNotificationPayload} payload
   * @returns {Promise<void>}
   */
  async sendNotificationToAdmins(payload = {}) {
    if (this.#subscriptions.size === 0)
      return this.#log(".sendNotificationToAdmins() - No subscriptions found");

    const admins = await User._where({
      role: Role.superAdminRoleName(),
      web_push_subscription_config: { not: null },
    });
    if (admins.length === 0)
      return this.#log(
        ".sendNotificationToAdmins() - No subscribed administrators"
      );

    await Promise.all(
      admins.map((admin) => this.sendNotification({ to: admin.id, payload }))
    );
  }

  /**
   * Setup the push notification service.
   * This will generate new VAPID keys if they don't exist and save them to the storage path.
   * It will also load the subscriptions from the database or the primary-subscription.json file.
   * @returns {Promise<void>}
   */
  static async setupPushNotificationService() {
    const instance = PushNotifications.instance;
    const existingVapidKeys = instance.existingVapidKeys;

    if (!existingVapidKeys.publicKey || !existingVapidKeys.privateKey) {
      instance.#log("Generating new VAPID keys...");
      const vapidKeys = webpush.generateVAPIDKeys();
      instance.#vapidKeys.publicKey = vapidKeys.publicKey;
      instance.#vapidKeys.privateKey = vapidKeys.privateKey;
      instance.#log(`New VAPID keys generated!`);
      if (!fs.existsSync(instance.storagePath))
        fs.mkdirSync(instance.storagePath, { recursive: true });
      fs.writeFileSync(
        path.resolve(instance.storagePath, `vapid-keys.json`),
        JSON.stringify(vapidKeys, null, 2)
      );
    }

    await instance.loadSubscriptions();
    instance.pushService;
    return;
  }
}

module.exports = {
  pushNotificationService: new PushNotifications(),
  PushNotifications,
};
