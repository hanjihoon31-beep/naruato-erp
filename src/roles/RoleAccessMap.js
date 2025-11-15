import { ADMIN_FEATURES, EMPLOYEE_FEATURES } from "@/auth/permissions";

const ROLE_NORMALIZE = {
  user: "employee",
  worker: "employee",
};

const employeeFeatures = [...EMPLOYEE_FEATURES];
const adminFeatures = [...ADMIN_FEATURES];

export const Access = {
  superadmin: ["*"],
  admin: adminFeatures,
  employee: employeeFeatures,
  user: employeeFeatures,
  worker: employeeFeatures,
};

const resolveRole = (role) => ROLE_NORMALIZE[role] || role;

const hasGrant = (grants, key) => {
  if (!Array.isArray(grants)) return false;
  if (grants.includes("*")) return true;
  return grants.includes(key);
};

export function can(role, key) {
  if (!role || !key) return false;
  const normalizedRole = resolveRole(role);
  const grants = Access[normalizedRole] || [];
  if (Array.isArray(key)) {
    return key.some((entry) => can(normalizedRole, entry));
  }
  if (typeof key === "string" && grants.includes("*")) return true;
  if (typeof key === "string") {
    return hasGrant(grants, key);
  }
  return false;
}
