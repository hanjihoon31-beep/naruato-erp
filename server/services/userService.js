// server/services/userService.js
const mongoose = require("mongoose");
const User = require("../models/User");
const ActionLog = require("../models/ActionLog");
const Attendance = require("../models/Attendance");
const DailyCash = require("../models/DailyCash");
const DailyInventory = require("../models/DailyInventory");
const EquipmentHistory = require("../models/EquipmentHistory");
const ProductDisposal = require("../models/ProductDisposal");

const nicknameRegex = /^[A-Za-z0-9가-힣_-]{2,12}$/;

async function requestNicknameChange(userId, newNickname) {
  if (!nicknameRegex.test(newNickname)) {
    throw new Error("닉네임 형식이 올바르지 않습니다.");
  }
  const exists = await User.exists({ nickname: newNickname });
  if (exists) {
    throw new Error("이미 사용 중인 닉네임입니다.");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("사용자를 찾을 수 없습니다.");
  }

  user.nicknameChangeRequest = {
    requested: true,
    status: "pending",
    newNickname,
    requestedAt: new Date(),
    reviewedAt: null,
    reviewedBy: null,
  };
  await user.save();

  await ActionLog.create({
    type: "NICKNAME_CHANGE_REQUEST",
    actor: userId,
    targetUser: userId,
    detail: { newNickname },
  });

  return user;
}

async function propagateNicknameChange(userId, newNickname) {
  const bulkOps = [
    { model: Attendance, filter: { user: userId } },
    { model: DailyCash, filter: { createdBy: userId } },
    { model: DailyInventory, filter: { createdBy: userId } },
    { model: EquipmentHistory, filter: { createdBy: userId } },
    { model: ProductDisposal, filter: { requester: userId } },
  ];

  await Promise.all(
    bulkOps.map(({ model, filter }) =>
      model.updateMany(filter, { $set: { displayName: newNickname } }).catch((err) => {
        console.warn(`⚠️ 닉네임 반영 실패 (${model.modelName}):`, err.message);
      })
    )
  );
}

async function approveNicknameChange({ targetUserId, approved, reviewerId, reason }) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(targetUserId).session(session);
    if (!user || !user.nicknameChangeRequest?.requested) {
      throw new Error("닉네임 변경 요청이 없습니다.");
    }

    if (approved) {
      const newNickname = user.nicknameChangeRequest.newNickname;
      user.nickname = newNickname;
      user.nicknameChangeRequest = {
        requested: false,
        status: "approved",
        newNickname,
        requestedAt: user.nicknameChangeRequest.requestedAt,
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        reason,
      };
      await user.save({ session });
      await ActionLog.create(
        [
          {
            type: "NICKNAME_CHANGED",
            actor: reviewerId,
            targetUser: targetUserId,
            detail: { nickname: newNickname },
          },
        ],
        { session }
      );
      await session.commitTransaction();
      await propagateNicknameChange(targetUserId, newNickname);
      return user;
    }

    user.nicknameChangeRequest = {
      requested: false,
      status: "rejected",
      newNickname: null,
      requestedAt: user.nicknameChangeRequest.requestedAt,
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
      reason,
    };
    await user.save({ session });
    await ActionLog.create(
      [
        {
          type: "NICKNAME_CHANGE_REJECTED",
          actor: reviewerId,
          targetUser: targetUserId,
          detail: { reason },
        },
      ],
      { session }
    );
    await session.commitTransaction();
    return user;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

async function updatePermissions({ targetUserId, permissions, updatedBy }) {
  const user = await User.findById(targetUserId);
  if (!user) throw new Error("사용자를 찾을 수 없습니다.");
  user.permissions = permissions;
  user.roleUpdatedAt = new Date();
  user.roleUpdatedBy = updatedBy;
  await user.save();
  return user;
}

module.exports = {
  requestNicknameChange,
  approveNicknameChange,
  propagateNicknameChange,
  updatePermissions,
};
