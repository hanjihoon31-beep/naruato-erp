// added by new ERP update
export type StoreId = string;
export type EmployeeId = string;
export type MenuKey = string;

export type Money = number;
export type Qty = number;
export type Timestamp = string;

export interface MenuPrice {
  key: MenuKey;
  name: string;
  unitPrice: Money;
  hidden?: boolean;
}

export type SettlementState =
  | "draft"
  | "settled"
  | "amend-requested"
  | "amend-approved"
  | "amend-rejected";

export interface OpenStartPayload {
  storeId: StoreId;
  isTakeover?: boolean;
  openPhotoUrl?: string;
  openAtFromPhoto?: boolean;
  cash: {
    50000: Qty;
    10000: Qty;
    5000: Qty;
    1000: Qty;
    500: Qty;
    100: Qty;
    coinSum: Money;
  };
  inventoryOpen: Array<{
    itemKey: string;
    qty: Qty;
  }>;
  adjustments?: Array<{
    itemKey: string;
    type: "auto-inbound" | "auto-outbound";
    qty: Qty;
    confirmed: boolean;
    reason?: string;
  }>;
}

export interface WasteMovePayload {
  storeId: StoreId;
  type: "waste" | "inbound" | "outbound";
  photoUrl?: string;
  items: Array<{ itemKey: string; qty: Qty; reason?: string }>;
}

export interface EntranceCountPayload {
  storeId: StoreId;
  date: string;
  enter: number;
  remain: number;
  photoUrl?: string;
}

export interface CashSettlementPayload {
  storeId: StoreId;
  cash: {
    50000: Qty;
    10000: Qty;
    5000: Qty;
    1000: Qty;
    500: Qty;
    100: Qty;
    coinSum: Money;
  };
  confirmAutoClaim?: boolean;
}

export interface SalesEntryPayload {
  storeId: StoreId;
  photos: string[];
  lines: Array<{ menuKey: MenuKey; qty: Qty }>;
}

export interface CloseInventoryPayload {
  storeId: StoreId;
  items: Array<{ itemKey: string; qty: Qty }>;
}

export interface AmendRequestPayload {
  storeId: StoreId;
  target: "cash" | "sales" | "inventory";
  beforeSnapshotId: string;
  patch: any;
  reason: string;
}

export interface Ok<T = unknown> {
  success: true;
  data: T;
}

export interface Fail {
  success: false;
  message: string;
  code?: string;
}
