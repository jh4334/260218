import { NextResponse } from "next/server";

import { isAdminSessionValid } from "@/lib/auth";
import { getClassroomBySlug } from "@/lib/adminClassroom";
import { createPDFCtx, drawText } from "@/lib/pdfHelpers";
import { getStudentReportMetrics } from "@/lib/reportMetrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; studentCode: string }> }
) {
  const valid = await isAdminSessionValid();
  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, studentCode } = await context.params;
  const classroom = await getClassroomBySlug(slug);
  if (!classroom) {
    return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
  }

  const metrics = await getStudentReportMetrics(classroom.id, studentCode);
  if (!metrics) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const { student, supportSummary } = metrics;
  const ctx = await createPDFCtx();

  drawText(ctx, `학생 리포트 - ${student.name} (${student.student_code})`, { size: 16, bold: true });
  drawText(ctx, `학급: ${classroom.name}`, { size: 10 });
  drawText(
    ctx,
    `지원(로그): 누적 ${supportSummary.totalLogs}회(${supportSummary.totalMinutes}분) · 이번주 ${supportSummary.thisWeekLogs}회(${supportSummary.thisWeekMinutes}분) · 3분 ${supportSummary.byKind.mission3} / 5분 ${supportSummary.byKind.mission5} / 버디 ${supportSummary.byKind.buddy} / 문장틀 ${supportSummary.byKind.frame}`,
    { size: 10 }
  );
  ctx.y -= 8;

  drawText(ctx, `필수 과제 진행률: ${metrics.requiredTaskProgress}%`, { size: 12, bold: true });
  drawText(ctx, `최신 문해력 점수: ${metrics.latestLiteracyScore ?? "-"}`, { size: 11 });
  drawText(ctx, `감정 체크인 평균: ${metrics.moodAverage ?? "-"}`, { size: 11 });

  ctx.y -= 8;
  drawText(ctx, "요약", { size: 12, bold: true });
  drawText(
    ctx,
    "본 학생 리포트는 관리자 입력 지원로그와 과제/문해력/감정 데이터 기반으로 생성되었습니다.",
    { size: 10 }
  );

  const bytes = await ctx.doc.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${slug}-${studentCode}-report.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
