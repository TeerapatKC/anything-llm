import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

const ScheduledJobs = {
  smtpStatus: async function () {
    return await fetch(`${API_BASE}/scheduled-jobs/smtp-status`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch(() => ({ ready: false }));
  },

  list: async function () {
    return await fetch(`${API_BASE}/scheduled-jobs`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch(() => ({ jobs: [] }));
  },

  create: async function (data) {
    return await fetch(`${API_BASE}/scheduled-jobs/new`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .catch(() => ({ job: null, error: "Failed to create scheduled job" }));
  },

  get: async function (id) {
    return await fetch(`${API_BASE}/scheduled-jobs/${id}`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch(() => ({ job: null }));
  },

  update: async function (id, data) {
    return await fetch(`${API_BASE}/scheduled-jobs/${id}`, {
      method: "PUT",
      headers: baseHeaders(),
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .catch((e) => ({
        job: null,
        error: e.message,
      }));
  },

  delete: async function (id) {
    return await fetch(`${API_BASE}/scheduled-jobs/${id}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch(() => ({ success: false }));
  },

  toggle: async function (id) {
    return await fetch(`${API_BASE}/scheduled-jobs/${id}/toggle`, {
      method: "POST",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch(() => ({ job: null }));
  },

  trigger: async function (id) {
    return await fetch(`${API_BASE}/scheduled-jobs/${id}/trigger`, {
      method: "POST",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ success: false, error: e.message }));
  },

  runs: async function (id) {
    return await fetch(`${API_BASE}/scheduled-jobs/${id}/runs`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch(() => ({ runs: [] }));
  },

  getRun: async function (runId) {
    return await fetch(`${API_BASE}/scheduled-jobs/runs/${runId}`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch(() => ({ run: null, job: null }));
  },

  markRunRead: async function (runId) {
    return await fetch(`${API_BASE}/scheduled-jobs/runs/${runId}/read`, {
      method: "POST",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch(() => ({ success: false }));
  },

  continueInThread: async function (runId) {
    return await fetch(`${API_BASE}/scheduled-jobs/runs/${runId}/continue`, {
      method: "POST",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({
        workspaceSlug: null,
        threadSlug: null,
        error: e.message,
      }));
  },

  availableTools: async function () {
    return await fetch(`${API_BASE}/scheduled-jobs/available-tools`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch(() => ({ tools: [] }));
  },

  availableRecipients: async function () {
    return await fetch(`${API_BASE}/scheduled-jobs/available-recipients`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch(() => ({ workspaces: [], users: [] }));
  },

  killRun: async function (runId) {
    return await fetch(`${API_BASE}/scheduled-jobs/runs/${runId}/kill`, {
      method: "POST",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ success: false, error: e.message }));
  },

  emailLogs: async function (runId) {
    return await fetch(
      `${API_BASE}/scheduled-jobs/runs/${runId}/email-logs`,
      { headers: baseHeaders() }
    )
      .then((res) => res.json())
      .catch(() => ({ logs: [] }));
  },

  // Instance-wide schedule log page - every result-email delivery attempt
  // across every job, paginated. Mirrors System.eventLogs/clearEventLogs.
  allLogs: async function (offset = 0) {
    return await fetch(`${API_BASE}/scheduled-jobs/logs`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ offset }),
    })
      .then((res) => res.json())
      .catch(() => ({ logs: [], hasPages: false }));
  },

  clearLogs: async function () {
    return await fetch(`${API_BASE}/scheduled-jobs/logs`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ success: false, error: e.message }));
  },

  // Jobs owned by a single workspace - managed from that workspace's own
  // settings instead of the instance-wide GeneralSettings page. Mirrors
  // AgentFlows.workspace.* / Workspace.slashCommands.*.
  workspace: {
    smtpStatus: async function (slug) {
      return await fetch(
        `${API_BASE}/scheduled-jobs/smtp-status`,
        { headers: baseHeaders() }
      )
        .then((res) => res.json())
        .catch(() => ({ ready: false }));
    },

    list: async function (slug) {
      return await fetch(`${API_BASE}/workspace/${slug}/scheduled-jobs`, {
        headers: baseHeaders(),
      })
        .then((res) => res.json())
        .catch(() => ({ jobs: [] }));
    },

    create: async function (slug, data) {
      return await fetch(`${API_BASE}/workspace/${slug}/scheduled-jobs`, {
        method: "POST",
        headers: baseHeaders(),
        body: JSON.stringify(data),
      })
        .then((res) => res.json())
        .catch(() => ({ job: null, error: "Failed to create scheduled job" }));
    },

    get: async function (slug, id) {
      return await fetch(`${API_BASE}/workspace/${slug}/scheduled-jobs/${id}`, {
        headers: baseHeaders(),
      })
        .then((res) => res.json())
        .catch(() => ({ job: null }));
    },

    update: async function (slug, id, data) {
      return await fetch(`${API_BASE}/workspace/${slug}/scheduled-jobs/${id}`, {
        method: "POST",
        headers: baseHeaders(),
        body: JSON.stringify(data),
      })
        .then((res) => res.json())
        .catch((e) => ({ job: null, error: e.message }));
    },

    delete: async function (slug, id) {
      return await fetch(`${API_BASE}/workspace/${slug}/scheduled-jobs/${id}`, {
        method: "DELETE",
        headers: baseHeaders(),
      })
        .then((res) => res.json())
        .catch(() => ({ success: false }));
    },

    toggle: async function (slug, id) {
      return await fetch(
        `${API_BASE}/workspace/${slug}/scheduled-jobs/${id}/toggle`,
        { method: "POST", headers: baseHeaders() }
      )
        .then((res) => res.json())
        .catch(() => ({ job: null }));
    },

    trigger: async function (slug, id) {
      return await fetch(
        `${API_BASE}/workspace/${slug}/scheduled-jobs/${id}/trigger`,
        { method: "POST", headers: baseHeaders() }
      )
        .then((res) => res.json())
        .catch((e) => ({ success: false, error: e.message }));
    },

    runs: async function (slug, id) {
      return await fetch(
        `${API_BASE}/workspace/${slug}/scheduled-jobs/${id}/runs`,
        { headers: baseHeaders() }
      )
        .then((res) => res.json())
        .catch(() => ({ runs: [] }));
    },

    getRun: async function (slug, runId) {
      return await fetch(
        `${API_BASE}/workspace/${slug}/scheduled-jobs/runs/${runId}`,
        { headers: baseHeaders() }
      )
        .then((res) => res.json())
        .catch(() => ({ run: null, job: null }));
    },

    markRunRead: async function (slug, runId) {
      return await fetch(
        `${API_BASE}/workspace/${slug}/scheduled-jobs/runs/${runId}/read`,
        { method: "POST", headers: baseHeaders() }
      )
        .then((res) => res.json())
        .catch(() => ({ success: false }));
    },

    continueInThread: async function (slug, runId) {
      return await fetch(
        `${API_BASE}/workspace/${slug}/scheduled-jobs/runs/${runId}/continue`,
        { method: "POST", headers: baseHeaders() }
      )
        .then((res) => res.json())
        .catch((e) => ({ workspaceSlug: null, threadSlug: null, error: e.message }));
    },

    killRun: async function (slug, runId) {
      return await fetch(
        `${API_BASE}/workspace/${slug}/scheduled-jobs/runs/${runId}/kill`,
        { method: "POST", headers: baseHeaders() }
      )
        .then((res) => res.json())
        .catch((e) => ({ success: false, error: e.message }));
    },

    availableTools: async function (slug) {
      return await fetch(
        `${API_BASE}/workspace/${slug}/scheduled-jobs/available-tools`,
        { headers: baseHeaders() }
      )
        .then((res) => res.json())
        .catch(() => ({ tools: [] }));
    },

    members: async function (slug) {
      return await fetch(
        `${API_BASE}/workspace/${slug}/scheduled-jobs/members`,
        { headers: baseHeaders() }
      )
        .then((res) => res.json())
        .catch(() => ({ members: [] }));
    },

    emailLogs: async function (slug, runId) {
      return await fetch(
        `${API_BASE}/workspace/${slug}/scheduled-jobs/runs/${runId}/email-logs`,
        { headers: baseHeaders() }
      )
        .then((res) => res.json())
        .catch(() => ({ logs: [] }));
    },
  },
};

export default ScheduledJobs;
