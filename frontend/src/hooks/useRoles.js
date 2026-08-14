import { useEffect, useState } from "react";
import Role from "@/models/role";

/**
 * Loads the instance's roles and the permission catalog so UI can reason about what a
 * given role grants - which role to offer in a dropdown, whether the signed-in user
 * outranks another user, what to show as a role's summary.
 * @returns {{roles: Array, permissionLabels: Record<string, string>, loading: boolean}}
 */
export default function useRoles() {
  const [roles, setRoles] = useState([]);
  const [permissionLabels, setPermissionLabels] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [{ roles: _roles }, { categories }] = await Promise.all([
        Role.all(),
        Role.permissionCatalog(),
      ]);
      if (cancelled) return;

      setRoles(_roles || []);
      setPermissionLabels(
        (categories || []).reduce((labels, category) => {
          for (const permission of category.permissions)
            labels[permission.key] = permission.label;
          return labels;
        }, {})
      );
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { roles, permissionLabels, loading };
}
