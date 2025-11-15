// src/pages/AdminApproval.jsx
import React, { useState, useEffect } from "react";
import { motion as Motion } from "framer-motion";
import { useAuth } from "../context/useAuth";
import { useInventory } from "../context/InventoryContext";

const AdminApproval = () => {
  const { user, axios: authAxios } = useAuth();
  const { realtime } = useInventory();
  const [tab, setTab] = useState("users");
  const [userRequests, setUserRequests] = useState([]);
  const [inventoryRequests, setInventoryRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const canApprove = user?.role === "superadmin" || user?.role === "admin";

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtime.approval?.at, realtime.transfer?.at]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, inventoryRes] = await Promise.all([
        authAxios.get(`/admin/users/pending`),
        authAxios.get(`/inventory`).catch(() => ({ data: { inventory: [] } })),
      ]);
      setUserRequests(usersRes.data || []);
      setInventoryRequests((inventoryRes.data.inventory || []).filter((i) => i.status === "대기"));
    } catch (err) {
      console.error("데이터 불러오기 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  // 직원 승인
  const handleUserApprove = async (id) => {
    if (!canApprove) return alert("권한이 없습니다.");
    if (!window.confirm("해당 직원을 승인하시겠습니까?")) return;
    try {
      await authAxios.post(`/admin/users/${id}/approve`);
      alert("✅ 직원 승인 완료");
      fetchData();
    } catch (err) {
      console.error("승인 오류:", err);
      alert("승인 중 오류 발생");
    }
  };

  // 직원 거부
  const handleUserReject = async (id) => {
    if (!canApprove) return alert("권한이 없습니다.");
    const reason = prompt("거부 사유를 입력해주세요:", "정보 불일치");
    if (!reason) return;
    try {
      await authAxios.post(`/admin/users/${id}/reject`, { reason });
      alert("❌ 직원 요청 거부 완료");
      fetchData();
    } catch (err) {
      console.error("거부 오류:", err);
      alert("거부 처리 중 오류 발생");
    }
  };

  // 권한 변경
  const handleRoleChange = async (id, newRole) => {
    if (user?.role !== "superadmin") return alert("최고관리자만 수정 가능합니다.");
    try {
      await authAxios.post(`/admin/users/${id}/role`, { role: newRole });
      alert("✅ 권한이 변경되었습니다.");
      fetchData();
    } catch (err) {
      console.error("권한 변경 오류:", err);
      alert("권한 변경 중 오류가 발생했습니다.");
    }
  };

  // 재고 승인/거부 (API는 기존 유지)
  const handleInventoryApprove = async (id) => {
    if (!canApprove) return alert("권한이 없습니다.");
    try {
      await authAxios.put(`/inventory/${id}/approve`);
      alert("✅ 재고 요청 승인 완료");
      fetchData();
    } catch (err) {
      console.error(err);
      alert("재고 승인 중 오류 발생");
    }
  };

  const handleInventoryReject = async (id) => {
    if (!canApprove) return alert("권한이 없습니다.");
    const reason = prompt("거부 사유를 입력해주세요:");
    if (!reason) return;
    try {
      await authAxios.put(`/inventory/${id}/reject`, { reason });
      alert("❌ 재고 요청 거부 완료");
      fetchData();
    } catch (err) {
      console.error(err);
      alert("재고 거부 중 오류 발생");
    }
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        데이터를 불러오는 중입니다...
      </div>
    );

  return (
    <Motion.div
      className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-10 text-slate-100"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_#312e81_0%,_transparent_55%)] opacity-70" />
      <div className="pointer-events-none absolute -right-28 top-1/4 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Approval Center</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">승인 허브</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              회원과 재고 요청을 빠르게 분류하고 처리할 수 있도록 구성했습니다.
            </p>
          </div>

          <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300 backdrop-blur">
            총 {userRequests.length + inventoryRequests.length}건 대기 중
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {["users", "inventory"].map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`group relative overflow-hidden rounded-full px-6 py-2 text-sm font-semibold transition ${
                tab === key ? "text-white" : "text-slate-300"
              }`}
            >
              <span
                className={`absolute inset-0 rounded-full border border-white/10 bg-white/5 transition-all duration-200 ${
                  tab === key ? "border-white/20 bg-indigo-500/20" : "hover:border-white/15 hover:bg-white/10"
                }`}
              />
              <span className="relative flex items-center gap-2">
                {key === "users" ? "👤 회원 승인" : "📦 재고 승인"}
              </span>
            </button>
          ))}
        </div>

        {tab === "users" && (
          <section className="space-y-4">
            <div className="rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur">
              <h2 className="text-lg font-semibold text-white">회원 승인 / 권한 관리</h2>
              <p className="mt-1 text-xs text-slate-400">신규 가입자와 권한 변경을 한곳에서 처리하세요.</p>
            </div>
            {userRequests.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-white/10 bg-white/5 py-12 text-center text-sm text-slate-400">
                승인 대기 중인 직원이 없습니다.
              </p>
            ) : (
              userRequests.map((u) => (
                <div
                  key={u._id}
                  className="rounded-3xl border border-white/5 bg-white/5 p-5 text-sm text-slate-200 backdrop-blur"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-base font-semibold text-white">{u.name}</p>
                      <p className="text-xs text-slate-300">{u.email}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        현재 권한: <span className="font-semibold text-indigo-200">{u.role}</span>
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      {user?.role === "superadmin" && (
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                          <span>권한 변경</span>
                          <select
                            defaultValue={u.role}
                            onChange={(e) => handleRoleChange(u._id, e.target.value)}
                            className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-1 focus:border-indigo-400 focus:outline-none"
                          >
                            <option value="user">근무자</option>
                            <option value="admin">관리자</option>
                            <option value="superadmin">최고관리자</option>
                          </select>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUserApprove(u._id)}
                          className="rounded-xl bg-emerald-500/80 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => handleUserReject(u._id)}
                          className="rounded-xl bg-rose-500/80 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-500"
                        >
                          거부
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {tab === "inventory" && (
          <section className="space-y-4">
            <div className="rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur">
              <h2 className="text-lg font-semibold text-white">재고 승인</h2>
              <p className="mt-1 text-xs text-slate-400">입출고·폐기·반납 요청을 확인하고 처리하세요.</p>
            </div>
            {inventoryRequests.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-white/10 bg-white/5 py-12 text-center text-sm text-slate-400">
                승인 대기 중인 재고 요청이 없습니다.
              </p>
            ) : (
              inventoryRequests.map((req) => (
                <div
                  key={req._id}
                  className="rounded-3xl border border-white/5 bg-white/5 p-5 text-sm text-slate-200 backdrop-blur"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-base font-semibold text-white">[{req.type}] {req.name}</p>
                      <p className="text-xs text-slate-300">창고 {req.warehouse}</p>
                      <p className="text-xs text-slate-400">수량 {req.quantity}개</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleInventoryApprove(req._id)}
                        className="rounded-xl bg-emerald-500/80 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => handleInventoryReject(req._id)}
                        className="rounded-xl bg-rose-500/80 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-500"
                      >
                        거부
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>
        )}
      </div>
    </Motion.div>
  );
};

export default AdminApproval;
