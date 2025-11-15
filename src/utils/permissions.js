export const normalizeMenuPermissions = (rawPermissions) => {
  if (!rawPermissions) return {};

  const entries =
    rawPermissions instanceof Map
      ? Array.from(rawPermissions.entries())
      : Object.entries(rawPermissions);

  return entries.reduce((acc, [key, value]) => {
    if (typeof value === "boolean") {
      acc[key] = value;
    } else if (value && typeof value === "object") {
      acc[key] = {
        read: Boolean(value.read),
        write: Boolean(value.write),
        approve: Boolean(value.approve),
      };
    } else {
      acc[key] = Boolean(value);
    }
    return acc;
  }, {});
};

const normalizeKeys = (keyInput) => {
  if (!keyInput) return [];
  if (Array.isArray(keyInput)) {
    return keyInput.filter(Boolean);
  }
  return [keyInput].filter(Boolean);
};

const hasAnyAction = (record) => {
  if (typeof record === "boolean") return record;
  if (!record || typeof record !== "object") return false;
  return Boolean(record.read || record.write || record.approve);
};

const checkSinglePermission = (permissions, key, action) => {
  const record = permissions[key];

  if (record === undefined) {
    return null;
  }

  if (typeof record === "boolean") {
    return record;
  }

  if (action === "any") {
    return hasAnyAction(record);
  }

  return Boolean(record[action]);
};

export const canAccessWithPermission = (user, permissionKeyInput, action = "read") => {
  const keys = normalizeKeys(permissionKeyInput);
  if (!keys.length) return true;
  if (!user) return false;
  if (user.role === "superadmin") return true;

  const permissions = user.menuPermissions || {};

  for (const key of keys) {
    const result = checkSinglePermission(permissions, key, action);
    if (result === true) return true;
    if (result === null) {
      if (user.role === "admin") return true;
      continue;
    }
  }

  return false;
};

export const hasAdminPermission = (user, key) => {
  if (!key) return true;
  if (!user) return false;
  if (user.role === "superadmin") return true;
  return Boolean(user.adminPermissions?.[key]);
}; // added by new ERP update
