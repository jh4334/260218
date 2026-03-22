import { NextResponse } from "next/server";

import { isAdminSessionValid } from "@/lib/auth";
import { getClassroomBySlug } from "@/lib/adminClassroom";
import { getClassReportMetrics } from "@/lib/classReportMetrics";
import { addPage, createPDFCtx, drawMultiLineChart, drawText } from "@/lib/pdfHelpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function seriesOrZero(values: Array<number | null>): number[] {
  return values.map((value) => value ?? 0);
}

function listText(items: Array<{ taskTitle: string; percent: number }>): string {
  if (items.length === 0) return "-";
  return items.map((item) => `${item.taskTitle} (${item.percent}%)`).join(", ");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const valid = await isAdminSessionValid();
  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;
  const classroom = await getClassroomBySlug(slug);
  if (!classroom) {
    return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
  }

  const metrics = await getClassReportMetrics(classroom.id);
  const ctx = await createPDFCtx();

  drawText(ctx, `학급 종합 리포트 - ${classroom.name}`, { size: 16, bold: true });
  drawText(ctx, `학생 ${metrics.studentCount}명 · 필수 과제 ${metrics.requiredTaskCount}개`, { size: 10 });
  drawText(
    ctx,
    `지원 체크리스트: 대상 ${metrics.supportChecklistSummary.supportStudents}명 / 미완료 보유 ${metrics.supportChecklistSummary.supportStudentsMissingRequired}명 / 미완료 총 ${metrics.supportChecklistSummary.totalMissingRequiredTasks}개`,
    { size: 10 }
  );
  ctx.y -= 8;

  drawText(ctx, "프로젝트별 Top/Bottom 3", { size: 12, bold: true });
  for (const project of metrics.projectProgress) {
    drawText(ctx, `${project.projectTitle} · 평균 ${project.avgPercent}%`, { size: 10, bold: true });
    drawText(ctx, `Top 3: ${listText(project.topTasks)}`, { size: 9 });
    drawText(ctx, `Bottom 3: ${listText(project.bottomTasks)}`, { size: 9 });
    ctx.y -= 2;
  }

  addPage(ctx);
  drawText(ctx, "태그 그룹 비교 (RU/UZ/KOR) + 체크리스트 요약", { size: 14, bold: true });
  drawMultiLineChart(
    ctx,
    "감정 체크인 주간 평균 (KST)",
    metrics.tagWeeklyMood.labels,
    [
      { label: "RU", data: seriesOrZero(metrics.tagWeeklyMood.ru), color: [0.82, 0.15, 0.15] },
      { label: "UZ", data: seriesOrZero(metrics.tagWeeklyMood.uz), color: [0.15, 0.39, 0.84], dashed: true },
      { label: "KOR", data: seriesOrZero(metrics.tagWeeklyMood.kor), color: [0.02, 0.53, 0.39] },
    ]
  );
  drawMultiLineChart(
    ctx,
    "문해력 주간 평균 (KST)",
    metrics.tagWeeklyLiteracy.labels,
    [
      { label: "RU", data: seriesOrZero(metrics.tagWeeklyLiteracy.ru), color: [0.82, 0.15, 0.15] },
      { label: "UZ", data: seriesOrZero(metrics.tagWeeklyLiteracy.uz), color: [0.15, 0.39, 0.84], dashed: true },
      { label: "KOR", data: seriesOrZero(metrics.tagWeeklyLiteracy.kor), color: [0.02, 0.53, 0.39] },
    ]
  );
  drawText(
    ctx,
    `지원 체크리스트 요약: 대상 ${metrics.supportChecklistSummary.supportStudents}명 / 미완료 보유 ${metrics.supportChecklistSummary.supportStudentsMissingRequired}명 / 미완료 총 ${metrics.supportChecklistSummary.totalMissingRequiredTasks}개`,
    { size: 10 }
  );

  addPage(ctx);
  drawText(ctx, "지원 로그 분석 (주간/누적)", { size: 14, bold: true });
  drawMultiLineChart(
    ctx,
    "주간 지원 로그",
    metrics.supportAnalytics.weekly.labels,
    [
      { label: "3분", data: metrics.supportAnalytics.weekly.mission3, color: [0.03, 0.57, 0.7] },
      { label: "5분", data: metrics.supportAnalytics.weekly.mission5, color: [0.49, 0.23, 0.93], dashed: true },
      { label: "스캐폴드", data: metrics.supportAnalytics.weekly.scaffold, color: [0.79, 0.54, 0.01] },
    ]
  );
  drawMultiLineChart(
    ctx,
    "누적 지원 로그/분",
    metrics.supportAnalytics.cumulative.labels,
    [
      { label: "누적 로그", data: metrics.supportAnalytics.cumulative.total, color: [0.15, 0.39, 0.84] },
      { label: "누적 분", data: metrics.supportAnalytics.cumulative.minutes, color: [0.82, 0.15, 0.15], dashed: true },
    ]
  );
  drawText(
    ctx,
    `총계 - 3분 ${metrics.supportAnalytics.totals.mission3}회 / 5분 ${metrics.supportAnalytics.totals.mission5}회 / 스캐폴드 ${metrics.supportAnalytics.totals.scaffold}회 / 총 ${metrics.supportAnalytics.totals.total}회 / ${metrics.supportAnalytics.totals.minutes}분`,
    { size: 9 }
  );
  drawText(ctx, "상위 학생", { size: 10, bold: true });
  for (const student of metrics.supportAnalytics.topStudents) {
    drawText(ctx, `${student.name} (${student.studentCode}) - ${student.logs}회 / ${student.minutes}분`, {
      size: 9,
    });
  }

  addPage(ctx);
  drawText(ctx, "지원 효과/상관 분석", { size: 14, bold: true });
  drawText(
    ctx,
    `지원군 문해력 변화 평균: ${metrics.supportEffect.avgDeltaSupport ?? "표본 부족"} (n=${metrics.supportEffect.sampleSizes.supportDeltaN})`,
    { size: 10 }
  );
  drawText(
    ctx,
    `비지원군 문해력 변화 평균: ${metrics.supportEffect.avgDeltaNonSupport ?? "표본 부족"} (n=${metrics.supportEffect.sampleSizes.nonSupportDeltaN})`,
    { size: 10 }
  );
  drawText(
    ctx,
    `지원 시작 전후 변화 평균: ${metrics.supportEffect.avgPrePostDeltaSupport ?? "표본 부족"} (n=${metrics.supportEffect.sampleSizes.prePostN})`,
    { size: 10 }
  );
  drawText(
    ctx,
    `상관(로그수-점수변화): ${metrics.supportEffect.correlationLogsDelta ?? "표본 부족"} / 상관(분량-점수변화): ${metrics.supportEffect.correlationMinutesDelta ?? "표본 부족"} (n=${metrics.supportEffect.sampleSizes.correlationN})`,
    { size: 10 }
  );
  ctx.y -= 6;
  drawText(ctx, "리포트용 해석 요약", { size: 11, bold: true });
  for (const line of metrics.supportEffect.interpretation) {
    drawText(ctx, `• ${line}`, { size: 9 });
  }

  const bytes = await ctx.doc.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${slug}-class-report.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
