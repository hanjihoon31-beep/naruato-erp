import { MENUS } from "../auth/permissions";

const PERMISSION = (...keys) => keys;

const ROLE_NORMALIZE = {
  user: "employee",
  worker: "employee",
};

const resolveRole = (role) => ROLE_NORMALIZE[role] || role;
const ADMIN_ONLY_ROLES = ["admin", "superadmin"];
const OPS_ROLES = ["employee", "user", "worker", "admin", "superadmin"];

export const ADMIN_NAV_SECTIONS = [
  {
    key: "management",
    title: "관리",
    items: [
      {
        key: "admin-dashboard",
        label: "관리자 대시보드",
        to: "/erp/admin/dashboard",
        permissions: PERMISSION("adminDashboard", "dashboardView"),
        roles: ADMIN_ONLY_ROLES,
      },
      {
        key: "admin-approval",
        label: "승인 관리",
        to: "/erp/admin/approval",
        permissions: PERMISSION("approvalManage", "approval"),
        roles: ADMIN_ONLY_ROLES,
      },
      {
        key: "admin-roles",
        label: "권한 관리",
        to: "/erp/admin/roles",
        permissions: PERMISSION("roleManage", "roleAdmin"),
        adminPermission: "manageRoles",
        roles: ADMIN_ONLY_ROLES,
      },
      {
        key: "admin-logs",
        label: "로그 관리",
        to: "/erp/admin/logs",
        permissions: PERMISSION("logManage", "auditLog"),
        roles: ADMIN_ONLY_ROLES,
      },
      {
        key: "admin-permission-log",
        label: "권한 변경 이력",
        to: "/erp/admin/permission-logs",
        permissions: PERMISSION(),
        adminPermission: "log",
        roles: ADMIN_ONLY_ROLES,
      },
      {
        key: "admin-ops-hub",
        label: "운영 허브",
        to: "/erp/admin/operations-hub",
        permissions: PERMISSION("adminDashboard"),
        roles: ADMIN_ONLY_ROLES,
      },
    ],
  },
  {
    key: "finance",
    title: "재무/정산",
    items: [
      {
        key: "voucher",
        label: "권면(바우처) 관리",
        to: "/erp/admin/vouchers",
        permissions: PERMISSION("voucherManage", "dailyCash"),
        roles: ADMIN_ONLY_ROLES,
      },
      {
        key: "payroll",
        label: "급여 관리",
        to: "/erp/admin/payroll",
        permissions: PERMISSION("payrollView", "payroll"),
        roles: ADMIN_ONLY_ROLES,
      },
      {
        key: "daily-report",
        label: "일일 결산",
        to: "/erp/admin/daily-report",
        permissions: PERMISSION("dailyReportView", "reportView"),
        roles: ADMIN_ONLY_ROLES,
      },
    ],
  },
  {
    key: "attendance",
    title: "근태",
    items: [
      {
        key: "attendance-check",
        label: "출퇴근 체크",
        to: "/erp/admin/attendance-check",
        permissions: PERMISSION("attendanceCheck", "attendance"),
        roles: ADMIN_ONLY_ROLES,
      },
      {
        key: "attendance-modify",
        label: "근태 수정",
        to: "/erp/admin/attendance-modification",
        permissions: PERMISSION("attendanceModify", "attendance"),
        roles: ADMIN_ONLY_ROLES,
      },
      {
        key: "attendance-settings",
        label: "근태 설정",
        to: "/erp/admin/attendance-settings",
        permissions: PERMISSION("attendanceSettings", "attendance"),
        roles: ADMIN_ONLY_ROLES,
      },
    ],
  },
  {
    key: "inventory",
    title: "창고/재고",
    items: [
      {
        key: "warehouse-inbound",
        label: "입고",
        to: "/erp/admin/warehouse/inbound",
        permissions: PERMISSION("storageInOut", "inventory"),
        roles: ADMIN_ONLY_ROLES,
      },
      {
        key: "warehouse-outbound",
        label: "출고",
        to: "/erp/admin/warehouse/outbound",
        permissions: PERMISSION("storageInOut", "inventory"),
        roles: ADMIN_ONLY_ROLES,
      },
      {
        key: "warehouse-return",
        label: "반품",
        to: "/erp/admin/warehouse/return",
        permissions: PERMISSION("storageInOut", "inventory"),
        roles: ADMIN_ONLY_ROLES,
      },
      {
        key: "warehouse-dispose",
        label: "폐기",
        to: "/erp/admin/warehouse/dispose",
        permissions: PERMISSION("storageInOut", "inventory"),
        roles: ADMIN_ONLY_ROLES,
      },
      {
        key: "warehouse-inventory",
        label: "창고 재고",
        to: "/erp/admin/warehouse/inventory",
        permissions: PERMISSION("warehouseInventory", "inventory"),
        roles: ADMIN_ONLY_ROLES,
      },
      {
        key: "equipment",
        label: "기물/기기 관리",
        to: "/erp/admin/equipment",
        permissions: PERMISSION("equipmentManage", "inventory"),
        roles: ADMIN_ONLY_ROLES,
      },
    ],
  },
  {
    key: "store-ops",
    title: "매장 운영",
    items: [
      {
        key: "close-sale",
        label: "매장 집계 후",
        to: "/erp/ops/close-sale",
        permissions: PERMISSION(MENUS.SETTLEMENT),
        roles: OPS_ROLES,
      },
      {
        key: "ops-pre-inventory",
        label: "재고 확인 전",
        to: "/erp/ops/pre-inventory-check",
        permissions: PERMISSION(MENUS.INVENTORY),
        roles: OPS_ROLES,
      },
      {
        key: "ops-template",
        label: "재고 템플릿",
        to: "/erp/ops/template",
        permissions: PERMISSION(MENUS.TEMPLATE),
        roles: OPS_ROLES,
      },
      {
        key: "ops-daily-cash",
        label: "일일 시재",
        to: "/erp/ops/daily-cash",
        permissions: PERMISSION(MENUS.SETTLEMENT),
        roles: OPS_ROLES,
      },
      {
        key: "open-start",
        label: "시재·재고 오픈",
        to: "/erp/ops/open-start",
        permissions: PERMISSION(MENUS.OPEN_START),
        roles: OPS_ROLES,
      },
      {
        key: "ops-inventory",
        label: "재고 확인",
        to: "/erp/ops/inventory",
        permissions: PERMISSION(MENUS.INVENTORY),
        roles: OPS_ROLES,
      },
      {
        key: "ops-disposal",
        label: "폐기/입출고",
        to: "/erp/ops/disposal",
        permissions: PERMISSION(MENUS.WASTE_MOVE),
        roles: OPS_ROLES,
      },
      {
        key: "ops-check-in",
        label: "입장 집계",
        to: "/erp/ops/check-in",
        permissions: PERMISSION(MENUS.ENTRANCE),
        roles: OPS_ROLES,
      },
    ],
  },
];

