"use server";

import { revalidatePath } from "next/cache";

import { isAdminSessionValid } from "@/lib/auth";
import { getClassroomBySlug } from "@/lib/adminClassroom";
import { buildInitialTagsMap } from "@/lib/studentTagging";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ALL_TAGS } from "@/lib/types";

function filterTags(values: FormDataEntryValue[]): string[] {
  const set = new Set(
    values
      .map((value) => String(value))
      .filter((value): value is (typeof ALL_TAGS)[number] =>
        (ALL_TAGS as readonly string[]).includes(value)
      )
  );
  return Array.from(set);
}

async function requireValidClassroom(slug: string) {
  const valid = await isAdminSessionValid();
  if (!valid) throw new Error("Unauthorized");

  const classroom = await getClassroomBySlug(slug);
  if (!classroom) throw new Error("Classroom not found");
  return classroom;
}

export async function updateStudentTagsAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const studentCode = String(formData.get("studentCode") ?? "");
  const tags = filterTags(formData.getAll("tags"));
  const classroom = await requireValidClassroom(slug);

  const { error } = await supabaseAdmin
    .from("students")
    .update({ tags })
    .eq("classroom_id", classroom.id)
    .eq("student_code", studentCode);

  if (error) {
    throw new Error(`Failed to update tags: ${error.message}`);
  }

  revalidatePath(`/admin/${slug}/students`);
  revalidatePath(`/admin/${slug}/students/tags`);
  revalidatePath(`/admin/${slug}/class-report`);
  revalidatePath(`/admin/${slug}/class-report/pdf`);
  revalidatePath(`/admin/${slug}/alerts`);
}

export async function autoAssignStudentTagsAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const classroom = await requireValidClassroom(slug);

  const { data, error } = await supabaseAdmin
    .from("students")
    .select("student_code, tags")
    .eq("classroom_id", classroom.id)
    .order("student_code", { ascending: true });

  if (error) {
    throw new Error(`Failed to load students for auto-tagging: ${error.message}`);
  }

  const rows = data ?? [];
  const codes = rows.map((row) => row.student_code as string);
  const defaultMap = buildInitialTagsMap(codes);

  for (const row of rows) {
    const studentCode = row.student_code as string;
    const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
    if (tags.length > 0) continue;
    const { error: updateError } = await supabaseAdmin
      .from("students")
      .update({ tags: defaultMap[studentCode] ?? [] })
      .eq("classroom_id", classroom.id)
      .eq("student_code", studentCode);
    if (updateError) {
      throw new Error(`Failed auto-tagging ${studentCode}: ${updateError.message}`);
    }
  }

  revalidatePath(`/admin/${slug}/students`);
  revalidatePath(`/admin/${slug}/students/tags`);
  revalidatePath(`/admin/${slug}/class-report`);
  revalidatePath(`/admin/${slug}/class-report/pdf`);
  revalidatePath(`/admin/${slug}/alerts`);
}
