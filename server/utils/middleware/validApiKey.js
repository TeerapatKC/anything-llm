const { ApiKey } = require("../../models/apiKeys");
const { User } = require("../../models/user");

async function validApiKey(request, response, next) {
  const auth = request.header("Authorization");
  const bearerKey = auth ? auth.split(" ")[1] : null;
  if (!bearerKey) {
    response.status(403).json({
      error: "No valid api key found.",
    });
    return;
  }

  const apiKey = await ApiKey.get({ secret: bearerKey });
  if (!apiKey) {
    response.status(403).json({
      error: "No valid api key found.",
    });
    return;
  }

  // The account that minted the key owns what the key creates, which is the
  // only user identity an API-key request has. Kept off `locals.user` on
  // purpose - these requests are not that user's session, and handlers that
  // branch on a signed-in user must not start treating them as one.
  // Loaded in full, not just the id: visibility checks read the owner's role
  // to decide whether they hold documents.view_all.
  response.locals.apiKey = apiKey;
  response.locals.apiKeyOwner = apiKey.createdBy
    ? await User.get({ id: apiKey.createdBy })
    : null;

  next();
}

module.exports = {
  validApiKey,
};
