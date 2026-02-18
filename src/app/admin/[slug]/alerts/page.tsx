import Link from "next/link";

import { deleteSupportLogAction, logSupportAction } from "@/app/admin/[slug]/alerts/actions";
import { requireAdminClassroom } from "@/lib/adminClassroom";
import { getSupportChecklistRows } from "@/lib/supportChecklist";

export const dynamic = "force-dynamic";

function kindLabel(kind: string): string {
  if (kind === "mission3") return "3분";
  if (kind === "mission5") return "5분";
  if (kind === "buddy") return "버디";
  if (kind === "frame") return "문장틀";
  return kind;
}

export default async function AlertsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const classroom = await requireAdminClassroom(slug);
  const rows = await getSupportChecklistRows(classroom.id);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">지원 체크리스트</h2>
        <Link href={`/admin/${slug}/class-report`} className="text-sm text-blue-700 hover:underline">
          학급 리포트 보기
        </Link>
      </div>

      {rows.length === 0 && (
        <div className="rounded-lg border bg-white p-6 text-sm text-slate-600">
          현재 `support_literacy` 태그 학생 중 필수 과제 미완료 학생이 없습니다.
        </div>
      )}

      {rows.map((row) => (
        <article key={row.studentCode} className="space-y-3 rounded-lg border bg-white p-4">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold">
                {row.studentName} <span className="font-mono text-xs text-slate-500">({row.studentCode})</span>
              </h3>
              <p className="text-xs text-slate-500">{row.tags.join(", ") || "-"}</p>
            </div>
            <p className="text-xs text-slate-600">
              이번주 로그 {row.thisWeekLogs}회 / 누적 {row.totalLogs}회
            </p>
          </header>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border p-3">
              <h4 className="mb-2 text-sm font-semibold">미완료 필수 과제</h4>
              <div className="space-y-2 text-xs text-slate-700">
                {row.missingByProject.map((project) => (
                  <div key={project.projectId}>
                    <div className="font-medium">{project.projectTitle}</div>
                    <ul className="ml-3 list-disc">
                      {project.tasks.map((task) => (
                        <li key={task.taskId}>
                          [{task.mode}] {task.taskTitle}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <h4 className="text-sm font-semibold">추천 미션</h4>
              <p className="text-xs text-slate-700">3분: {row.recommended.threeMin}</p>
              <p className="text-xs text-slate-700">5분: {row.recommended.fiveMin}</p>

              <div className="flex flex-wrap gap-2 pt-1">
                <form action={logSupportAction}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="studentCode" value={row.studentCode} />
                  <input type="hidden" name="kind" value="mission3" />
                  <input type="hidden" name="minutes" value="3" />
                  <input type="hidden" name="mission" value={row.recommended.threeMin} />
                  <button type="submit" className="rounded-md bg-emerald-600 px-3 py-1 text-xs text-white">
                    3분 기록
                  </button>
                </form>
                <form action={logSupportAction}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="studentCode" value={row.studentCode} />
                  <input type="hidden" name="kind" value="mission5" />
                  <input type="hidden" name="minutes" value="5" />
                  <input type="hidden" name="mission" value={row.recommended.fiveMin} />
                  <button type="submit" className="rounded-md bg-blue-600 px-3 py-1 text-xs text-white">
                    5분 기록
                  </button>
                </form>
                <form action={logSupportAction}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="studentCode" value={row.studentCode} />
                  <input type="hidden" name="kind" value="buddy" />
                  <input type="hidden" name="minutes" value="0" />
                  <input type="hidden" name="mission" value="버디 협력 지원" />
                  <button type="submit" className="rounded-md bg-violet-600 px-3 py-1 text-xs text-white">
                    버디 기록
                  </button>
                </form>
                <form action={logSupportAction}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="studentCode" value={row.studentCode} />
                  <input type="hidden" name="kind" value="frame" />
                  <input type="hidden" name="minutes" value="0" />
                  <input type="hidden" name="mission" value="문장틀 스캐폴드 제공" />
                  <button type="submit" className="rounded-md bg-amber-600 px-3 py-1 text-xs text-white">
                    문장틀 기록
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="rounded-md border p-3">
            <h4 className="mb-2 text-sm font-semibold">최근 로그 (최대 5개)</h4>
            <div className="space-y-2 text-xs">
              {row.recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between gap-3">
                  <span className="text-slate-700">
                    {log.created_at.slice(0, 10)} · {kindLabel(log.kind)} · {log.minutes}분 ·{" "}
                    {log.mission ?? "-"}
                  </span>
                  <form action={deleteSupportLogAction}>
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="id" value={log.id} />
                    <input type="hidden" name="studentCode" value={row.studentCode} />
                    <button type="submit" className="rounded border px-2 py-1 text-[11px] text-rose-700">
                      삭제
                    </button>
                  </form>
                </div>
              ))}
              {row.recentLogs.length === 0 && <p className="text-slate-500">기록이 없습니다.</p>}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
