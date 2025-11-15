// added by new ERP update
export const formatMoney = (value: number | null | undefined) =>
  new Intl.NumberFormat("ko-KR").format(value ?? 0);

export const sumCashDenominations = (cash: Record<number | "coinSum", number>) =>
  (cash[50000] || 0) * 50000 +
  (cash[10000] || 0) * 10000 +
  (cash[5000] || 0) * 5000 +
  (cash[1000] || 0) * 1000 +
  (cash[500] || 0) * 500 +
  (cash[100] || 0) * 100 +
  (cash.coinSum || 0);
