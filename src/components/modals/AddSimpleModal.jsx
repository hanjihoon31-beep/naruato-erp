import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/useAuth";

export default function AddSimpleModal({
  open,
  onClose,
  onSubmit,
  onSuccess,
  title,
  description,
  confirmLabel = "추가",
  loading = false,
  endpoint,
  successMessage = "정상적으로 추가되었습니다.",
}) {
  const { axios: authAxios } = useAuth();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [internalLoading, setInternalLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setLocation("");
    }
  }, [open]);

  const resetForm = () => {
    setName("");
    setLocation("");
  };

  const handleSuccess = (result) => {
    onSuccess?.(result);
    resetForm();
    onClose?.();
  };

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = { name: name.trim(), location: location.trim() };
    if (onSubmit) {
      const result = await onSubmit(payload);
      if (result !== false) {
        handleSuccess(result);
      }
      return;
    }
    if (!endpoint) return;
    setInternalLoading(true);
    try {
      const { data } = await authAxios.post(endpoint, payload);
      const created = data?.data || data?.warehouse || data?.store || data;
      window.alert(successMessage);
      handleSuccess(created);
    } catch (err) {
      window.alert(err?.response?.data?.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setInternalLoading(false);
    }
  };
  const submitting = loading || internalLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl border border-darkborder bg-darkcard p-6 text-gray-100 shadow-2xl">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
          {description && <p className="text-sm text-gray-300">{description}</p>}
        </div>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-100">이름</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="예: 잠실점"
              className="w-full rounded-lg border border-darkborder bg-darkbg px-3 py-2 text-sm text-gray-100 placeholder-gray-400"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-100">위치</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="예: 서울 송파구"
              className="w-full rounded-lg border border-darkborder bg-darkbg px-3 py-2 text-sm text-gray-100 placeholder-gray-400"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? "저장 중..." : confirmLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
