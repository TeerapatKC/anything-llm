const TRANSLATIONS = {
  onboarding: {
    home: {
      welcome: "Welcome",
      getStarted: "Get Started",
    },
    userSetup: {
      title: "User Setup",
      description: "Configure your user settings.",
      adminUsername: "Admin account username",
      adminEmail: "Admin account email",
      adminPassword: "Admin account password",
      adminPasswordReq: "Passwords must be at least 8 characters.",
      teamHint:
        "By default, you will be the only admin. Once onboarding is completed you can create and invite others to be users or admins. Do not lose your password as only admins can reset passwords.",
    },
  },
  common: {
    "workspaces-name": "Workspace Name",
    selection: "Model Selection",
    saving: "Saving...",
    save: "Save changes",
    previous: "Previous Page",
    next: "Next Page",
    optional: "Optional",
    on: "On",
    none: "None",
    stopped: "Stopped",
    search: "Search",
    username_requirements:
      "Username must be 2-64 characters, start with a lowercase letter, and only contain lowercase letters, numbers, underscores, hyphens, and periods.",
    loading: "Loading",
    refresh: "Refresh",
    delete: "Delete",
  },
  home: {
    welcome: "Welcome",
    chooseWorkspace: "Choose a workspace to start chatting!",
    noWorkspaces:
      "You don't have any workspaces yet.\nCreate one to start chatting.",
    notAssigned:
      "You currently aren't assigned to any workspaces.\nPlease contact your administrator to request access to a workspace.",
    goToWorkspace: 'Go to "{{workspace}}"',
  },
  settings: {
    title: "Instance Settings",
    invites: "Invites",
    users: "Users",
    roles: "Roles & Permissions",
    workspaces: "Workspaces",
    "workspace-chats": "Workspace Chats",
    customization: "Customization",
    interface: "UI Preferences",
    branding: "Branding & Whitelabeling",
    chat: "Chat",
    "api-keys": "Developer API",
    llm: "LLM",
    transcription: "Transcription",
    embedder: "Embedder",
    "text-splitting": "Text Splitter & Chunking",
    "image-generation": "Image Generation",
    "voice-speech": "Voice & Speech",
    "vector-database": "Vector Database",
    embeds: "Chat Embed",
    "event-logs": "Event Logs",
    "scheduled-jobs": "Scheduled Jobs",
    privacy: "Privacy & Data",
    "ai-providers": "AI Providers",
    "agent-skills": "Agent Skills",
    "agent-flow": "Agent Flow",
    "sql-connector": "SQL Connector",
    "agent-skills-settings": "Settings",
    "default-system-prompt": "Default System Prompt",
    "instance-owner": "Instance Owner",
    "model-router": "Model Router",
    "community-hub": {
      title: "Community Hub",
      trending: "Explore Trending",
      "your-account": "Your Account",
      "import-item": "Import Item",
    },
    admin: "Admin",
    tools: "Tools",
    "system-prompt-variables": "System Prompt Variables",
    "slash-commands": "Slash Commands",
    "experimental-features": "Experimental Features",
    contact: "Contact Support",
    "browser-extension": "Browser Extension",
    smtp: "SMTP",
    "mobile-app": "NexusAI Mobile",
    channels: "Channels",
    "available-channels": {
      telegram: "Telegram",
      line: "LINE",
    },
  },
  login: {
    form: {
      welcome: "Welcome",
      "placeholder-username": "Username",
      "placeholder-password": "Password",
      login: "Login",
      validating: "Validating...",
      "forgot-pass": "Forgot password",
      reset: "Reset",
    },
    "sign-in":
      "Enter your username and password to access your {{appName}} instance.",
    "password-reset": {
      title: "Password Reset",
      "admin-reset-description":
        "Ask an administrator to reset your password. They will generate a new one for you, and you will be asked to choose your own password the next time you log in.",
      "back-to-login": "Back to Login",
    },
  },
  "main-page": {
    greeting: "How can I help you today?",
    quickActions: {
      createAgent: "Create an Agent",
      editWorkspace: "Edit Workspace",
      uploadDocument: "Upload a Document",
    },
  },
  "new-workspace": {
    title: "New Workspace",
    placeholder: "My Workspace",
  },
  "workspaces—settings": {
    general: "General Settings",
    chat: "Chat Settings",
    vector: "Vector Database",
    members: "Members",
    agent: "Agent Configuration",
    "upload-documents": "Upload Documents",
  },
  general: {
    vector: {
      title: "Vector Count",
      description: "Total number of vectors in your vector database.",
    },
    names: {
      description: "This will only change the display name of your workspace.",
    },
    message: {
      title: "Suggested Chat Messages",
      description:
        "Customize the messages that will be suggested to your workspace users.",
      add: "Add new message",
      save: "Save Messages",
      heading: "Explain to me",
      body: "the benefits of NexusAI",
    },
    status: {
      title: "Workspace Status",
      description:
        "An inactive workspace keeps all of its documents, chats and members, but nobody can chat in it and any embeds pointing at it stop responding.",
      active: "Active",
      inactive: "Inactive",
      deactivate: "Deactivate",
      activated: "Workspace is now active.",
      deactivated: "Workspace is now inactive.",
      "chat-disabled":
        "This workspace is inactive. An admin must activate it before you can chat here.",
      failed: "Failed to update workspace status.",
      "confirm-title": "Deactivate this workspace?",
      "confirm-description":
        "Members will not be able to chat in this workspace until it is activated again. Nothing is deleted.",
    },
    delete: {
      title: "Delete Workspace",
      description:
        "Delete this workspace and all of its data. This will delete the workspace for all users.",
      delete: "Delete Workspace",
      deleting: "Deleting Workspace...",
      "confirm-start": "You are about to delete your entire",
      "confirm-end":
        "workspace. This will remove all vector embeddings in your vector database.\n\nThe original source files will remain untouched. This action is irreversible.",
    },
  },
  chat: {
    llm: {
      title: "Workspace LLM Provider",
      description:
        "The specific LLM provider & model that will be used for this workspace. By default, it uses the system LLM provider and settings.",
      search: "Search all LLM providers",
    },
    model: {
      title: "Workspace Chat model",
      description:
        "The specific chat model that will be used for this workspace. If empty, will use the system LLM preference.",
    },
    mode: {
      title: "Chat mode",
      automatic: {
        title: "Agent",
        description:
          "will automatically use tools if the model and provider support native tool calling.<br />If native tooling is not supported, you will need to use the @agent command to use tools.",
      },
      chat: {
        title: "Chat",
        description:
          "will provide answers with the LLM's general knowledge <b>and</b> document context that is found.<br />You will need to use the @agent command to use tools.",
      },
      query: {
        title: "Query",
        description:
          "will provide answers <b>only</b> if document context is found.<br />You will need to use the @agent command to use tools.",
      },
    },
    history: {
      title: "Chat History",
      "desc-start":
        "The number of previous chats that will be included in the response's short-term memory.",
      recommend: "Recommend 20. ",
    },
    prompt: {
      title: "System Prompt",
      description:
        "The prompt that will be used on this workspace. Define the context and instructions for the AI to generate a response. You should provide a carefully crafted prompt so the AI can generate a relevant and accurate response.",
      history: {
        title: "System Prompt History",
        clearAll: "Clear All",
        noHistory: "No system prompt history available",
        restore: "Restore",
        delete: "Delete",
        publish: "Publish to Community Hub",
        deleteConfirm: "Are you sure you want to delete this history item?",
        clearAllConfirm:
          "Are you sure you want to clear all history? This action cannot be undone.",
        expand: "Expand",
      },
    },
    refusal: {
      title: "Query mode refusal response",
      "desc-start": "When in",
      query: "query",
      "desc-end":
        "mode, you may want to return a custom refusal response when no context is found.",
      "tooltip-title": "Why am I seeing this?",
      "tooltip-description":
        "You are in query mode, which only uses information from your documents. Switch to chat mode for more flexible conversations, or click here to visit our documentation to learn more about chat modes.",
    },
    temperature: {
      title: "LLM Temperature",
      "desc-end":
        "The higher the number the more creative. For some models this can lead to incoherent responses when set too high.",
    },
  },
  "vector-workspace": {
    identifier: "Vector database identifier",
    snippets: {
      title: "Max Context Snippets",
      description:
        "This setting controls the maximum amount of context snippets that will be sent to the LLM for per chat or query.",
      recommend: "Recommended: 4",
    },
    doc: {
      title: "Document similarity threshold",
      description:
        "The minimum similarity score required for a source to be considered related to the chat. The higher the number, the more similar the source must be to the chat.",
      zero: "No restriction",
      low: "Low (similarity score ≥ .25)",
      medium: "Medium (similarity score ≥ .50)",
      high: "High (similarity score ≥ .75)",
    },
    reset: {
      reset: "Reset Vector Database",
      resetting: "Clearing vectors...",
      confirm:
        "You are about to reset this workspace's vector database. This will remove all vector embeddings currently embedded.\n\nThe original source files will remain untouched. This action is irreversible.",
      error: "Workspace vector database could not be reset!",
      success: "Workspace vector database was reset!",
    },
  },
  agent: {
    "performance-warning":
      "Performance of LLMs that do not explicitly support tool-calling is highly dependent on the model's capabilities and accuracy. Some abilities may be limited or non-functional.",
    provider: {
      title: "Workspace Agent LLM Provider",
      description:
        "The specific LLM provider & model that will be used for this workspace's @agent agent.",
    },
    mode: {
      chat: {
        title: "Workspace Agent Chat model",
        description:
          "The specific chat model that will be used for this workspace's @agent agent.",
      },
      title: "Workspace Agent model",
      description:
        "The specific LLM model that will be used for this workspace's @agent agent.",
      wait: "-- waiting for models --",
    },
    skill: {
      rag: {
        title: "RAG & long-term memory",
        description:
          'Allow the agent to leverage your local documents to answer a query or ask the agent to "remember" pieces of content for long-term memory retrieval.',
      },
      view: {
        title: "View & summarize documents",
        description:
          "Allow the agent to list and summarize the content of workspace files currently embedded.",
      },
      scrape: {
        title: "Scrape websites",
        description:
          "Allow the agent to visit and scrape the content of websites.",
      },
      generate: {
        title: "Generate charts",
        description:
          "Enable the default agent to generate various types of charts from data provided or given in chat.",
      },
      web: {
        title: "Web Search",
        description:
          "Enable your agent to search the web to answer your questions by connecting to a web-search (SERP) provider.",
      },
      sql: {
        title: "SQL Connector",
        description:
          "Enable your agent to be able to leverage SQL to answer you questions by connecting to various SQL database providers.",
      },
      scheduledJob: {
        title: "Create scheduled jobs",
        description:
          'Allow the agent to create recurring Scheduled Jobs from chat (e.g. "every weekday at 9am summarize my inbox and email me").',
      },
      filesystem: {
        title: "File System Access",
        description:
          "Enable your agent to read, write, search, and manage files within a designated directory. Supports file editing, directory navigation, and content search.",
        learnMore: "Learn more about this how to use this skill",
        configuration: "Configuration",
        readActions: "Read Actions",
        writeActions: "Write Actions",
        warning:
          "Filesystem access can be dangerous as it can modify or delete files. Please consult the <a>documentation</a> before enabling.",
        skills: {
          "read-text-file": {
            title: "Read File",
            description:
              "Read contents of files (text, code, PDF, images, etc.)",
          },
          "read-multiple-files": {
            title: "Read Multiple Files",
            description: "Read multiple files at once",
          },
          "list-directory": {
            title: "List Directory",
            description: "List files and directories in a folder",
          },
          "search-files": {
            title: "Search Files",
            description: "Search for files by name or content",
          },
          "get-file-info": {
            title: "Get File Info",
            description: "Get detailed metadata about files",
          },
          "write-text-file": {
            title: "Write Text File",
            description:
              "Create new text files or overwrite existing text files",
          },
          "edit-file": {
            title: "Edit File",
            description: "Make line-based edits to text files",
          },
          "create-directory": {
            title: "Create Directory",
            description: "Create new directories",
          },
          "copy-file": {
            title: "Copy File",
            description: "Copy files and directories",
          },
          "move-file": {
            title: "Move/Rename File",
            description: "Move or rename files and directories",
          },
        },
      },
      createFiles: {
        title: "Document Creation",
        description:
          "Enable your agent to create binary document formats like PowerPoint presentations, Excel spreadsheets, Word documents, and PDFs. Files can be downloaded directly from the chat window.",
        configuration: "Available Document Types",
        skills: {
          "create-text-file": {
            title: "Text Files",
            description:
              "Create text files with any content and extension (.txt, .md, .json, .csv, etc.)",
          },
          "create-pptx": {
            title: "PowerPoint Presentations",
            description:
              "Create new PowerPoint presentations with slides, titles, and bullet points",
          },
          "create-pdf": {
            title: "PDF Documents",
            description:
              "Create PDF documents from markdown or plain text with basic styling",
          },
          "create-xlsx": {
            title: "Excel Spreadsheets",
            description:
              "Create Excel documents for tabular data with sheets and styling",
          },
          "create-docx": {
            title: "Word Documents",
            description:
              "Create Word documents with basic styling and formatting",
          },
        },
      },
      gmail: {
        title: "GMail",
        description:
          "Enable your agent to interact with Gmail - search emails, read threads, compose drafts, send emails, and manage your inbox. <a>Read the documentation</a>.",
        configuration: "Gmail Configuration",
        deploymentId: "Deployment ID",
        deploymentIdHelp:
          "The deployment ID from your Google Apps Script web app",
        apiKey: "API Key",
        apiKeyHelp:
          "The API key you configured in your Google Apps Script deployment",
        configurationRequired:
          "Please configure the Deployment ID and API Key to enable Gmail skills.",
        configured: "Configured",
        searchSkills: "Search skills...",
        noSkillsFound: "No skills match your search.",
        categories: {
          search: {
            title: "Search & Read Emails",
            description: "Search and read emails from your Gmail inbox",
          },
          drafts: {
            title: "Draft Emails",
            description: "Create, edit, and manage email drafts",
          },
          send: {
            title: "Send & Reply to Emails",
            description: "Send emails and reply to threads immediately",
          },
          threads: {
            title: "Manage Email Threads",
            description:
              "Manage email threads - mark read/unread, archive, trash",
          },
          account: {
            title: "Integration Statistics",
            description: "View mailbox statistics and account information",
          },
        },
        skills: {
          getInbox: {
            title: "Get Inbox",
            description: "Streamlined way to get the inbox emails from Gmail",
          },
          search: {
            title: "Search Emails",
            description: "Search emails using Gmail query syntax",
          },
          readThread: {
            title: "Read Thread",
            description: "Read a full email thread by ID",
          },
          createDraft: {
            title: "Create Draft",
            description: "Create a new draft email",
          },
          createDraftReply: {
            title: "Create Draft Reply",
            description: "Create a draft reply to an existing thread",
          },
          updateDraft: {
            title: "Update Draft",
            description: "Update an existing draft email",
          },
          getDraft: {
            title: "Get Draft",
            description: "Retrieve a specific draft by ID",
          },
          listDrafts: {
            title: "List Drafts",
            description: "List all draft emails",
          },
          deleteDraft: {
            title: "Delete Draft",
            description: "Delete a draft email",
          },
          sendDraft: {
            title: "Send Draft",
            description: "Send an existing draft email",
          },
          sendEmail: {
            title: "Send Email",
            description: "Send an email immediately",
          },
          replyToThread: {
            title: "Reply to Thread",
            description: "Reply to an email thread immediately",
          },
          markRead: {
            title: "Mark Read",
            description: "Mark a thread as read",
          },
          markUnread: {
            title: "Mark Unread",
            description: "Mark a thread as unread",
          },
          moveToTrash: {
            title: "Move to Trash",
            description: "Move a thread to trash",
          },
          moveToArchive: {
            title: "Archive",
            description: "Archive a thread",
          },
          moveToInbox: {
            title: "Move to Inbox",
            description: "Move a thread to inbox",
          },
          getMailboxStats: {
            title: "Mailbox Stats",
            description: "Get unread counts and mailbox statistics",
          },
        },
      },
      googleCalendar: {
        title: "Google Calendar",
        description:
          "Enable your agent to interact with Google Calendar - view calendars, get events, create and update events, and manage RSVPs. <a>Read the documentation</a>.",
        configuration: "Google Calendar Configuration",
        deploymentId: "Deployment ID",
        deploymentIdHelp:
          "The deployment ID from your Google Apps Script web app",
        apiKey: "API Key",
        apiKeyHelp:
          "The API key you configured in your Google Apps Script deployment",
        configurationRequired:
          "Please configure the Deployment ID and API Key to enable Google Calendar skills.",
        configured: "Configured",
        searchSkills: "Search skills...",
        noSkillsFound: "No skills match your search.",
        categories: {
          calendars: {
            title: "Calendars",
            description: "View and manage your Google Calendars",
          },
          readEvents: {
            title: "Read Events",
            description: "View and search calendar events",
          },
          writeEvents: {
            title: "Create & Update Events",
            description: "Create new events and modify existing ones",
          },
          rsvp: {
            title: "RSVP Management",
            description: "Manage your response status for events",
          },
        },
        skills: {
          listCalendars: {
            title: "List Calendars",
            description: "List all calendars you own or are subscribed to",
          },
          getCalendar: {
            title: "Get Calendar Details",
            description: "Get detailed information about a specific calendar",
          },
          getEvent: {
            title: "Get Event",
            description: "Get detailed information about a specific event",
          },
          getEventsForDay: {
            title: "Get Events for Day",
            description: "Get all events scheduled for a specific day",
          },
          getEvents: {
            title: "Get Events (Date Range)",
            description: "Get events within a custom date range",
          },
          getUpcomingEvents: {
            title: "Get Upcoming Events",
            description:
              "Get events for today, this week, or this month using simple keywords",
          },
          quickAdd: {
            title: "Quick Add Event",
            description:
              "Create an event from natural language (e.g., 'Meeting tomorrow at 3pm')",
          },
          createEvent: {
            title: "Create Event",
            description:
              "Create a new event with full control over all properties",
          },
          updateEvent: {
            title: "Update Event",
            description: "Update an existing calendar event",
          },
          setMyStatus: {
            title: "Set RSVP Status",
            description: "Accept, decline, or tentatively accept an event",
          },
        },
      },
      outlook: {
        title: "Outlook",
        description:
          "Enable your agent to interact with Microsoft Outlook - search emails, read threads, compose drafts, send emails, and manage your inbox via Microsoft Graph API. <a>Read the documentation</a>.",
        configuration: "Outlook Configuration",
        authType: "Account Type",
        authTypeHelp:
          "Choose which types of Microsoft accounts can authenticate. 'All accounts' supports both personal and work/school accounts. 'Personal only' restricts to personal Microsoft accounts. 'Organization only' restricts to work/school accounts from a specific Azure AD tenant.",
        authTypeCommon: "All accounts (personal & work/school)",
        authTypeConsumers: "Personal Microsoft accounts only",
        authTypeOrganization: "Organization accounts only (requires Tenant ID)",
        clientId: "Application (Client) ID",
        clientIdHelp:
          "The Application (Client) ID from your Azure AD app registration",
        tenantId: "Directory (Tenant) ID",
        tenantIdHelp:
          "The Directory (Tenant) ID from your Azure AD app registration. Required only for organization-only authentication.",
        clientSecret: "Client Secret",
        clientSecretHelp:
          "The client secret value from your Azure AD app registration",
        configurationRequired:
          "Please configure the Client ID and Client Secret to enable Outlook skills.",
        authRequired:
          "Save your credentials first, then authenticate with Microsoft to complete the setup.",
        authenticateWithMicrosoft: "Authenticate with Microsoft",
        authenticated: "Successfully authenticated with Microsoft Outlook.",
        revokeAccess: "Revoke Access",
        configured: "Configured",
        searchSkills: "Search skills...",
        noSkillsFound: "No skills match your search.",
        categories: {
          search: {
            title: "Search & Read Emails",
            description: "Search and read emails from your Outlook inbox",
          },
          drafts: {
            title: "Draft Emails",
            description: "Create, edit, and manage email drafts",
          },
          send: {
            title: "Send Emails",
            description: "Send new emails or reply to messages immediately",
          },
          account: {
            title: "Integration Statistics",
            description: "View mailbox statistics and account information",
          },
        },
        skills: {
          getInbox: {
            title: "Get Inbox",
            description: "Get recent emails from your Outlook inbox",
          },
          search: {
            title: "Search Emails",
            description: "Search emails using Microsoft Search syntax",
          },
          readThread: {
            title: "Read Conversation",
            description: "Read a full email conversation thread",
          },
          createDraft: {
            title: "Create Draft",
            description:
              "Create a new draft email or draft reply to an existing message",
          },
          updateDraft: {
            title: "Update Draft",
            description: "Update an existing draft email",
          },
          listDrafts: {
            title: "List Drafts",
            description: "List all draft emails",
          },
          deleteDraft: {
            title: "Delete Draft",
            description: "Delete a draft email",
          },
          sendDraft: {
            title: "Send Draft",
            description: "Send an existing draft email",
          },
          sendEmail: {
            title: "Send Email",
            description:
              "Send a new email or reply to an existing message immediately",
          },
          getMailboxStats: {
            title: "Mailbox Stats",
            description: "Get folder counts and mailbox statistics",
          },
        },
      },
      default_skill:
        "By default, this skill is enabled, but you can disable it if you don't want it to be available to the agent.",
    },
    mcp: {
      title: "MCP Servers",
      "loading-from-config": "Loading MCP Servers from configuration file",
      "learn-more": "Learn more about MCP Servers.",
      "no-servers-found": "No MCP servers found",
      "tool-warning":
        "For the best performance, consider disabling unwanted tools to conserve context.",
      "tools-enabled": "tools enabled",
      "stop-server": "Stop MCP Server",
      "start-server": "Start MCP Server",
      "delete-server": "Delete MCP Server",
      "tool-count-warning":
        "This MCP server has <b>{{count}} tools enabled</b> that will consume context in every chat.<br />Consider disabling unwanted tools to conserve context.",
      "startup-command": "Startup Command",
      command: "Command",
      arguments: "Arguments",
      "not-running-warning":
        "This MCP server is not running - it may be stopped or experiencing an error on startup.",
      "tool-call-arguments": "Tool call arguments",
    },
    settings: {
      title: "Agent Skill Settings",
      "max-tool-calls": {
        title: "Max Tool Calls Per Response",
        description:
          "The maximum number of tools an agent can chain to generate a single response. This prevents runaway tool calls and infinite loops.",
      },
      "intelligent-skill-selection": {
        title: "Intelligent Skill Selection",
        description:
          "Enable unlimited tools and cut token usage by up to 80% per query — NexusAI automatically selects the right skills for every prompt.",
        "max-tools": {
          title: "Max Tools",
          description:
            "The maximum number of tools to select for each query. We recommend setting this to higher values for larger context models.",
        },
      },
      "clarifying-questions": {
        title: "Allow agent to ask clarifying questions",
        "beta-badge": "BETA",
        description:
          "When enabled, agents can pause to ask short clarifying questions if your prompt is ambiguous.",
        "max-per-turn": {
          title: "Max questions per turn",
          description:
            "How many clarifying questions the agent may ask in a single survey.",
        },
      },
    },
  },
  recorded: {
    title: "Workspace Chats",
    description:
      "These are all the recorded chats and messages that have been sent by users ordered by their creation date.",
    export: "Export",
    table: {
      id: "ID",
      by: "Sent By",
      workspace: "Workspace",
      prompt: "Prompt",
      response: "Response",
      feedback: "Feedback",
      at: "Sent At",
    },
    feedback: {
      up: "Marked helpful",
      down: "Marked not helpful",
      none: "No rating",
      filter_all: "All feedback",
      filter_up: "Helpful only",
      filter_down: "Not helpful only",
      filter_none: "Unrated only",
    },
  },
  customization: {
    interface: {
      title: "UI Preferences",
      description: "Set your UI preferences for NexusAI.",
    },
    branding: {
      title: "Branding & Whitelabeling",
      description: "White-label your NexusAI instance with custom branding.",
    },
    chat: {
      title: "Chat",
      description: "Set your chat preferences for NexusAI.",
      auto_submit: {
        title: "Auto-Submit Speech Input",
        description:
          "Automatically submit speech input after a period of silence",
      },
      auto_speak: {
        title: "Auto-Speak Responses",
        description: "Automatically speak responses from the AI",
      },
      spellcheck: {
        title: "Enable Spellcheck",
        description: "Enable or disable spellcheck in the chat input field",
      },
    },
    items: {
      theme: {
        title: "Theme",
        description: "Select your preferred color theme for the application.",
      },
      "show-scrollbar": {
        title: "Show Scrollbar",
        description: "Enable or disable the scrollbar in the chat window.",
      },
      "disable-auto-scroll": {
        title: "Disable Auto-Scroll",
        description:
          "Disable automatic scrolling to the bottom of the chat when new messages are received.",
      },
      "support-email": {
        title: "Support Email",
        description:
          "Set the support email address that should be accessible by users when they need help.",
      },
      "app-name": {
        title: "Name",
        description:
          "Set a name that is displayed on the login page to all users.",
      },
      "display-language": {
        title: "Display Language",
        description:
          "Select the preferred language to render NexusAI's UI in - when translations are available.",
      },
      logo: {
        title: "Brand Logo",
        description: "Upload your custom logo to showcase on all pages.",
        add: "Add a custom logo",
        recommended: "Recommended size: 800 x 200",
        remove: "Remove",
        replace: "Replace",
      },
      "browser-appearance": {
        title: "Browser Appearance",
        description:
          "Customize the appearance of the browser tab and title when the app is open.",
        tab: {
          title: "Title",
          description:
            "Set a custom tab title when the app is open in a browser.",
        },
        favicon: {
          title: "Favicon",
          description: "Use a custom favicon for the browser tab.",
        },
      },
      "sidebar-footer": {
        title: "Sidebar Footer Items",
        description:
          "Customize the footer items displayed on the bottom of the sidebar.",
        icon: "Icon",
        link: "Link",
      },
      "render-html": {
        title: "Render HTML in chat",
        description:
          "Render HTML responses in assistant responses.\nThis can result in a much higher fidelity of response quality, but can also lead to potential security risks.",
      },
    },
  },
  api: {
    title: "API Keys",
    description:
      "API keys allow the holder to programmatically access and manage this NexusAI instance.",
    link: "Read the API documentation",
    generate: "Generate New API Key",
    empty: "No API keys found",
    actions: "Actions",
    messages: {
      error: "Error: {{error}}",
    },
    modal: {
      title: "Create new API key",
      cancel: "Cancel",
      close: "Close",
      create: "Create API Key",
      helper:
        "Once created the API key can be used to programmatically access and configure this NexusAI instance.",
      name: {
        label: "Name",
        placeholder: "Production integration",
        helper:
          "Optional. Use a friendly name so you can identify this key later.",
      },
    },
    row: {
      copy: "Copy API Key",
      copied: "Copied",
      unnamed: "--",
      deleteConfirm:
        "Are you sure you want to deactivate this api key?\nAfter you do this it will not longer be useable.\n\nThis action is irreversible.",
    },
    table: {
      name: "Name",
      key: "API Key",
      by: "Created By",
      created: "Created",
    },
  },
  llm: {
    title: "LLM Preference",
    description:
      "These are the credentials and settings for your preferred LLM chat & embedding provider. It is important that these keys are current and correct, or else NexusAI will not function properly.",
    provider: "LLM Provider",
    providers: {
      azure_openai: {
        azure_service_endpoint: "Azure Service Endpoint",
        api_key: "API Key",
        chat_deployment_name: "Chat Deployment Name",
        chat_model_token_limit: "Chat Model Token Limit",
        model_type: "Model Type",
        model_type_tooltip:
          "If your deployment uses a reasoning model (o1, o1-mini, o3-mini, etc.), set this to “Reasoning”. Otherwise, your chat requests may fail.",
        default: "Default",
        reasoning: "Reasoning",
      },
    },
  },
  "model-router": {
    title: "Model Routers",
    description:
      "Model routers let you define rules to automatically route chat messages to different LLM providers and models based on conditions.",
    table: {
      name: "Name",
      fallback: "Fallback",
      rules: "Rules",
      workspaces: "Workspaces",
    },
    "no-routers": "No model routers yet",
    "empty-description":
      "No model routers configured yet. Create one to get started.",
    "new-router-button": "New Router",
    "delete-confirm":
      'Are you sure you want to delete the router "{{name}}"?\nThis will remove all its rules and unlink any workspaces using it.\n\nThis action is irreversible.',
    "toast-deleted": "Router deleted",
    "toast-delete-failed": "Failed to delete router: {{error}}",
    "new-router": {
      title: "Create New Model Router",
      name: "Name",
      "name-placeholder": "e.g. Cost Optimizer",
      description: "Description",
      "description-placeholder": "Optional description",
      "fallback-label": "Primary Provider & Model",
      "fallback-description":
        "Used when no routing rule matches. Also used to evaluate LLM-classified rules.",
      "cooldown-label": "Cache Cooldown (seconds)",
      "cooldown-help":
        "How long a routing decision is cached before re-evaluating rules. Set to 0 to disable caching.",
      "name-required": "Name is required.",
      "fallback-required": "Primary provider and model are required.",
      cancel: "Cancel",
      create: "Create Router",
    },
    "edit-router": {
      "back-to-routers": "Back to Model Routers",
      title: "Edit Router: {{name}}",
      save: "Save Changes",
      "toast-update-failed": "Failed to update router",
    },
    rules: {
      title: "Routing Rules",
      "title-with-name": "Router Rules: {{name}}",
      description:
        "Define the rules that determine when and how chat messages go to specific providers and models.",
      "add-rule": "Add Rule",
      "delete-confirm": 'Delete rule "{{title}}"?',
      "toast-delete-failed": "Failed to delete rule",
      "toast-reorder-failed": "Failed to reorder rules",
      "no-rules": "No rules yet",
      "empty-description":
        "Add a rule to start routing chat messages to specific providers and models.",
      "new-rule-button": "New Rule",
      "calculated-section-label":
        "Calculated rules — evaluated first, in priority order",
      "llm-section-label":
        "LLM rules — evaluated as a batch if no calculated rule matched",
      "llm-rule-body":
        'Match <desc>"{{description}}"</desc> then route to <route>{{route}}</route>',
      "calculated-no-conditions":
        "No conditions — route to <route>{{route}}</route>",
      "calculated-single-condition":
        'If <prop>{{property}}</prop> {{comparator}} <val>"{{value}}"</val> then route to <route>{{route}}</route>',
      "calculated-multi-condition":
        "If {{quantifier}} of <cond>{{conditions}}</cond> then route to <route>{{route}}</route>",
      "comparator-contains": "contains",
      "comparator-matches": "matches",
      "comparator-between": "between",
      "badge-llm": "LLM",
      "badge-calculated": "Calculated",
      "aria-drag-to-reorder": "Drag to reorder",
      "aria-edit-rule": "Edit rule",
      "aria-delete-rule": "Delete rule",
      "quantifier-any": "ANY",
      "quantifier-all": "ALL",
    },
    "rule-form": {
      "title-label": "Title",
      "rule-type": "Rule Type",
      "property-label": "Property",
      "property-select": "Select",
      "comparator-label": "Comparator",
      "comparator-select": "Select",
      "value-label": "Value",
      "add-condition": "Add condition",
      "remove-condition": "Remove condition",
      "conditions-incomplete":
        "Condition {{index}} is incomplete — fill in property, comparator, and value.",
      "match-description-label": "Match Description",
      "match-description-placeholder":
        "e.g. The user is asking about legal topics, contracts, or compliance",
      "match-description-help":
        "Describe the situation when you want this rule to match. This is evaluated by your LLM to determine if it should be used.",
      "route-to-label": "Route to Provider & Model",
      "route-to-description": "When this rule matches, use this provider/model",
      cancel: "Cancel",
      saving: "Saving...",
      "update-rule": "Update Rule",
      "create-rule": "Create Rule",
      "title-required": "Title is required",
      "toast-save-failed": "Failed to save rule",
      "type-calculated-label": "Calculated",
      "type-calculated-description":
        "Match based on message properties like content, token count, or time of day.",
      "type-llm-label": "LLM Classified",
      "type-llm-description":
        "Use an LLM to classify the message based on a description you provide.",
      "prop-prompt-content": "Prompt Content",
      "prop-token-count": "Conversation Token Count",
      "prop-message-count": "Conversation Message Count",
      "prop-current-hour": "Current Hour (0-23)",
      "prop-has-image": "Has Image Attachment",
      "cmp-contains": "contains",
      "cmp-matches-regex": "matches (regex)",
      "cmp-equals": "equals",
      "cmp-not-equals": "not equals",
      "cmp-greater-than": "greater than",
      "cmp-greater-than-or-equal": "greater than or equal",
      "cmp-less-than": "less than",
      "cmp-less-than-or-equal": "less than or equal",
      "cmp-between": "between (inclusive)",
      "placeholder-between-hour": "e.g. 9,17 (9am to 5pm)",
      "placeholder-between-numeric": "e.g. 10,50",
      "placeholder-hour": "e.g. 18 (0-23)",
      "placeholder-message-count": "e.g. 10",
      "placeholder-numeric": "e.g. 4000",
      "placeholder-contains": "e.g. code, python, rust",
      "placeholder-matches": "e.g. /\\bpython\\b/i",
      "placeholder-default": "e.g. code",
      "help-contains":
        "Comma-separated list — matches if the prompt contains any of the values (case-insensitive).",
      "help-matches":
        "Regex pattern. Use /pattern/flags for case sensitivity (defaults to case-insensitive).",
      "bool-true": "True",
      "bool-false": "False",
    },
    "provider-picker": {
      "select-provider": "Select provider",
      "setup-required": "(setup required)",
      "loading-models": "Loading models...",
      "select-model": "Select model",
      "enter-model": "Enter model name",
      "select-provider-first": "Select a provider first",
      "configure-to-continue": "Configure {{name}} to continue",
      "configure-provider": "Configure {{name}}",
      "setup-credentials":
        "Enter the required credentials to use {{name}} as a routing target.",
      cancel: "Cancel",
      "save-settings": "Save settings",
      "toast-save-failed": "Failed to save settings: {{error}}",
    },
    "router-selection": {
      "loading-routers": "Loading custom routers...",
      "no-routers-prefix-settings": "No model routers configured yet.",
      "no-routers-prefix-workspace": "No model routers configured.",
      "no-routers-link": "Create one in Model Router settings",
      "model-router-label": "Model Router",
      "select-router": "Select a router",
      "select-description": "Select which router to use for this workspace.",
    },
    chat: {
      "routed-to": "Routed to <route>{{model}}</route>",
      "routed-to-rule":
        "Routed to <route>{{model}}</route> via <rule>{{ruleTitle}}</rule>",
    },
  },
  transcription: {
    title: "Transcription Model Preference",
    description:
      "These are the credentials and settings for your preferred transcription model provider. Its important these keys are current and correct or else media files and audio will not transcribe.",
    provider: "Transcription Provider",
    "warn-start":
      "Using the local whisper model on machines with limited RAM or CPU can stall NexusAI when processing media files.",
    "warn-recommend":
      "We recommend at least 2GB of RAM and upload files <10Mb.",
    "warn-end":
      "The built-in model will automatically download on the first use.",
  },
  embedding: {
    title: "Embedding Preference",
    "desc-start":
      "When using an LLM that does not natively support an embedding engine - you may need to additionally specify credentials for embedding text.",
    "desc-end":
      "Embedding is the process of turning text into vectors. These credentials are required to turn your files and prompts into a format which NexusAI can use to process.",
    provider: {
      title: "Embedding Provider",
    },
  },
  imageGeneration: {
    title: "Image Generation Preference",
    description:
      "Configure the provider used to generate images from the /img chat command.",
    provider: "Image Generation Provider",
    card: {
      "failed-to-load": "Image failed to load",
      "alt-text": "Generated image",
      edit: "Edit",
      download: "Download",
    },
    pending: {
      heading: "Generating your image…",
      description:
        "This can take a little while. It'll appear here as soon as it's ready.",
      aborted: "Image generation was aborted",
    },
  },
  text: {
    title: "Text splitting & Chunking Preferences",
    "desc-start":
      "Sometimes, you may want to change the default way that new documents are split and chunked before being inserted into your vector database.",
    "desc-end":
      "You should only modify this setting if you understand how text splitting works and it's side effects.",
    size: {
      title: "Text Chunk Size",
      description:
        "This is the maximum length of characters that can be present in a single vector.",
      recommend: "Embed model maximum length is",
    },
    overlap: {
      title: "Text Chunk Overlap",
      description:
        "This is the maximum overlap of characters that occurs during chunking between two adjacent text chunks.",
    },
  },
  vector: {
    title: "Vector Database",
    description:
      "These are the credentials and settings for how your NexusAI instance will function. It's important these keys are current and correct.",
    provider: {
      title: "Vector Database Provider",
      description: "There is no configuration needed for LanceDB.",
    },
  },
  embeddable: {
    title: "Embeddable Chat Widgets",
    description:
      "Embeddable chat widgets are public facing chat interfaces that are tied to a single workspace. These allow you to build workspaces that then you can publish to the world.",
    create: "Create embed",
    table: {
      workspace: "Workspace",
      chats: "Sent Chats",
      active: "Active Domains",
      created: "Created",
    },
  },
  "embed-chats": {
    title: "Embed Chat History",
    export: "Export",
    description:
      "These are all the recorded chats and messages from any embed that you have published.",
    table: {
      embed: "Embed",
      sender: "Sender",
      message: "Message",
      response: "Response",
      at: "Sent At",
    },
  },
  telegram: {
    title: "Telegram Bot",
    description:
      "Connect your NexusAI instance to Telegram. One bot serves everyone - each person links their own account and reaches only their own workspaces.",
    setup: {
      step1: {
        title: "Step 1: Create your Telegram bot",
        description:
          "Open @BotFather in Telegram, send <code>/newbot</code> to <code>@BotFather</code>, follow the prompts, and copy the API token.",
        "open-botfather": "Open BotFather",
        "instruction-1": "1. Open the link or scan the QR code",
        "instruction-2":
          "2. Send <code>/newbot</code> to <code>@BotFather</code>",
        "instruction-3": "3. Choose a name and username for your bot",
        "instruction-4": "4. Copy the API token you receive",
      },
      step2: {
        title: "Step 2: Connect your bot",
        description:
          "Paste the API token you received from @BotFather to connect your bot.",
        "bot-token": "Bot Token",
        connecting: "Connecting...",
        "connect-bot": "Connect Bot",
      },
      security: {
        title: "Recommended Security Settings",
        description:
          "For additional security, configure these settings in @BotFather.",
        "disable-groups": "— Prevent adding bot to groups",
        "disable-inline": "— Prevent bot from being used in inline search",
        "obscure-username":
          "Use a non-obvious bot handle username to reduce discoverability",
      },
      "toast-enter-token": "Please enter a bot token.",
      "toast-connect-failed": "Failed to connect bot.",
    },
    connected: {
      status: "Connected",
      "status-disconnected": "Disconnected — token may be expired or invalid",
      "smtp-warning":
        "SMTP is not configured, so the verification code can't be emailed to anyone - nobody will be able to link their account. Set it up under Settings > SMTP.",
      "placeholder-token": "Paste new bot token...",
      reconnect: "Reconnect",
      workspace: "Workspace",
      "bot-link": "Bot Link",
      "voice-response": "Voice Response",
      disconnecting: "Disconnecting...",
      disconnect: "Disconnect",
      "voice-text-only": "Text only",
      "voice-mirror": "Mirror (reply with voice when user sends voice)",
      "voice-always": "Always voice (send audio with every reply)",
      "toast-disconnect-failed": "Failed to disconnect bot.",
      "toast-reconnect-failed": "Failed to reconnect bot.",
      "toast-voice-failed": "Failed to update voice mode.",
      "linked-accounts": "Linked accounts",
      "per-user-note":
        "Each person links their own account from their profile settings, then chats in their own workspaces with their own permissions.",
    },
    users: {
      title: "Linked Accounts",
      description:
        "Telegram chats bound to an account on this instance. The bot answers each one as that account.",
      empty: "Nobody has linked a Telegram chat yet.",
      "no-workspace": "No workspace selected",
      disconnect: "Disconnect",
      "toast-unlink-failed": "Failed to disconnect that chat.",
      "toast-unlinked": "Chat disconnected.",
      unknown: "Unknown",
    },
  },
  event: {
    title: "Event Logs",
    description:
      "View all actions and events happening on this instance for monitoring.",
    clear: "Clear Event Logs",
    table: {
      type: "Event Type",
      user: "User",
      occurred: "Occurred At",
    },
  },
  privacy: {
    title: "Privacy & Data-Handling",
    description:
      "This is your configuration for how connected third party providers and NexusAI handle your data.",
    anonymous: "Anonymous Telemetry Enabled",
    personalization: {
      label: "Personalization & Memories Enabled",
      auto_label: "Automatic Memory Extraction Enabled",
      description:
        "Lets your assistant remember facts about a user or workspace and use them in later conversations. This is an instance-wide policy: turning it off removes the feature for everyone. Each user still chooses whether to be remembered from the Memories panel in chat, and memories are never shared between users. Automatic extraction runs a background job that costs an LLM call per active user and workspace.",
    },
  },
  connectors: {
    "search-placeholder": "Search data connectors",
    "no-connectors": "No data connectors found.",
    obsidian: {
      vault_location: "Vault Location",
      vault_description:
        "Select your Obsidian vault folder to import all notes and their connections.",
      selected_files: "Found {{count}} markdown files",
      importing: "Importing vault...",
      import_vault: "Import Vault",
      processing_time:
        "This may take a while depending on the size of your vault.",
      vault_warning:
        "To avoid any conflicts, make sure your Obsidian vault is not currently open.",
    },
    github: {
      name: "GitHub Repo",
      description:
        "Import an entire public or private GitHub repository in a single click.",
      URL: "GitHub Repo URL",
      URL_explained: "Url of the GitHub repo you wish to collect.",
      token: "GitHub Access Token",
      optional: "optional",
      token_explained: "Access Token to prevent rate limiting.",
      token_explained_start: "Without a ",
      token_explained_link1: "Personal Access Token",
      token_explained_middle:
        ", the GitHub API may limit the number of files that can be collected due to rate limits. You can ",
      token_explained_link2: "create a temporary Access Token",
      token_explained_end: " to avoid this issue.",
      ignores: "File Ignores",
      git_ignore:
        "List in .gitignore format to ignore specific files during collection. Press enter after each entry you want to save.",
      task_explained:
        "Once complete, all files will be available for embedding into workspaces in the document picker.",
      branch: "Branch you wish to collect files from.",
      branch_loading: "-- loading available branches --",
      branch_explained: "Branch you wish to collect files from.",
      token_information:
        "Without filling out the <b>GitHub Access Token</b> this data connector will only be able to collect the <b>top-level</b> files of the repo due to GitHub's public API rate-limits.",
      token_personal:
        "Get a free Personal Access Token with a GitHub account here.",
    },
    gitlab: {
      name: "GitLab Repo",
      description:
        "Import an entire public or private GitLab repository in a single click.",
      URL: "GitLab Repo URL",
      URL_explained: "URL of the GitLab repo you wish to collect.",
      token: "GitLab Access Token",
      optional: "optional",
      token_description:
        "Select additional entities to fetch from the GitLab API.",
      token_explained_start: "Without a ",
      token_explained_link1: "Personal Access Token",
      token_explained_middle:
        ", the GitLab API may limit the number of files that can be collected due to rate limits. You can ",
      token_explained_link2: "create a temporary Access Token",
      token_explained_end: " to avoid this issue.",
      fetch_issues: "Fetch Issues as Documents",
      ignores: "File Ignores",
      git_ignore:
        "List in .gitignore format to ignore specific files during collection. Press enter after each entry you want to save.",
      task_explained:
        "Once complete, all files will be available for embedding into workspaces in the document picker.",
      branch: "Branch you wish to collect files from",
      branch_loading: "-- loading available branches --",
      branch_explained: "Branch you wish to collect files from.",
      token_information:
        "Without filling out the <b>GitLab Access Token</b> this data connector will only be able to collect the <b>top-level</b> files of the repo due to GitLab's public API rate-limits.",
      token_personal:
        "Get a free Personal Access Token with a GitLab account here.",
    },
    gitea: {
      name: "Gitea Repo",
      description:
        "Import an entire public or private repository from any Gitea instance in a single click.",
      URL: "Gitea Repo URL",
      URL_explained:
        "Url of the repo you wish to collect on your Gitea instance - self-hosted instances are supported.",
      token: "Gitea Access Token",
      optional: "optional",
      token_explained:
        "Access Token required to collect private repositories or repos on instances that require authentication.",
      token_explained_start: "Without an ",
      token_explained_link1: "Access Token",
      token_explained_end:
        ", only repositories that your Gitea instance exposes publicly can be collected.",
      ignores: "File Ignores",
      git_ignore:
        "List in .gitignore format to ignore specific files during collection. Press enter after each entry you want to save.",
      task_explained:
        "Once complete, all files will be available for embedding into workspaces in the document picker.",
      branch: "Branch you wish to collect files from.",
      branch_loading: "-- loading available branches --",
      branch_explained: "Branch you wish to collect files from.",
      token_information:
        "Without filling out the <b>Gitea Access Token</b> this data connector will only be able to collect files from repositories that are <b>publicly readable</b> on your Gitea instance.",
    },
    youtube: {
      name: "YouTube Transcript",
      description:
        "Import the transcription of an entire YouTube video from a link.",
      URL: "YouTube Video URL",
      URL_explained_start:
        "Enter the URL of any YouTube video to fetch its transcript. The video must have ",
      URL_explained_link: "closed captions",
      URL_explained_end: " available.",
      task_explained:
        "Once complete, the transcript will be available for embedding into workspaces in the document picker.",
    },
    "website-depth": {
      name: "Bulk Link Scraper",
      description: "Scrape a website and its sub-links up to a certain depth.",
      URL: "Website URL",
      URL_explained: "URL of the website you want to scrape.",
      depth: "Crawl Depth",
      depth_explained:
        "This is the number of child-links that the worker should follow from the origin URL.",
      max_pages: "Maximum Pages",
      max_pages_explained: "Maximum number of links to scrape.",
      task_explained:
        "Once complete, all scraped content will be available for embedding into workspaces in the document picker.",
    },
    confluence: {
      name: "Confluence",
      description: "Import an entire Confluence page in a single click.",
      deployment_type: "Confluence deployment type",
      deployment_type_explained:
        "Determine if your Confluence instance is hosted on Atlassian cloud or self-hosted.",
      base_url: "Confluence base URL",
      base_url_explained: "This is the base URL of your Confluence space.",
      space_key: "Confluence space key",
      space_key_explained:
        "This is the spaces key of your confluence instance that will be used. Usually begins with ~",
      username: "Confluence Username",
      username_explained: "Your Confluence username",
      auth_type: "Confluence Auth Type",
      auth_type_explained:
        "Select the authentication type you want to use to access your Confluence pages.",
      auth_type_username: "Username and Access Token",
      auth_type_personal: "Personal Access Token",
      token: "Confluence Access Token",
      token_explained_start:
        "You need to provide an access token for authentication. You can generate an access token",
      token_explained_link: "here",
      token_desc: "Access token for authentication",
      pat_token: "Confluence Personal Access Token",
      pat_token_explained: "Your Confluence personal access token.",
      bypass_ssl: "Bypass SSL Certificate Validation",
      bypass_ssl_explained:
        "Enable this option to bypass SSL certificate validation for self-hosted confluence instances with self-signed certificate",
      task_explained:
        "Once complete, the page content will be available for embedding into workspaces in the document picker.",
    },
    manage: {
      documents: "Documents",
      "data-connectors": "Data Connectors",
      "desktop-only":
        "Editing these settings are only available on a desktop device. Please access this page on your desktop to continue.",
      dismiss: "Dismiss",
      editing: "Editing",
    },
    directory: {
      "my-documents": "My Documents",
      "new-folder": "New Folder",
      visibility: {
        label: "Who can see this folder",
        private: "Only me",
        "private-description":
          "Nobody else sees this folder or the files in it.",
        workspace: "This workspace",
        "workspace-description":
          "Everyone who is a member of this workspace can see it.",
        shared: "Everyone",
        "shared-description":
          "Anyone with access to the document library can see it.",
      },
      "default-folder": "Shared uploads",
      "my-folder": "My uploads",
      "rename-folder": "Rename Folder",
      "change-visibility": "Change Visibility",
      "total-documents_one": "{{count}} document",
      "total-documents_other": "{{count}} documents",
      "search-results_one": "{{count}} result",
      "search-results_other": "{{count}} results",
      "search-document": "Search for document",
      "no-documents": "No Documents",
      "move-workspace": "Move to Workspace",
      "delete-confirmation-files":
        "Are you sure you want to delete these files?\nThis will remove them from the system and from any existing workspaces automatically.\nThis action is not reversible.",
      "delete-confirmation":
        "Are you sure you want to delete these files and folders?\nThis will remove the files from the system and remove them from any existing workspaces automatically.\nThis action is not reversible.",
      "removing-message-files": "Removing {{count}} documents. Please wait.",
      "removing-message":
        "Removing {{count}} documents and {{folderCount}} folders. Please wait.",
      "move-success": "Successfully moved {{count}} documents.",
      no_docs: "No Documents",
      select_all: "Select All",
      deselect_all: "Deselect All",
      remove_selected: "Remove Selected",
      save_embed: "Save and Embed",
    },
    upload: {
      "processor-offline": "Document Processor Unavailable",
      "processor-offline-desc":
        "We can't upload your files right now because the document processor is offline. Please try again later.",
      "click-upload": "Click to upload or drag and drop",
      "upload-files": "Upload",
      "upload-into": "Upload into {{folder}}",
      "drop-here": "Drop onto a folder to upload there, or here for {{folder}}",
      "file-types":
        "supports text files, csv's, spreadsheets, audio files, and more!",
      "or-submit-link": "or submit a link",
      "placeholder-link": "https://example.com",
      fetching: "Fetching...",
      "fetch-website": "Fetch website",
      "privacy-notice":
        "These files will be uploaded to the document processor running on this NexusAI instance. These files are not sent or shared with a third party.",
    },
    pinning: {
      what_pinning: "What is document pinning?",
      pin_explained_block1:
        "When you <b>pin</b> a document in NexusAI we will inject the entire content of the document into your prompt window for your LLM to fully comprehend.",
      pin_explained_block2:
        "This works best with <b>large-context models</b> or small files that are critical to its knowledge-base.",
      pin_explained_block3:
        "If you are not getting the answers you desire from NexusAI by default then pinning is a great way to get higher quality answers in a click.",
      accept: "Okay, got it",
    },
    watching: {
      what_watching: "What does watching a document do?",
      watch_explained_block1:
        "When you <b>watch</b> a document in NexusAI we will <i>automatically</i> sync your document content from it's original source on regular intervals. This will automatically update the content in every workspace where this file is managed.",
      watch_explained_block2:
        "This feature currently supports online-based content and will not be available for manually uploaded documents.",
      watch_explained_block3_start:
        "You can manage what documents are watched from the ",
      watch_explained_block3_link: "File manager",
      watch_explained_block3_end: " admin view.",
      accept: "Okay, got it",
    },
  },
  chat_window: {
    attachments_processing: "Attachments are processing. Please wait...",
    response_streaming:
      "Please wait for the current response to finish before sending another message.",
    agent_exit_hint: "Type /exit to exit agent execution loop early.",
    generating_response: "Generating response",
    thought_in_progress: "Model is Thinking...",
    thoughts: "Thoughts",
    response_failed: "Could not respond to message.",
    response_failed_reason: "Reason: {{reason}}",
    send_message: "Send a message",
    attach_file: "Attach a file to this chat",
    text_size: "Change text size.",
    export: "Export chat as...",
    exporting: "Exporting...",
    microphone: "Speak your prompt.",
    stt_unsupported: "Microphone access is not supported in this browser.",
    stt_mic_denied:
      "Could not access the microphone. Please grant permission and try again.",
    stt_transcription_failed: "Transcription failed: {{error}}",
    send: "Send prompt message to workspace",
    tts_speak_message: "TTS Speak message",
    copy: "Copy",
    regenerate: "Regenerate",
    regenerate_response: "Regenerate response",
    good_response: "Good response",
    bad_response: "Bad response",
    feedback_reason_title: "What went wrong?",
    feedback_reason_placeholder:
      "Tell us what was wrong with this answer (optional)",
    feedback_reason_skip: "Skip",
    feedback_reason_submit: "Send feedback",
    more_actions: "More actions",
    sources: "Sources",
    source_count_one: "{{count}} reference",
    source_count_other: "{{count}} references",
    document: "Document",
    database_source: "Database",
    mcp_source: "MCP Tool",
    similarity_match: "match",
    fork: "Fork",
    delete: "Delete",
    cancel: "Cancel",
    submit: "Submit",
    edit_prompt: "Edit prompt",
    edit_response: "Edit response",
    edit_info_user:
      '"Submit" regenerates the AI response. "Save" updates your message only.',
    edit_info_assistant:
      "Your changes will be saved directly to this response.",
    see_less: "See Less",
    see_more: "See More",
    preset_reset_description: "Clear your chat history and begin a new chat",
    preset_img_description: "Generate an image from a text prompt",
    add_new_preset: " Add New Preset",
    stop_generating: "Stop generating response",
    command: "Command",
    your_command: "your-command",
    placeholder_prompt:
      "This is the content that will be injected in front of your prompt.",
    description: "Description",
    placeholder_description: "Responds with a poem about LLMs.",
    save: "Save",
    small: "Small",
    normal: "Normal",
    large: "Large",
    tools: "Tools",
    text_size_label: "Text Size",
    slash_commands: "Slash Commands",
    agents: "Available agents",
    at_agent: "@agent",
    default_agent_description:
      " - the default agent for this workspace. Can search the web, scrape sites, and more.",
    start_agent_session: "Start Agent Session",
    agent_invocation: {
      model_wants_to_call: "Model wants to call",
      approve: "Approve",
      reject: "Reject",
      always_allow: "Always allow {{skillName}}",
      tool_call_was_approved: "Tool call was approved",
      tool_call_was_rejected: "Tool call was rejected",
      clarifying_skip: "Let agent decide",
      clarifying_submit: "Submit",
      clarifying_skipped: "You let the agent decide.",
      clarifying_timeout: "No response submitted in time.",
      clarifying_pagination: "{{current}} of {{total}}",
      clarifying_prev_aria: "Previous question",
      clarifying_next_aria: "Next question",
      clarifying_close_aria: "Close and skip",
      clarifying_other: "Other",
      clarifying_other_placeholder: "Type your answer",
      batch_progress: "{{answered}} of {{total}} answered",
      batch_skip_this: "Skip",
      batch_submit_all: "Submit all",
      batch_next: "Next",
      answer_skipped: "[user skipped]",
    },
    memories: {
      title: "Memories",
      empty:
        "No memories so far. After you interact with the chatbot more memories will fill in or",
      empty_cta: "create a new memory",
      tab_workspace: "Workspace",
      tab_global: "Global",
      toggle: {
        label: "Enable Personalization",
        description:
          "Allow your assistant to recall facts about you or this workspace and use them in conversations",
      },
      auto_extraction: {
        label: "Automatic Memories",
        description:
          "Have your assistant automatically create memories in the background",
      },
      scope_hint:
        "These settings apply to your account only. Your memories are never shared with other users.",
      menu: {
        edit: "Edit",
        delete: "Delete",
        move_to_global: "Move to Global",
        move_to_workspace: "Move to Workspace",
      },
      modal: {
        create_title: "Create Memory",
        edit_title: "Edit Memory",
        create_description:
          'Memories should be a single, concise statement. e.g. "User prefers Python over JavaScript"',
        edit_description: "Update the content of this memory.",
        label: "Memory",
        placeholder: "e.g. User's name is Joe, User works on NexusAI, etc.",
        create: "Create",
        save: "Save",
        cancel: "Cancel",
      },
    },
    leave_generating: {
      title: "Stop generating response?",
      description:
        "You are about to leave this chat, this will stop the model from generating the response and it cannot be recovered.",
      cancel: "Cancel",
      confirm: "Continue",
    },
  },
  profile_settings: {
    edit_account: "Edit Account",
    profile_picture: "Profile Picture",
    remove_profile_picture: "Remove Profile Picture",
    username: "Username",
    email: "Email",
    password: "Password",
    password_description: "Password must be at least 8 characters long",
    cancel: "Cancel",
    update_account: "Update Account",
    theme: "Theme Preference",
    language: "Preferred language",
    failed_upload: "Failed to upload profile picture: {{error}}",
    upload_success: "Profile picture uploaded.",
    failed_remove: "Failed to remove profile picture: {{error}}",
    profile_updated: "Profile updated.",
    failed_update_user: "Failed to update user: {{error}}",
    account: "Account",
    support: "Support",
    signout: "Sign out",
    speech: {
      title: "Speech",
    },
    connections: {
      title: "Connected apps",
      status_connected: "Connected",
      status_disconnected: "Not connected",
      status_unavailable: "Not set up",
    },
    telegram: {
      title: "Telegram",
      unavailable:
        "No Telegram bot is connected on this instance yet. Ask an admin to set one up.",
      description:
        "Chat with your workspaces from Telegram using this instance's bot.",
      connect: "Connect",
      connected_chat: "Connected chat",
      connected_description:
        "The bot answers this chat as you, with your workspaces.",
      disconnect: "Disconnect",
      disconnected: "Telegram disconnected.",
      disconnect_failed: "Failed to disconnect Telegram.",
      send_this: "Send this to {{bot}} on Telegram:",
      the_bot: "the bot",
      copy: "Copy command",
      copy_failed: "Could not copy to clipboard.",
      expires_in: "Expires in {{seconds}}s",
      open_bot: "Open bot",
      scan_hint: "Scan to open the bot in Telegram",
      status_connected: "Connected",
      status_disconnected: "Not connected",
      code_failed: "Could not generate a linking code.",
    },
    line: {
      title: "LINE",
      unavailable:
        "No LINE bot is connected on this instance yet. Ask an admin to set one up.",
      description:
        "Chat with your workspaces from LINE using this instance's bot.",
      connect: "Connect",
      connected_chat: "Connected chat",
      connected_description:
        "The bot answers this chat as you, with your workspaces.",
      disconnect: "Disconnect",
      disconnected: "LINE disconnected.",
      disconnect_failed: "Failed to disconnect LINE.",
      send_this: "Send this to {{bot}} on LINE:",
      the_bot: "the bot",
      copy: "Copy command",
      copy_failed: "Could not copy to clipboard.",
      expires_in: "Expires in {{seconds}}s",
      open_bot: "Open bot",
      scan_hint: "Scan to add the bot as a friend on LINE",
      scan_or_search: "Scan to add, or search {{basicId}} in LINE",
      status_connected: "Connected",
      status_disconnected: "Not connected",
      code_failed: "Could not generate a linking code.",
    },
  },
  password_change: {
    title: "Change password",
    current_password: "Current password",
    new_password: "New password",
    confirm_password: "Confirm new password",
    password_requirements: "Password must be at least 8 characters long",
    mismatch: "New passwords do not match.",
    success: "Your password has been changed.",
    updating: "Updating...",
    cancel: "Cancel",
    page_description: "Choose a new password for your account.",
    forced_title: "Set a new password",
    forced_description:
      "Your password was issued by an administrator. Choose a password of your own to continue.",
    forced_submit: "Set password and continue",
    sign_out: "Sign out instead",
  },
  "keyboard-shortcuts": {
    title: "Keyboard Shortcuts",
    shortcuts: {
      settings: "Open Settings",
      workspaceSettings: "Open Current Workspace Settings",
      home: "Go to Home",
      workspaces: "Manage Workspaces",
      apiKeys: "API Keys Settings",
      llmPreferences: "LLM Preferences",
      chatSettings: "Chat Settings",
      help: "Show keyboard shortcuts help",
    },
  },
  community_hub: {
    publish: {
      system_prompt: {
        success_title: "Success!",
        success_description:
          "Your System Prompt has been published to the Community Hub!",
        success_thank_you: "Thank you for sharing to the Community!",
        view_on_hub: "View on Community Hub",
        modal_title: "Publish System Prompt",
        name_label: "Name",
        name_description: "This is the display name of your system prompt.",
        name_placeholder: "My System Prompt",
        description_label: "Description",
        description_description:
          "This is the description of your system prompt. Use this to describe the purpose of your system prompt.",
        tags_label: "Tags",
        tags_description:
          "Tags are used to label your system prompt for easier searching. You can add multiple tags. Max 5 tags. Max 20 characters per tag.",
        tags_placeholder: "Type and press Enter to add tags",
        visibility_label: "Visibility",
        public_description: "Public system prompts are visible to everyone.",
        private_description: "Private system prompts are only visible to you.",
        publish_button: "Publish to Community Hub",
        submitting: "Publishing...",
        prompt_label: "Prompt",
        prompt_description:
          "This is the actual system prompt that will be used to guide the LLM.",
        prompt_placeholder: "Enter your system prompt here...",
      },
      agent_flow: {
        success_title: "Success!",
        success_description:
          "Your Agent Flow has been published to the Community Hub!",
        success_thank_you: "Thank you for sharing to the Community!",
        view_on_hub: "View on Community Hub",
        modal_title: "Publish Agent Flow",
        name_label: "Name",
        name_description: "This is the display name of your agent flow.",
        name_placeholder: "My Agent Flow",
        description_label: "Description",
        description_description:
          "This is the description of your agent flow. Use this to describe the purpose of your agent flow.",
        tags_label: "Tags",
        tags_description:
          "Tags are used to label your agent flow for easier searching. You can add multiple tags. Max 5 tags. Max 20 characters per tag.",
        tags_placeholder: "Type and press Enter to add tags",
        visibility_label: "Visibility",
        submitting: "Publishing...",
        submit: "Publish to Community Hub",
        privacy_note:
          "Agent flows are always uploaded as private to protect any sensitive data. You can change the visibility in the Community Hub after publishing. Please verify your flow does not contain any sensitive or private information before publishing.",
      },
      slash_command: {
        success_title: "Success!",
        success_description:
          "Your Slash Command has been published to the Community Hub!",
        success_thank_you: "Thank you for sharing to the Community!",
        view_on_hub: "View on Community Hub",
        modal_title: "Publish Slash Command",
        name_label: "Name",
        name_description: "This is the display name of your slash command.",
        name_placeholder: "My Slash Command",
        description_label: "Description",
        description_description:
          "This is the description of your slash command. Use this to describe the purpose of your slash command.",
        tags_label: "Tags",
        tags_description:
          "Tags are used to label your slash command for easier searching. You can add multiple tags. Max 5 tags. Max 20 characters per tag.",
        tags_placeholder: "Type and press Enter to add tags",
        visibility_label: "Visibility",
        public_description: "Public slash commands are visible to everyone.",
        private_description: "Private slash commands are only visible to you.",
        publish_button: "Publish to Community Hub",
        submitting: "Publishing...",
        prompt_label: "Prompt",
        prompt_description:
          "This is the prompt that will be used when the slash command is triggered.",
        prompt_placeholder: "Enter your prompt here...",
      },
      generic: {
        unauthenticated: {
          title: "Authentication Required",
          description:
            "You need to authenticate with the NexusAI Community Hub before publishing items.",
          button: "Connect to Community Hub",
        },
      },
    },
  },
  scheduledJobs: {
    title: "Scheduled Jobs",
    enableNotifications: "Enable browser notifications for job results",
    description:
      "Create recurring AI tasks that run on a schedule. Each job runs a prompt with optional tools and saves the result for review.",
    newJob: "New Job",
    loading: "Loading...",
    emptyTitle: "No Scheduled Jobs yet",
    emptySubtitle: "Create one to get started.",
    table: {
      name: "Name",
      schedule: "Schedule",
      status: "Status",
      lastRun: "Last Run",
      nextRun: "Next Run",
      actions: "Actions",
    },
    confirmDelete: "Are you sure you want to delete this scheduled job?",
    status: {
      completed: "Completed",
      failed: "Failed",
      timed_out: "Timed out",
      running: "Running",
      queued: "Queued",
    },
    toast: {
      deleted: "Job deleted",
      triggered: "Job triggered successfully",
      triggerFailed: "Failed to trigger job",
      triggerSkipped: "A run is already in progress for this job",
      killed: "Job stopped successfully",
      killFailed: "Failed to stop job",
    },
    row: {
      neverRun: "Never run",
      viewRuns: "View runs",
      runNow: "Run now",
      enable: "Enable",
      disable: "Disable",
      edit: "Edit",
      delete: "Delete",
    },
    modal: {
      titleEdit: "Edit Scheduled Job",
      titleNew: "New Scheduled Job",
      nameLabel: "Name",
      namePlaceholder: "e.g. Daily News Digest",
      promptLabel: "Prompt",
      promptPlaceholder: "The instruction to run on each execution...",
      scheduleLabel: "Schedule",
      modeBuilder: "Builder",
      modeCustom: "Custom",
      cronPlaceholder: "Cron expression (e.g. 0 9 * * *)",
      currentSchedule: "Current schedule:",
      toolsLabel: "Tools (Optional)",
      toolsDescription:
        "Select which agent tools this job can use. If none are selected, the job runs without any tools.",
      toolsSearch: "Search",
      needsSetup: "This skill requires configuration before use",
      needsSetupLabel: "Needs Setup",
      toolsNoResults: "No tools match",
      required: "Required",
      requiredFieldsBanner:
        "Please fill out all required fields in order to create job.",
      cancel: "Cancel",
      saving: "Saving...",
      updateJob: "Update Job",
      createJob: "Create Job",
      jobUpdated: "Job updated",
      jobCreated: "Job created",
    },
    builder: {
      fallbackWarning:
        "This expression can't be edited visually. Switch to Custom to keep it, or change anything below to overwrite it.",
      run: "Run",
      frequency: {
        minute: "every minute",
        hour: "hourly",
        day: "daily",
        week: "weekly",
        month: "monthly",
      },
      every: "Every",
      minuteOne: "1 minute",
      minuteOther: "{{count}} minutes",
      atMinute: "At minute",
      pastEveryHour: "past every hour",
      at: "At",
      on: "On",
      onDay: "On day",
      ofEveryMonth: "of every month",
      weekdays: {
        sun: "Sun",
        mon: "Mon",
        tue: "Tue",
        wed: "Wed",
        thu: "Thu",
        fri: "Fri",
        sat: "Sat",
      },
    },
    runHistory: {
      back: "Back to jobs",
      title: "Run History: {{name}}",
      schedule: "Schedule:",
      emptyTitle: "No runs yet for this job",
      emptySubtitle: "Run the job now and view its results.",
      runNow: "Run Now",
      stopJob: "Stop job",
      table: {
        status: "Status",
        started: "Started",
        duration: "Duration",
        error: "Error",
      },
    },
    runDetail: {
      loading: "Loading run details...",
      notFound: "Run not found.",
      back: "Back",
      unknownJob: "Unknown Job",
      runHeading: "{{name}} — Run #{{id}}",
      duration: "Duration: {{value}}",
      continueInThread: "Continue in Chat",
      creating: "Creating...",
      threadFailed: "Failed to create thread",
      stopJob: "Stop Job",
      killing: "Stopping...",
      sections: {
        prompt: "Prompt",
        error: "Error",
        thinking: "Thoughts ({{count}})",
        toolCalls: "Tool Calls ({{count}})",
        files: "Files ({{count}})",
        response: "Response",
        metrics: "Metrics",
      },
      metrics: {
        promptTokens: "Prompt tokens:",
        completionTokens: "Completion tokens:",
      },
    },
    toolCall: {
      arguments: "Arguments:",
      showResult: "Show result",
      hideResult: "Hide result",
    },
    file: {
      unknown: "Unknown file",
      download: "Download",
      downloadFailed: "Failed to download file",
      types: {
        powerpoint: "PowerPoint",
        pdf: "PDF Document",
        word: "Word Document",
        spreadsheet: "Spreadsheet",
        generic: "File",
      },
    },
  },
  "admin-users": {
    title: "Users",
    description:
      "These are all the accounts which have an account on this instance. Removing an account will instantly remove their access to this instance.",
    "add-user": "Add user",
    table: {
      username: "Username",
      email: "Email",
      role: "Role",
      status: "Status",
      "date-added": "Date Added",
    },
    owner: "Owner",
    active: "Active",
    suspended: "Suspended",
    "role-default-suffix": "(Default)",
    permissions: {
      title: "Permissions",
      all: "Holds every permission on the instance.",
      none: "No elevated permissions - can only chat in the workspaces they are added to.",
    },
    "message-limit": {
      label: "Limit messages per day",
      description:
        "Restrict this user to a number of successful queries or chats within a 24 hour window.",
      "limit-label": "Message limit per day",
    },
    modal: {
      "new-title": "Add user to instance",
      "edit-title": "Edit {{username}}",
      username: "Username",
      "username-placeholder": "User's username",
      email: "Email",
      "email-placeholder": "user@example.com",
      "email-help": "Used to identify and contact the account holder.",
      "email-help-edit":
        'Passwords are not set here - use "Reset password" on the user list to issue a new one.',
      bio: "Bio",
      "bio-placeholder": "User's bio",
      role: "Role",
      "role-placeholder": "Select a role",
      "password-note":
        "An initial password is generated for you and shown once after the user is created. The user must replace it before they can use the instance.",
      cancel: "Cancel",
      add: "Add user",
      adding: "Adding...",
      update: "Update user",
      error: "Error: {{error}}",
    },
    row: {
      edit: "Edit",
      "reset-password": "Reset password",
      suspend: "Suspend",
      unsuspend: "Unsuspend",
      delete: "Delete",
      "reset-title": "Reset password for {{username}}?",
      "reset-description":
        "A new password will be generated and shown to you once. Their current password stops working immediately and they must set a new one the next time they log in.",
      "suspend-title": "Suspend {{username}}?",
      "unsuspend-title": "Unsuspend {{username}}?",
      "suspend-description":
        "After suspending they will be logged out and unable to log back in until unsuspended by an admin.",
      "unsuspend-description":
        "The user will be able to log back into this instance of NexusAI.",
      "delete-title": "Delete {{username}}?",
      "delete-description":
        "After deleting they will be logged out and unable to use this instance of NexusAI. This action is irreversible.",
      "suspend-toast": "User has been suspended.",
      "unsuspend-toast": "User is no longer suspended.",
      "delete-toast": "User deleted from system.",
      "new-password": "New password",
      "aria-suspend": "Suspend {{username}}",
      "aria-unsuspend": "Unsuspend {{username}}",
    },
  },
  "admin-invites": {
    title: "Invitations",
    description:
      "Create invitation links for people in your organization to accept and sign up with. Invitations can only be used by a single user.",
    "create-link": "Create Invite Link",
    table: {
      status: "Status",
      email: "Email",
      "accepted-by": "Accepted By",
      "created-by": "Created By",
      created: "Created",
    },
    empty: "No invitations yet",
    "empty-description": "Create a link to invite someone to this instance.",
    "deleted-user": "deleted user",
    row: {
      copy: "Copy invite link",
      copied: "Copied",
      delete: "Delete",
      "delete-title": "Deactivate this invite?",
      "delete-description":
        "After you do this it will no longer be usable. This action is irreversible.",
      "delete-confirm": "Deactivate",
      disabled: "Disabled",
    },
    modal: {
      title: "Create new invite",
      error: "Error: {{error}}",
      "link-copied": "Invite link copied to clipboard",
      "emailed-to": "Also emailed to <b>{{email}}</b>.",
      "not-emailed-disabled":
        "Not emailed - SMTP is off or not fully configured. Set it up in <a>Settings → SMTP</a>, or copy the link above and share it yourself.",
      "not-emailed-failed":
        "Not emailed - sending failed{{reason}}. Copy the link above and share it yourself.",
      helper:
        "Once created you can copy the link and send it to someone. They sign up with the <b>default</b> role and join the workspaces you pick below.",
      "email-label": "Email (optional)",
      "email-help":
        "If SMTP is configured, the invite link is emailed here as soon as it is created. Leave blank to only get a link to share yourself.",
      "pick-user": "Pick an existing user's email…",
      "email-placeholder": "someone@example.com",
      "workspaces-label": "Add to workspaces",
      "workspaces-selected": "{{count}} of {{total}} selected",
      "workspaces-help":
        "Optional. Anyone joining with this invite is added to the workspaces you pick here - otherwise they start with none, and you can assign workspaces after they accept.",
      cancel: "Cancel",
      create: "Create Invite",
      close: "Close",
    },
  },
  smtp: {
    title: "SMTP / Outbound Email",
    description:
      "Configure the mailbox NexusAI sends system email from - password resets, invitations, and notifications. Restricted to the instance owner.",
    "enable-aria": "Enable SMTP",
    "enable-title": "Enable outbound email",
    "enable-description":
      "When off, NexusAI will not attempt to send any email even if the fields below are filled in.",
    "service-label": "Email service",
    "service-placeholder": "Choose a service",
    providers: {
      google: "Google (Gmail)",
      microsoft: "Microsoft 365 (Office 365 work/school)",
      outlook: "Outlook.com / Hotmail (personal)",
      custom: "Custom SMTP server",
    },
    hints: {
      google:
        "Uses smtp.gmail.com. Sign in with a Google account and generate an App Password (requires 2-Step Verification) to use as the password below.",
      microsoft:
        "Uses smtp.office365.com, for work/school Microsoft 365 mailboxes. An app password is required if the tenant has MFA enabled.",
      outlook:
        "Uses smtp-mail.outlook.com, for personal Outlook.com/Hotmail mailboxes. Generate an app password from your Microsoft account's security settings if 2-Step Verification is on.",
      custom: "Enter the host, port and security mode of any SMTP server.",
    },
    host: "Host",
    "host-placeholder": "smtp.example.com",
    port: "Port",
    "tls-aria": "Use TLS",
    "tls-label": "Use TLS (typically on for port 465, off for 587)",
    username: "Username / mailbox address",
    "username-placeholder": "you@example.com",
    password: "Password / App Password",
    "password-unchanged": "Unchanged",
    "password-placeholder": "App password",
    "from-email": "From address",
    "from-email-placeholder": "noreply@example.com",
    "from-name": "From name",
    "from-name-placeholder": "NexusAI",
    saving: "Saving…",
    save: "Save Changes",
    "save-failed": "Failed to save SMTP settings.",
    saved: "SMTP settings saved.",
    "test-title": "Send a test email",
    "test-description":
      "Save your settings first, then confirm they work by sending a test message to yourself.",
    "test-placeholder": "you@example.com",
    "test-send": "Send test email",
    "test-sending": "Sending…",
    "test-success": "Test email sent to {{email}}.",
    "test-failed": "Failed to send test email.",
  },
  "generated-password": {
    title: "Initial password",
    "give-to":
      "Give this password to <b>{{username}}</b>. They will be required to set a password of their own the first time they log in.",
    generic:
      "The user will be required to set a password of their own the next time they log in.",
    "copy-aria": "Copy password",
    warning:
      "Copy it now - this password cannot be shown again. If it is lost, reset the user's password to generate a new one.",
    "emailed-to": "Also emailed to <b>{{email}}</b>.",
    "the-user": "the user",
    "not-emailed":
      "Not emailed automatically - SMTP is off or not fully configured. Share the password above directly instead.",
    done: "Done",
  },
  "provider-options": {
    "api-key": "API Key",
    "api-key-optional": "API Key (optional)",
    "base-url": "Base URL",
    "auth-token": "Authentication Token",
    "chat-model-selection": "Chat Model Selection",
    "model-preference": "Model Preference",
    "selected-model": "Selected Model",
    "select-option": "Select an option",
    "select-model": "Select a model",
    "loading-models": "-- loading available models --",
    "no-models-found": "No models found!",
    "available-models": "Available models",
    "your-loaded-models": "Your loaded models",
    "downloaded-models": "Downloaded models",
    "discovered-models": "Discovered models",
    "model-context-window": "Model context window",
    "automatically-managed": "Automatically managed",
    "max-tokens": "Max Tokens",
    "stream-timeout": "Stream Timeout (ms)",
    "stream-timeout-placeholder":
      "Timeout value between token responses to auto-timeout the stream",
    "embedding-model": "Embedding Model",
    "embedding-model-name": "Embedding Model Name",
    "embedding-model-selection": "Embedding Model Selection",
    "available-embedding-models": "Available embedding models",
    "max-embedding-chunk": "Max embedding chunk length",
    "max-embedding-chunk-help":
      "Maximum length of text chunks, in characters, for embedding.",
    "output-dimensions": "Output dimensions",
    "assume-default-dimensions": "Assume default dimensions",
    "transcription-model": "Transcription Model",
    "voice-model": "Voice Model",
    "voice-model-selection": "Voice Model Selection",
    "tts-model": "TTS Model",
  },
  "web-search": {
    engine: "Engine",
    "get-free-key": "You can get a free API key <a>from {{provider}}.</a>",
    "get-key": "You can get an API key <a>from {{provider}}.</a>",
    "api-key-placeholder": "{{provider}} API Key",
    "bing-key":
      "You can get a Bing Web Search API subscription key <a>from the Azure portal.</a>",
    "bing-steps-title": "To set up a Bing Web Search API subscription:",
    "bing-step-1": "Go to the Azure portal:",
    "bing-step-2":
      "Create a new Azure account or sign in with an existing one.",
    "bing-step-3":
      'Navigate to the "Create a resource" section and search for "Grounding with Bing Search".',
    "bing-step-4":
      'Select the "Grounding with Bing Search" resource and create a new subscription.',
    "bing-step-5": "Choose the pricing tier that suits your needs.",
    "bing-step-6":
      "Obtain the API key for your Grounding with Bing Search subscription.",
    "searxng-base-url": "SearXNG API Base URL",
    "base-url-optional": "Base URL (optional)",
    "crw-self-host": "You can also <a>self-host.</a>",
    "duckduckgo-ready":
      "DuckDuckGo is ready to use without any additional configuration.",
    "you-notice":
      "You.com works without an API key (free tier, IP rate-limited). For higher limits, get an API key <a>from You.com</a>.",
  },
  "agent-builder": {
    common: {
      "select-or-create-variable": "Select or create variable",
      "insert-variable": "Insert variable",
      "select-variable": "Select variable",
      "select-option": "Select an option",
      "store-result-in": "Store Result In",
      "result-variable": "Result Variable",
      url: "URL",
    },
    flowInfo: {
      name: "Flow Name",
      "name-help":
        "It is important to give your flow a name that an LLM can easily understand.",
      "name-examples":
        '"SendMessageToDiscord", "CheckStockPrice", "CheckWeather"',
      "name-placeholder": "Enter flow name",
      description: "Description",
      "description-help":
        "It is equally important to give your flow a description that an LLM can easily understand. Be sure to include the purpose of the flow, the context it will be used in, and any other relevant information.",
      "description-placeholder": "Enter flow description",
    },
    start: {
      "variable-name": "Variable name",
      "initial-value": "Initial value",
      "delete-variable": "Delete variable",
      "add-variable": "Add variable",
    },
    llmInstruction: {
      instruction: "Instruction",
      "instruction-placeholder": "Enter instructions for the LLM...",
    },
    apiCall: {
      "url-placeholder": "https://api.example.com/endpoint",
      method: "Method",
      headers: "Headers",
      "add-header": "Add header",
      "header-name": "Header name",
      value: "Value",
      "remove-header": "Remove header",
      "request-body": "Request Body",
      json: "JSON",
      "raw-text": "Raw Text",
      "form-data": "Form Data",
      key: "Key",
      "remove-field": "Remove field",
      "add-form-field": "Add Form Field",
      "raw-body-placeholder": "Raw request body...",
      "store-response-in": "Store Response In",
    },
    website: {
      "url-placeholder": "https://example.com",
      action: "Action",
      "read-content": "Read Content",
      "click-element": "Click Element",
      "type-text": "Type Text",
      "css-selector": "CSS Selector",
      "selector-placeholder": "#element-id or .class-name",
    },
    file: {
      operation: "Operation",
      read: "Read File",
      write: "Write File",
      append: "Append to File",
      path: "File Path",
      "path-placeholder": "/path/to/file",
      content: "Content",
      "content-placeholder": "File content...",
    },
    code: {
      language: "Language",
      javascript: "JavaScript",
      python: "Python",
      shell: "Shell",
      code: "Code",
      "code-placeholder": "Enter code...",
    },
    webScraping: {
      "url-to-scrape": "URL to Scrape",
      "capture-as": "Capture Page Content As",
      "capture-text": "Text content only",
      "capture-html": "Raw HTML",
      "capture-selector": "CSS Query Selector",
      "query-selector": "Query Selector",
      "query-selector-help":
        "Enter a valid CSS selector to scrape the content of the page.",
      "query-selector-placeholder":
        ".article-content, #content, .main-content, etc.",
      summarization: "Content Summarization",
      "summarization-hint":
        "When enabled, long webpage content will be automatically summarized to reduce token usage.",
      "summarization-note":
        "Note: This may affect data quality and remove specific details from the original content.",
    },
    blockList: {
      "direct-output": "Direct Output",
      "direct-output-description":
        "The output of this block will be returned directly to the chat. This will prevent any further tool calls from being executed.",
      "coming-soon": "Configuration options coming soon...",
    },
  },
  "sql-connector": {
    title: "SQL Connector",
    "list-description":
      "Browse the database connections configured for this instance.",
    "connections-heading": "Database Connections",
    "new-connection": "New connection",
    "enable-title": "Enable SQL Connector",
    "enable-description": "Let your agents query the connections below.",
    "enable-first":
      "Enable the SQL Connector above to manage database connections.",
    "empty-list": "No database connections yet.",
    on: "On",
    off: "Off",
    "select-connection": "Select a connection",
    "select-connection-description":
      "Choose a database connection from the list to configure it.",
    "connector-off": "SQL Connector is off",
    "connector-off-description":
      "Enable it on the left to add and manage database connections.",
    "toggle-failed": "Failed to update connection.",
    manage: {
      "aria-label": "Manage connection",
      edit: "Edit connection",
      delete: "Delete connection",
      "delete-title": "Delete {{name}}?",
      "delete-description":
        "It will be removed from the list of available SQL connections. This cannot be undone.",
      "delete-confirm": "Delete",
    },
    visibility: {
      title: "Visible to workspaces",
      description: "Choose which workspaces' agents can query this database.",
      "select-all": "Select all",
      "clear-all": "Clear all",
      loading: "Loading workspaces...",
      empty: "No workspaces on this instance yet.",
      save: "Save visibility",
      saving: "Saving...",
      updated: "Workspace visibility updated.",
      failed: "Failed to update workspace visibility.",
    },
    modal: {
      "edit-title": "Edit SQL Connection",
      "new-title": "New SQL Connection",
      "edit-description":
        "Update the connection information for your database below.",
      "new-description":
        "Add the connection information for your database below and it will be available for future SQL agent calls.",
      warning:
        "<b>WARNING:</b> The SQL agent has been <i>instructed</i> to only perform non-modifying queries. This <b>does not</b> prevent a hallucination from still deleting data. Only connect with a user who has <b>READ_ONLY</b> permissions.",
      "select-engine": "Select your SQL engine",
      name: "Connection name",
      "name-placeholder": "a unique name to identify this SQL connection",
      username: "Database user",
      "username-placeholder": "root",
      password: "Database user password",
      "password-placeholder": "password123",
      host: "Server endpoint",
      "host-placeholder": "the hostname or endpoint for your database",
      port: "Port",
      "port-placeholder": "3306",
      database: "Database",
      "database-placeholder": "the database the agent will interact with",
      schema: "Schema (optional)",
      "schema-placeholder": "public (default schema if not specified)",
      encrypt: "Enable Encryption",
      ssl: "Use SSL",
      cancel: "Cancel",
      save: "Save connection",
      validating: "Validating...",
      "validate-failed":
        "Failed to validate connection. Please check your connection details.",
    },
  },
  "experimental-features": {
    title: "Experimental Features",
    "select-feature": "Select an experimental feature",
    on: "On",
    off: "Off",
    tos: {
      title: "Terms of use for experimental features",
      intro:
        "Experimental features of NexusAI are features that we are piloting and are <b>opt-in</b>. We proactively will condition or warn you on any potential concerns should any exist prior to approval of any feature.",
      "risks-intro":
        "Use of any feature on this page can result in, but not limited to, the following possibilities.",
      "risk-data-loss": "Loss of data.",
      "risk-quality": "Change in quality of results.",
      "risk-storage": "Increased storage.",
      "risk-resources": "Increased resource consumption.",
      "risk-cost":
        "Increased cost or use of any connected LLM or embedding provider.",
      "risk-bugs": "Potential bugs or issues using NexusAI.",
      "conditions-intro":
        "Use of an experimental feature also comes with the following list of non-exhaustive conditions.",
      "condition-removal": "Feature may not exist in future updates.",
      "condition-stability": "The feature being used is not currently stable.",
      "condition-availability":
        "The feature may not be available in future versions, configurations, or subscriptions of NexusAI.",
      "condition-privacy":
        "Your privacy settings <b>will be honored</b> with use of any beta feature.",
      "condition-change": "These conditions may change in future updates.",
      "docs-prefix":
        "Access to any features requires approval of this modal. If you would like to read more you can refer to",
      "docs-or-email": "or email",
      reject: "Reject & close",
      accept: "I understand",
    },
  },
  "admin-workspaces": {
    table: {
      name: "Name",
      link: "Link",
      users: "Users",
      status: "Status",
      "created-on": "Created On",
    },
  },
  "workspace-members": {
    title: "Workspace members",
    table: {
      username: "Username",
      role: "Workspace role",
      "date-added": "Date Added",
    },
    empty: "No workspace members",
    description:
      'Manage who can access "{{workspace}}" and assign their workspace roles.',
    "manage-users": "Manage users",
  },
  "browser-extension-keys": {
    table: {
      "connection-string": "Extension Connection String",
      "created-by": "Created By",
      "created-at": "Created At",
      actions: "Actions",
    },
    "empty-description":
      "Generate a key to connect the browser extension to this instance.",
    empty: "No API keys yet",
    error: "Error: {{error}}",
  },
  sidebar: {
    workspaces: "Workspaces",
    "new-workspace": "New Workspace",
    "new-workspace-description": "Create a space for your documents and chats",
    home: "Home",
    "no-workspaces": "No workspaces yet.",
    logo: "Logo",
    "toggle-sidebar": "Toggle Sidebar",
    "general-appearance": "General appearance settings",
  },
  "agent-panel": {
    "agent-flow": "Agent Flow",
    "flows-description": "Browse the flows configured for this instance.",
    "skills-title": "Agent skills & settings",
    "skills-description": "Browse skills and connected services.",
    "agent-flows": "Agent Flows",
    "custom-skills": "Custom Skills",
    back: "Back",
    "create-flow": "Create Flow",
    "open-builder": "Open Builder",
  },
  "vector-providers": {
    pgvector: {
      "connection-string": "Postgres Connection String",
      "connection-string-tooltip":
        "This is the connection string for the Postgres database in the format of",
      "permissions-intro":
        "The user for the database must have the following permissions:",
      "permission-read": "Read access to the database",
      "permission-read-schema": "Read access to the database schema",
      "permission-create": "Create access to the database",
      "extension-warning":
        "You must have the pgvector extension installed on the database.",
      "table-name": "Vector Table Name",
      "table-name-tooltip":
        "This is the name of the table in the Postgres database that will store the vectors.",
      "table-name-default": "By default, the table name is",
      "table-name-warning":
        "This table must not already exist on the database - it will be created automatically.",
    },
    milvus: {
      address: "Milvus DB Address",
      username: "Milvus Username",
      password: "Milvus Password",
    },
  },
  embeds: {
    modal: {
      "max-chats-day": "Max chats per day",
      "max-chats-day-hint":
        "Limit the amount of chats this embedded chat can process in a 24 hour period. Zero is unlimited.",
      "max-chats-session": "Max chats per session",
      "max-chats-session-hint":
        "Limit the amount of chats a session user can send with this embed in a 24 hour period. Zero is unlimited.",
      "message-limit": "Message History Limit",
      "message-limit-hint":
        "The number of previous messages to include in the chat context. Default is 20.",
      "model-override": "Enable dynamic model use",
      "model-override-hint":
        "Allow setting of the preferred LLM model to override the workspace default.",
      "temperature-override": "Enable dynamic LLM temperature",
      "temperature-override-hint":
        "Allow setting of the LLM temperature to override the workspace default.",
      "prompt-override": "Enable Prompt Override",
      "prompt-override-hint":
        "Allow setting of the system prompt to override the workspace default.",
      error: "Error: {{error}}",
    },
  },
  "hub-import": {
    title: "Import an item from the community hub",
    "intro-1":
      "The community hub is a place where you can find, share, and import agent-skills, system prompts, slash commands, and more!",
    "intro-2":
      "These items are created by the NexusAI team and community, and are a great way to get started with NexusAI as well as extend NexusAI in a way that is customized to your needs.",
    "intro-3":
      "There are both <b>private</b> and <b>public</b> items in the community hub. Private items are only visible to you, while public items are visible to everyone.",
    warning:
      "If you are pulling in a private item, make sure it is <b>shared with a team</b> you belong to, and you have added a <a>Connection Key.</a>",
    "item-id": "Community Hub Item Import ID",
    "item-id-placeholder": "allm-community-id:agent-skill:1234567890",
    "enter-item-id": "Please enter an item ID",
  },
  ui: {
    "select-option": "Select an option",
    "select-model": "Select a model",
    "select-model-dashed": "-- Select a model --",
    "type-or-select-model": "Type or select a model",
    "waiting-for-models": "-- waiting for models --",
    "select-role": "Select a role",
    "select-region": "Select a region",
    "select-voice": "Select a voice",
    "select-engine": "Select an engine",
    "search-models": "Search models",
    "search-users": "Search users",
    "select-all-visible-users": "Select all visible users",
    "open-actions": "Open actions",
    "your-password": "Your password",
    "create-new-folder": "Create New Folder",
    "enter-folder-name": "Enter folder name",
    "new-thread": "New Thread",
    "delete-selected": "Delete Selected",
    "enter-thread-name": "Enter thread name",
    "mark-thread-deletion": "Mark thread for deletion",
    "close-lightbox": "Close lightbox",
    "next-image": "Next image",
    "copy-error-details": "Copy error details",
    "remove-icon": "Remove icon",
    "remove-from-queue": "Remove from queue",
    "agent-thinking": "Agent is thinking...",
    "agent-finished-thinking": "Agent has finished thinking",
    "model-thinking": "Model is thinking",
    "routing-to-model": "Routing to model...",
    "no-agent-flows": "No agent flows found",
    "no-imported-skills": "No imported skills found",
    "no-event-logs": "No event logs found",
    "your-api-key": "Your API key...",
    "your-client-secret": "Your client secret...",
    "enter-api-token": "Enter your API token",
    "enter-auth-token": "Enter your Auth Token",
    "enter-api-key-dashed": "-- Enter API key --",
    "search-web-search-providers": "Search available web-search providers",
    "search-stt-providers": "Search speech to text providers",
    "search-tts-providers": "Search text to speech providers",
    "search-embedding-providers": "Search all embedding providers",
    "search-image-providers": "Search image generation providers",
    "search-llm-providers": "Search all LLM providers",
    "search-available-llm-providers": "Search available LLM providers",
    "search-transcription-providers": "Search audio transcription providers",
    "search-vectordb-providers": "Search all vector database providers",
    "document-name": "Document Name",
    "time-until-refresh": "Time until next refresh",
    "created-on": "Created On",
    "accept-invitation": "Accept your invitation",
    "create-account": "Create account",
    "use-existing-account": "Use existing account",
    "confirm-it-is-you": "Confirm it is you",
    "what-to-clear": "What to clear",
    "choose-an-account": "Choose an account",
    "hub-account-title": "Your NexusAI Community Hub Account",
    "hub-api-key-placeholder": "Enter your NexusAI Hub API key",
    "add-to-workspace": "Add to Workspace",
    "apply-to-workspace": "Apply to Workspace",
    "max-vector-text-length": "maximum length of vectorized text",
    "device-name": "Device Name",
    "register-device":
      "Register a device to use this instance from your phone.",
    "admin-username-placeholder": "Your admin username",
    "admin-password-placeholder": "Your admin password",
    "embedding-deployment-name": "Embedding Deployment Name",
    "azure-embedding-deployment-placeholder":
      "Azure OpenAI embedding model deployment name",
    "azure-chat-deployment-placeholder":
      "Azure OpenAI chat model deployment name",
    "no-image-models":
      "No image models could be found for this provider - enter the model name manually.",
    "image-model-name": "Image model name",
    "fetch-wikis": "Fetch Wikis as Documents",
    "test-prompt-placeholder":
      "This is a test prompt. Please respond with a poem about LLMs.",
    "preset-description-placeholder": "Responds with a poem about LLMs.",
    "voice-model-identifier": "Your voice model identifier",
    "tts-model-identifier": "Your TTS model identifier",
    "stt-model-identifier": "Your STT model identifier",
    "feature-docs-warnings": "Feature Documentation and Warnings",
    "role-description-placeholder": "What this role is for",
    "slash-commands-inherited":
      "Inherited by every workspace. A workspace can define a command with the same name to override the default.",
    "reserved-to-owner": "Reserved to the owner",
    "refusal-placeholder":
      "The text returned in query mode when there is no relevant context found for a response.",
    "model-name-exact-placeholder":
      "Enter model name exactly as referenced in the API (e.g., gpt-4.1-nano)",
    "model-id-for-chat": "Model id used for chat requests",
    "no-caching": "No caching",
    "no-cache": "No cache",
    "recovery-codes-once": "These recovery codes are only shown once!",
    "database-name": "Database Name",
    "pinecone-index-name": "Pinecone Index Name",
  },
  help: {
    "paperless-base-url":
      "The URL where your Paperless-ngx instance is running (e.g., http://localhost:8000)",
    "drupal-wiki-token":
      "You need to provide an API token for authentication. See the Drupal Wiki <a>manual</a> on how to generate an API-Token for your user.",
    "lmstudio-context-window":
      "Override the context window limit. Leave empty to auto-detect from the model (defaults to 4096 if detection fails).",
    "telemetry-note":
      "All events do not record IP-address and contain <b>no identifying</b> content, settings, chats, or other non-usage based information. To see the list of event tags collected you can look on <a>GitHub here</a>.",
    "finish-node":
      "This is the end of your agent flow. All steps above will be executed in sequence.",
    "agent-skill-settings":
      "Configure how agents select and call skills. These are the instance defaults — a workspace can override any of them under its own Agent Configuration.",
    agents:
      "Choose an agent skill, integration, flow, or MCP server from the list.",
    "default-system-prompt":
      "A system prompt provides instructions that shape the AI’s responses and behavior. This prompt will be automatically applied to all newly created workspaces. To change the system prompt of a <b>specific workspace</b>, edit the prompt in the <b>workspace settings</b>. To restore the system prompt to our sane default, leave this field empty and save changes.",
    "toggle-3":
      "This feature only applies to web-based content, such as websites, Confluence, YouTube, and GitHub files.",
    "toggle-2":
      "Watched documents will automatically update in all workspaces they are referenced in at the same time of update.",
    toggle:
      'Enable the ability to specify a document to be "watched". Watched document\'s content will be regularly fetched and updated in NexusAI.',
    "role-modal":
      "This role holds the system administrator grant, so it has every permission — including any added by future updates — regardless of the boxes below.",
    "factory-reset":
      "Erases the entire deployment and starts it over from the setup screen, as if it had just been installed. Unlike the reset above, this deletes <strong>your own account</strong> and the LLM, embedder and vector database configuration too.",
    "reserved-permissions":
      "Anything you tick here belongs to you alone. It is removed from every other role when permissions are resolved — including Admin, whose wildcard would otherwise cover it — so those screens disappear for them and the routes behind them refuse the request. Untick a box to hand the capability back to whoever their role says.",
    "reset-instance":
      "Everything you tick below is deleted permanently. Your own account, the roles and permissions you have defined, and your LLM, embedder and vector database configuration are never touched.",
    "transfer-ownership-2":
      "Suspended accounts are not listed — the new owner has to be able to sign in.",
    "transfer-ownership":
      "There is nobody to hand this instance to yet. Ownership can only go to another active account, so create one first.",
    "new-workspace-modal":
      "After creating this workspace only admins will be able to see it. You can add users after it has been created.",
    "new-browser-extension-api-key-modal-3":
      'If you see "Connected to NexusAI" in the extension, the connection was successful. If not, please copy the connection string and paste it into the extension manually.',
    "new-browser-extension-api-key-modal-2":
      'After clicking "Create API Key", NexusAI will attempt to connect to your browser extension automatically.',
    "new-browser-extension-api-key-modal":
      "Warning: this API key will allow access to all workspaces associated with your account. Please share it cautiously.",
    "code-snippet-modal":
      "Have your workspace chat embed function like a help desk chat bottom in the corner of your website.",
    "edit-embed-modal":
      "After creating an embed you will be provided a link that you can publish on your website with a simple",
    "new-embed-modal-5":
      "This filter will block any requests that come from a domain other than the list below.",
    "new-embed-modal-4":
      "Chat opens the chat to even general questions and can answer totally unrelated queries to your workspace.",
    "new-embed-modal-3":
      "Set how your chatbot should operate. Query means it will only respond if a document helps answer the query.",
    "new-embed-modal-2":
      "This is the workspace your chat window will be based on. All defaults will be inherited from the workspace unless overridden by this config.",
    "new-embed-modal":
      "After creating an embed you will be provided a link that you can publish on your website with a simple",
    authentication:
      "You do not need to connect your NexusAI Community Hub account to pull in public items from the NexusAI Community Hub.",
    "agent-flow":
      "Agent flows allow you to create reusable sequences of actions that can be triggered by your agent.",
    "agent-skill":
      "Agent skills can execute code on your NexusAI instance, so only import agent skills from sources you trust. You should also review the code before importing. If you are unsure about what a skill does - don't import it!",
    "slash-command":
      "Slash commands are used to prefill information into a prompt while chatting with a NexusAI workspace.",
    "system-prompt":
      "System prompts are used to guide the behavior of the AI agents and can be applied to any existing workspace.",
    unknown:
      "We found an item in the community hub, but we don't know what it is or it is not yet supported for import into NexusAI.",
    "pull-and-review":
      "An error occurred while fetching the item. Please try again later.",
    "connection-modal-3":
      "Scan the QR code with the NexusAI Mobile app to enable live sync of your workspaces, chats, threads and documents.",
    "connection-modal-2":
      "Run with local models on your phone privately or relay chats directly to this instance seamlessly.",
    "connection-modal":
      "NexusAI for mobile allows you to connect to your workspace's chats, threads, tools, and documents for you to use on the go.",
    "privacy-and-data":
      "As an open-source project we respect your right to privacy. We are dedicated to building the best solution for integrating AI and documents privately and securely. If you do decide to turn off telemetry all we ask is to consider sending us feedback and thoughts",
    "existing-user-form":
      "Sign in with your existing account to add it to the invite's workspaces. Your role does not change.",
    invite:
      "Join with a new account, or add the invite's workspaces to an account you already have.",
    "new-user-modal":
      "After creating your account you will be able to login with these credentials and start using workspaces.",
    "agent-skill-selection-2":
      "Only engines an administrator has already set up are listed. API keys are configured instance-wide under Agent Skills.",
    "agent-skill-selection":
      "Choose which skills this workspace's agent can use. These apply to this workspace only — other workspaces keep their own selection.",
    roles:
      "Defined in instance settings and used by every workspace, so it cannot be changed from here.",
    "gemini-options":
      "The number of dimensions the resulting output embeddings should have if it supports multiple dimensions output.",
    "generic-open-ai-options-2":
      'Text prepended to the query text before embedding for search. Some models require this to distinguish queries from passages (e.g. "query: " or "search_query: ").<br /><br />NexusAI <b>does not</b> append anything to this text including the ":" character.',
    "generic-open-ai-options":
      'Text prepended to each chunk of content before embedding for storage. Some models require this to distinguish passages from queries (e.g. "passage: " or "search_document: ").<br /><br />NexusAI <b>does not</b> append anything to this text including the ":" character.',
    "lemonade-options":
      "Select the Lemonade model for embeddings. Models will load after entering a valid Lemonade URL.",
    "lmstudio-options-2":
      "Could not reach LM Studio. Verify the URL is correct and the LMStudio server is running and accessible.",
    "lmstudio-options":
      "Useful if running LM Studio behind an authentication or proxy.",
    "local-ai-options":
      "The number of dimensions the resulting output embeddings should have if it supports multiple dimensions output.",
    "ollama-options-3":
      "Select the Ollama model for embeddings. Models will load after entering a valid Ollama URL.",
    "ollama-options-2":
      "Increase this value to process multiple chunks simultaneously for faster embedding.",
    "ollama-options":
      "Number of text chunks to embed in parallel. Higher values improve speed but use more memory. Default is 1.",
    "ollama-options-4":
      "Ollama image generation is experimental and only available on macOS. Only models that report image generation support will be listed.",
    "aws-bedrock-llmoptions":
      "Maximum number of tokens the model can generate per response. Increase for longer outputs. Default is 4096.",
    "docker-model-runner-options":
      "The maximum number of tokens that can be used for a model context window.",
    "foundry-options":
      "Override the context window limit. Leave empty to auto-detect from the model, or lower it if large context windows slow your machine down.",
    "kobold-cppoptions":
      "Select the KoboldCPP model you want to use. Models will load after entering a valid KoboldCPP URL.",
    "lemonade-options-2":
      "The maximum number of tokens that can be used for a model context window. This must be set to a value that is supported by the model.",
    "lmstudio-options-5":
      "Could not reach LM Studio. Verify the URL is correct and the LMStudio server is running and accessible.",
    "lmstudio-options-4":
      "Useful if running LM Studio behind an authentication or proxy.",
    "lmstudio-options-3":
      "LMStudio as your LLM requires you to set an embedding service to use.",
    "local-ai-options-2":
      "LocalAI as your LLM requires you to set an embedding service to use.",
    "ollama-llmoptions-4":
      "Select the Ollama model you want to use. Models will load after entering a valid Ollama URL.",
    "ollama-llmoptions-3":
      "If an invalid value is entered, NexusAI will handle this for you so that chats do not fail.",
    "ollama-llmoptions-2":
      "If you leave this field blank, the context window limit will be auto-detected from the model and applied to all chats. If auto-detection fails, a fallback context window limit of 4096 will be used.",
    "ollama-llmoptions":
      "Specify the maximum number of tokens that can be used for the model context window.",
    "omlxoptions-4":
      "Select the OMLX model you want to use. Models will load after entering a valid OMLX URL.",
    "omlxoptions-3":
      "If an invalid value is entered, NexusAI will handle this for you so that chats do not fail.",
    "omlxoptions-2":
      "If you leave this field blank, the context window limit will be auto-detected from the model and applied to all chats. If auto-detection fails, a fallback context window limit of 16000 will be used.",
    omlxoptions:
      "Specify the maximum number of tokens that can be used for the model context window.",
    "drupal-wiki":
      "Once complete, all pages will be available for embedding into workspaces.",
    "paperless-ngx-2":
      "Once complete, all documents will be available for embedding into workspaces.",
    "paperless-ngx":
      "Make sure your Paperless-ngx instance is running and accessible from this machine.",
    "generic-open-ai-options-4":
      "Some STT services require an API key to transcribe audio - this is optional if your service does not require one.",
    "generic-open-ai-options-3":
      "This should be the base URL of the OpenAI compatible STT service you will transcribe audio with.",
    "lemonade-options-4":
      "Load a Whisper or transcription model into your Lemonade server, then it will appear here.",
    "lemonade-options-3":
      "The API key for your Lemonade server. Shared with the Lemonade LLM and embedder settings.",
    "kokoro-options":
      "Could not reach the Kokoro server to load voices. Enter a voice id manually.",
    "open-ai-generic-options-3":
      "Most TTS services will have several voice models available, this is the identifier for the voice model you want to use.",
    "open-ai-generic-options-2":
      "Some TTS services require an API key to generate TTS responses - this is optional if your service does not require one.",
    "open-ai-generic-options":
      "This should be the base URL of the OpenAI compatible TTS service you will generate TTS responses from.",
    "piper-ttsoptions-2":
      'The "✔" indicates this model is already stored locally and does not need to be downloaded when run.',
    "piper-ttsoptions":
      "All PiperTTS models will run in your browser locally. This can be resource intensive on lower-end devices.",
    "generic-open-ai-options-5":
      "The base URL of the OpenAI-compatible service used to transcribe audio.",
    "parsed-files-menu-2":
      "You have exceeded the context window limit. Some files may be truncated or excluded from chat responses. Responses may hallucinate or lack relevant information.",
    "parsed-files-menu":
      "Your context window is getting full. Some files may be truncated or excluded from chat responses. We recommend embedding these files directly into your workspace for better results.",
    "workspace-chat":
      "The workspace you're looking for is not available. It may have been deleted or you may not have access to it.",
  },
};

export default TRANSLATIONS;
