"use server";

import { revalidatePath } from "next/cache";

import { isAdminSessionValid } from "@/lib/auth";
import { getClassroomBySlug } from "@/lib/adminClassroom";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { SupportLogKind } from "@/lib/types";

const ALLOWED_KINDS: SupportLogKind[] = ["mission3", "mission5", "buddy", "frame"];

async function requireValidContext(slug: string) {
  const valid = await isAdminSessionValid();
  if (!valid) throw new Error("Unauthorized");

  const classroom = await getClassroomBySlug(slug);
  if (!classroom) throw new Error("Classroom not found");
  return classroom;
}

function parseKind(value: string): SupportLogKind {
  if (!ALLOWED_KINDS.includes(value as SupportLogKind)) {
    throw new Error("Invalid support log kind");
  }
  return value as SupportLogKind;
}

function revalidateClassroomPaths(slug: string, studentCode?: string) {
  revalidatePath(`/admin/${slug}/alerts`);
  revalidatePath(`/admin/${slug}/class-report`);
  revalidatePath(`/admin/${slug}/class-report/pdf`);
  if (studentCode) {
    revalidatePath(`/admin/${slug}/students/${studentCode}`);
    revalidatePath(`/admin/${slug}/students/${studentCode}/report`);
  }
}

export async function logSupportAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const studentCode = String(formData.get("studentCode") ?? "");
  const kind = parseKind(String(formData.get("kind") ?? ""));
  const minutes = Number(formData.get("minutes") ?? 0);
  const mission = String(formData.get("mission") ?? "").trim();
  const classroom = await requireValidContext(slug);

  const { error } = await supabaseAdmin.from("support_logs").insert({
    classroom_id: classroom.id,
    student_code: studentCode,
    kind,
    minutes: Number.isFinite(minutes) ? Math.max(0, minutes) : 0,
    mission: mission || null,
    detail: {
      source: "admin-alerts",
      createdBy: "admin",
    },
  });

  if (error) {
    throw new Error(`Failed to create support log: ${error.message}`);
  }

  revalidateClassroomPaths(slug, studentCode);
}

export async function deleteSupportLogAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const id = String(formData.get("id") ?? "");
  const studentCode = String(formData.get("studentCode") ?? "");
  const classroom = await requireValidContext(slug);

  const { error } = await supabaseAdmin
    .from("support_logs")
    .delete()
    .eq("id", id)
    .eq("classroom_id", classroom.id);

  if (error) {
    throw new Error(`Failed to delete support log: ${error.message}`);
  }

  revalidateClassroomPaths(slug, studentCode);
}
