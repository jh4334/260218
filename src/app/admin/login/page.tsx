import { adminLoginAction } from "@/app/admin/login/actions";

export const dynamic = "force-dynamic";

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
    ok?: string;
  }>;
}

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const showError = params.error === "1";
  const showOk = params.ok === "1";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-2xl font-bold">관리자 로그인</h1>
      <p className="mt-2 text-sm text-slate-600">비밀번호와 학급 slug를 입력하세요.</p>

      <form action={adminLoginAction} className="mt-6 space-y-3 rounded-lg border bg-white p-4">
        <div>
          <label htmlFor="password" className="mb-1 block text-xs text-slate-600">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="slug" className="mb-1 block text-xs text-slate-600">
            학급 slug
          </label>
          <input id="slug" name="slug" type="text" className="w-full rounded-md border px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
          로그인
        </button>
      </form>

      {showError && <p className="mt-3 text-sm text-rose-600">비밀번호가 올바르지 않습니다.</p>}
      {showOk && <p className="mt-3 text-sm text-emerald-600">로그인되었습니다. 학급 slug를 입력하세요.</p>}
    </main>
  );
}
