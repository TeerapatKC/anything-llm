const t = (key, substitutions) =>
  chrome.i18n.getMessage(key, substitutions) || key;

const ContextMenuModel = {
  async create(workspaces) {
    await chrome.contextMenus.removeAll();

    if (workspaces && workspaces.length > 0) {
      chrome.contextMenus.create({
        id: "saveToNexusAI",
        title: t("context_save_selection"),
        contexts: ["selection"],
      });

      chrome.contextMenus.create({
        id: "embedToWorkspace",
        title: t("context_embed_selection"),
        contexts: ["selection"],
      });

      chrome.contextMenus.create({
        id: "saveEntirePageToNexusAI",
        title: t("context_save_page"),
        contexts: ["page"],
      });

      chrome.contextMenus.create({
        id: "embedEntirePageToWorkspace",
        title: t("context_embed_page"),
        contexts: ["page"],
      });

      workspaces.forEach((workspace) => {
        chrome.contextMenus.create({
          id: `workspace-selected-${workspace.id}`,
          parentId: "embedToWorkspace",
          title: workspace.name,
          contexts: ["selection"],
        });
        chrome.contextMenus.create({
          id: `workspace-page-${workspace.id}`,
          parentId: "embedEntirePageToWorkspace",
          title: workspace.name,
          contexts: ["page"],
        });
      });
    } else {
      chrome.contextMenus.create({
        id: "saveToNexusAI",
        title: t("context_save_selection"),
        contexts: ["selection"],
      });
      chrome.contextMenus.create({
        id: "saveEntirePageToNexusAI",
        title: t("context_save_page"),
        contexts: ["page"],
      });
    }
  },

  async remove() {
    await chrome.contextMenus.removeAll();
  },
};

const ExtensionModel = {
  async checkApiKeyValidity() {
    const { apiBase, apiKey } = await chrome.storage.sync.get([
      "apiBase",
      "apiKey",
    ]);

    if (!apiBase || !apiKey) {
      await ContextMenuModel.remove();
      return false;
    }

    const data = await fetch(`${apiBase}/browser-extension/check`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Response not ok.");
        return res.json();
      })
      .catch(() => null);

    if (data === null) {
      await chrome.storage.sync.remove(["apiBase", "apiKey"]);
      await ContextMenuModel.remove();
      return false;
    }

    await ContextMenuModel.create(data.workspaces);
    return true;
  },

  async updateWorkspaces() {
    const { apiBase, apiKey } = await chrome.storage.sync.get([
      "apiBase",
      "apiKey",
    ]);

    if (!apiBase || !apiKey) return await ContextMenuModel.remove();

    const data = await fetch(`${apiBase}/browser-extension/check`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Response not ok.");
        return res.json();
      })
      .catch(() => null);

    if (data === null) return await ContextMenuModel.remove();
    await ContextMenuModel.create(data.workspaces);
    return;
  },

  async saveToNexusAI(selectedText, pageTitle, pageUrl) {
    const { apiBase, apiKey } = await chrome.storage.sync.get([
      "apiBase",
      "apiKey",
    ]);
    if (!apiBase || !apiKey) return;

    this.showNotification("loading", t("upload_selection_loading"));
    const response = await fetch(
      `${apiBase}/browser-extension/upload-content`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          textContent: selectedText,
          metadata: { title: pageTitle, url: pageUrl },
        }),
      }
    );

    this.handleResponse(response, "action_save_content");
  },

  async embedToWorkspace(workspaceId, selectedText, pageTitle, pageUrl) {
    const { apiBase, apiKey } = await chrome.storage.sync.get([
      "apiBase",
      "apiKey",
    ]);
    if (!apiBase || !apiKey) return;

    this.showNotification("loading", t("embed_selection_loading"));
    const response = await fetch(`${apiBase}/browser-extension/embed-content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        workspaceId,
        textContent: selectedText,
        metadata: { title: pageTitle, url: pageUrl },
      }),
    });

    this.handleResponse(response, "action_embed_content");
  },

  async saveEntirePageToNexusAI(pageContent, pageTitle, pageUrl) {
    const { apiBase, apiKey } = await chrome.storage.sync.get([
      "apiBase",
      "apiKey",
    ]);
    if (!apiBase || !apiKey) return;

    this.showNotification("loading", t("upload_page_loading"));
    const response = await fetch(
      `${apiBase}/browser-extension/upload-content`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          textContent: pageContent,
          metadata: { title: pageTitle, url: pageUrl },
        }),
      }
    );

    this.handleResponse(response, "action_save_page");
  },

  async embedEntirePageToWorkspace(
    workspaceId,
    pageContent,
    pageTitle,
    pageUrl
  ) {
    const { apiBase, apiKey } = await chrome.storage.sync.get([
      "apiBase",
      "apiKey",
    ]);
    if (!apiBase || !apiKey) return;

    this.showNotification("loading", t("embed_page_loading"));
    const response = await fetch(`${apiBase}/browser-extension/embed-content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        workspaceId,
        textContent: pageContent,
        metadata: { title: pageTitle, url: pageUrl },
      }),
    });

    this.handleResponse(response, "action_embed_page");
  },

  async handleResponse(response, action) {
    if (response.status === 401 || response.status === 403) {
      await chrome.storage.sync.remove(["apiBase", "apiKey"]);
      await ContextMenuModel.remove();
      this.showNotification("error", t("authentication_failed"));
    } else if (!response.ok) {
      await this.checkApiKeyValidity();
      this.showNotification("error", t("action_failed", t(action)));
    } else {
      this.showNotification("success", t("save_success"));
    }
  },

  /**
   * Shows badge notification on extension icon
   * @param {"success"|"error"|"loading"} type
   * @param {string} message
   */
  showNotification(type, message) {
    const NOTIFICATION_MAP = {
      success: {
        title: t("status_success"),
        icon: "✅",
      },
      error: {
        title: t("status_error"),
        icon: "❌",
      },
      loading: {
        title: t("status_loading"),
        icon: "⏳",
      },
    };
    if (!NOTIFICATION_MAP.hasOwnProperty(type)) return;
    const { icon, title } = NOTIFICATION_MAP[type];
    chrome.action.setBadgeText({ text: icon });
    chrome.action.setTitle({ title: `${title}: ${message}` });

    setTimeout(() => {
      chrome.action.setBadgeText({ text: "" });
      chrome.action.setTitle({ title: t("extension_title") });
    }, 5000);
  },
};

