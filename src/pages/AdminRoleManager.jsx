// src/pages/AdminRoleManager.jsx
import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/useAuth";
import { Users, Shield, UserX, UserCheck, Check, XCircle } from "lucide-react";
import { normalizeMenuPermissions } from "../utils/permissions";

// added by new ERP update
const MENU_PERMISSION_OPTIONS = [
  { key: "openStart", label: "오픈시재" },
  { key: "wasteMove", label: "폐기입력" },
  { key: "entrance", label: "입장집계" },
  { key: "settlement", label: "시재정산" },
  { key: "sales", label: "판매입력" },
  { key: "daybook", label: "장부제출" },
  { key: "inventory", label: "재고관리" },
  { key: "admin", label: "관리자페이지" },
];

const MENU_PERMISSION_DEFAULTS = MENU_PERMISSION_OPTIONS.reduce((acc, opt) => {
  acc[opt.key] = false;
  return acc;
}, {});

// added by new ERP update
const ADMIN_PERMISSION_OPTIONS = [
  { key: "manageRoles", label: "권한 변경 관리" },
  { key: "log", label: "권한 로그 열람" },
];

const ADMIN_PERMISSION_DEFAULTS = ADMIN_PERMISSION_OPTIONS.reduce((acc, opt) => {
  acc[opt.key] = false;
  return acc;
}, {});

const buildMenuDraft = (raw = {}) => {
  const next = { ...MENU_PERMISSION_DEFAULTS };
  MENU_PERMISSION_OPTIONS.forEach(({ key }) => {
    if (typeof raw?.[key] === "boolean") {
      next[key] = raw[key];
    }
  });
  return next;
};

const buildAdminDraft = (raw = {}, role = "user") => {
  const next = { ...ADMIN_PERMISSION_DEFAULTS };
  ADMIN_PERMISSION_OPTIONS.forEach(({ key }) => {
    if (role === "superadmin") {
      next[key] = true;
      return;
    }
    if (typeof raw?.[key] === "boolean") {
      next[key] = raw[key];
    }
  });
  if (role === "superadmin") {
    next.log = true;
  }
  return next;
};

const buildDraftState = (entry = {}) => ({
  menuPermissions: buildMenuDraft(entry.menuPermissions),
  adminPermissions: buildAdminDraft(entry.adminPermissions, entry.role),
}); // added by new ERP update

const MotionDiv = motion.div;

