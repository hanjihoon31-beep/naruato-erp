import { useOutletContext } from "react-router-dom";

export default function useOpsBranchContext() {
  return useOutletContext() || {};
}
