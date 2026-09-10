-- Removes the browser extension surface. The extension client, its endpoints, its
-- model and its settings page are all gone, so nothing reads this table any more -
-- and every row in it is a live bearer credential that grants a connected browser
-- access to the instance, so the table is dropped rather than left behind on
-- deployed instances.
DROP TABLE IF EXISTS "browser_extension_api_keys";

-- The `system.browser_extension` permission is deliberately not deleted here.
-- Role.seed() already prunes any permission missing from the catalog on every boot
-- (see `permissions.deleteMany` in server/models/role.js), and role_permissions
-- cascades from it, so the row and every role that ticked it clear themselves.
