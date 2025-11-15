import React from "react";
import { NavLink } from "react-router-dom";
import { OPS_ALLOWED_ROLES, OPS_NAV_ITEMS } from "@/constants/opsNavigation";
import { useAuth } from "@/context/useAuth";

const ROLE_NORMALIZE = {
  user: "employee",
  worker: "employee",
};

const normalizeRole = (role) => ROLE_NORMALIZE[role] || role;

const isAllowed = (role) => OPS_ALLOWED_ROLES.includes(normalizeRole(role));

const navLinkClass = ({ isActive }) =>
  `flex flex-col rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
    isActive
      ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow"
      : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white"
  }`;

const OpsSidebar = () => {
  const { user } = useAuth();
  const role = user?.role || "employee";
  if (!isAllowed(role)) {
    return null;
  }

  return (
    <aside className="w-full max-w-[220px] space-y-3">
      {OPS_NAV_ITEMS.map((item) => (
        <NavLink key={item.key} to={item.to} className={navLinkClass}>
          {item.label}
          <span className="mt-1 text-xs font-normal text-slate-500">{item.description}</span>
        </NavLink>
      ))}
    </aside>
  );
};

export default OpsSidebar;
