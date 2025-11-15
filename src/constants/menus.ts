// added by new ERP update
import { MENUS } from "@/auth/permissions";

export const OPERATION_MENU_LINKS = [
  { key: MENUS.OPEN_START, label: "시재·재고 오픈", path: "/erp/ops/open-start" },
  { key: MENUS.SETTLEMENT, label: "일일 결산", path: "/erp/ops/close-sale" },
  { key: MENUS.WASTE_MOVE, label: "폐기/입출고", path: "/erp/ops/disposal" },
  { key: MENUS.ENTRANCE, label: "입장 집계", path: "/erp/ops/check-in" },
  { key: MENUS.INVENTORY, label: "재고 확인", path: "/erp/ops/inventory" },
  { key: MENUS.TEMPLATE, label: "재고 템플릿", path: "/erp/ops/template" },
] as const;
