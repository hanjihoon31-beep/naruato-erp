// src/pages/AdminDashboard.jsx
import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useAuth } from "../context/useAuth";

const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444"];
const MotionDiv = motion.div;

export default function AdminDashboard() {
  const { user, axios: authAxios } = useAuth();
  const [stats, setStats] = useState({
    totalInventory: 0,
    pendingCount: 0,
    typeCounts: {},
    userCounts: {},
    recentLogs: [],
  });
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const fetchStats = useCallback(async () => {
    try {
      const [inventoryRes, userRes, logRes] = await Promise.all([
        authAxios.get(`/inventory`),
        authAxios.get(`/users`),
        authAxios.get(`/logs`),
      ]);

      const inventory = inventoryRes.data.inventory || [];
      const users = userRes.data.users || [];
      const logs = logRes.data.logs || [];

      const pendingCount = inventory.filter((i) => i.status === "대기").length;
      const typeCounts = inventory.reduce((acc, i) => {
        acc[i.type] = (acc[i.type] || 0) + 1;
        return acc;
      }, {});

      const userCounts = users.reduce((acc, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
      }, {});

      setStats({
        totalInventory: inventory.length,
        pendingCount,
        typeCounts,
        userCounts,
        recentLogs: logs.slice(0, 5),
      });
    } catch (err) {
      console.error("통계 불러오기 실패:", err);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    if (isAdmin) fetchStats();
  }, [isAdmin, fetchStats]);

  if (!isAdmin)
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-500">
        ⚠️ 접근 권한이 없습니다.
      </div>
    );

  if (loading)
    return <p className="text-center mt-10 text-gray-500">로딩 중...</p>;

  const chartData = Object.entries(stats.typeCounts).map(([key, value]) => ({
    name: key,
    value,
  }));

  const userData = Object.entries(stats.userCounts).map(([key, value]) => ({
    name:
      key === "superadmin"
        ? "최종관리자"
        : key === "admin"
        ? "관리자"
        : "직원",
    value,
  }));

  return (
    <MotionDiv
      className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-10 text-slate-100"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_#3730a3_0%,_transparent_55%)] opacity-70" />
      <div className="pointer-events-none absolute -left-36 top-1/3 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-10">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Admin Insight</p>
            <h1 className="mt-2 text-4xl font-semibold text-white">운영 지표 요약</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              재고 이동, 사용자 구성, 승인 현황을 한눈에 파악할 수 있도록 인터페이스를 새롭게 정돈했습니다. 기존 기능은 유지하면서도 더 선명한 정보 구조를 제공합니다.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-xs text-slate-300 backdrop-blur">
            마지막 동기화 {new Date().toLocaleTimeString()} 기준
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "총 재고 등록",
              value: stats.totalInventory,
              tone: "from-indigo-500/40 via-indigo-400/10 to-transparent",
              footer: "실시간 집계",
            },
            {
              label: "승인 대기",
              value: stats.pendingCount,
              tone: "from-amber-500/40 via-amber-400/10 to-transparent",
              footer: "관리자 검토 필요",
            },
            {
              label: "관리자",
              value: stats.userCounts.admin || 0,
              tone: "from-emerald-500/40 via-emerald-400/10 to-transparent",
              footer: "활성 계정",
            },
            {
              label: "직원",
              value: stats.userCounts.employee || 0,
              tone: "from-sky-500/40 via-sky-400/10 to-transparent",
              footer: "승인 완료",
            },
          ].map(({ label, value, tone, footer }) => (
            <div
              key={label}
              className="group relative overflow-hidden rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur transition hover:border-white/20 hover:bg-white/10"
            >
              <span className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
              <div className="relative">
                <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
                <p className="mt-2 text-xs text-slate-300">{footer}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-white">📦 재고 이동 현황</h2>
            <p className="mt-1 text-xs text-slate-400">입고·출고·폐기·반납 비중을 시각적으로 비교합니다.</p>
            <div className="mt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: 12, border: "1px solid rgba(148,163,184,0.25)", color: "#e2e8f0" }} />
                  <Legend wrapperStyle={{ color: "#cbd5f5" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-white">👥 사용자 구성</h2>
            <p className="mt-1 text-xs text-slate-400">권한 별 인원 분포와 변동 상황을 확인하세요.</p>
            <div className="mt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={userData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
                    {userData.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: 12, border: "1px solid rgba(148,163,184,0.25)", color: "#e2e8f0" }} />
                  <Legend wrapperStyle={{ color: "#cbd5f5" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">🧾 최근 활동 로그</h2>
              <p className="text-xs text-slate-400">최근 승인 및 반려 내역이 최신순으로 정렬됩니다.</p>
            </div>
          </div>
          <ul className="mt-6 divide-y divide-white/5 text-sm">
            {stats.recentLogs.length === 0 ? (
              <li className="py-6 text-center text-slate-400">최근 로그가 없습니다.</li>
            ) : (
              stats.recentLogs.map((log) => (
                <li key={log._id} className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-medium text-slate-100">{log.action}</p>
                    <p className="text-xs text-slate-400">{log.itemName}</p>
                  </div>
                  <span className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </MotionDiv>
  );
}
