// ✅ src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { canAccessWithPermission, hasAdminPermission } from "../utils/permissions"; // added by new ERP update
import { can as canByRole } from "../roles/RoleAccessMap";

const normalizePermissionKeys = (keys) => {
  if (!keys) return [];
  if (Array.isArray(keys)) return keys.filter(Boolean);
  return [keys].filter(Boolean);
};

const ROLE_NORMALIZE = {
  user: "employee",
  worker: "employee",
};

const normalizeRole = (role) => ROLE_NORMALIZE[role] || role;

const matchesRole = (expected, actual) => {
  if (!expected || !actual) return false;
  return normalizeRole(expected) === normalizeRole(actual);
};

const ProtectedRoute = ({
  children,
  allowedRoles,
  permissionKey,
  permissionKeys,
  permissionAction = "read",
  fallbackPath = "/403",
  adminPermission, // added by new ERP update
  need,
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const normalizedNeeds = normalizePermissionKeys(need);

  if (allowedRoles && allowedRoles.length) {
    const normalizedRole = normalizeRole(user.role);
    let hasAccess = allowedRoles.some((role) => matchesRole(role, normalizedRole));
    if (!hasAccess && normalizedNeeds.length) {
      hasAccess = normalizedNeeds.some((entry) => canByRole(normalizedRole, entry));
    }

    if (!hasAccess) {
      return <Navigate to={fallbackPath} replace state={{ from: location }} />;
    }
  }

  if (normalizedNeeds.length && !normalizedNeeds.some((entry) => canByRole(normalizeRole(user.role), entry))) {
    return <Navigate to={fallbackPath} replace state={{ from: location }} />;
  }

  const normalizedKeys = normalizePermissionKeys(permissionKeys || permissionKey);

  if (normalizedKeys.length && !canAccessWithPermission(user, normalizedKeys, permissionAction)) {
    return <Navigate to={fallbackPath} replace state={{ from: location }} />;
  }

  if (adminPermission && !hasAdminPermission(user, adminPermission)) {
    return <Navigate to={fallbackPath} replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;
