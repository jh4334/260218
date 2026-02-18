"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_COOKIE, verifyAdminPassword } from "@/lib/auth";

export async function adminLoginAction(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  const slug = String(formData.get("slug") ?? "").trim();

  if (!verifyAdminPassword(password)) {
    redirect("/admin/login?error=1");
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "valid", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  if (slug) {
    redirect(`/admin/${slug}`);
  }
  redirect("/admin/login?ok=1");
}

export async function adminLogoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
