// server/services/inventoryService.js
const dayjs = require("dayjs");
const Item = require("../models/Item");
const InventoryMove = require("../models/InventoryMove");

function findPriceForDate(item, date) {
  const target = dayjs(date || new Date()).endOf("day").toDate();
  const entry = item.priceHistory
    .filter((p) => {
      const startOk = !p.startDate || dayjs(p.startDate).isSameOrBefore(target, "day");
      const endOk = !p.endDate || dayjs(p.endDate).isSameOrAfter(target, "day");
      return startOk && endOk;
    })
    .sort((a, b) => dayjs(b.startDate).valueOf() - dayjs(a.startDate).valueOf())[0];

  return entry
    ? {
        price: entry.price,
        currency: entry.currency,
        sourceHistoryId: entry._id,
      }
    : null;
}

async function recordInventoryMove({
  itemId,
  quantity,
  moveType = "transfer",
  source,
  destination,
  performedBy,
  moveDate,
  strictCountOverride,
  note,
}) {
  const item = await Item.findById(itemId);
  if (!item) {
    throw new Error("품목을 찾을 수 없습니다.");
  }

  const strictCount = typeof strictCountOverride === "boolean" ? strictCountOverride : item.strictCount;

  let warning = null;
  let strictViolation = false;
  if (strictCount && moveType === "adjustment") {
    strictViolation = true;
    throw new Error("정확 검증 대상 항목은 차이 조정이 허용되지 않습니다.");
  } else if (strictCount && moveType !== "inbound" && quantity < 0) {
    strictViolation = true;
    throw new Error("정확 검증 대상 항목은 재고 감소 시 반드시 입/출고 기록이 필요합니다.");
  } else if (!strictCount && moveType === "adjustment") {
    warning = "엄격 검증이 비활성화된 품목이므로 경고만 남기고 저장합니다.";
  }

  const priceApplied = findPriceForDate(item, moveDate);
  const autoInboundSuggested = quantity > 0 && moveType !== "inbound";

  const move = await InventoryMove.create({
    item: itemId,
    quantity,
    moveType,
    source,
    destination,
    strictCount,
    strictViolation,
    warning,
    performedBy,
    moveDate,
    note,
    priceApplied,
    autoInboundSuggested,
  });

  return move;
}

module.exports = {
  recordInventoryMove,
  findPriceForDate,
};
