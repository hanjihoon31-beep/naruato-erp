export const OPS_NAV_ITEMS = [
  {
    key: "open-start",
    label: "시재·재고 오픈",
    description: "오픈 시재 및 재고 체크",
    to: "/erp/ops/open-start",
  },
  {
    key: "close-sale",
    label: "일일 결산",
    description: "마감 판매 및 결산",
    to: "/erp/ops/close-sale",
  },
  {
    key: "check-in",
    label: "입장 집계",
    description: "입장 현황을 실시간으로 확인",
    to: "/erp/ops/check-in",
  },
  {
    key: "disposal",
    label: "폐기/입출고",
    description: "폐기 및 이동 로그 관리",
    to: "/erp/ops/disposal",
  },
  {
    key: "daily-inventory",
    label: "일일 재고",
    description: "재고 이동/폐기 내역",
    to: "/erp/ops/daily-inventory",
  },
  {
    key: "daily-inventory-template",
    label: "재고 템플릿",
    description: "템플릿 기반 재고 관리",
    to: "/erp/ops/daily-inventory-template",
  },
];

export const OPS_ALLOWED_ROLES = ["superadmin", "admin", "employee", "user", "worker"];
