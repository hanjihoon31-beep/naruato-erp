// src/pages/AdminLogManager.jsx
import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/useAuth";

const MotionDiv = motion.div;

const AdminLogManager = () => {
  const { axios: authAxios } = useAuth();
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ 로그 불러오기
  const fetchLogs = useCallback(async () => {
    try {
      const res = await authAxios.get(`/logs`);
      if (res.data.success) setLogs(res.data.logs || []);
    } catch (err) {
      console.error("로그 불러오기 오류:", err);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setTimeout(() => setRefreshing(false), 500);
  };

  const filteredLogs =
    filter === "all" ? logs : logs.filter((log) => log.actionType === filter);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        로그를 불러오는 중입니다...
      </div>
    );


  return (
    <MotionDiv
      className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-10 text-slate-100"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_#312e81_0%,_transparent_55%)] opacity-70" />
      <div className="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Audit Trail</p>
            <h2 className="text-3xl font-semibold text-white">승인 / 거부 로그</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              모든 승인, 거부, 변경 내역이 시간순으로 정리됩니다. 필요한 로그를 손쉽게 찾을 수 있도록 필터와 새로고침을 재구성했습니다.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className={`inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2 text-xs font-semibold transition ${
              refreshing ? "bg-white/10 text-slate-200" : "bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/30 hover:translate-y-[-1px]"
            }`}
          >
            새로고침
          </button>
        </header>

        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "전체" },
            { key: "inventory", label: "재고 승인" },
            { key: "user", label: "직원 승인" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full px-5 py-2 text-xs font-semibold transition ${
                filter === key
                  ? "border border-white/20 bg-indigo-500/30 text-white"
                  : "border border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {filteredLogs.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-white/10 bg-white/5 py-12 text-center text-sm text-slate-400">
            조건에 해당하는 로그가 없습니다.
          </p>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <MotionDiv
                key={log._id}
                className="rounded-3xl border border-white/5 bg-white/5 p-5 text-sm text-slate-200 backdrop-blur"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-base font-semibold text-white">
                      {log.actionType === "inventory" ? "📦 재고" : "👤 직원"}{" "}
                      {log.action === "approve"
                        ? "승인"
                        : log.action === "reject"
                        ? "거부"
                        : "기타"}
                    </p>
                    <p className="text-xs text-slate-300">대상: {log.targetName || "N/A"}</p>
                    <p className="text-xs text-slate-300">
                      처리자: {log.approverName || "알 수 없음"} ({log.approverRole})
                    </p>
                    <p className="text-xs text-slate-400">사유: {log.reason || "없음"}</p>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              </MotionDiv>
            ))}
          </div>
        )}
      </div>
    </MotionDiv>
  );
};

export default AdminLogManager;
