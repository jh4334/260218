import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <h1 className="text-2xl font-bold">Classroom Admin</h1>
      <p className="mt-3 text-sm text-slate-600">
        관리자 기능은 인증 후 `/admin/[slug]` 경로에서 사용할 수 있습니다.
      </p>
      <Link
        href="/admin/login"
        className="mt-6 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
      >
        관리자 로그인
      </Link>
    </main>
  );
}
