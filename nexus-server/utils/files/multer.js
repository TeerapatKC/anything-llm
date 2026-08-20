const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4 } = require("uuid");
const { normalizePath, sanitizeFileName, hotdirPath } = require(".");

/**
 * Decodes+normalizes+sanitizes a raw multer `file.originalname` into a safe
 * filename. Shared by every storage config below so the latin1/utf8 charset
 * workaround only needs to be correct in one place.
 * @param {string} originalname
 * @returns {string}
 */
function decodeAndSanitizeFilename(originalname) {
  return sanitizeFileName(
    normalizePath(Buffer.from(originalname, "latin1").toString("utf8"))
  );
}

// Pfp/logo images are served back to any authenticated viewer with a
// Content-Type derived from the STORED file's extension (see
// server/utils/files/pfp.js and server/utils/files/logo.js, both use
// mime.getType(path)) - the upload path preserves the original extension
// verbatim (only the base filename is randomized). Without this allowlist, an
// uploaded "x.svg" or "x.html" would be served with Content-Type: image/svg+xml
// or text/html and executed by a browser that navigates to it directly -
// stored XSS. `image/svg+xml` is deliberately excluded even though it's a
// real image type, since SVG can embed <script>.
const SAFE_IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".bmp",
]);

function imageFileFilter(_req, file, cb) {
  const ext = path.extname(normalizePath(file.originalname)).toLowerCase();
  if (!SAFE_IMAGE_EXTENSIONS.has(ext))
    return cb(new Error(`Unsupported image type "${ext || "(none)"}".`));
  if (file.mimetype && !file.mimetype.startsWith("image/"))
    return cb(new Error("Uploaded file is not an image."));
  cb(null, true);
}

const PFP_MAX_BYTES = 10 * 1024 * 1024; // 10MB - these are meant to be small avatars/logos.
// Matches the FILE_LIMIT already used for the request body in server/index.js -
// documents are legitimately large (PDFs, etc.), so this is a backstop against
// unbounded uploads rather than a tight cap.
const DOCUMENT_MAX_BYTES = 3 * 1024 * 1024 * 1024; // 3GB

// Below this much free space on the hotdir's volume, reject new document
// uploads outright rather than let them fail partway through writing (or
// succeed and starve the DB/vector-cache write that follows). Configurable
// since deployments vary widely in disk size; 500MB is a conservative floor.
const MIN_FREE_DISK_BYTES =
  Number(process.env.MIN_FREE_DISK_SPACE_MB || 500) * 1024 * 1024;

/**
 * Rejects the upload before multer writes anything to disk if the hotdir's
 * volume doesn't have enough free space left. Matches the product doc's
 * "Storage เต็ม" error case: stop accepting new files and surface a clear
 * reason rather than a generic write failure.
 * @param {import('express').Response} response
 * @returns {Promise<boolean>} true if there's enough space to proceed
 */
async function ensureDiskSpaceAvailable(response) {
  try {
    const checkDiskSpace = require("check-disk-space").default;
    const { free } = await checkDiskSpace(hotdirPath);
    if (free >= MIN_FREE_DISK_BYTES) return true;

    const { EventLogs } = require("../../models/eventLogs");
    await EventLogs.logFailure("storage_low", {
      freeBytes: free,
      minRequiredBytes: MIN_FREE_DISK_BYTES,
    });
    response.status(507).json({
      success: false,
      error:
        "Server storage is nearly full. Contact your system administrator before uploading new documents.",
    });
    return false;
  } catch (error) {
    // If disk space can't be determined (e.g. unsupported platform/path),
    // don't block uploads on a check that itself failed - fail open, same
    // as getDiskStorage()'s existing behavior elsewhere in the codebase.
    console.error("ensureDiskSpaceAvailable check failed", error.message);
    return true;
  }
}

/**
 * Handle File uploads for auto-uploading.
 * Mostly used for internal GUI/API uploads.
 */
const fileUploadStorage = multer.diskStorage({
  destination: function (_, __, cb) {
    cb(null, hotdirPath);
  },
  // Deduping here (rather than after the collector has processed the file)
  // closes the race where two uploads sharing a name could otherwise clobber
  // each other in the shared hotdir before either is picked up for processing.
  filename: async function (_, file, cb) {
    const sanitized = decodeAndSanitizeFilename(file.originalname);
    try {
      const { Document } = require("../../models/documents");
      file.originalname = await Document.resolveUniqueFilename(sanitized);
    } catch (error) {
      console.error("Failed to resolve unique filename, using as-is", error.message);
      file.originalname = sanitized;
    }
    cb(null, file.originalname);
  },
});

