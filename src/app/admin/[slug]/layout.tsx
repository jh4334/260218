import Link from "next/link";
import type { ReactNode } from "react";

import { adminLogoutAction } from "@/app/admin/login/actions";
import { requireAdminClassroom } from "@/lib/adminClassroom";

export const dynamic = "force-dynamic";

export default async function AdminClassroomLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: ReactNode;
}) {
  const { slug } = await params;
  const classroom = await requireAdminClassroom(slug);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs text-slate-500">학급</p>
            <h1 className="text-lg font-semibold">{classroom.name}</h1>
          </div>
          <form action={adminLogoutAction}>
            <button type="submit" className="rounded-md border px-3 py-1 text-xs text-slate-700">
              로그아웃
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-6 md:grid-cols-[240px_1fr]">
        <aside className="rounded-lg border bg-white p-3">
          <nav className="space-y-1 text-sm">
            <Link href={`/admin/${slug}`} className="block rounded px-2 py-1 hover:bg-slate-100">
              대시보드
            </Link>
            <Link href={`/admin/${slug}/students`} className="block rounded px-2 py-1 hover:bg-slate-100">
              학생 관리
            </Link>
            <Link
              href={`/admin/${slug}/students/tags`}
              className="block rounded px-2 py-1 hover:bg-slate-100"
            >
              Tags 관리
            </Link>
            <Link href={`/admin/${slug}/alerts`} className="block rounded px-2 py-1 hover:bg-slate-100">
              지원 체크리스트
            </Link>
            <Link
              href={`/admin/${slug}/class-report`}
              className="block rounded px-2 py-1 hover:bg-slate-100"
            >
              학급 종합 리포트
            </Link>
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
