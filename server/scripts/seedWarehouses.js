/* eslint-env node */
const mongoose = require("mongoose");
const Warehouse = require("../models/Warehouse");

const SEED_DATA = [
  { warehouseName: "내부창고(양담)", location: "본사" },
  { warehouseName: "내부창고(버거)", location: "지점 2" },
  { warehouseName: "외부창고(사무실)", location: "서울 사무동" },
];

const seed = async () => {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/erphan_db";
    await mongoose.connect(uri, { dbName: "erphan_db" });
    const existing = await Warehouse.countDocuments();
    if (existing === 0) {
      await Warehouse.insertMany(SEED_DATA);
      console.log("✅ Seeded default warehouses");
    } else {
      console.log("ℹ️ Warehouses already exist, skipping seed");
    }
  } catch (err) {
    console.error("❌ Warehouse seed failed:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seed();