/**
 * Handle API file upload as documents - this does not manipulate the filename
 * at all for encoding/charset reasons.
 */
const fileAPIUploadStorage = multer.diskStorage({
  destination: function (_, __, cb) {
    cb(null, hotdirPath);
  },
  filename: function (_, file, cb) {
    file.originalname = decodeAndSanitizeFilename(file.originalname);
    cb(null, file.originalname);
  },
});

// Asset storage for logos
const assetUploadStorage = multer.diskStorage({
  destination: function (_, __, cb) {
    const uploadOutput =
      process.env.NODE_ENV === "development"
        ? path.resolve(__dirname, `../../storage/assets`)
        : path.resolve(process.env.STORAGE_DIR, "assets");
    fs.mkdirSync(uploadOutput, { recursive: true });
    return cb(null, uploadOutput);
  },
  filename: function (_, file, cb) {
    file.originalname = decodeAndSanitizeFilename(file.originalname);
    cb(null, file.originalname);
  },
});

/**
 * Handle PFP file upload as logos
 */
const pfpUploadStorage = multer.diskStorage({
  destination: function (_, __, cb) {
    const uploadOutput =
      process.env.NODE_ENV === "development"
        ? path.resolve(__dirname, `../../storage/assets/pfp`)
        : path.resolve(process.env.STORAGE_DIR, "assets/pfp");
    fs.mkdirSync(uploadOutput, { recursive: true });
    return cb(null, uploadOutput);
  },
  filename: function (req, file, cb) {
    const randomFileName = `${v4()}${path.extname(
      normalizePath(file.originalname)
    )}`;
    req.randomFileName = randomFileName;
    cb(null, randomFileName);
  },
});

/**
 * Handle Generic file upload as documents from the GUI
 * @param {Request} request
 * @param {Response} response
 * @param {NextFunction} next
 */
async function handleFileUpload(request, response, next) {
  if (!(await ensureDiskSpaceAvailable(response))) return;
  const upload = multer({
    storage: fileUploadStorage,
    limits: { fileSize: DOCUMENT_MAX_BYTES },
  }).single("file");
  upload(request, response, function (err) {
    if (err) {
      response
        .status(500)
        .json({
          success: false,
          error: `Invalid file upload. ${err.message}`,
        })
        .end();
      return;
    }
    next();
  });
}

/**
 * Handle API file upload as documents - this does not manipulate the filename
 * at all for encoding/charset reasons.
 * @param {Request} request
 * @param {Response} response
 * @param {NextFunction} next
 */
async function handleAPIFileUpload(request, response, next) {
  if (!(await ensureDiskSpaceAvailable(response))) return;
  const upload = multer({
    storage: fileAPIUploadStorage,
    limits: { fileSize: DOCUMENT_MAX_BYTES },
  }).single("file");
  upload(request, response, function (err) {
    if (err) {
      response
        .status(500)
        .json({
          success: false,
          error: `Invalid file upload. ${err.message}`,
        })
        .end();
      return;
    }
    next();
  });
}

/**
 * Handle logo asset uploads
 */
function handleAssetUpload(request, response, next) {
  const upload = multer({
    storage: assetUploadStorage,
    limits: { fileSize: PFP_MAX_BYTES },
    fileFilter: imageFileFilter,
  }).single("logo");
  upload(request, response, function (err) {
    if (err) {
      response
        .status(500)
        .json({
          success: false,
          error: `Invalid file upload. ${err.message}`,
        })
        .end();
      return;
    }
    next();
  });
}

/**
 * Handle PFP file upload as logos
 */
function handlePfpUpload(request, response, next) {
  const upload = multer({
    storage: pfpUploadStorage,
    limits: { fileSize: PFP_MAX_BYTES },
    fileFilter: imageFileFilter,
  }).single("file");
  upload(request, response, function (err) {
    if (err) {
      response
        .status(500)
        .json({
          success: false,
          error: `Invalid file upload. ${err.message}`,
        })
        .end();
      return;
    }
    next();
  });
}

/**
 * Handle in-memory audio upload for STT transcription. Audio buffers are
 * passed straight to the STT provider so we never persist them to disk.
 */
function handleAudioUpload(request, response, next) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB matches OpenAI Whisper limit
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype?.startsWith("audio/"))
        return cb(new Error("Only audio uploads are allowed."));
      cb(null, true);
    },
  }).single("audio");
  upload(request, response, function (err) {
    if (err) {
      return response.status(500).json({
        success: false,
        error: `Invalid audio upload. ${err.message}`,
      });
    }
    next();
  });
}

module.exports = {
  handleFileUpload,
  handleAPIFileUpload,
  handleAssetUpload,
  handlePfpUpload,
  handleAudioUpload,
};
