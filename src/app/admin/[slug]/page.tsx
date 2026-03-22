import Link from "next/link";

import { requireAdminClassroom } from "@/lib/adminClassroom";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const classroom = await requireAdminClassroom(slug);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{classroom.name} 관리자 대시보드</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <Link href={`/admin/${slug}/students`} className="rounded-lg border bg-white p-4 hover:bg-slate-50">
          학생 목록
        </Link>
        <Link href={`/admin/${slug}/alerts`} className="rounded-lg border bg-white p-4 hover:bg-slate-50">
          지원 체크리스트
        </Link>
        <Link
          href={`/admin/${slug}/class-report`}
          className="rounded-lg border bg-white p-4 hover:bg-slate-50"
        >
          학급 리포트
        </Link>
      </div>
    </section>
  );
}