export const EMPLOYEE_NAV_SECTIONS = [
  {
    key: "employee-ops",
    title: "신규 운영 프로세스",
    items: [
      {
        key: "employee-close-sale",
        label: "매장 집계 후",
        to: "/erp/ops/close-sale",
        permissions: PERMISSION(MENUS.SETTLEMENT),
        roles: OPS_ROLES,
      },
      {
        key: "employee-pre-inventory",
        label: "재고 확인 전",
        to: "/erp/ops/pre-inventory-check",
        permissions: PERMISSION(MENUS.INVENTORY),
        roles: OPS_ROLES,
      },
      {
        key: "employee-template",
        label: "재고 템플릿",
        to: "/erp/ops/template",
        permissions: PERMISSION(MENUS.TEMPLATE),
        roles: OPS_ROLES,
      },
      {
        key: "employee-daily-cash",
        label: "일일 시재",
        to: "/erp/ops/daily-cash",
        permissions: PERMISSION(MENUS.SETTLEMENT),
        roles: OPS_ROLES,
      },
      {
        key: "employee-open-start",
        label: "오픈 시재·재고",
        to: "/erp/ops/open-start",
        permissions: PERMISSION(MENUS.OPEN_START),
        roles: OPS_ROLES,
      },
      {
        key: "employee-disposal",
        label: "폐기/입출고",
        to: "/erp/ops/disposal",
        permissions: PERMISSION(MENUS.WASTE_MOVE),
        roles: OPS_ROLES,
      },
      {
        key: "employee-check-in",
        label: "입장 집계",
        to: "/erp/ops/check-in",
        permissions: PERMISSION(MENUS.ENTRANCE),
        roles: OPS_ROLES,
      },
      {
        key: "employee-inventory",
        label: "재고 확인",
        to: "/erp/ops/inventory",
        permissions: PERMISSION(MENUS.INVENTORY),
        roles: OPS_ROLES,
      },
    ],
  },
];

const flattenItems = (sections = []) =>
  sections.flatMap((section) =>
    (section.items || []).map((item) => ({
      ...item,
      sectionKey: section.key,
    }))
  );

const ADMIN_ITEMS = flattenItems(ADMIN_NAV_SECTIONS);
const EMPLOYEE_ITEMS = flattenItems(EMPLOYEE_NAV_SECTIONS);

export const ROUTE_PERMISSION_MAP = {};
export const ROUTE_ADMIN_PERMISSION_MAP = {};

const registerRoutes = (items = []) => {
  items.forEach((item) => {
    if (item.to) {
      ROUTE_PERMISSION_MAP[item.to] = item.permissions;
      if (item.adminPermission) {
        ROUTE_ADMIN_PERMISSION_MAP[item.to] = item.adminPermission;
      }
    }
  });
};

registerRoutes(ADMIN_ITEMS);
registerRoutes(EMPLOYEE_ITEMS);

ROUTE_PERMISSION_MAP["/erp/superadmin/dashboard"] = ROUTE_PERMISSION_MAP["/erp/admin/dashboard"];
ROUTE_PERMISSION_MAP["/admin/disposal"] = ROUTE_PERMISSION_MAP["/erp/admin/disposal"];
ROUTE_ADMIN_PERMISSION_MAP["/erp/superadmin/dashboard"] = ROUTE_ADMIN_PERMISSION_MAP["/erp/admin/dashboard"];
ROUTE_ADMIN_PERMISSION_MAP["/admin/disposal"] = ROUTE_ADMIN_PERMISSION_MAP["/erp/admin/disposal"];

export const isRoleAllowedForItem = (role, itemRoles = []) => {
  if (!itemRoles.length) return true;
  return itemRoles.includes(resolveRole(role));
};
