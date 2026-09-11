import { useState } from "react";
import MCPServers from "@/models/mcpServers";
import Workspace from "@/models/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function parseHeaders(value) {
  const headers = {};
  for (const rawLine of value.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator <= 0 || !line.slice(separator + 1).trim()) {
      throw new Error(`Invalid header: ${line}`);
    }
    headers[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return headers;
}

/**
 * Add or edit a remote MCP server.
 *
 * The same form serves both owners a server can have. With no `workspaceSlug` it
 * writes through the instance-wide routes, which is the admin screen; with one it
 * writes through that workspace's own routes, so the server it creates belongs to
 * the workspace and is visible nowhere else - exactly how the SQL connection modal
 * is shared between the two screens.
 */
export default function AddServerModal({
  closeModal,
  onSaved,
  server = null,
  workspaceSlug = null,
}) {
  const isEditing = !!server;
  const [transport, setTransport] = useState(
    server?.config?.type === "sse" ? "sse" : "streamable"
  );
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const form = new FormData(event.currentTarget);
      const config = {
        name: String(form.get("name") || "").trim(),
        type: transport,
        url: String(form.get("url") || "").trim(),
        headers: parseHeaders(String(form.get("headers") || "")),
      };
      const result = workspaceSlug
        ? isEditing
          ? await Workspace.mcpServers.update(
              workspaceSlug,
              server.name,
              config
            )
          : await Workspace.mcpServers.create(workspaceSlug, config)
        : isEditing
          ? await MCPServers.updateRemote(server.name, config)
          : await MCPServers.createRemote(config);
      if (!result.success)
        throw new Error(result.error || "Unable to save server.");
      onSaved(result.server, result.error);
      closeModal();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEditing ? "Edit external MCP server" : "Add external MCP server"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="mcp-name" className="mb-2 block">
            Name
          </Label>
          <Input
            id="mcp-name"
            name="name"
            placeholder="company-mcp"
            defaultValue={server?.name || ""}
            pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}"
            maxLength={64}
            required
            autoComplete="off"
          />
        </div>
        <div>
          <Label htmlFor="mcp-transport" className="mb-2 block">
            Transport
          </Label>
          <select
            id="mcp-transport"
            value={transport}
            onChange={(event) => setTransport(event.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-theme-text-primary"
          >
            <option value="streamable">Streamable HTTP</option>
            <option value="sse">SSE (legacy)</option>
          </select>
        </div>
        <div>
          <Label htmlFor="mcp-url" className="mb-2 block">
            MCP endpoint URL
          </Label>
          <Input
            id="mcp-url"
            name="url"
            type="url"
            placeholder="https://mcp.example.com/mcp"
            defaultValue={server?.config?.url || ""}
            required
            autoComplete="off"
          />
          <p className="mt-2 text-xs text-theme-text-secondary">
            For a server on the Docker host, use host.docker.internal instead of
            localhost.
          </p>
        </div>
        <div>
          <Label htmlFor="mcp-headers" className="mb-2 block">
            HTTP headers (optional)
          </Label>
          <Textarea
            id="mcp-headers"
            name="headers"
            rows={3}
            placeholder={"Authorization: Bearer token\nX-API-Key: value"}
            defaultValue={Object.entries(server?.config?.headers || {})
              .map(([key, value]) => `${key}: ${value}`)
              .join("\n")}
          />
          <p className="mt-2 text-xs text-theme-text-secondary">
            Enter one header per line. Credentials are stored in the server's
            persistent configuration.
          </p>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>
            Cancel
          </DialogClose>
          <Button type="submit" disabled={saving}>
            {saving
              ? "Connecting..."
              : isEditing
                ? "Save changes"
                : "Add server"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
