const fs = require("fs");
const path = require("path");
const {
  purgeVectorCache,
  purgeSourceDocument,
  normalizePath,
  isWithin,
  documentsPath,
} = require(".");
const { Document } = require("../../models/documents");
const { Workspace } = require("../../models/workspace");
const { DocumentFolder } = require("../../models/documentFolders");

async function purgeDocument(filename = null) {
  if (!filename || !normalizePath(filename)) return;

  await purgeVectorCache(filename);
  await purgeSourceDocument(filename);
  const workspaces = await Workspace.where();
  for (const workspace of workspaces) {
    await Document.removeDocuments(workspace, [filename]);
  }
  return;
}

/**
 * Purge a folder and all its contents. This will also remove all vector-cache files and workspace document associations
 * for the documents within the folder.
 * @notice This function is not recursive. It only purges the contents of the specified folder.
 * @notice You cannot purge the `custom-documents` folder.
 * @param {string} folderName - The name/path of the folder to purge.
 * @param {{id: number, role: string}|null} user - the caller, so a folder they
 * cannot see is refused rather than deleted out from under its owner. Omit only
 * for callers with no user at all (the dev API), which are trusted by key.
 * @returns {Promise<{success: boolean, message: string|null}>} why the folder
 * was not purged, if it was not. Callers must report this: a refusal that
 * returned quietly read to the caller exactly like a successful delete.
 */
async function purgeFolder(folderName = null, user = null) {
  if (!folderName)
    return { success: false, message: "No folder name provided." };

  const subFolder = normalizePath(folderName);
  const subFolderPath = path.resolve(documentsPath, subFolder);

  if (subFolder === "custom-documents")
    return {
      success: false,
      message:
        "The custom-documents folder is protected and cannot be removed - it is where every upload without a folder is stored.",
    };

  if (!isWithin(documentsPath, subFolderPath))
    return { success: false, message: "Invalid folder name." };

  // Answer exactly as if it were not there - confirming a folder the caller
  // cannot see would leak that someone else owns one by that name.
  if (user !== null && !(await DocumentFolder.canView(subFolder, user)))
    return { success: false, message: "That folder does not exist." };

  const validRemovableSubFolders = fs
    .readdirSync(documentsPath)
    .map((folder) => {
      // Filter out any results which are not folders or
      // are the protected custom-documents folder.
      if (folder === "custom-documents") return null;
      const subfolderPath = path.resolve(documentsPath, folder);
      if (!fs.lstatSync(subfolderPath).isDirectory()) return null;
      return folder;
    })
    .filter((subFolder) => !!subFolder);

  if (
    !validRemovableSubFolders.includes(subFolder) ||
    !fs.existsSync(subFolderPath)
  )
    return { success: false, message: "That folder does not exist." };

  const filenames = fs
    .readdirSync(subFolderPath)
    .map((file) =>
      path.join(subFolderPath, file).replace(documentsPath + "/", "")
    );
  const workspaces = await Workspace.where();

  const purgePromises = [];
  // Remove associated Vector-cache files
  for (const filename of filenames) {
    const rmVectorCache = () =>
      new Promise((resolve) =>
        purgeVectorCache(filename).then(() => resolve(true))
      );
    purgePromises.push(rmVectorCache);
  }

  // Remove workspace document associations
  for (const workspace of workspaces) {
    const rmWorkspaceDoc = () =>
      new Promise((resolve) =>
        Document.removeDocuments(workspace, filenames).then(() => resolve(true))
      );
    purgePromises.push(rmWorkspaceDoc);
  }

  await Promise.all(purgePromises.flat().map((f) => f()));
  fs.rmSync(subFolderPath, { recursive: true }); // Delete target document-folder and source files.
  await DocumentFolder.delete(subFolder); // Its ownership row outlives it otherwise.

  return { success: true, message: null };
}

module.exports = {
  purgeDocument,
  purgeFolder,
};
