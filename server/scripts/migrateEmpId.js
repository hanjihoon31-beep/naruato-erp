// node server/scripts/migrateEmpId.js
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: undefined });
    console.log("✅ MongoDB connected");

    // empId 가 있고 employeeId 가 비어있는 문서만 업데이트
    const result = await User.updateMany(
      { empId: { $exists: true, $ne: null }, $or: [{ employeeId: { $exists: false } }, { employeeId: "" }] },
      [{ $set: { employeeId: { $toString: "$empId" } } }] // 숫자여도 문자열로 변환
    );
    console.log("➡️  migrated docs:", result.modifiedCount);

    // 필요시 인덱스 보정
    await User.collection.createIndex({ employeeId: 1 }, { unique: true });
    console.log("✅ unique index on employeeId ensured");
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
