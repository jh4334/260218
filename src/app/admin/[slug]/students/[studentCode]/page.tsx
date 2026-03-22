import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdminClassroom } from "@/lib/adminClassroom";
import { getStudentReportMetrics } from "@/lib/reportMetrics";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ slug: string; studentCode: string }>;
}) {
  const { slug, studentCode } = await params;
  const classroom = await requireAdminClassroom(slug);
  const metrics = await getStudentReportMetrics(classroom.id, studentCode);
  if (!metrics) {
    notFound();
  }

  const { student, supportSummary } = metrics;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {student.name} <span className="font-mono text-sm text-slate-500">({student.student_code})</span>
        </h2>
        <Link href={`/admin/${slug}/students/${studentCode}/report`} className="rounded-md bg-slate-900 px-3 py-2 text-xs text-white">
          학생 리포트 PDF
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 text-sm">
          <p className="text-slate-500">필수 과제 진행률</p>
          <p className="mt-2 text-xl font-semibold">{metrics.requiredTaskProgress}%</p>
        </div>
        <div className="rounded-lg border bg-white p-4 text-sm">
          <p className="text-slate-500">최신 문해력 점수</p>
          <p className="mt-2 text-xl font-semibold">{metrics.latestLiteracyScore ?? "-"}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 text-sm">
          <p className="text-slate-500">감정 평균</p>
          <p className="mt-2 text-xl font-semibold">{metrics.moodAverage ?? "-"}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold">지원 로그 요약</h3>
        <p className="mt-2 text-sm text-slate-700">
          누적 {supportSummary.totalLogs}회 ({supportSummary.totalMinutes}분) · 이번주 {supportSummary.thisWeekLogs}
          회 ({supportSummary.thisWeekMinutes}분)
        </p>
        <p className="mt-1 text-xs text-slate-600">
          3분 {supportSummary.byKind.mission3}회 / 5분 {supportSummary.byKind.mission5}회 / 버디{" "}
          {supportSummary.byKind.buddy}회 / 문장틀 {supportSummary.byKind.frame}회
        </p>
        <p className="mt-1 text-xs text-slate-600">
          최근 기록:{" "}
          {supportSummary.lastLog
            ? `${supportSummary.lastLog.createdAt.slice(0, 10)} · ${supportSummary.lastLog.kind} · ${supportSummary.lastLog.minutes}분`
            : "-"}
        </p>
      </div>
    </section>
  );
}
