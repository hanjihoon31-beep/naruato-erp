const Warehouse = require("../models/Warehouse");

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const DEFAULT_INTERVAL_MS = 12 * 60 * 60 * 1000; // every 12h

async function purgeHiddenWarehouses() {
  const threshold = new Date(Date.now() - THREE_DAYS_MS);
  try {
    const candidates = await Warehouse.find({
      isActive: false,
      hiddenAt: { $lte: threshold },
    }).select("_id warehouseName");
    if (!candidates.length) return;
    const ids = candidates.map((warehouse) => warehouse._id);
    await Warehouse.deleteMany({ _id: { $in: ids } });
    console.log(
      `[WarehouseCleanup] deleted ${ids.length} warehouses: ${candidates.map((c) => c.warehouseName).join(", ")}`
    );
  } catch (err) {
    console.error("[WarehouseCleanup] failed:", err?.message || err);
  }
}

function setupWarehouseCleanup(intervalMs = DEFAULT_INTERVAL_MS) {
  purgeHiddenWarehouses();
  setInterval(purgeHiddenWarehouses, intervalMs);
}

module.exports = { setupWarehouseCleanup };
