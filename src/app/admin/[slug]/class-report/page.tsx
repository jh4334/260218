import Link from "next/link";

import MiniMultiLineChart from "@/components/MiniMultiLineChart";
import { requireAdminClassroom } from "@/lib/adminClassroom";
import { getClassReportMetrics } from "@/lib/classReportMetrics";

export const dynamic = "force-dynamic";

function taskListText(
  tasks: Array<{
    projectTitle: string;
    taskTitle: string;
    percent: number;
  }>
): string {
  if (tasks.length === 0) return "-";
  return tasks.map((task) => `${task.taskTitle} (${task.percent}%)`).join(" · ");
}

export default async function ClassReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const classroom = await requireAdminClassroom(slug);
  const metrics = await getClassReportMetrics(classroom.id);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">학급 종합 리포트</h2>
        <div className="flex gap-2">
          <Link href={`/admin/${slug}/alerts`} className="rounded-md border px-3 py-1 text-xs">
            지원 체크리스트
          </Link>
          <Link href={`/admin/${slug}/class-report/pdf`} className="rounded-md bg-slate-900 px-3 py-1 text-xs text-white">
            PDF 다운로드
          </Link>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 text-sm">
        <p className="text-slate-700">
          학생 {metrics.studentCount}명 · 필수 과제 {metrics.requiredTaskCount}개
        </p>
        <p className="mt-1 text-slate-700">
          지원 체크리스트: 대상 {metrics.supportChecklistSummary.supportStudents}명 / 미완료 보유{" "}
          {metrics.supportChecklistSummary.supportStudentsMissingRequired}명 / 미완료 총{" "}
          {metrics.supportChecklistSummary.totalMissingRequiredTasks}개
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {metrics.projectProgress.map((project) => (
          <article key={project.projectId} className="rounded-lg border bg-white p-4 text-sm">
            <h3 className="font-semibold">{project.projectTitle}</h3>
            <p className="mt-1 text-slate-700">프로젝트 평균 진행률: {project.avgPercent}%</p>
            <p className="mt-2 text-xs text-emerald-700">Top 3: {taskListText(project.topTasks)}</p>
            <p className="mt-1 text-xs text-rose-700">Bottom 3: {taskListText(project.bottomTasks)}</p>
          </article>
        ))}
      </div>

      <MiniMultiLineChart
        title="감정 체크인 주간 평균 (RU/UZ/KOR, KST)"
        labels={metrics.tagWeeklyMood.labels}
        series={[
          { label: "RU", data: metrics.tagWeeklyMood.ru, color: "#dc2626" },
          { label: "UZ", data: metrics.tagWeeklyMood.uz, color: "#2563eb", dashed: true },
          { label: "KOR", data: metrics.tagWeeklyMood.kor, color: "#059669" },
        ]}
      />
      <MiniMultiLineChart
        title="문해력 주간 평균 (RU/UZ/KOR, KST)"
        labels={metrics.tagWeeklyLiteracy.labels}
        series={[
          { label: "RU", data: metrics.tagWeeklyLiteracy.ru, color: "#dc2626" },
          { label: "UZ", data: metrics.tagWeeklyLiteracy.uz, color: "#2563eb", dashed: true },
          { label: "KOR", data: metrics.tagWeeklyLiteracy.kor, color: "#059669" },
        ]}
      />
      <MiniMultiLineChart
        title="지원 로그 주간 추이 (미션3/미션5/스캐폴드)"
        labels={metrics.supportAnalytics.weekly.labels}
        series={[
          { label: "3분", data: metrics.supportAnalytics.weekly.mission3, color: "#0891b2" },
          { label: "5분", data: metrics.supportAnalytics.weekly.mission5, color: "#7c3aed", dashed: true },
          { label: "스캐폴드", data: metrics.supportAnalytics.weekly.scaffold, color: "#ca8a04" },
        ]}
      />
      <MiniMultiLineChart
        title="지원 로그 누적 추이 (총 로그/분)"
        labels={metrics.supportAnalytics.cumulative.labels}
        series={[
          { label: "누적 로그", data: metrics.supportAnalytics.cumulative.total, color: "#2563eb" },
          { label: "누적 분", data: metrics.supportAnalytics.cumulative.minutes, color: "#dc2626", dashed: true },
        ]}
      />

      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold">지원 효과 요약</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {metrics.supportEffect.interpretation.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold">지원 상위 학생 (로그/분)</h3>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {metrics.supportAnalytics.topStudents.map((student) => (
            <li key={student.studentCode}>
              {student.name} ({student.studentCode}) - {student.logs}회 / {student.minutes}분
            </li>
          ))}
          {metrics.supportAnalytics.topStudents.length === 0 && <li>데이터 없음</li>}
        </ul>
      </div>
    </section>
  );
}
