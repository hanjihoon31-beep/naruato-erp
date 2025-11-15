// added by new ERP update
import { useMemo } from "react";
import { useAuth as useAuthContext } from "@/context/useAuth";
import { can as canByRole } from "@/roles/RoleAccessMap.js";

export function useAuth() {
  const authCtx = useAuthContext();

  const can = useMemo(
    () => (key: string) => {
      const role = authCtx?.user?.role;
      if (canByRole(role, key)) return true;
      const record = authCtx?.user?.menuPermissions?.[key];
      if (typeof record === "boolean") return record;
      if (record && typeof record === "object") {
        return Boolean(record.read || record.write || record.approve);
      }
      return false;
    },
    [authCtx?.user]
  );

  return {
    user: authCtx?.user ?? null,
    setUser: authCtx?.setUser ?? (() => undefined),
    can,
    isLoggedIn: Boolean(authCtx?.user),
  };
}
