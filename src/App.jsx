// src/App.jsx
import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Topbar from "./components/layouts/Topbar";
import DashboardShell from "./components/layouts/DashboardShell";
import { ROUTE_PERMISSION_MAP, ROUTE_ADMIN_PERMISSION_MAP } from "./constants/navigation";
import AppRouter from "./routes/AppRouter"; // added by new ERP update

const ADMIN_ROLES = ["superadmin", "admin"];
const EMPLOYEE_ROLES = ["superadmin", "admin", "employee", "user", "worker"];
const AUTH_ROLES = ["superadmin", "admin", "employee", "user", "worker"];

// 공통/메인
import LoginPage from "./pages/LoginPage";
import Erphan from "./pages/Erphan";
import MyPage from "./pages/MyPage";

// 대시보드
import AdminDashboard from "./pages/AdminDashboard";
import SuperadminDashboard from "./pages/superadmin/Dashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";

// 관리/로그/권한/승인
import AdminApproval from "./pages/AdminApproval";
import AdminLogManager from "./pages/AdminLogManager";
import AdminRoleManager from "./pages/AdminRoleManager";
import AdminOperationsHub from "./pages/admin/AdminOperationsHub.jsx"; // added by new ERP update
import AdminPermissionLog from "./pages/AdminPermissionLog"; // added by new ERP update

// 재무/정산
import VoucherManagement from "./pages/VoucherManagement";
import PayrollManagement from "./pages/PayrollManagement";

// 근태
import AttendanceCheck from "./pages/AttendanceCheck";
import AttendanceModification from "./pages/AttendanceModification";
import AttendanceSettings from "./pages/AttendanceSettings";

// 창고/재고
import EquipmentManagement from "./pages/EquipmentManagement";
import StoreSaleItems from "./pages/StoreSaleItems";
import ProductDisposalManagement from "./pages/ProductDisposalManagement";
import WarehouseInbound from "./pages/WarehouseInbound";
import WarehouseOutbound from "./pages/WarehouseOutbound";
import WarehouseReturn from "./pages/WarehouseReturn";
import WarehouseDispose from "./pages/WarehouseDispose";
import WarehouseInventory from "./pages/WarehouseInventory";
import AdminDailyReport from "./pages/AdminDailyReport";

// 샘플 페이지
import ApprovalPage from "./pages/ApprovalPage";
import ManagePage from "./pages/ManagePage";
import InventoryPage from "./pages/InventoryPage";
import WarehousePage from "./pages/WarehousePage";
import NoPermission from "./pages/NoPermission";

