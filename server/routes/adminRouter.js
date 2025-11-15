// server/routes/adminRouter.js
const express = require("express");
const User = require("../models/User");
const ActionLog = require("../models/ActionLog");
const AdminLog = require("../models/AdminLog"); // added by new ERP update
const Inventory = require("../models/Inventory");
const Approval = require("../models/Approval");
const Warehouse = require("../models/Warehouse");
const Store = require("../models/Store");
const { verifyToken, requireRole, requireAdminPermission } = require("../middleware/authMiddleware");

const router = express.Router();
const verifyAdmin = requireRole(["admin", "superadmin"]);
const verifyOpsContributor = requireRole(["user", "admin", "superadmin"]);
const MENU_PERMISSION_KEYS = ["openStart", "wasteMove", "entrance", "settlement", "sales", "daybook", "inventory", "admin"];
const ADMIN_PERMISSION_KEYS = ["log", "manageRoles"]; // added by new ERP update

const toPlainObject = (value = {}) => {
  if (!value) return {};
  return typeof value.toObject === "function" ? value.toObject() : value;
}; // added by new ERP update

const applyPermissionPatch = (current = {}, patch = {}, allowedKeys = []) => {
  const next = { ...(current || {}) };
  allowedKeys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(patch || {}, key)) {
      next[key] = Boolean(patch[key]);
    }
  });
  return next;
}; // added by new ERP update

const asWarehouseResponse = (doc = {}) => {
  if (!doc) return doc;
  const base = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    ...base,
    id: base._id?.toString?.() || base.id,
  };
};

const asStoreResponse = (doc = {}) => {
  if (!doc) return doc;
  const base = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    ...base,
    id: base._id?.toString?.() || base.id,
    name: base.storeName,
    storeName: base.storeName,
    isActive: base.isActive !== false,
  };
};

const APPROVAL_STATUS = {
  pending: ["pending", "대기"],
  approved: ["approved", "승인"],
  rejected: ["rejected", "거절"],
};

const buildSummarySnapshot = async () => {
  const [pending, approved, rejected, activeUsers, inventoryAgg, last24hLogs] = await Promise.all([
    Approval.countDocuments({ status: { $in: APPROVAL_STATUS.pending } }),
    Approval.countDocuments({ status: { $in: APPROVAL_STATUS.approved } }),
    Approval.countDocuments({ status: { $in: APPROVAL_STATUS.rejected } }),
    User.countDocuments({ status: "active" }),
    Inventory.aggregate([
      {
        $group: {
          _id: null,
          itemCount: { $sum: 1 },
          totalQty: { $sum: "$quantity" },
        },
      },
    ]),
    AdminLog.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
  ]);

  const total = pending + approved + rejected;
  const inventoryStats = inventoryAgg[0] || { itemCount: 0, totalQty: 0 };

  return {
    approvals: {
      pending,
      approved,
      rejected,
      processRate: total ? Math.round((approved / total) * 100) : 0,
    },
    users: { active: activeUsers },
    inventory: {
      itemCount: inventoryStats.itemCount || 0,
      totalQty: inventoryStats.totalQty || 0,
    },
    logs: { last24h: last24hLogs },
    timestamp: new Date().toISOString(),
  };
};

const emitSummaryUpdate = async (app) => {
  const io = app?.get("io");
  if (!io) return;
  try {
    const snapshot = await buildSummarySnapshot();
    io.emit("summary:updated", snapshot);
  } catch (err) {
    console.error("summary broadcast error:", err?.message);
  }
};

// ========== 기존 목록/승인/거절/비활성/재활성/역할변경 유지 ==========

