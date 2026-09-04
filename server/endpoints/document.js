const { Document } = require("../models/documents");
const { DocumentFolder } = require("../models/documentFolders");
const {
  normalizePath,
  documentsPath,
  isWithin,
  renameVectorCacheEntry,
} = require("../utils/files");
const { reqBody } = require("../utils/http");
const {
  userPermissionValid,
} = require("../utils/middleware/authorizedRequest");
const { PERMISSIONS } = require("../utils/permissions");
const { Role } = require("../models/role");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const fs = require("fs");
const path = require("path");

function documentEndpoints(app) {
  if (!app) return;
  app.post(
    "/document/create-folder",
    [validatedRequest, userPermissionValid([PERMISSIONS.DOCUMENTS_MANAGE])],
    async (request, response) => {
      try {
        const { name, visibility, workspaceSlug = null } = reqBody(request);
        const storagePath = path.join(documentsPath, normalizePath(name));
        if (!isWithin(path.resolve(documentsPath), path.resolve(storagePath)))
          throw new Error("Invalid folder name.");

        if (fs.existsSync(storagePath)) {
          response.status(500).json({
            success: false,
            message: "Folder by that name already exists",
          });
          return;
        }

        // Default to private, not shared: a folder whose visibility the caller
        // did not state should be the one that leaks least, and the picker
        // always sends an explicit choice.
        const level = DocumentFolder.VALID_VISIBILITIES.includes(visibility)
          ? visibility
          : DocumentFolder.VISIBILITY.PRIVATE;

        // Only resolved for workspace visibility - the other two levels do not
        // scope to one, and storing it anyway would imply they did.
        let workspaceId = null;
        if (level === DocumentFolder.VISIBILITY.WORKSPACE && workspaceSlug) {
          const { Workspace } = require("../models/workspace");
          workspaceId =
            (await Workspace.get({ slug: String(workspaceSlug) }))?.id ?? null;
          if (!workspaceId)
            return response.status(400).json({
              success: false,
              message: "That workspace could not be found.",
            });
        }

        fs.mkdirSync(storagePath, { recursive: true });

        const { error } = await DocumentFolder.create({
          name: normalizePath(name),
          ownerId: response.locals?.user?.id ?? null,
          workspaceId,
          visibility: level,
        });
        // The folder exists on disk now; without its row it would silently be
        // treated as shared, so undo rather than leave it visible to everyone.
        if (error) {
          fs.rmSync(storagePath, { recursive: true, force: true });
          throw new Error(error);
        }

        response.status(200).json({ success: true, message: null });
      } catch (e) {
        console.error(e);
        response.status(500).json({
          success: false,
          message: `Failed to create folder: ${e.message} `,
        });
      }
    }
  );

  /**
   * Renames a folder in place, taking the documents inside it along - unlike
   * move-files, which refuses to touch anything already embedded. A folder
   * rename does not change any document's identity, so the embedded ones come
   * with it and their `docpath` is rewritten to match.
   *
   * `custom-documents` cannot be renamed: it is the destination the uploader
   * writes to by name when a file is not aimed at a folder, and purgeFolder
   * protects it for the same reason.
   */
  app.post(
    "/document/rename-folder",
    [validatedRequest, userPermissionValid([PERMISSIONS.DOCUMENTS_MANAGE])],
    async (request, response) => {
      try {
        const { from, to } = reqBody(request);
        const rawSource = String(from ?? "").trim();
        const rawTarget = String(to ?? "").trim();

        // Checked before normalizePath, which throws on the inputs (""/"."/"..")
        // this is here to reject with a message the user can act on.
        if (!rawSource || !rawTarget)
          return response
            .status(400)
            .json({ success: false, message: "Folder name is required." });

        // Storage is exactly two segments (`folder/file.json`), so a folder
        // name is always a single segment - same rule create-folder enforces.
        if (/[/\\]/.test(rawSource) || /[/\\]/.test(rawTarget))
          return response.status(400).json({
            success: false,
            message: "Folder name cannot contain path separators.",
          });

        const source = normalizePath(rawSource);
        const target = normalizePath(rawTarget);

        if (source === DocumentFolder.STAGING_FOLDER)
          return response.status(400).json({
            success: false,
            message: "The custom-documents folder cannot be renamed.",
          });

        // A folder the caller cannot see is not one they may rename, and the
        // reply must not confirm it exists either.
        if (!(await DocumentFolder.canView(source, response.locals?.user)))
          return response
            .status(404)
            .json({ success: false, message: "That folder no longer exists." });

        const sourcePath = path.join(documentsPath, source);
        const targetPath = path.join(documentsPath, target);
        if (
          !isWithin(path.resolve(documentsPath), path.resolve(sourcePath)) ||
          !isWithin(path.resolve(documentsPath), path.resolve(targetPath))
        )
          return response
            .status(400)
            .json({ success: false, message: "Invalid folder name." });

        if (
          !fs.existsSync(sourcePath) ||
          !fs.lstatSync(sourcePath).isDirectory()
        )
          return response
            .status(404)
            .json({ success: false, message: "That folder no longer exists." });

        // A case-only rename resolves to the same directory on a
        // case-insensitive filesystem, so existsSync is not a collision there.
        const caseOnlyRename =
          source.toLowerCase() === target.toLowerCase() && source !== target;
        if (fs.existsSync(targetPath) && !caseOnlyRename)
          return response.status(409).json({
            success: false,
            message: "A folder by that name already exists.",
          });
        if (source === target)
          return response.status(200).json({ success: true, message: null });

        fs.renameSync(sourcePath, targetPath);

        // The files have moved; the records that point at them have not. If
        // this throws the folder is already renamed, so put it back rather
        // than leave the two out of sync.
        try {
          await Document.updateFolderPaths(source, target);
          // The ownership row is keyed by name, so it has to follow the rename
          // or the folder drops back to being treated as shared.
          await DocumentFolder.rename(source, target);
        } catch (error) {
          fs.renameSync(targetPath, sourcePath);
          throw error;
        }

        // Cached embeddings are keyed by docpath, so they have to follow the
        // rename or the next embed of an unchanged file would be paid for
        // twice. Best-effort: a missed entry only costs a re-embed, which is
        // not worth failing a rename that already succeeded.
        try {
          for (const file of fs.readdirSync(targetPath))
            renameVectorCacheEntry(`${source}/${file}`, `${target}/${file}`);
        } catch (error) {
          console.error(
            `Renamed ${source} to ${target} but could not move its vector cache:`,
            error.message
          );
        }

        response
          .status(200)
          .json({ success: true, message: null, folder: target });
      } catch (e) {
        console.error(e);
        response.status(500).json({
          success: false,
          message: `Failed to rename folder: ${e.message}`,
        });
      }
    }
  );

  /**
   * Change who may see a folder. Restricted to the folder's owner (and holders
   * of documents.view_all): visibility is the only thing standing between a
   * private folder and the rest of the instance, so anyone who can browse a
   * folder must not also be able to widen it.
   */
  app.post(
    "/document/folder-visibility",
    [validatedRequest, userPermissionValid([PERMISSIONS.DOCUMENTS_MANAGE])],
    async (request, response) => {
      try {
        const { name, visibility, workspaceSlug = null } = reqBody(request);
        const user = response.locals?.user ?? null;

        if (!name || !DocumentFolder.VALID_VISIBILITIES.includes(visibility))
          return response
            .status(400)
            .json({ success: false, message: "Invalid folder or visibility." });

        if (name === DocumentFolder.STAGING_FOLDER)
          return response.status(400).json({
            success: false,
            message: "The custom-documents folder is always shared.",
          });

        // Answers as if it were missing, same as the other folder routes.
        if (!(await DocumentFolder.canView(name, user)))
          return response
            .status(404)
            .json({ success: false, message: "That folder does not exist." });

        const row = await DocumentFolder.get({ name });
        const isOwner = !!row?.ownerId && row.ownerId === user?.id;
        const canSeeEverything = await Role.userCan(
          user,
          PERMISSIONS.DOCUMENTS_VIEW_ALL
        );
        // A folder with no row predates ownership and belongs to nobody, so an
        // operator is the only one who may claim it.
        if (!isOwner && !canSeeEverything)
          return response.status(403).json({
            success: false,
            message: "Only the folder's owner can change who can see it.",
          });

        let workspaceId = null;
        if (visibility === DocumentFolder.VISIBILITY.WORKSPACE) {
          const { Workspace } = require("../models/workspace");
          workspaceId = workspaceSlug
            ? ((await Workspace.get({ slug: String(workspaceSlug) }))?.id ??
              null)
            : (row?.workspaceId ?? null);
          if (!workspaceId)
            return response.status(400).json({
              success: false,
              message: "A workspace is required for workspace visibility.",
            });
        }

        const { error } = await DocumentFolder.setVisibility({
          name,
          visibility,
          workspaceId,
          // Claiming an unowned folder makes the operator its owner, so it
          // stops being nobody's to manage.
          ownerId: row?.ownerId ?? user?.id ?? null,
        });
        if (error) throw new Error(error);

        response.status(200).json({ success: true, message: null });
      } catch (e) {
        console.error(e);
        response.status(500).json({
          success: false,
          message: `Failed to update folder visibility: ${e.message}`,
        });
      }
    }
  );

  app.post(
    "/document/move-files",
    [validatedRequest, userPermissionValid([PERMISSIONS.DOCUMENTS_MANAGE])],
    async (request, response) => {
      try {
        const { files } = reqBody(request);
        const docpaths = files.map(({ from }) => from);
        const documents = await Document.where({ docpath: { in: docpaths } });

        const embeddedFiles = documents.map((doc) => doc.docpath);
        const moveableFiles = files.filter(
          ({ from }) => !embeddedFiles.includes(from)
        );

        const movePromises = moveableFiles.map(({ from, to }) => {
          const sourcePath = path.join(documentsPath, normalizePath(from));
          const destinationPath = path.join(documentsPath, normalizePath(to));

          return new Promise((resolve, reject) => {
            if (
              !isWithin(documentsPath, sourcePath) ||
              !isWithin(documentsPath, destinationPath)
            )
              return reject("Invalid file location");

            fs.rename(sourcePath, destinationPath, (err) => {
              if (err) {
                console.error(`Error moving file ${from} to ${to}:`, err);
                reject(err);
              } else {
                resolve();
              }
            });
          });
        });

        Promise.all(movePromises)
          .then(() => {
            const unmovableCount = files.length - moveableFiles.length;
            if (unmovableCount > 0) {
              response.status(200).json({
                success: true,
                message: `${unmovableCount}/${files.length} files not moved. Unembed them from all workspaces.`,
              });
            } else {
              response.status(200).json({
                success: true,
                message: null,
              });
            }
          })
          .catch((err) => {
            console.error("Error moving files:", err);
            response
              .status(500)
              .json({ success: false, message: "Failed to move some files." });
          });
      } catch (e) {
        console.error(e);
        response
          .status(500)
          .json({ success: false, message: "Failed to move files." });
      }
    }
  );
}

module.exports = { documentEndpoints };