export default function App() {
  const location = useLocation();
  const isOpsRoute = location.pathname.startsWith("/erp/ops");
  const renderDashboardRoute = (path, allowedRoles, node) => (
    <ProtectedRoute
      allowedRoles={allowedRoles}
      permissionKeys={ROUTE_PERMISSION_MAP[path]}
      adminPermission={ROUTE_ADMIN_PERMISSION_MAP[path]}
    >
      <DashboardShell>{node}</DashboardShell>
    </ProtectedRoute>
  );

  return (
    <>
      {!isOpsRoute && <Topbar />}

      <div className={isOpsRoute ? "" : "pt-16"}>
        <Routes>
          {/* ✅ 로그인 */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />

        {/* ✅ ERP 진입 */}
        <Route path="/erp" element={<Erphan />} />

        {/* ✅ 최고관리자 */}
        <Route
          path="/erp/superadmin/dashboard"
          element={renderDashboardRoute("/erp/superadmin/dashboard", ["superadmin"], <SuperadminDashboard />)}
        />

        {/* ✅ 관리자 */}
        <Route
          path="/erp/admin/dashboard"
          element={renderDashboardRoute("/erp/admin/dashboard", ADMIN_ROLES, <AdminDashboard />)}
        />
        <Route
          path="/erp/admin/approval"
          element={renderDashboardRoute("/erp/admin/approval", ADMIN_ROLES, <AdminApproval />)}
        />
        <Route
          path="/erp/admin/roles"
          element={renderDashboardRoute("/erp/admin/roles", ADMIN_ROLES, <AdminRoleManager />)}
        />
        <Route
          path="/erp/admin/operations-hub"
          element={renderDashboardRoute("/erp/admin/operations-hub", ADMIN_ROLES, <AdminOperationsHub />)}
        />
        <Route
          path="/erp/admin/logs"
          element={renderDashboardRoute("/erp/admin/logs", ADMIN_ROLES, <AdminLogManager />)}
        />
        <Route
          path="/erp/admin/permission-logs"
          element={renderDashboardRoute("/erp/admin/permission-logs", ADMIN_ROLES, <AdminPermissionLog />)}
        />

        {/* ✅ 재무/정산 */}
        <Route
          path="/erp/admin/daily-cash"
          element={
            <ProtectedRoute allowedRoles={ADMIN_ROLES}>
              <Navigate to="/erp/ops/daily-cash" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/erp/admin/vouchers"
          element={renderDashboardRoute("/erp/admin/vouchers", ADMIN_ROLES, <VoucherManagement />)}
        />
        <Route
          path="/erp/admin/payroll"
          element={renderDashboardRoute("/erp/admin/payroll", ADMIN_ROLES, <PayrollManagement />)}
        />

        {/* ✅ 근태 */}
        <Route
          path="/erp/admin/attendance-check"
          element={renderDashboardRoute("/erp/admin/attendance-check", ADMIN_ROLES, <AttendanceCheck />)}
        />
        <Route
          path="/erp/admin/attendance-modification"
          element={renderDashboardRoute("/erp/admin/attendance-modification", ADMIN_ROLES, <AttendanceModification />)}
        />
        <Route
          path="/erp/admin/attendance-settings"
          element={renderDashboardRoute("/erp/admin/attendance-settings", ADMIN_ROLES, <AttendanceSettings />)}
        />

        {/* ✅ 창고/재고 */}
        <Route
          path="/erp/admin/equipment"
          element={renderDashboardRoute("/erp/admin/equipment", ADMIN_ROLES, <EquipmentManagement />)}
        />
        <Route
          path="/erp/admin/disposal"
          element={renderDashboardRoute("/erp/admin/disposal", ADMIN_ROLES, <ProductDisposalManagement />)}
        />
        <Route
          path="/admin/disposal"
          element={renderDashboardRoute("/admin/disposal", ADMIN_ROLES, <ProductDisposalManagement />)}
        />
        <Route
          path="/erp/admin/daily-inventory"
          element={
            <ProtectedRoute allowedRoles={ADMIN_ROLES}>
              <Navigate to="/erp/ops/pre-inventory-check" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/erp/admin/daily-inventory-template"
          element={
            <ProtectedRoute allowedRoles={ADMIN_ROLES}>
              <Navigate to="/erp/ops/template" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/erp/admin/store-sale-items"
          element={renderDashboardRoute("/erp/admin/store-sale-items", ADMIN_ROLES, <StoreSaleItems />)}
        />
        <Route
          path="/erp/admin/daily-report"
          element={renderDashboardRoute("/erp/admin/daily-report", ADMIN_ROLES, <AdminDailyReport />)}
        />

        {/* ✅ 창고 세부 */}
        <Route
          path="/erp/admin/warehouse/inbound"
          element={renderDashboardRoute("/erp/admin/warehouse/inbound", ADMIN_ROLES, <WarehouseInbound />)}
        />
        <Route
          path="/erp/admin/warehouse/outbound"
          element={renderDashboardRoute("/erp/admin/warehouse/outbound", ADMIN_ROLES, <WarehouseOutbound />)}
        />
        <Route
          path="/erp/admin/warehouse/return"
          element={renderDashboardRoute("/erp/admin/warehouse/return", ADMIN_ROLES, <WarehouseReturn />)}
        />
        <Route
          path="/erp/admin/warehouse/dispose"
          element={renderDashboardRoute("/erp/admin/warehouse/dispose", ADMIN_ROLES, <WarehouseDispose />)}
        />
        <Route
          path="/erp/admin/warehouse/inventory"
          element={renderDashboardRoute("/erp/admin/warehouse/inventory", ADMIN_ROLES, <WarehouseInventory />)}
        />
        <Route
          path="/erp/ops/*"
          element={
            <ProtectedRoute allowedRoles={EMPLOYEE_ROLES}>
              <AppRouter />
            </ProtectedRoute>
          }
        />

        {/* ✅ MyPage */}
        <Route
          path="/mypage"
          element={
            <ProtectedRoute allowedRoles={AUTH_ROLES}>
              <MyPage />
            </ProtectedRoute>
          }
        />

        {/* ✅ 근무자 Dashboard */}
        <Route
          path="/erp/employee/dashboard"
          element={renderDashboardRoute("/erp/employee/dashboard", EMPLOYEE_ROLES, <EmployeeDashboard />)}
        />

        {/* ✅ 샘플 */}
        <Route path="/approval" element={<ApprovalPage />} />
        <Route path="/manage" element={<ManagePage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/warehouse" element={<WarehousePage />} />
        <Route path="/403" element={<NoPermission />} />

          {/* ✅ Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </>
  );
}
