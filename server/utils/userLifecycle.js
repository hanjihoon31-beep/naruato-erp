// server/utils/userLifecycle.js
const crypto = require("crypto");
const cron = require("node-cron");
const User = require("../models/User");
const ActionLog = require("../models/ActionLog");
const { sendNewCredentialsMail } = require("./mailer");

/** EB + 5자리 유니크 사번 생성 */
async function generateEmployeeId() {
  while (true) {
    const id = "EB" + Math.floor(10000 + Math.random() * 90000);
    const exist = await User.findOne({ employeeId: id }).lean();
    if (!exist) return id;
  }
}

/** 8~14자리 임시비밀번호 생성 */
function generateTempPassword() {
  const len = Math.floor(8 + Math.random() * 7);
  return crypto.randomBytes(len).toString("base64").replace(/[^A-Za-z0-9]/g, "").slice(0, len);
}

/** 비활성화된 계정 익명화(PII 제거) */
async function anonymizeUser(user, actorId, reason = "자동 익명화(보존 7일 경과)") {
  if (!user || user.isAnonymized) return;

  const before = {
    name: user.name,
    email: user.email,
    employeeId: user.employeeId,
  };

  user.name = undefined;
  user.email = undefined;
  user.employeeId = undefined;
  user.password = undefined;
  user.forcePasswordChange = false;
  user.isAnonymized = true;
  user.anonymizedAt = new Date();
  await user.save();

  await ActionLog.create({
    type: "USER_ANONYMIZE",
    actor: actorId || undefined,
    targetUser: user._id,
    reason,
    detail: { before },
    actionAt: new Date(),
  });
}

/** 매일 00:30 익명화 스케줄: inactive 7일 경과 or hold 1년 경과 */
function initUserAnonymizeScheduler() {
  cron.schedule("30 0 * * *", async () => {
    const now = new Date();

    // 1) inactive + scheduledAnonymizeAt 도래
    const due = await User.find({
      status: "inactive",
      isAnonymized: false,
      scheduledAnonymizeAt: { $lte: now },
    });

    for (const u of due) {
      await anonymizeUser(u, null, "비활성 7일 경과 자동 익명화");
    }

    // 2) hold + 1년 경과 (활성화 이력 없음)
    const holdDue = await User.find({
      status: "hold",
      "hold.isHold": true,
      isAnonymized: false,
    });

    for (const u of holdDue) {
      const heldAt = u.hold?.heldAt || u.updatedAt;
      const limit = new Date(heldAt);
      limit.setDate(limit.getDate() + (u.hold?.releaseAfterDays || 365));
      if (limit <= now && !u.lastActivatedAt) {
        await anonymizeUser(u, null, "보류 1년 경과 자동 익명화");
      }
    }
  });

  console.log("✅ 사용자 익명화 스케줄러(매일 00:30) 등록");
}

/** 관리자: 이름+메일만으로 계정 생성 & EB사번/임시비번 발급 & 메일 전송 */
async function createUserWithEmail({ name, email }, actorId) {
  const employeeId = await generateEmployeeId();
  const password = generateTempPassword();

  const user = new User({
    employeeId,
    name,
    email,
    password,
    role: "user",
    status: "pending",
    forcePasswordChange: true,
  });
  await user.save();

  await ActionLog.create({
    type: "USER_CREATE_WITH_EMAIL",
    actor: actorId || undefined,
    targetUser: user._id,
    detail: { employeeId, name, email },
    actionAt: new Date(),
  });

  await sendNewCredentialsMail(email, name, employeeId, password);
  return { user, employeeId, password };
}

module.exports = {
  initUserAnonymizeScheduler,
  anonymizeUser,
  createUserWithEmail,
  generateEmployeeId,
  generateTempPassword,
};