// Event Listeners
chrome.runtime.onInstalled.addListener(async () => {
  await ExtensionModel.checkApiKeyValidity();
});

chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message.action === "connectionUpdated")
    return ExtensionModel.checkApiKeyValidity();

  if (message.action === "newApiKey") {
    const [apiBase, apiKey] = message.connectionString.split("|");
    chrome.storage.sync.set({ apiBase, apiKey }, () => {
      ExtensionModel.checkApiKeyValidity();
      chrome.action.openPopup();
    });
    return;
  }
});

function getPageContent(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { action: "getPageContent" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else if (response && response.content) {
        resolve(response.content);
      } else {
        reject(new Error("Failed to get page content"));
      }
    });
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "saveToNexusAI") {
    ExtensionModel.saveToNexusAI(info.selectionText, tab.title, tab.url);
    return;
  }

  if (info.menuItemId.startsWith("workspace-selected-")) {
    const workspaceId = info.menuItemId.split("-")[2];
    ExtensionModel.embedToWorkspace(
      workspaceId,
      info.selectionText,
      tab.title,
      tab.url
    );
    return;
  }

  if (info.menuItemId === "saveEntirePageToNexusAI") {
    getPageContent(tab.id)
      .then((content) => {
        ExtensionModel.saveEntirePageToNexusAI(content, tab.title, tab.url);
      })
      .catch((error) => {
        console.error("Error getting page content:", error);
        ExtensionModel.showNotification("error", t("page_content_failed"));
      });
    return;
  }

  if (info.menuItemId.startsWith("workspace-page-")) {
    const workspaceId = info.menuItemId.split("-")[2];
    getPageContent(tab.id)
      .then((content) => {
        ExtensionModel.embedEntirePageToWorkspace(
          workspaceId,
          content,
          tab.title,
          tab.url
        );
      })
      .catch((error) => {
        console.error("Error getting page content:", error);
        ExtensionModel.showNotification("error", t("page_content_failed"));
      });
    return;
  }
});

// Remove context menu items when connection is lost
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "sync" && (changes.apiBase || changes.apiKey)) {
    if (!changes.apiBase?.newValue || !changes.apiKey?.newValue) {
      ContextMenuModel.remove();
    }
  }
});

// Update workspaces periodically
chrome.alarms.create("updateWorkspaces", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "updateWorkspaces") {
    ExtensionModel.updateWorkspaces();
  }
});
