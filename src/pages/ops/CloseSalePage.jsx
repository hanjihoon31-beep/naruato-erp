import React from "react";
import useOpsBranchContext from "@/hooks/useOpsBranchContext";
import DailyCashManagement from "@/pages/DailyCashManagement";

const CloseSalePage = () => {
  const { branchId, branch } = useOpsBranchContext();

  return (
    <DailyCashManagement
      overrideStoreId={branchId}
      overrideStoreName={branch?.name || branch?.storeName || ""}
      hideStoreSelector
      compactHeader
    />
  );
};

export default CloseSalePage;
