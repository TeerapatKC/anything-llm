import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

const Document = {
  /**
   * @param {string} name - folder name
   * @param {"private"|"workspace"|"shared"} visibility - who may see it
   * @param {string|null} workspaceSlug - required for "workspace" visibility,
   * which is the workspace whose members the folder is scoped to
   */
  createFolder: async (name, visibility = "private", workspaceSlug = null) => {
    return await fetch(`${API_BASE}/document/create-folder`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ name, visibility, workspaceSlug }),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },
  /**
   * Renames a folder, taking its documents - embedded ones included - with it.
   * @param {string} from - current folder name
   * @param {string} to - new folder name
   * @returns {Promise<{success: boolean, message: string|null}>}
   */
  renameFolder: async (from, to) => {
    return await fetch(`${API_BASE}/document/rename-folder`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ from, to }),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, message: e.message };
      });
  },
  /**
   * Change who may see a folder. Owner-only on the server.
   * @param {string} name
   * @param {"private"|"workspace"|"shared"} visibility
   * @param {string|null} workspaceSlug - required for "workspace"
   */
  setFolderVisibility: async (name, visibility, workspaceSlug = null) => {
    return await fetch(`${API_BASE}/document/folder-visibility`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ name, visibility, workspaceSlug }),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, message: e.message };
      });
  },
  moveToFolder: async (files, folderName) => {
    const data = {
      files: files.map((file) => ({
        from: file.folderName ? `${file.folderName}/${file.name}` : file.name,
        to: `${folderName}/${file.name}`,
      })),
    };

    return await fetch(`${API_BASE}/document/move-files`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },
};

export default Document;
