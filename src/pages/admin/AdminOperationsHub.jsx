import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Calculator, Clock, Package, Settings, Store, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AdminGridLayout from "@/components/layouts/AdminGridLayout";
import { useAuth } from "@/context/useAuth";
import { ADMIN_NAV_SECTIONS } from "@/constants/navigation";

const SECTION_BLUEPRINT = [
  {
    key: "finance",
    title: "재무 / 정산",
    icon: <Calculator className="h-5 w-5 text-blue-600" />,
    description: "일일 시재부터 결산까지 재무 흐름을 단일 경로로 연결합니다.",
  },
  {
    key: "attendance",
    title: "근태",
    icon: <Clock className="h-5 w-5 text-purple-600" />,
    description: "출퇴근부터 정책까지 근태 흐름을 투명하게 정리합니다.",
  },
  {
    key: "inventory",
    title: "창고 / 재고",
    icon: <Package className="h-5 w-5 text-amber-600" />,
    description: "입출고, 재고, 폐기까지 전사 물류를 한 곳에서 점검하세요.",
  },
  {
    key: "store-ops",
    title: "매장 운영",
    icon: <Store className="h-5 w-5 text-emerald-600" />,
    description: "매장별 시나리오를 템플릿화해 빠르게 접근합니다.",
  },
  {
    key: "management",
    title: "관리",
    icon: <Settings className="h-5 w-5 text-slate-600" />,
    description: "권한, 승인, 로그 등 거버넌스 항목을 한 번에 관리하세요.",
  },
];

const QUICK_LINKS = [
  { label: "관리자 대시보드", to: "/erp/admin/dashboard" },
  { label: "승인 관리", to: "/erp/admin/approval" },
  { label: "일일 시재 관리", to: "/erp/admin/daily-cash" },
  { label: "창고 재고", to: "/erp/admin/warehouse/inventory" },
  { label: "근태 설정", to: "/erp/admin/attendance-settings" },
];

const SUMMARY_METRICS = [
  { label: "승인 대기", value: "12건", helper: "+3건 / SLA 25분", tone: "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200" },
  { label: "자동화율", value: "72%", helper: "37건 자동 처리", tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200" },
  { label: "활성 인원", value: "128명", helper: "이번 주 +4명", tone: "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200" },
];

const getSectionLinks = (key) => {
  const section = ADMIN_NAV_SECTIONS.find((item) => item.key === key);
  return (section?.items || []).map((link) => ({
    label: link.label,
    to: link.to,
  }));
};

export default function AdminOperationsHub() {
  const { user } = useAuth();

  const sections = useMemo(
    () =>
      SECTION_BLUEPRINT.map((blueprint) => ({
        ...blueprint,
        links: getSectionLinks(blueprint.key),
      })),
    []
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-900 dark:text-gray-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="text-center space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-500 dark:text-gray-400">Operations Hub</p>
          <h1 className="text-3xl font-bold tracking-tight">Erphan Admin</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Google Workspace, Notion, 삼성 ERP의 여백감을 반영한 운영 센터입니다.
          </p>
        </header>

        <Card className="mt-10 border-gray-200 shadow-md dark:border-gray-800 dark:bg-gray-800/80">
          <CardHeader className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-semibold">운영 센터 요약</CardTitle>
              <CardDescription className="text-sm">
                관리자 프로필과 실시간 지표를 한눈에 확인하세요.
              </CardDescription>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-right dark:border-gray-700 dark:bg-gray-900/50">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">현재 사용자</p>
              <p className="mt-1 text-lg font-semibold">{user?.name ?? "—"}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user?.role ?? "—"}</p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {SUMMARY_METRICS.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{metric.label}</p>
                <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${metric.tone}`}>{metric.value}</div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{metric.helper}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <AdminGridLayout>
          {sections.map((section) => (
            <Card key={section.key} className="border-gray-200 transition hover:shadow-lg dark:border-gray-800 dark:bg-gray-800/80">
              <CardHeader>
                <div className="flex items-center gap-2">
                  {section.icon}
                  <CardTitle className="text-lg font-semibold">{section.title}</CardTitle>
                </div>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(section.links || []).slice(0, 6).map((link) => (
                  <Button key={link.to} variant="outline" className="justify-between bg-white text-sm font-medium dark:bg-gray-900/40" asChild>
                    <Link to={link.to}>
                      {link.label}
                      <ArrowRight className="h-4 w-4 opacity-60" />
                    </Link>
                  </Button>
                ))}
                {(!section.links || section.links.length === 0) && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">연결된 메뉴가 없습니다.</p>
                )}
              </CardContent>
            </Card>
          ))}

          <Card className="border-gray-200 transition hover:shadow-lg dark:border-gray-800 dark:bg-gray-800/80">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-lg font-semibold">바로가기</CardTitle>
              </div>
              <CardDescription>자주 찾는 메뉴만 모았습니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {QUICK_LINKS.map((link) => (
                <Button key={link.to} variant="ghost" className="justify-between px-3 text-sm font-semibold" asChild>
                  <Link to={link.to}>
                    {link.label}
                    <ArrowRight className="h-4 w-4 opacity-60" />
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </AdminGridLayout>
      </div>
    </div>
  );
}
