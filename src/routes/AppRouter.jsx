import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import OpsLayout from "@/components/ops/OpsLayout";
import OpenStartPage from "@/pages/ops/OpenStartPage";
import CloseSalePage from "@/pages/ops/CloseSalePage";
import DisposalPage from "@/pages/ops/DisposalPage";
import CheckInPage from "@/pages/ops/CheckInPage";
import InventoryPage from "@/pages/ops/InventoryPage";
import TemplatePage from "@/pages/ops/TemplatePage";
import PreInventoryCheckPage from "@/pages/ops/PreInventoryCheckPage";
import DailyCashPage from "@/pages/ops/DailyCashPage";
import { FEATURE_PERMISSIONS } from "@/auth/permissions";
import { OPS_ALLOWED_ROLES } from "@/constants/opsNavigation";

const withPermission = (element, permission) => (
  <ProtectedRoute allowedRoles={OPS_ALLOWED_ROLES} need={permission}>
    {element}
  </ProtectedRoute>
);

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/erp/ops" element={<Navigate to="/erp/ops/open-start" replace />} />
      <Route
        path="/erp/ops/*"
        element={
          <ProtectedRoute allowedRoles={OPS_ALLOWED_ROLES}>
            <OpsLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={withPermission(<OpenStartPage />, FEATURE_PERMISSIONS.OPEN_SHIFT)} />
        <Route path="open-start" element={withPermission(<OpenStartPage />, FEATURE_PERMISSIONS.OPEN_SHIFT)} />
        <Route path="close-sale" element={withPermission(<CloseSalePage />, FEATURE_PERMISSIONS.CLOSE_SALE)} />
        <Route path="daily-cash" element={withPermission(<DailyCashPage />, FEATURE_PERMISSIONS.CLOSE_SALE)} />
        <Route path="check-in" element={withPermission(<CheckInPage />, FEATURE_PERMISSIONS.SALES_INPUT)} />
        <Route path="disposal" element={withPermission(<DisposalPage />, FEATURE_PERMISSIONS.WASTE_INPUT)} />
        <Route
          path="pre-inventory-check"
          element={withPermission(<PreInventoryCheckPage />, FEATURE_PERMISSIONS.INVENTORY_BASIC)}
        />
        <Route
          path="daily-inventory"
          element={withPermission(<InventoryPage />, FEATURE_PERMISSIONS.INVENTORY_BASIC)}
        />
        <Route
          path="inventory"
          element={withPermission(<InventoryPage />, FEATURE_PERMISSIONS.INVENTORY_BASIC)}
        />
        <Route
          path="daily-inventory-template"
          element={withPermission(<TemplatePage />, FEATURE_PERMISSIONS.INVENTORY_BASIC)}
        />
        <Route
          path="template"
          element={withPermission(<TemplatePage />, FEATURE_PERMISSIONS.INVENTORY_BASIC)}
        />
        <Route path="*" element={<Navigate to="open-start" replace />} />
      </Route>
    </Routes>
  );
}
