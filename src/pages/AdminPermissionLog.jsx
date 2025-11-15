// added by new ERP update
import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useAuth } from "../context/useAuth";

const formatDiffs = (before = {}, after = {}) =>
  Object.keys({ ...before, ...after })
    .filter((key) => before[key] !== after[key])
    .map((key) => key + ": " + (after[key] ? "ON" : "OFF"));

export default function AdminPermissionLog() {
  const { axios: authAxios } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const fetchLogs = async () => {
      try {
        const { data } = await authAxios.get("/admin/logs/permissions");
        if (!active) return;
        setRows(data.logs || []);
        setError("");
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || "로그를 불러오지 못했습니다.");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchLogs();
    return () => {
      active = false;
    };
  }, [authAxios]);

  const preparedRows = useMemo(() => rows, [rows]);

  if (loading) {
    return <div className="p-6 text-sm text-slate-600">불러오는 중…</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">최근 1개월 권한 변경 이력</h2>
        <p className="text-sm text-slate-500 mt-1">1개월 이전 이력은 TTL 및 정기 정리 작업으로 자동 삭제됩니다.</p>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-auto rounded border border-slate-200">
        <table className="min-w-[760px] w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="border-b px-3 py-2 text-left">변경일</th>
              <th className="border-b px-3 py-2 text-left">관리자</th>
              <th className="border-b px-3 py-2 text-left">대상자</th>
              <th className="border-b px-3 py-2 text-left">변경 항목</th>
            </tr>
          </thead>
          <tbody>
            {preparedRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  최근 한 달간 변경 내역이 없습니다.
                </td>
              </tr>
            )}
            {preparedRows.map((row) => {
              const menuBefore = row?.beforePermissions?.menuPermissions || {};
              const menuAfter = row?.afterPermissions?.menuPermissions || {};
              const adminBefore = row?.beforePermissions?.adminPermissions || {};
              const adminAfter = row?.afterPermissions?.adminPermissions || {};

              const menuDiffs = formatDiffs(menuBefore, menuAfter).map((item) => "메뉴 - " + item);
              const adminDiffs = formatDiffs(adminBefore, adminAfter).map((item) => "관리 - " + item);
              const diffs = [...menuDiffs, ...adminDiffs];

              return (
                <tr key={row._id} className="odd:bg-white even:bg-slate-50/40">
                  <td className="px-3 py-2 whitespace-nowrap">{dayjs(row.createdAt).format("YYYY-MM-DD HH:mm")}</td>
                  <td className="px-3 py-2">
                    <div className="font-semibold">{row.adminId?.name || "-"}</div>
                    <div className="text-xs text-slate-500">{row.adminId?.email || "-"}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-semibold">{row.targetUserId?.name || "-"}</div>
                    <div className="text-xs text-slate-500">{row.targetUserId?.email || "-"}</div>
                  </td>
                  <td className="px-3 py-2">
                    {diffs.length ? (
                      diffs.map((diff, idx) => (
                        <div key={`${row._id}-diff-${idx}`} className="text-slate-700">
                          {diff}
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-400">차이 없음</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
