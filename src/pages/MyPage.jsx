// client/src/pages/MyPage.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "../context/useAuth";
import MyPageLayout from "../components/layouts/MyPageLayout";

export default function MyPage() {
  const { token, axios: authAxios } = useAuth();
  const [profile, setProfile] = useState(null);

  // 닉네임 관련 상태
  const [newNickname, setNewNickname] = useState("");
  const [nickCheck, setNickCheck] = useState({ loading: false, available: null, reason: "" });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordState, setPasswordState] = useState({ type: "", message: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // 닉네임 정규식(백엔드와 동일)
  const nicknameRegex = useMemo(() => /^[A-Za-z0-9가-힣_-]{2,12}$/, []);
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

  const fetchMe = useCallback(async () => {
    if (!token) return;
    try {
      const res = await authAxios.get(`/user/me`);
      setProfile(res.data.user);
      setNewNickname(res.data.user?.nickname || "");
    } catch (err) {
      console.error("내 정보 조회 실패:", err);
      setToast("내 정보를 불러오지 못했습니다.");
    }
  }, [authAxios, token]);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // 닉네임 자동 중복 체크: 500ms 디바운스
  useEffect(() => {
    if (!newNickname || !nicknameRegex.test(newNickname)) {
      setNickCheck({ loading: false, available: null, reason: "" });
      return;
    }
    const id = setTimeout(async () => {
      try {
        setNickCheck((p) => ({ ...p, loading: true }));
        const res = await authAxios.get(`/auth/nickname-available`, {
          params: { nickname: newNickname },
        });
        setNickCheck({
          loading: false,
          available: !!res.data?.available,
          reason: res.data?.reason || "",
        });
      } catch (err) {
        console.error("닉네임 체크 실패:", err);
        setNickCheck({ loading: false, available: false, reason: "SERVER_ERROR" });
      }
    }, 500);
    return () => clearTimeout(id);
  }, [newNickname, authAxios, nicknameRegex]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newNickname || !nicknameRegex.test(newNickname)) {
      return setToast("닉네임 형식이 올바르지 않습니다. (2~12자, 영문/숫자/한글/_/-)");
    }
    if (profile?.nickname === newNickname) {
      return setToast("현재 닉네임과 동일합니다.");
    }
    if (nickCheck.available === false) {
      return setToast("이미 사용 중인 닉네임입니다.");
    }

    try {
      setSubmitLoading(true);
      const res = await authAxios.put(`/user/request-nickname-change`, { newNickname });
      setToast("닉네임 변경 요청을 제출했습니다.");
      // 로컬 상태 갱신(요청 배지 보이게)
      setProfile((p) => ({
        ...p,
        nicknameChangeRequest: res.data.nicknameChangeRequest,
      }));
    } catch (err) {
      console.error("닉네임 변경 요청 실패:", err);
      const msg = err.response?.data?.message || "닉네임 변경 요청 중 오류가 발생했습니다.";
      setToast(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const passwordEndpoints = [
    { method: "post", url: "/auth/change-password" },
    { method: "put", url: "/auth/change-password" },
    { method: "post", url: "/user/change-password" },
    { method: "put", url: "/user/change-password" },
  ];

  const submitPasswordChange = async (payload) => {
    let lastError = null;
    for (const endpoint of passwordEndpoints) {
      try {
        return await authAxios[endpoint.method](endpoint.url, payload);
      } catch (error) {
        if (error?.response?.status === 404) {
          lastError = error;
          continue;
        }
        throw error;
      }
    }
    throw lastError || new Error("비밀번호 변경 API가 아직 구성되지 않았습니다.");
  };

  const handlePasswordInput = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordState({ type: "", message: "" });
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordState({ type: "error", message: "모든 비밀번호 필드를 입력해주세요." });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordState({ type: "error", message: "새 비밀번호와 확인 비밀번호가 일치하지 않습니다." });
      return;
    }
    if (!passwordRegex.test(passwordForm.newPassword)) {
      setPasswordState({ type: "error", message: "새 비밀번호는 영문과 숫자를 포함해 8자 이상이어야 합니다." });
      return;
    }
    try {
      setPasswordLoading(true);
      await submitPasswordChange({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordState({ type: "success", message: "비밀번호가 성공적으로 변경되었습니다." });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      console.error("비밀번호 변경 실패:", err);
      setPasswordState({
        type: "error",
        message: err.response?.data?.message || err.message || "비밀번호 변경에 실패했습니다.",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!profile) {
    return (
      <MyPageLayout>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          내 정보를 불러오는 중입니다...
        </div>
      </MyPageLayout>
    );
  }

  const pending = profile?.nicknameChangeRequest?.requested;

  return (
    <MyPageLayout>
      <div className="space-y-4">
        {/* 알림 토스트 */}
        {toast && (
          <div className="rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-700">
            {toast}
          </div>
        )}

        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">내 정보</h2>
            {pending && (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                닉네임 승인 대기중
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoItem label="사번" value={profile.employeeId} />
            <InfoItem label="이름" value={profile.name} />
            <InfoItem label="이메일" value={profile.email} />
            <InfoItem label="권한" value={roleToKorean(profile.role)} />
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">현재 닉네임</span>
                <span className="font-semibold">{profile.nickname}</span>
              </div>
            </div>
          </div>

          <hr className="my-5" />

          {/* 닉네임 변경 요청 */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-sm font-medium">새 닉네임</label>
            <input
              type="text"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-gray-800"
              placeholder="새 닉네임을 입력하세요 (2~12자, 영문/숫자/한글/_/-)"
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              닉네임은 관리자 승인 후 반영됩니다. 승인되면 기존 기록의 닉네임도 전부 새 닉네임으로 표시됩니다.
            </p>

            {/* 중복/형식 상태 */}
            <div className="text-sm">
              {newNickname && !nicknameRegex.test(newNickname) && (
                <span className="text-red-600">형식이 올바르지 않습니다.</span>
              )}
              {nicknameRegex.test(newNickname) && nickCheck.loading && (
                <span className="text-gray-600">중복 확인 중...</span>
              )}
              {nicknameRegex.test(newNickname) && nickCheck.available === true && (
                <span className="text-green-600">사용 가능한 닉네임입니다.</span>
              )}
              {nicknameRegex.test(newNickname) && nickCheck.available === false && (
                <span className="text-red-600">이미 사용 중인 닉네임입니다.</span>
              )}
            </div>

          <button
            type="submit"
            disabled={
              submitLoading ||
              !nicknameRegex.test(newNickname) ||
              nickCheck.available === false ||
              profile.nickname === newNickname
            }
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitLoading ? "요청 중..." : "닉네임 변경 요청"}
          </button>
        </form>

        <hr className="my-6" />

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">비밀번호 변경</h3>
            <span className="text-xs text-gray-500">영문+숫자 조합 8자 이상</span>
          </div>
          {passwordState.message && (
            <div
              className={`mb-4 rounded-md border px-3 py-2 text-sm ${
                passwordState.type === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {passwordState.message}
            </div>
          )}
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">현재 비밀번호</label>
              <input
                type="password"
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={handlePasswordInput}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-gray-800"
                autoComplete="current-password"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">새 비밀번호</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordInput}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-gray-800"
                  placeholder="영문+숫자 포함 8자 이상"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">새 비밀번호 확인</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordInput}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-gray-800"
                  placeholder="한 번 더 입력"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={passwordLoading}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {passwordLoading ? "변경 중..." : "비밀번호 변경"}
            </button>
          </form>
        </div>
      </div>
      </div>
    </MyPageLayout>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="text-sm">
      <div className="text-gray-500">{label}</div>
      <div className="font-medium">{value || "-"}</div>
    </div>
  );
}

function roleToKorean(role) {
  if (role === "superadmin") return "최고관리자";
  if (role === "admin") return "관리자";
  return "근무자";
}
