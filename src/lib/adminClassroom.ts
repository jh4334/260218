import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Classroom } from "@/lib/types";

export async function getClassroomBySlug(slug: string): Promise<Classroom | null> {
  const { data, error } = await supabaseAdmin
    .from("classrooms")
    .select("id, slug, name, created_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load classroom: ${error.message}`);
  }

  if (!data) return null;
  return data as Classroom;
}

export async function requireAdminClassroom(slug: string): Promise<Classroom> {
  await requireAdmin();
  const classroom = await getClassroomBySlug(slug);
  if (!classroom) {
    notFound();
  }
  return classroom;
}
