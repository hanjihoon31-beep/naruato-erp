import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { ADMIN_NAV_SECTIONS, EMPLOYEE_NAV_SECTIONS, isRoleAllowedForItem } from "../../constants/navigation";
import { canAccessWithPermission, hasAdminPermission } from "../../utils/permissions"; // added by new ERP update

const ROLE_NORMALIZE = {
  user: "employee",
  worker: "employee",
};

const resolveRole = (role) => ROLE_NORMALIZE[role] || role;

const flattenSections = (sections) => sections.flatMap((section) => section.items);

const filterSectionsByPermission = (sections, user) => {
  const role = resolveRole(user?.role);
  return sections
    .map((section) => ({
      ...section,
      items: (section.items || []).filter((item) => {
        const hasMenuPermission = canAccessWithPermission(
          user,
          item.permissions || item.permissionKey,
          item.permissionAction || "read"
        );
        const hasAdminPerm = item.adminPermission ? hasAdminPermission(user, item.adminPermission) : true;
        const roleAllowed = isRoleAllowedForItem(role, item.roles);
        return hasMenuPermission && hasAdminPerm && roleAllowed;
      }),
    }))
    .filter((section) => section.items.length > 0);
};

const NavItem = ({ to, children }) => {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      className={`block rounded-xl border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-indigo-600 bg-indigo-600 text-white shadow"
          : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white"
      }`}
    >
      {children}
    </Link>
  );
};

const SidebarSection = ({ title, items }) => (
  <div className="space-y-2">
    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{title}</p>
    <div className="space-y-1">
      {items.map((item) => (
        <NavItem key={item.to} to={item.to}>
          {item.label}
        </NavItem>
      ))}
    </div>
  </div>
);

const Sidebar = () => {
  const { user, logout } = useAuth();
  const normalizedRole = resolveRole(user?.role);
  const isAdmin = normalizedRole === "admin" || normalizedRole === "superadmin";
  const sections = filterSectionsByPermission(isAdmin ? ADMIN_NAV_SECTIONS : EMPLOYEE_NAV_SECTIONS, user);

  return (
    <div className="hidden h-screen w-72 flex-shrink-0 overflow-hidden border-r border-slate-200 bg-white/95 shadow-md md:flex">
      <div className="flex h-full w-full flex-col px-5 py-6">
        <Link to="/erp" className="mb-6 flex flex-col text-left leading-tight" aria-label="ERP 홈으로 이동">
          <span className="text-sm font-medium text-gray-400">NARUATO ERP</span>
          <span className="text-lg font-bold text-gray-900">운영센터</span>
        </Link>
        <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">현재 사용자</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{user?.name || "사용자"}</p>
          <p className="text-xs text-slate-500">권한: {normalizedRole}</p>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto pr-1">
          {sections.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">
              표시할 메뉴가 없습니다. 관리자에게 권한을 요청하세요.
            </div>
          ) : (
            sections.map((section) => (
              <SidebarSection key={section.key} title={section.title} items={section.items} />
            ))
          )}
        </div>

        <button
          onClick={logout}
          className="mt-6 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
};

export const MobileNav = () => {
  const { user } = useAuth();
  const normalizedRole = resolveRole(user?.role);
  const isAdmin = normalizedRole === "admin" || normalizedRole === "superadmin";
  const sections = filterSectionsByPermission(isAdmin ? ADMIN_NAV_SECTIONS : EMPLOYEE_NAV_SECTIONS, user);
  const links = flattenSections(sections);
  const location = useLocation();

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow md:hidden">
      <div className="flex flex-wrap gap-2">
        {links.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
