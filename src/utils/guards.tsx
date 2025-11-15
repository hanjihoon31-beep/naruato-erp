// added by new ERP update
import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import type { MenuPermissionKey } from "@/auth/permissions";

export function PermissionGuard({ need, children }: { need: MenuPermissionKey; children: ReactElement }) {
  const { isLoggedIn, can } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!can(need)) {
    return <Navigate to="/403" replace />;
  }

  return children;
}
