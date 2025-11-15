// added by new ERP update
const cron = require("node-cron");
const AdminLog = require("../models/AdminLog");

const CLEANUP_SCHEDULE = "5 3 * * *";

function setupAdminLogCleanup() {
  cron.schedule(CLEANUP_SCHEDULE, async () => {
    const threshold = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    try {
      const { deletedCount } = await AdminLog.deleteMany({ createdAt: { $lt: threshold } });
      if (deletedCount) {
        console.log(`[AdminLogCleanup] deleted ${deletedCount} stale records`);
      }
    } catch (err) {
      console.error("[AdminLogCleanup] cleanup failed:", err?.message);
    }
  });
}

module.exports = { setupAdminLogCleanup };
