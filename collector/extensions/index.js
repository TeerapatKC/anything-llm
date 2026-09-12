const { setDataSigner } = require("../middleware/setDataSigner");
const { verifyPayloadIntegrity } = require("../middleware/verifyIntegrity");
const { reqBody } = require("../utils/http");
const { validURL, validateURL } = require("../utils/url");
const RESYNC_METHODS = require("./resync");

function extensions(app) {
  if (!app) return;

  app.post(
    "/ext/resync-source-document",
    [verifyPayloadIntegrity, setDataSigner],
    async function (request, response) {
      try {
        const { type, options } = reqBody(request);
        if (!Object.hasOwn(RESYNC_METHODS, type))
          throw new Error('Type "' + type + '" is not a valid type to sync.');
        return await RESYNC_METHODS[type](options, response);
      } catch (e) {
        console.error(e);
        response.status(200).json({
          success: false,
          content: null,
          reason: e.message || "A processing error occurred.",
        });
      }
    }
  );

  app.post(
    "/ext/youtube-transcript",
    [verifyPayloadIntegrity],
    async function (request, response) {
      try {
        const {
          loadYouTubeTranscript,
        } = require("../utils/extensions/YoutubeTranscript");
        const { success, reason, data } = await loadYouTubeTranscript(
          reqBody(request)
        );
        response.status(200).json({ success, reason, data });
      } catch (e) {
        console.error(e);
        response.status(400).json({
          success: false,
          reason: e.message,
          data: {
            title: null,
            author: null,
          },
        });
      }
    }
  );

  app.post(
    "/ext/website-depth",
    [verifyPayloadIntegrity],
    async function (request, response) {
      try {
        const websiteDepth = require("../utils/extensions/WebsiteDepth");
        const {
          url,
          depth = 1,
          maxLinks = 20,
          destination = null,
        } = reqBody(request);
        const validatedUrl = validateURL(url);
        if (!validURL(validatedUrl)) throw new Error("Not a valid URL.");
        const scrapedData = await websiteDepth(
          validatedUrl,
          depth,
          maxLinks,
          destination
        );
        response.status(200).json({ success: true, data: scrapedData });
      } catch (e) {
        console.error(e);
        response.status(400).json({ success: false, reason: e.message });
      }
    }
  );
}

module.exports = extensions;
