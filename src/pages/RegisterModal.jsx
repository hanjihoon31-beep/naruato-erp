import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import naruatoLogo from "../assets/naruato-logo.jpg";
import { API_BASE } from "../utils/env.js";

const AUTH_BASE = `${API_BASE}/auth`;

const RegisterModal = ({ onClose }) => {
  const [formData, setFormData] = useState({
    employeeId: "",
    name: "",
    email: "",
    nickname: "",
    password: "",
  });

  const [errors, setErrors] = useState({ password: null });
  const [nicknameAvailable, setNicknameAvailable] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const validatePassword = (pw) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()-_=+]{8,}$/.test(pw);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "password") {
      setErrors((prev) => ({
        ...prev,
        password: validatePassword(value) ? null : "영문+숫자 포함 8자 이상이어야 합니다.",
      }));
    }
  };

  useEffect(() => {
    if (!formData.nickname) {
      setNicknameAvailable(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`${AUTH_BASE}/nickname-available`, { params: { nickname: formData.nickname } });
        setNicknameAvailable(res.data.available);
      } catch {
        setNicknameAvailable(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.nickname]);

  const isFormValid =
    formData.employeeId &&
    formData.name &&
    formData.email &&
    formData.nickname &&
    formData.password &&
    nicknameAvailable === true &&
    validatePassword(formData.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    setIsSubmitting(true);
    try {
      const res = await axios.post(`${AUTH_BASE}/register`, formData);
      if (res.data?.success) {
        alert("✅ 가입 요청이 완료되었습니다.\n관리자 승인 후 로그인 가능합니다.");
        onClose();
      } else {
        alert(res.data?.message || "❌ 가입 처리 중 오류가 발생했습니다.");
      }
    } catch (err) {
      alert(err.response?.data?.message || "❌ 서버 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
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
        <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={naruatoLogo} alt="Naruato Logo" className="h-12 w-12 rounded-2xl object-cover" />
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">REGISTER REQUEST</p>
                <h2 className="text-xl font-bold text-slate-900">회원가입</h2>
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
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-slate-700">사번</label>
                <input
                  type="text"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
                  placeholder="사번을 입력하세요"
                  required
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">이름</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="이름을 입력하세요"
                  required
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">이메일</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="이메일을 입력하세요"
                  required
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">닉네임</label>
                <input
                  type="text"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleChange}
                  placeholder="닉네임 입력 (2~12자)"
                  required
                  className={inputClassName}
                />
                {formData.nickname && (
                  <p
                    className={`mt-1 text-xs ${
                      nicknameAvailable === true
                        ? "text-emerald-600"
                        : nicknameAvailable === false
                        ? "text-rose-600"
                        : "text-amber-600"
                    }`}
                  >
                    {nicknameAvailable === true && "✅ 사용 가능한 닉네임입니다."}
                    {nicknameAvailable === false && "❌ 이미 사용 중인 닉네임입니다."}
                    {nicknameAvailable === null && "⏳ 닉네임 형식 확인 중..."}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">비밀번호</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="영문+숫자 포함 8자 이상"
                required
                className={inputClassName}
              />
              {formData.password && (
                <p className={`mt-1 text-xs ${errors.password ? "text-rose-600" : "text-emerald-600"}`}>
                  {errors.password || "✅ 사용 가능한 비밀번호입니다."}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="rounded-2xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? "처리 중..." : "가입 요청"}
              </button>
            </div>
          </form>
        </div>
      </div>
    ),
    document.body
  );
};

export default RegisterModal;
