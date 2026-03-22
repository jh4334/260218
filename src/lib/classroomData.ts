import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type {
  GuidebookEntry,
  LiteracyRun,
  MoodCheckin,
  Project,
  ProjectTask,
  Student,
  SupportLog,
  TaskSubmission,
} from "@/lib/types";

export interface ClassroomDataset {
  students: Student[];
  projects: Project[];
  tasks: ProjectTask[];
  submissions: TaskSubmission[];
  moodCheckins: MoodCheckin[];
  literacyRuns: LiteracyRun[];
  guidebookEntries: GuidebookEntry[];
  supportLogs: SupportLog[];
}

function normalizeStudents(rows: Student[]): Student[] {
  return rows.map((row) => ({
    ...row,
    tags: Array.isArray(row.tags) ? row.tags : [],
  }));
}

function assertNoError(source: string, message: string | null | undefined): void {
  if (message) {
    throw new Error(`Failed to load ${source}: ${message}`);
  }
}

export async function fetchClassroomDataset(classroomId: string): Promise<ClassroomDataset> {
  const [studentsRes, projectsRes, tasksRes, submissionsRes, moodRes, literacyRes, guidebookRes, supportRes] =
    await Promise.all([
      supabaseAdmin
        .from("students")
        .select("id, classroom_id, student_code, name, tags, created_at")
        .eq("classroom_id", classroomId)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("projects")
        .select("id, classroom_id, title, order_index, created_at")
        .eq("classroom_id", classroomId)
        .order("order_index", { ascending: true }),
      supabaseAdmin
        .from("project_tasks")
        .select("id, project_id, classroom_id, title, mode, required, order_index")
        .eq("classroom_id", classroomId)
        .order("order_index", { ascending: true }),
      supabaseAdmin
        .from("task_submissions")
        .select("id, task_id, student_code, classroom_id, completed, score, created_at")
        .eq("classroom_id", classroomId),
      supabaseAdmin
        .from("mood_checkins")
        .select("id, classroom_id, student_code, mood_score, phrase, created_at")
        .eq("classroom_id", classroomId),
      supabaseAdmin
        .from("literacy_runs")
        .select("id, classroom_id, student_code, score, created_at")
        .eq("classroom_id", classroomId),
      supabaseAdmin
        .from("guidebook_entries")
        .select("id, classroom_id, student_code, content, created_at")
        .eq("classroom_id", classroomId),
      supabaseAdmin
        .from("support_logs")
        .select("id, classroom_id, student_code, kind, minutes, mission, detail, created_at")
        .eq("classroom_id", classroomId),
    ]);

  assertNoError("students", studentsRes.error?.message);
  assertNoError("projects", projectsRes.error?.message);
  assertNoError("project_tasks", tasksRes.error?.message);
  assertNoError("task_submissions", submissionsRes.error?.message);
  assertNoError("mood_checkins", moodRes.error?.message);
  assertNoError("literacy_runs", literacyRes.error?.message);
  assertNoError("guidebook_entries", guidebookRes.error?.message);
  assertNoError("support_logs", supportRes.error?.message);

  return {
    students: normalizeStudents((studentsRes.data ?? []) as Student[]),
    projects: (projectsRes.data ?? []) as Project[],
    tasks: (tasksRes.data ?? []) as ProjectTask[],
    submissions: (submissionsRes.data ?? []) as TaskSubmission[],
    moodCheckins: (moodRes.data ?? []) as MoodCheckin[],
    literacyRuns: (literacyRes.data ?? []) as LiteracyRun[],
    guidebookEntries: (guidebookRes.data ?? []) as GuidebookEntry[],
    supportLogs: (supportRes.data ?? []) as SupportLog[],
  };
}
