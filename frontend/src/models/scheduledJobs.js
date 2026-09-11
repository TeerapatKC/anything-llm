import { API_BASE, fullApiUrl } from "@/utils/constants";
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

  // Instance-wide schedule log page - every run (status/duration/error) across
  // every job, each with its result-email delivery attempts attached, paginated.
  // Pass jobId to filter to a single job's runs. Mirrors System.eventLogs.
  allLogs: async function (offset = 0, jobId = null) {
    return await fetch(`${API_BASE}/scheduled-jobs/logs`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ offset, jobId }),
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

  // startDate/endDate are "YYYY-MM-DD" strings, or null to export everything.
  // Mirrors System.exportEventLogs. Returns the raw file text, or null on failure.
  exportLogs: async function (
    format = "csv",
    startDate = null,
    endDate = null,
    jobId = null
  ) {
    const url = new URL(`${fullApiUrl()}/scheduled-jobs/logs/export`);
    url.searchParams.append("format", format);
    if (startDate) url.searchParams.append("startDate", startDate);
    if (endDate) url.searchParams.append("endDate", endDate);
    if (jobId) url.searchParams.append("jobId", jobId);
    return await fetch(url, { method: "GET", headers: baseHeaders() })
      .then((res) => {
        if (res.ok) return res.text();
        throw new Error(res.statusText);
      })
      .catch((e) => {
        console.error(e);
        return null;
      });
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

    allLogs: async function (slug, offset = 0, jobId = null) {
      return await fetch(
        `${API_BASE}/workspace/${slug}/scheduled-jobs/logs`,
        {
          method: "POST",
          headers: baseHeaders(),
          body: JSON.stringify({ offset, jobId }),
        }
      )
        .then((res) => res.json())
        .catch(() => ({ logs: [], hasPages: false }));
    },

    exportLogs: async function (
      slug,
      format = "csv",
      startDate = null,
      endDate = null,
      jobId = null
    ) {
      const url = new URL(
        `${fullApiUrl()}/workspace/${slug}/scheduled-jobs/logs/export`
      );
      url.searchParams.append("format", format);
      if (startDate) url.searchParams.append("startDate", startDate);
      if (endDate) url.searchParams.append("endDate", endDate);
      if (jobId) url.searchParams.append("jobId", jobId);
      return await fetch(url, { method: "GET", headers: baseHeaders() })
        .then((res) => {
          if (res.ok) return res.text();
          throw new Error(res.statusText);
        })
        .catch((e) => {
          console.error(e);
          return null;
        });
    },
  },
};

export default ScheduledJobs;
