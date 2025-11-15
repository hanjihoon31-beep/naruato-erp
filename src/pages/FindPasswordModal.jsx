import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import naruatoLogo from "../assets/naruato-logo.jpg";
import { API_BASE } from "../utils/env.js";

const AUTH_BASE = `${API_BASE}/auth`;

const FindPasswordModal = ({ onClose }) => {
  const [formData, setFormData] = useState({ employeeId: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const inputClassName =
    "mt-2 w-full rounded-2xl border border-white/60 bg-white/90 px-4 py-3 text-sm font-semibold text-gray-900 placeholder:text-gray-400 shadow-[0_6px_20px_rgba(15,23,42,0.08)] transition focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200/70 focus:shadow-[0_10px_25px_rgba(79,70,229,0.18)]";

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await axios.post(`${AUTH_BASE}/forgot-password`, formData);
      if (res.data.success) {
        setMessage("✅ 이메일로 임시 비밀번호가 발송되었습니다.");
      } else {
        setMessage(res.data.message || "❌ 요청 처리 중 오류가 발생했습니다.");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "❌ 서버 연결 오류가 발생했습니다.");
    }
    setLoading(false);
  };

  const handleOverlay = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
        onClick={handleOverlay}
      >
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={naruatoLogo} alt="Naruato Logo" className="h-10 w-10 rounded-2xl object-cover" />
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">PASSWORD RESET</p>
                <h2 className="text-xl font-bold text-slate-900">비밀번호 찾기</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100"
            >
              닫기
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700">사번</label>
              <input
                type="text"
                name="employeeId"
                placeholder="사번 입력"
                value={formData.employeeId}
                onChange={handleChange}
                required
                className={inputClassName}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">가입 시 등록한 이메일</label>
              <input
                type="email"
                name="email"
                placeholder="이메일 입력"
                value={formData.email}
                onChange={handleChange}
                required
                className={inputClassName}
              />
            </div>

            {message && (
              <p className={`text-sm ${message.startsWith("✅") ? "text-emerald-600" : "text-rose-600"}`}>{message}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? "전송 중..." : "임시 비밀번호 발송"}
              </button>
            </div>
          </form>
        </div>
      </div>
    ),
    document.body
  );
};

export default FindPasswordModal;