const AdminRoleManager = () => {
  const { user, axios: authAxios, setUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [error, setError] = useState("");
  const [permissionDrafts, setPermissionDrafts] = useState({});
  const [permissionSaving, setPermissionSaving] = useState({});

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const canManageRoleChanges = user?.role === "superadmin" || Boolean(user?.adminPermissions?.manageRoles);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authAxios.get(`/admin/users`);
      const list = res.data || [];
      setUsers(list);
      const drafts = list.reduce((acc, entry) => {
        acc[entry._id] = buildDraftState(entry);
        return acc;
      }, {});
      setPermissionDrafts(drafts);
      setError("");
    } catch (err) {
      console.error("❌ 유저 불러오기 오류:", err);
      setError(err?.response?.data?.message || "유저 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin, fetchUsers]);

  // 승인/거절
  const approve = async (id) => {
    if (!window.confirm("이 사용자를 승인하시겠습니까?")) return;
    try {
      await authAxios.post(`/admin/users/${id}/approve`);
      alert("✅ 승인되었습니다.");
      fetchUsers();
    } catch (e) {
      console.error("승인 실패:", e);
      alert(e?.response?.data?.message || "승인 중 오류가 발생했습니다.");
    }
  };

  const reject = async (id, name) => {
    const reason = prompt(`${name} 님을 거절하는 사유를 입력하세요.`, "승인 요건 미충족");
    if (reason === null) return;
    if (!reason.trim()) return alert("거절 사유를 입력해주세요.");

    try {
      await authAxios.post(`/admin/users/${id}/reject`, { reason });
      alert("⛔ 거절 처리되었습니다.");
      fetchUsers();
    } catch (e) {
      console.error("거절 실패:", e);
      alert(e?.response?.data?.message || "거절 처리 중 오류가 발생했습니다.");
    }
  };

  // 역할 변경
  const handleRoleChange = async (userId, currentRole) => {
    if (!canManageRoleChanges) {
      alert("권한 변경 관리 권한이 없습니다.");
      return;
    }
    const roleOptions = ["user", "admin", "superadmin"];
    const newRole = prompt(
      `새 역할을 입력하세요 (${roleOptions.join(", ")}):`,
      currentRole
    );
    if (!newRole || !roleOptions.includes(newRole)) return alert("유효하지 않은 역할입니다.");
    if (newRole === currentRole) return alert("같은 역할입니다.");

    if (!window.confirm(`이 사용자의 역할을 ${newRole}(으)로 변경하시겠습니까?`)) return;

    try {
      const res = await authAxios.post(`/admin/users/${userId}/role`, { role: newRole });
      if (res.data.success) {
        alert("✅ 권한이 변경되었습니다.");
        fetchUsers();
      }
    } catch (err) {
      console.error("❌ 권한 변경 오류:", err);
      alert(err.response?.data?.message || "권한 변경에 실패했습니다.");
    }
  };

  // 비활성화/재활성화
  const handleDeactivate = async (userId, userName) => {
    const reason = prompt(`${userName}님의 퇴사 사유를 입력하세요:`, "퇴사");
    if (reason === null) return;

    if (!window.confirm(`${userName}님의 계정을 비활성화하시겠습니까?`)) return;

    try {
      const res = await authAxios.post(`/admin/users/${userId}/deactivate`, { reason });
      if (res.data.success) {
        alert("🚫 계정이 비활성화되었습니다.");
        fetchUsers();
      }
    } catch (err) {
      console.error("❌ 비활성화 오류:", err);
      alert(err.response?.data?.message || "비활성화에 실패했습니다.");
    }
  };

  const handleReactivate = async (userId, userName) => {
    if (!window.confirm(`${userName}님의 계정을 재활성화하시겠습니까?`)) return;

    try {
      const res = await authAxios.post(`/admin/users/${userId}/reactivate`);
      if (res.data.success) {
        alert("✅ 계정이 재활성화되었습니다.");
        fetchUsers();
      }
    } catch (err) {
      console.error("❌ 재활성화 오류:", err);
      alert(err.response?.data?.message || "재활성화에 실패했습니다.");
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || u.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    pending: users.filter((u) => u.status === "pending").length,
    inactive: users.filter((u) => u.status === "inactive").length,
    rejected: users.filter((u) => u.status === "rejected").length,
  };

  const ensureDraft = (prevState, userId) => {
    if (prevState[userId]) return prevState[userId];
    const source = users.find((entry) => entry._id === userId) || {};
    return buildDraftState(source);
  }; // added by new ERP update

  const handlePermissionToggle = (userId, bucket, key) => {
    if (!canManageRoleChanges) {
      alert("권한 변경 관리 권한이 없습니다.");
      return;
    }
    setPermissionDrafts((prev) => {
      const current = ensureDraft(prev, userId);
      const updatedBucket = {
        ...current[bucket],
        [key]: !current[bucket]?.[key],
      };
      return {
        ...prev,
        [userId]: {
          ...current,
          [bucket]: updatedBucket,
        },
      };
    });
  };

  const savePermissions = async (userId) => {
    if (!canManageRoleChanges) {
      alert("권한 변경 관리 권한이 없습니다.");
      return;
    }
    const draft = permissionDrafts[userId] || buildDraftState(users.find((entry) => entry._id === userId) || {});
    if (!draft.menuPermissions || !draft.adminPermissions) {
      setError("권한 정보를 불러오지 못했습니다. 다시 시도해주세요.");
      return;
    }
    setPermissionSaving((prev) => ({ ...prev, [userId]: true }));
    try {
      const res = await authAxios.patch(`/admin/users/${userId}/permissions`, {
        menuPermissions: draft.menuPermissions,
        adminPermissions: draft.adminPermissions,
      });
      const updated = res.data?.user;
      if (updated) {
        setUsers((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
        setPermissionDrafts((prev) => ({
          ...prev,
          [updated._id]: buildDraftState(updated),
        }));

        const loggedInId = user?.id || user?._id;
        if (loggedInId && updated._id && loggedInId.toString() === updated._id.toString()) {
          setUser((prev) => {
            if (!prev) return prev;
            const nextAdminPermissions = { ...(prev.adminPermissions || {}) };
            ADMIN_PERMISSION_OPTIONS.forEach(({ key }) => {
              if (prev.role === "superadmin") {
                nextAdminPermissions[key] = true;
              } else if (Object.prototype.hasOwnProperty.call(updated.adminPermissions || {}, key)) {
                nextAdminPermissions[key] = Boolean(updated.adminPermissions?.[key]);
              } else {
                nextAdminPermissions[key] = Boolean(nextAdminPermissions[key]);
              }
            });
            const next = {
              ...prev,
              menuPermissions: normalizeMenuPermissions(updated.menuPermissions || {}),
              adminPermissions: nextAdminPermissions,
            };
            localStorage.setItem("erp_user", JSON.stringify(next));
            return next;
          });
        }
      }
      await fetchUsers(); // added by new ERP update
      alert("권한이 저장되었습니다.");
    } catch (err) {
      console.error("메뉴 권한 저장 오류:", err);
      setError(err?.response?.data?.message || "메뉴 권한 저장 중 오류가 발생했습니다.");
    } finally {
      setPermissionSaving((prev) => ({ ...prev, [userId]: false }));
    }
  };

  if (loading) return <p className="text-center mt-10">로딩 중...</p>;
  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-semibold">접근 권한이 없습니다.</p>
      </div>
    );
  }

  return (
    <MotionDiv className="p-8 bg-gray-50 min-h-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Users className="w-8 h-8" />
          사용자 관리
        </h2>
        <p className="text-gray-600">전체 사용자 목록 및 권한/상태 관리</p>
      </div>
      {!canManageRoleChanges && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          권한 변경 관리 권한이 없어 조회만 가능합니다. 최고관리자에게 권한을 요청하세요.
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <StatCard label="전체 사용자" value={stats.total} icon={<Users className="w-10 h-10 text-blue-500" />} />
        <StatCard label="활성 사용자" value={stats.active} color="text-green-600" icon={<UserCheck className="w-10 h-10 text-green-500" />} />
        <StatCard label="승인 대기" value={stats.pending} color="text-yellow-600" icon={<Shield className="w-10 h-10 text-yellow-500" />} />
        <StatCard label="비활성화" value={stats.inactive} color="text-red-600" icon={<UserX className="w-10 h-10 text-red-500" />} />
        <StatCard label="거절됨" value={stats.rejected} color="text-rose-600" icon={<XCircle className="w-10 h-10 text-rose-500" />} />
      </div>

      {/* 검색/필터 */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="이름/사번/이메일 검색"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 border px-4 py-2 rounded-lg shadow-sm"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border px-4 py-2 rounded-lg shadow-sm"
        >
          <option value="all">전체 상태</option>
          <option value="active">활성</option>
          <option value="pending">승인 대기</option>
          <option value="rejected">거절됨</option>
          <option value="inactive">비활성화</option>
        </select>
      </div>

      {/* 사용자 목록 */}
      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <p className="text-center text-gray-500">검색 결과가 없습니다.</p>
        ) : (
          filteredUsers.map((u) => {
      const permissionState = permissionDrafts[u._id] || buildDraftState(u);
      const saving = permissionSaving[u._id];
            return (
            <MotionDiv
              key={u._id}
              className="bg-white border border-gray-200 shadow-sm p-5 rounded-xl"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-bold text-xl">{u.name}</p>
                    <ChipStatus status={u.status} />
                    <ChipRole role={u.role} />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    사번: <b>{u.employeeId}</b> · 이메일: {u.email}
                  </p>
                  <p className="text-xs text-gray-400">
                    가입일: {new Date(u.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                  {u.status === "inactive" && u.inactivationReason && (
                    <p className="text-sm text-red-600 mt-2">
                      사유: {u.inactivationReason}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* 승인/거절 (pending 전용) */}
                  {u.status === "pending" && (
                    <>
                      <button
                        onClick={() => approve(u._id)}
                        className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
                      >
                        <Check className="w-4 h-4" />
                        승인
                      </button>
                      <button
                        onClick={() => reject(u._id, u.name)}
                        className="flex items-center gap-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm"
                      >
                        <XCircle className="w-4 h-4" />
                        거절
                      </button>
                    </>
                  )}

                  {/* 권한 변경 (inactive 제외) */}
                  <button
                    onClick={() => handleRoleChange(u._id, u.role)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm disabled:opacity-50"
                    disabled={u.status === "inactive" || u.status === "pending" || !canManageRoleChanges}
                  >
                    권한 변경
                  </button>

                  {/* 비활성화/재활성화 */}
                  {u.status === "inactive" ? (
                    <button
                      onClick={() => handleReactivate(u._id, u.name)}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm"
                    >
                      재활성화
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDeactivate(u._id, u.name)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm"
                      disabled={u.status === "pending"}
                    >
                      비활성화
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-4 border-t border-dashed pt-4">
                <p className="text-sm font-semibold mb-2">세부 메뉴 권한</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MENU_PERMISSION_OPTIONS.map((option) => (
                    <label key={`${u._id}-${option.key}`} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={permissionState.menuPermissions?.[option.key] || false}
                        disabled={!canManageRoleChanges}
                        onChange={() => handlePermissionToggle(u._id, "menuPermissions", option.key)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-4">
                  <p className="text-sm font-semibold mb-2">관리 권한</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ADMIN_PERMISSION_OPTIONS.map((option) => (
                      <label key={`${u._id}-admin-${option.key}`} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          checked={permissionState.adminPermissions?.[option.key] || false}
                          disabled={u.role === "superadmin" || !canManageRoleChanges}
                          onChange={() => handlePermissionToggle(u._id, "adminPermissions", option.key)}
                        />
                        <span>
                          {option.label}
                          {u.role === "superadmin" && <span className="ml-1 text-xs text-slate-500">(고정)</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => savePermissions(u._id)}
                    disabled={!!saving || !canManageRoleChanges}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm disabled:bg-slate-300"
                  >
                    {saving ? "저장 중..." : "권한 저장"}
                  </button>
                </div>
              </div>
            </MotionDiv>
          );
        })
        )}
      </div>
    </MotionDiv>
  );
};

function StatCard({ label, value, icon, color = "" }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        {icon}
      </div>
    </div>
  );
}

function ChipStatus({ status }) {
  const map = {
    active: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    rejected: "bg-rose-100 text-rose-700",
    inactive: "bg-gray-100 text-gray-700",
  };
  const text = {
    active: "활성",
    pending: "승인 대기",
    rejected: "거절됨",
    inactive: "비활성화",
  }[status];

  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${map[status]}`}>{text}</span>;
}

function ChipRole({ role }) {
  const map = {
    superadmin: "bg-purple-100 text-purple-700",
    admin: "bg-blue-100 text-blue-700",
    user: "bg-gray-100 text-gray-700",
  };
  const text = {
    superadmin: "최고관리자",
    admin: "관리자",
    user: "근무자",
  }[role];

  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${map[role]}`}>{text}</span>;
}

export default AdminRoleManager;
