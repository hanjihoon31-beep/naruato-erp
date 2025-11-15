// server/middleware/requirePermission.js
const requirePermission = (permissionKey, action = "read") => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }
    if (req.user.role === "superadmin") {
      return next();
    }

    const permissions = req.user.permissions || {};
    const menuPermission = permissions.get
      ? permissions.get(permissionKey)
      : permissions[permissionKey];

    if (!menuPermission) {
      return res.status(403).json({ message: "메뉴 권한이 없습니다." });
    }

    if (!menuPermission[action]) {
      return res.status(403).json({ message: "해당 작업에 대한 권한이 없습니다." });
    }

    return next();
  };
};

module.exports = { requirePermission };
