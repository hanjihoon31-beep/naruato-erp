import React from "react";
import useSummary from "../../hooks/useSummary";
import StatCard from "../../components/ui/StatCard";

export default function Dashboard() {
  const { data, error } = useSummary();

  if (error) return <div className="p-6 text-rose-500">{error}</div>;
  if (!data) return <div className="p-6 text-slate-400">로딩 중...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-3">운영 컨트롤 센터</h1>
      <p className="text-xs text-slate-400">갱신: {new Date(data.timestamp).toLocaleString("ko-KR")}</p>
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard label="승인 대기" value={data.approvals.pending} hint="검토 필요" />
        <StatCard label="처리율" value={`${data.approvals.processRate}%`} hint="승인/전체" />
        <StatCard label="활성 사용자" value={data.users.active} />
        <StatCard label="최근 로그(24h)" value={data.logs.last24h} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <StatCard label="재고 품목" value={data.inventory.itemCount} hint={`총 ${data.inventory.totalQty}개`} />
      </div>
    </div>
  );
}
