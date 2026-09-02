// Local dev repro: walk the exact check-token path (validatedRequest -> userFromSession)
// without booting the whole server (no schedulers/telegram polling side effects).
process.env.NODE_ENV = "development";
require("dotenv").config({ path: ".env.development" });

const JWT = require("jsonwebtoken");

(async () => {
  const { User } = require("./models/user");
  const users = await User.where({}, 5);
  console.log(
    "users:",
    users.map((u) => ({ id: u.id, username: u.username, role: u.role }))
  );
  if (!users.length) return console.log("no users - cannot repro");

  const u = users[0];
  const token = JWT.sign(
    { id: u.id, username: u.username, p: null },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );

  const { validatedRequest } = require("./utils/middleware/validatedRequest");
  const { userFromSession } = require("./utils/http");

  const request = {
    path: "/system/check-token",
    header: (k) => (k === "Authorization" ? `Bearer ${token}` : undefined),
    headers: { authorization: `Bearer ${token}` },
  };
  const response = {
    locals: {},
    statusCode: null,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(b) {
      console.log("RESPONDED", this.statusCode, b);
      return this;
    },
    sendStatus(c) {
      console.log("SENDSTATUS", c);
      return this;
    },
    end() {},
  };

  try {
    await validatedRequest(request, response, () =>
      console.log("validatedRequest -> next() OK")
    );
  } catch (e) {
    console.error("!!! validatedRequest THREW:", e);
    return;
  }

  try {
    const user = await userFromSession(request, response);
    console.log("userFromSession ->", user ? { id: user.id } : null);
  } catch (e) {
    console.error("!!! userFromSession THREW:", e);
  }
})().catch((e) => console.error("TOP LEVEL THROW:", e));
