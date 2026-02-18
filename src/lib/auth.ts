import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_COOKIE = "admin_session";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

export async function isAdminSessionValid(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE);
  return session?.value === "valid";
}

export async function requireAdmin(): Promise<void> {
  const valid = await isAdminSessionValid();
  if (!valid) {
    redirect("/admin/login");
  }
}

export function verifyAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export { ADMIN_COOKIE };