router.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status, role } = req.query;
    const q = {};
    if (status) q.status = status;
    if (role) q.role = role;
    const users = await User.find(q).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error("사용자 목록 조회 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

router.get("/users/pending", verifyToken, verifyAdmin, async (_req, res) => {
  try {
    const users = await User.find({ status: "pending" })
      .select("-password")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error("대기자 조회 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

router.post("/users/:id/approve", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: "active", approvedAt: new Date(), approvedBy: req.user._id },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });

    await ActionLog.create({
      type: "USER_APPROVE",
      actor: req.user._id,
      targetUser: user._id,
      detail: { approvedAt: user.approvedAt },
    });

    res.json({ success: true, message: "승인되었습니다.", user });
  } catch (err) {
    console.error("승인 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

router.post("/users/:id/reject", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });

    await ActionLog.create({
      type: "USER_REJECT",
      actor: req.user._id,
      targetUser: user._id,
      reason: reason || "관리자 거절",
    });

    res.json({ success: true, message: "거절 처리되었습니다.", user });
  } catch (err) {
    console.error("거절 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

router.post("/users/:id/deactivate", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });

    user.status = "inactive";
    user.inactivationReason = reason || "관리자 처리";
    user.inactivatedAt = new Date();
    user.inactivatedBy = req.user._id;
    // 7일 뒤 익명화 예약
    user.scheduledAnonymizeAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await user.save();

    const sanitized = user.toObject();
    delete sanitized.password;

    await ActionLog.create({
      type: "USER_DEACTIVATE",
      actor: req.user._id,
      targetUser: user._id,
      reason: user.inactivationReason,
      detail: { inactivatedAt: user.inactivatedAt, scheduledAnonymizeAt: user.scheduledAnonymizeAt },
    });

    res.json({ success: true, message: "퇴사(비활성) 처리되었습니다.", user: sanitized });
  } catch (err) {
    console.error("비활성화 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

router.post("/users/:id/reactivate", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        status: "active",
        inactivationReason: null,
        inactivatedAt: null,
        inactivatedBy: null,
        scheduledAnonymizeAt: null,
      },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });

    await ActionLog.create({
      type: "USER_REACTIVATE",
      actor: req.user._id,
      targetUser: user._id,
    });

    res.json({ success: true, message: "재활성화되었습니다.", user });
  } catch (err) {
    console.error("재활성화 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

router.get("/inventory", verifyToken, verifyAdmin, async (_req, res) => {
  try {
    const inventory = await Inventory.find().sort({ updatedAt: -1 }).lean();
    res.json({ success: true, inventory });
  } catch (err) {
    console.error("재고 목록 조회 오류:", err);
    res.status(500).json({ success: false, message: "재고 데이터를 불러오지 못했습니다." });
  }
});

router.get("/logs", verifyToken, verifyAdmin, async (_req, res) => {
  try {
    const logs = await ActionLog.find().sort({ createdAt: -1 }).limit(200).lean();
    res.json({ success: true, logs });
  } catch (err) {
    console.error("관리 로그 조회 오류:", err);
    res.status(500).json({ success: false, message: "로그 데이터를 불러오지 못했습니다." });
  }
});

router.get("/summary", verifyToken, verifyAdmin, async (_req, res) => {
  try {
    const snapshot = await buildSummarySnapshot();
    res.json({ success: true, data: snapshot });
  } catch (err) {
    console.error("요약 정보 조회 오류:", err);
    res.status(500).json({ success: false, message: "요약 정보를 불러오지 못했습니다." });
  }
});

router.get("/warehouse/list", verifyToken, async (_req, res) => {
  try {
    const warehouses = await Warehouse.find().sort({ createdAt: -1 });
    res.json({ success: true, data: warehouses.map(asWarehouseResponse) });
  } catch (err) {
    console.error("창고 목록 조회 오류:", err);
    res.status(500).json({ success: false, message: "창고 목록을 불러오지 못했습니다." });
  }
});

router.get("/store/list", verifyToken, async (req, res) => {
  try {
    const includeHidden = req.query.includeHidden === "true";
    const query = includeHidden ? {} : { isActive: { $ne: false } };
    const stores = await Store.find(query).sort({ storeNumber: 1, createdAt: 1 });
    res.json({ success: true, data: stores.map(asStoreResponse) });
  } catch (err) {
    console.error("매장 목록 조회 오류:", err);
    res.status(500).json({ success: false, message: "매장 목록을 불러오지 못했습니다." });
  }
});

router.post("/warehouse/create", verifyToken, verifyOpsContributor, async (req, res) => {
  try {
    const { name, location } = req.body || {};
    if (!name) {
      return res.status(400).json({ success: false, message: "창고 이름을 입력해주세요." });
    }
    const warehouse = await Warehouse.create({
      warehouseName: name,
      location,
      warehouseType: "main",
    });
    await emitSummaryUpdate(req.app);
    res.json({ success: true, data: asWarehouseResponse(warehouse) });
  } catch (err) {
    console.error("창고 생성 오류:", err);
    res.status(500).json({ success: false, message: "창고를 생성하지 못했습니다." });
  }
});

router.post("/store/create", verifyToken, verifyOpsContributor, async (req, res) => {
  try {
    const { name, location } = req.body || {};
    if (!name) {
      return res.status(400).json({ success: false, message: "매장 이름을 입력해주세요." });
    }
    const storeNumber = `STR-${Date.now()}`;
    const store = await Store.create({
      storeName: name,
      storeNumber,
      location,
      manager: req.user?._id,
    });
    await emitSummaryUpdate(req.app);
    res.json({ success: true, data: asStoreResponse(store) });
  } catch (err) {
    console.error("매장 생성 오류:", err);
    res.status(500).json({ success: false, message: "매장을 생성하지 못했습니다." });
  }
});

router.post("/users/:id/role", verifyToken, verifyAdmin, requireAdminPermission("manageRoles"), async (req, res) => {
  try {
    const { role } = req.body;
    if (!["superadmin", "admin", "user"].includes(role)) {
      return res.status(400).json({ message: "유효하지 않은 역할입니다." });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role, roleUpdatedAt: new Date(), roleUpdatedBy: req.user._id },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });

    await ActionLog.create({
      type: "USER_ROLE_CHANGE",
      actor: req.user._id,
      targetUser: user._id,
      detail: { newRole: role, at: user.roleUpdatedAt },
    });

    res.json({ success: true, message: "역할이 변경되었습니다.", user });
  } catch (err) {
    console.error("역할 변경 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

// added by new ERP update
router.patch("/users/:id/permissions", verifyToken, verifyAdmin, requireAdminPermission("manageRoles"), async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });

    const before = {
      menuPermissions: toPlainObject(target.menuPermissions || {}),
      adminPermissions: toPlainObject(target.adminPermissions || {}),
    };

    const { menuPermissions: menuPatch, adminPermissions: adminPatch } = req.body || {};

    if (!menuPatch && !adminPatch) {
      return res.status(400).json({ message: "변경할 권한이 없습니다." });
    }

    if (menuPatch) {
      const nextMenu = applyPermissionPatch(
        MENU_PERMISSION_KEYS.reduce((acc, key) => {
          acc[key] = Boolean(before.menuPermissions?.[key]);
          return acc;
        }, {}),
        menuPatch,
        MENU_PERMISSION_KEYS
      );
      target.menuPermissions = nextMenu;
      target.markModified("menuPermissions");
    }

    if (adminPatch) {
      const nextAdmin = applyPermissionPatch(
        ADMIN_PERMISSION_KEYS.reduce((acc, key) => {
          acc[key] = target.role === "superadmin" ? true : Boolean(before.adminPermissions?.[key]);
          return acc;
        }, {}),
        adminPatch,
        ADMIN_PERMISSION_KEYS
      );
      if (target.role === "superadmin") {
        ADMIN_PERMISSION_KEYS.forEach((key) => {
          nextAdmin[key] = true;
        });
      }
      target.adminPermissions = nextAdmin;
      target.markModified("adminPermissions");
    }

    await target.save();
    const updated = target.toObject();
    delete updated.password;

    await ActionLog.create({
      type: "USER_MENU_PERMISSION_UPDATE",
      actor: req.user._id,
      targetUser: target._id,
      detail: {
        menuPermissions: updated.menuPermissions,
        adminPermissions: updated.adminPermissions,
      },
    });

    await AdminLog.create({
      adminId: req.user._id,
      targetUserId: target._id,
      beforePermissions: before,
      afterPermissions: {
        menuPermissions: updated.menuPermissions || {},
        adminPermissions: updated.adminPermissions || {},
      },
    });

    res.json({ success: true, message: "권한이 업데이트되었습니다.", user: updated });
  } catch (err) {
    console.error("메뉴 권한 업데이트 오류:", err);
    res.status(500).json({ success: false, message: "서버 오류" });
  }
});

// ========== 닉네임 변경 요청 처리 ==========

/**
 * 대기 중인 닉네임 변경 요청 목록
 */
router.get("/nickname-requests", verifyToken, verifyAdmin, async (_req, res) => {
  try {
    const users = await User.find({
      "nicknameChangeRequest.requested": true,
    })
      .select("name email nickname nicknameChangeRequest createdAt")
      .sort({ "nicknameChangeRequest.requestedAt": -1 });
    res.json(users);
  } catch (err) {
    console.error("닉네임 요청 목록 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * 닉네임 변경 승인
 */
router.post("/users/:id/nickname/approve", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.nicknameChangeRequest?.requested) {
      return res.status(404).json({ message: "닉네임 변경 요청이 없습니다." });
    }

    const newNickname = user.nicknameChangeRequest.newNickname;

    // 중복 재확인
    const exists = await User.exists({ nickname: newNickname });
    if (exists && String(exists._id) !== String(user._id)) {
      return res.status(400).json({ message: "이미 사용 중인 닉네임입니다." });
    }

    const oldNickname = user.nickname;
    user.nickname = newNickname;
    user.nicknameChangeRequest = { requested: false, newNickname: null, requestedAt: null };
    await user.save();

    // TODO: 필요 시 과거 문서들 updateMany로 old → new 치환

    await ActionLog.create({
      type: "NICKNAME_CHANGED",
      actor: req.user._id,
      targetUser: user._id,
      detail: { oldNickname, newNickname },
    });

    res.json({ success: true, message: "닉네임이 변경되었습니다.", user: {
      id: user._id,
      name: user.name,
      nickname: user.nickname,
      email: user.email,
      employeeId: user.employeeId,
      status: user.status,
      role: user.role,
    }});
  } catch (err) {
    console.error("닉네임 승인 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * 닉네임 변경 거절
 */
router.post("/users/:id/nickname/reject", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user || !user.nicknameChangeRequest?.requested) {
      return res.status(404).json({ message: "닉네임 변경 요청이 없습니다." });
    }

    const requested = user.nicknameChangeRequest.newNickname;
    user.nicknameChangeRequest = { requested: false, newNickname: null, requestedAt: null };
    await user.save();

    await ActionLog.create({
      type: "NICKNAME_CHANGE_REJECTED",
      actor: req.user._id,
      targetUser: user._id,
      reason: reason || "관리자 거절",
      detail: { requested },
    });

    res.json({ success: true, message: "닉네임 변경 요청이 거절되었습니다." });
  } catch (err) {
    console.error("닉네임 거절 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

module.exports = router;
