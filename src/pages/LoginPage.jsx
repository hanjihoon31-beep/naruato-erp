import React, { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { useNavigate } from "react-router-dom";
import naruatoLogo from "../assets/naruato-logo.jpg";
import RegisterModal from "./RegisterModal";
import FindPasswordModal from "./FindPasswordModal";

const LoginPage = () => {
  const { login, user, getLandingPath } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ employeeId: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showFindPw, setShowFindPw] = useState(false);
  const inputClassName =
    "mt-2 w-full rounded-2xl border border-white/60 bg-white/90 px-4 py-3 text-sm font-semibold text-gray-900 placeholder:text-gray-400 shadow-[0_6px_20px_rgba(15,23,42,0.08)] transition focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200/70 focus:shadow-[0_10px_25px_rgba(79,70,229,0.18)]";

  useEffect(() => {
    if (user) {
      navigate(getLandingPath(user.role), { replace: true });
    }
  }, [user, navigate, getLandingPath]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    if (!formData.employeeId || !formData.password) {
      setMessage("사번과 비밀번호를 모두 입력해주세요.");
      setLoading(false);
      return;
    }

    const result = await login(formData.employeeId, formData.password);
    if (!result?.success) setMessage(result?.message || "❌ 로그인 실패");
    setLoading(false);
  };

  const openRegister = () => setShowRegister(true);
  const closeRegister = () => setShowRegister(false);

  const openFindPw = () => setShowFindPw(true);
  const closeFindPw = () => setShowFindPw(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-12 text-slate-900">
      <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/95 p-8 shadow-2xl backdrop-blur">
          <div className="mb-8 flex flex-col items-center text-center">
            <span className="rounded-2xl bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">NARUATO</span>
            <img src={naruatoLogo} alt="Naruato Logo" className="mt-4 h-16 w-16 rounded-2xl object-cover" />
            <h1 className="mt-6 text-2xl font-bold text-slate-900">로그인</h1>
            <p className="mt-2 text-sm text-slate-500">승인된 사번과 비밀번호로 접속하세요.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-semibold text-slate-700">
              사번
              <input
                type="text"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                placeholder="사번 입력"
                autoComplete="username"
                className={inputClassName}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              비밀번호
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="비밀번호 입력"
                autoComplete="current-password"
                className={inputClassName}
              />
            </label>

            {message && <p className="text-sm text-rose-600">{message}</p>}

            <button
              type="submit"
              className="w-full rounded-2xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center text-sm text-slate-600">
            <button
              type="button"
              onClick={openRegister}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:border-indigo-400 hover:text-indigo-600"
            >
              회원가입 요청
            </button>
            <button
              type="button"
              onClick={openFindPw}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:border-indigo-400 hover:text-indigo-600"
            >
              비밀번호 찾기
            </button>
          </div>
        </div>
      </div>

      {showRegister && <RegisterModal onClose={closeRegister} />}
      {showFindPw && <FindPasswordModal onClose={closeFindPw} />}
    </div>
  );
};

export default LoginPage;
