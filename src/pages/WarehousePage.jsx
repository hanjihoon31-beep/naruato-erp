// src/pages/WarehousePage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function WarehousePage() {
  const navigate = useNavigate();

  const [inbound, setInbound] = useState([]);
  const [outbound, setOutbound] = useState([]);
  const [dispose, setDispose] = useState([]);
  const [returns, setReturns] = useState([]);

  useEffect(() => {
    setInbound(JSON.parse(localStorage.getItem("inboundItems")) || []);
    setOutbound(JSON.parse(localStorage.getItem("outboundItems")) || []);
    setDispose(JSON.parse(localStorage.getItem("disposedItems")) || []);
    setReturns(JSON.parse(localStorage.getItem("returnedItems")) || []);
  }, []);

  const renderItemList = (items) => {
    if (items.length === 0)
      return (
        <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400">
          등록된 내역이 없습니다.
        </p>
      );

    return items.slice(-3).map((item) => (
      <div
        key={item.id}
        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
      >
        {item.photo && (
          <img
            src={item.photo}
            alt={item.name}
            className="h-14 w-14 rounded-xl border border-white/10 object-cover"
          />
        )}
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-white">{item.name}</h4>
          <p className="text-xs text-slate-300">수량 {item.quantity}개</p>
          <p className="text-xs text-slate-400">
            상태:{" "}
            <span
              className={
                item.status === "approved"
                  ? "text-emerald-300"
                  : "text-amber-300"
              }
            >
              {item.status === "approved" ? "승인됨" : "대기중"}
            </span>
          </p>
        </div>
      </div>
    ));
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-10 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_#1e3a8a_0%,_transparent_55%)] opacity-70" />
      <div className="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <header className="text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Warehouse Hub</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">창고 관리 시스템</h1>
          <p className="mt-2 text-sm text-slate-300">
            입출고, 반납, 폐기 현황을 한 눈에 파악하고 필요한 업무로 빠르게 이동하세요.
          </p>
        </header>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[{
            title: "📥 입고 내역",
            data: inbound,
            action: () => navigate("/warehouse/inbound"),
            accent: "from-indigo-500/40 via-indigo-400/10 to-transparent",
          },
          {
            title: "📤 출고 내역",
            data: outbound,
            action: () => navigate("/warehouse/outbound"),
            accent: "from-amber-500/40 via-amber-400/10 to-transparent",
          },
          {
            title: "🗑️ 폐기 내역",
            data: dispose,
            action: () => navigate("/warehouse/dispose"),
            accent: "from-rose-500/40 via-rose-400/10 to-transparent",
          },
          {
            title: "🔁 반납 내역",
            data: returns,
            action: () => navigate("/warehouse/return"),
            accent: "from-emerald-500/40 via-emerald-400/10 to-transparent",
          }].map(({ title, data, action, accent }) => (
            <div
              key={title}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur transition hover:border-white/20 hover:bg-white/15"
            >
              <span className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
              <div className="relative">
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <div className="mt-4 space-y-4">{renderItemList(data)}</div>
                <button
                  onClick={action}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10"
                >
                  상세 관리로 이동 →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
