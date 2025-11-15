// ✅ server/models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// 🔹 닉네임 규칙
const NICKNAME_MIN = 2;
const NICKNAME_MAX = 12;
const nicknameRegex = /^[A-Za-z0-9가-힣_-]{2,12}$/;

const menuPermissionSchema = new mongoose.Schema(
  {
    read: { type: Boolean, default: false },
    write: { type: Boolean, default: false },
    approve: { type: Boolean, default: false },
  },
  { _id: false }
);

// added by new ERP update
const menuToggleSchema = new mongoose.Schema(
  {
    openStart: { type: Boolean, default: false },
    wasteMove: { type: Boolean, default: false },
    entrance: { type: Boolean, default: false },
    settlement: { type: Boolean, default: false },
    sales: { type: Boolean, default: false },
    daybook: { type: Boolean, default: false },
    inventory: { type: Boolean, default: false },
    admin: { type: Boolean, default: false },
  },
  { _id: false, minimize: false }
);

// added by new ERP update
const adminPermissionSchema = new mongoose.Schema(
  {
    log: { type: Boolean, default: false },
    manageRoles: { type: Boolean, default: false },
  },
  { _id: false, minimize: false }
);

const nicknameChangeSchema = new mongoose.Schema(
  {
    requested: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["idle", "pending", "approved", "rejected"],
      default: "idle",
    },
    newNickname: { type: String, default: null },
    requestedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reason: { type: String, default: "" },
  },
  { _id: false }
);

const terminationInfoSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["none", "resigned", "terminated", "layoff", "retired", "other"],
      default: "none",
    },
    subtype: {
      type: String,
      enum: ["voluntary", "involuntary", "contract-end", "disciplinary", "medical", "other"],
      default: "voluntary",
    },
    reason: { type: String },
    effectiveDate: { type: Date },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: { type: String },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    // 🔐 로그인용 사번
    employeeId: { type: String, required: true, unique: true, trim: true },

    // 🏷️ 실명 & 닉네임 (닉네임은 중복 불가)
    name: { type: String, required: true, trim: true },
    nickname: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: NICKNAME_MIN,
      maxlength: NICKNAME_MAX,
      validate: {
        validator: (v) => nicknameRegex.test(v),
        message: "닉네임 형식이 올바르지 않습니다. (2~12자, 영문/숫자/한글/_/-)",
      },
    },

    // 📧 비밀번호 찾기용 이메일
    email: { type: String, required: true, trim: true },

    // 🔑 비밀번호(해시 저장)
    password: { type: String, required: true },

    // 🪪 권한
    role: { type: String, enum: ["superadmin", "admin", "user"], default: "user" },

    // 🧭 상태
    status: {
      type: String,
      enum: ["pending", "active", "inactive", "rejected", "hold"],
      default: "pending",
    },

    // ✅ 승인/거절/퇴사/변경 기록
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    inactivatedAt: { type: Date },
    inactivatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    inactivationReason: { type: String },

    roleUpdatedAt: { type: Date },
    roleUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // 🕒 익명화 스케줄
    scheduledAnonymizeAt: { type: Date },

    // 🏪 소속 매장 / 직책
    store: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
    position: { type: String },

    // 📋 메뉴별 권한
    permissions: {
      type: Map,
      of: menuPermissionSchema,
      default: {},
    },
    // added by new ERP update
    menuPermissions: {
      type: menuToggleSchema,
      default: () => ({}),
    },
    // added by new ERP update
    adminPermissions: {
      type: adminPermissionSchema,
      default: function () {
        const isSuperAdmin = this.role === "superadmin";
        return {
          log: isSuperAdmin,
          manageRoles: isSuperAdmin,
        };
      },
    },

    // ✏️ 닉네임 변경 요청 기능
    nicknameChangeRequest: {
      type: nicknameChangeSchema,
      default: () => ({ requested: false, status: "idle" }),
    },

    // 🧾 퇴사/휴직 정보
    terminationInfo: {
      type: terminationInfoSchema,
      default: () => ({ status: "none" }),
    },
  },
  { timestamps: true }
);

// ✅ 비밀번호 자동 해시
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ✅ 로그인 비밀번호 비교 함수
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
