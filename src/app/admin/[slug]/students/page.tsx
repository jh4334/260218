import Link from "next/link";

import { requireAdminClassroom } from "@/lib/adminClassroom";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Student } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StudentsPage({
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">학생 관리</h2>
        <Link
          href={`/admin/${slug}/students/tags`}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
        >
          Tags 관리
        </Link>
      </div>
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2">코드</th>
              <th className="px-3 py-2">이름</th>
              <th className="px-3 py-2">태그</th>
              <th className="px-3 py-2">리포트</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{student.student_code}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/${slug}/students/${student.student_code}`}
                    className="text-slate-900 hover:underline"
                  >
                    {student.name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-xs text-slate-600">{student.tags.join(", ") || "-"}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/${slug}/students/${student.student_code}/report`}
                    className="text-xs text-blue-700 hover:underline"
                  >
                    PDF 보기
                  </Link>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
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
