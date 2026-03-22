import { autoAssignStudentTagsAction, updateStudentTagsAction } from "@/app/admin/[slug]/students/tags/actions";
import { requireAdminClassroom } from "@/lib/adminClassroom";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ALL_TAGS, type Student } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StudentTagsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const classroom = await requireAdminClassroom(slug);

  const { data, error } = await supabaseAdmin
    .from("students")
    .select("id, classroom_id, student_code, name, tags, created_at")
    .eq("classroom_id", classroom.id)
    .order("student_code", { ascending: true });

  if (error) {
    throw new Error(`Failed to load students: ${error.message}`);
  }

  const students = ((data ?? []) as Student[]).map((student) => ({
    ...student,
    tags: Array.isArray(student.tags) ? student.tags : [],
  }));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">학생 Tags 관리</h2>
        <form action={autoAssignStudentTagsAction}>
          <input type="hidden" name="slug" value={slug} />
          <button type="submit" className="rounded-md border px-3 py-2 text-xs hover:bg-slate-100">
            빈 태그 자동 분배 (70/30, ru/uz 70/30)
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2">학생</th>
              <th className="px-3 py-2">태그</th>
              <th className="px-3 py-2">저장</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-t align-top">
                <td className="px-3 py-2">
                  <div className="font-medium">{student.name}</div>
                  <div className="font-mono text-xs text-slate-500">{student.student_code}</div>
                </td>
                <td className="px-3 py-2">
                  <form action={updateStudentTagsAction} className="space-y-2">
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="studentCode" value={student.student_code} />
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      {ALL_TAGS.map((tag) => (
                        <label key={`${student.id}-${tag}`} className="flex items-center gap-2 text-xs">
                          <input type="checkbox" name="tags" value={tag} defaultChecked={student.tags.includes(tag)} />
                          {tag}
                        </label>
                      ))}
                    </div>
                    <button type="submit" className="rounded-md bg-slate-900 px-3 py-1 text-xs text-white">
                      저장
                    </button>
                  </form>
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">학생별 즉시 저장</td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                  학생 데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
