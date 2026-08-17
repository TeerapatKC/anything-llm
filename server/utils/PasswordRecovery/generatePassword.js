const crypto = require("crypto");

const CHARSETS = {
  lowerCase: "abcdefghijkmnopqrstuvwxyz", // no `l` - too easy to misread
  upperCase: "ABCDEFGHJKLMNPQRSTUVWXYZ", // no `I`/`O` - too easy to misread
  numeric: "23456789", // no `0`/`1` - too easy to misread
  symbol: "!@#$%^&*-_+=?",
};

/**
 * Pick `count` characters from `pool` using a uniform, rejection-sampled draw so the
 * generated password does not skew toward the front of the pool.
 * @param {string} pool
 * @param {number} count
 * @returns {string[]}
 */
function randomChars(pool, count = 1) {
  const picked = [];
  const limit = Math.floor(256 / pool.length) * pool.length;
  while (picked.length < count) {
    const byte = crypto.randomBytes(1)[0];
    if (byte >= limit) continue; // discard biased tail of the byte range
    picked.push(pool[byte % pool.length]);
  }
  return picked;
}

/**
 * Fisher-Yates shuffle using CSPRNG draws so the guaranteed characters are not
 * pinned to the front of the password.
 * @param {string[]} items
 * @returns {string[]}
 */
function shuffle(items = []) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/**
 * Generates a random password that satisfies the same complexity rules
 * `User.checkPasswordComplexity` enforces, regardless of how the PASSWORD* env
 * variables are configured. Used for the initial password of a newly created user
 * and for admin-driven password resets - in both cases the plaintext is shown to
 * the admin exactly once and the account is flagged to require a change on login.
 * @returns {string} the plaintext password
 */
function generateInitialPassword() {
  const minLength = Math.max(Number(process.env.PASSWORDMINCHAR || 8) || 8, 16);
  const maxLength = Number(process.env.PASSWORDMAXCHAR || 250) || 250;
  const length = Math.min(minLength, maxLength);

  // Always include one of each class - the complexity check may require any
  // combination of them and an all-class password satisfies every combination.
  const characters = Object.values(CHARSETS).map(
    (pool) => randomChars(pool)[0]
  );
  const allPools = Object.values(CHARSETS).join("");
  characters.push(
    ...randomChars(allPools, Math.max(length - characters.length, 0))
  );
  return shuffle(characters).join("");
}

module.exports = { generateInitialPassword };
