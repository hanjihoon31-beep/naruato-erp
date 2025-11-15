import React from "react";
import Sidebar, { MobileNav } from "./Sidebar";
import { InventoryProvider } from "../../context/InventoryContext";

const DashboardShell = ({ children }) => (
  <div className="min-h-screen bg-gray-100">
    <div className="flex">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <InventoryProvider>
          <MobileNav />
          <div className="space-y-6">{children}</div>
        </InventoryProvider>
      </main>
    </div>
  </div>
);

export default DashboardShell;
